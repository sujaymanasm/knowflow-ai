import time
import re
from typing import List, Dict, Any, Optional, Tuple
import httpx
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.config import settings
from app.services.retrieval.vector_store import VectorStoreService, RetrievedChunk
from app.services.rag.context_builder import ContextBuilder
from app.services.rag.citation_validator import CitationValidator, ValidatedCitation

class RAGResponse:
    def __init__(
        self,
        answer: str,
        citations: List[ValidatedCitation],
        retrieval_latency_ms: float,
        generation_latency_ms: float,
        is_simulated: bool
    ):
        self.answer = answer
        self.citations = citations
        self.retrieval_latency_ms = retrieval_latency_ms
        self.generation_latency_ms = generation_latency_ms
        self.is_simulated = is_simulated

class RAGGenerator:
    SYSTEM_PROMPT = (
        "You are KnowFlow AI, an evidence-based Document Intelligence and RAG Assistant.\n"
        "Your task is to answer the user's question accurately and concisely, strictly grounded "
        "in the provided reference materials in <retrieved_documents>.\n\n"
        "Guidelines:\n"
        "1. Grounding: Answer strictly using facts from the retrieved passages.\n"
        "2. Insufficient Evidence: If the retrieved documents do not contain enough evidence to answer, "
        "explicitly state: 'Based on the provided documents, there is insufficient evidence to answer this question.' "
        "Do not hallucinate or use external knowledge.\n"
        "3. Citations: Reference supporting passages by inserting [Citation: <chunk_id>] directly after claims.\n"
        "4. Tone: Professional, analytical, objective, and clear."
    )

    @classmethod
    async def generate_answer(
        cls,
        session: AsyncSession,
        workspace_id: str,
        question: str,
        document_id: Optional[str] = None,
        top_k: int = 4
    ) -> RAGResponse:
        """
        Executes end-to-end RAG pipeline:
        1. Retrieval from Vector Store
        2. Context Construction with Injection Defense
        3. LLM Generation (OpenAI or Grounded Demo Engine)
        4. Citation Validation
        """
        # --- 1. Retrieval ---
        retrieval_start = time.perf_counter()
        retrieved_chunks = await VectorStoreService.search(
            session=session,
            workspace_id=workspace_id,
            query=question,
            top_k=top_k,
            document_id=document_id
        )
        retrieval_latency_ms = round((time.perf_counter() - retrieval_start) * 1000, 2)

        # --- 2. Generation ---
        generation_start = time.perf_counter()

        if settings.IS_DEMO_MODE:
            raw_answer, is_simulated = cls._generate_grounded_demo_answer(question, retrieved_chunks)
        else:
            try:
                raw_answer = await cls._call_llm_api(question, retrieved_chunks)
                is_simulated = False
            except Exception as e:
                print(f"[RAGGenerator] LLM API error: {e}. Falling back to grounded demo engine.")
                raw_answer, is_simulated = cls._generate_grounded_demo_answer(question, retrieved_chunks)
                raw_answer = f"> **Notice:** Live LLM call failed ({str(e)}). Fallen back to local deterministic synthesis.\n\n" + raw_answer

        generation_latency_ms = round((time.perf_counter() - generation_start) * 1000, 2)

        # --- 3. Citation Validation ---
        clean_answer, citations = CitationValidator.validate_and_extract(raw_answer, retrieved_chunks)

        return RAGResponse(
            answer=clean_answer,
            citations=citations,
            retrieval_latency_ms=retrieval_latency_ms,
            generation_latency_ms=generation_latency_ms,
            is_simulated=is_simulated
        )

    @classmethod
    async def _call_llm_api(cls, question: str, retrieved_chunks: List[RetrievedChunk]) -> str:
        context_str = ContextBuilder.build_context(retrieved_chunks)
        user_prompt = (
            f"Here are the retrieved passages from the user's workspace documents:\n\n"
            f"{context_str}\n\n"
            f"User Question: {question}\n\n"
            f"Please formulate an evidence-based answer supported by citations:"
        )

        url = (settings.OPENAI_BASE_URL.rstrip('/') + "/chat/completions") if settings.OPENAI_BASE_URL else "https://api.openai.com/v1/chat/completions"
        headers = {
            "Authorization": f"Bearer {settings.OPENAI_API_KEY}",
            "Content-Type": "application/json"
        }
        payload = {
            "model": settings.LLM_MODEL,
            "messages": [
                {"role": "system", "content": cls.SYSTEM_PROMPT},
                {"role": "user", "content": user_prompt}
            ],
            "temperature": 0.1,
            "max_tokens": 1200
        }

        async with httpx.AsyncClient(timeout=45.0) as client:
            resp = await client.post(url, headers=headers, json=payload)
            resp.raise_for_status()
            data = resp.json()
            return data["choices"][0]["message"]["content"]

    @classmethod
    def _generate_grounded_demo_answer(
        cls,
        question: str,
        retrieved_chunks: List[RetrievedChunk]
    ) -> Tuple[str, bool]:
        """
        Deterministic, grounded response generator for Demo Mode.
        Synthesizes answers strictly from retrieved passage content without hallucination.
        """
        # If no documents or top similarity is too low (< 0.2)
        if not retrieved_chunks or retrieved_chunks[0].score < 0.2:
            msg = (
                f"### Insufficient Evidence\n\n"
                f"Based on the documents currently indexed in this workspace, there is **insufficient evidence** "
                f"to answer the question: *\"{question}\"*.\n\n"
                f"**Suggestions:**\n"
                f"- Upload documents containing relevant information in the **Document Library**.\n"
                f"- Check if your documents finished indexing (Status should be `Indexed`).\n"
                f"- Try rephrasing your question using terms found in the source documents."
            )
            return msg, True

        # Synthesize from top matching chunks
        top_chunk = retrieved_chunks[0]
        other_chunks = retrieved_chunks[1:3]

        answer_lines = [
            f"Based on the analysis of **{top_chunk.document_title}** (Page {top_chunk.page_number}), here are the key findings regarding your inquiry:\n"
        ]

        # Clean sentences from top_chunk
        raw_sentences = [s.strip() for s in re.split(r'(?<=[.!?])\s+', top_chunk.content) if len(s.strip()) > 15]
        # Clean up any fragmented leading words or markdown symbols
        sentences: List[str] = []
        for s in raw_sentences:
            cleaned_s = re.sub(r'^[#\-*>\s]+', '', s).strip()
            if cleaned_s and len(cleaned_s) > 15:
                # If first character is lowercase, capitalize it
                if cleaned_s[0].islower():
                    cleaned_s = cleaned_s[0].upper() + cleaned_s[1:]
                sentences.append(cleaned_s)
        if sentences:
            lead = sentences[0]
            answer_lines.append(f"> \"{lead}\" [Citation: {top_chunk.chunk_id}]\n")
            if len(sentences) > 1:
                answer_lines.append(f"**Supporting Details:**\n")
                for s in sentences[1:4]:
                    answer_lines.append(f"- {s}")
                answer_lines.append("")

        # Add cross-references from supporting chunks if available
        if other_chunks:
            answer_lines.append("#### Additional Context from Workspace Documents:\n")
            for oc in other_chunks:
                sec_sentences = [s.strip() for s in re.split(r'(?<=[.!?])\s+', oc.content) if len(s.strip()) > 20]
                summary = sec_sentences[0] if sec_sentences else oc.content[:150]
                answer_lines.append(f"- **{oc.document_title}** (Page {oc.page_number}): {summary} [Citation: {oc.chunk_id}]")

        answer_lines.append("\n---\n*Generated in Demo Mode using grounded deterministic extraction. Configure `OPENAI_API_KEY` for live generative model inference.*")

        return "\n".join(answer_lines), True
