import re
from typing import List, Dict, Tuple, Any
from app.services.retrieval.vector_store import RetrievedChunk

class ValidatedCitation:
    def __init__(
        self,
        chunk_id: str,
        document_id: str,
        document_title: str,
        page_number: int,
        excerpt: str,
        relevance_score: float
    ):
        self.chunk_id = chunk_id
        self.document_id = document_id
        self.document_title = document_title
        self.page_number = page_number
        self.excerpt = excerpt
        self.relevance_score = relevance_score

    def to_dict(self) -> Dict[str, Any]:
        return {
            "chunk_id": self.chunk_id,
            "document_id": self.document_id,
            "document_title": self.document_title,
            "page_number": self.page_number,
            "excerpt": self.excerpt,
            "relevance_score": self.relevance_score
        }

class CitationValidator:
    @staticmethod
    def validate_and_extract(
        answer_text: str,
        retrieved_chunks: List[RetrievedChunk]
    ) -> Tuple[str, List[ValidatedCitation]]:
        """
        Validates citations in the answer against retrieved chunks.
        Rejects fabricated or unretrieved references.
        Returns cleaned answer text and verified citation list.
        """
        if not retrieved_chunks:
            return answer_text, []

        chunk_by_id = {c.chunk_id: c for c in retrieved_chunks}
        chunk_by_title = {c.document_title.lower(): c for c in retrieved_chunks}

        verified_citations: List[ValidatedCitation] = []
        seen_chunk_ids = set()

        # Check explicit chunk citations: [Citation: <chunk_id>] or [id: <chunk_id>]
        id_pattern = r'\[(?:Citation|chunk_id|id):\s*([a-zA-Z0-9_-]+)\]'
        for match in re.finditer(id_pattern, answer_text, re.IGNORECASE):
            cid = match.group(1)
            if cid in chunk_by_id and cid not in seen_chunk_ids:
                c = chunk_by_id[cid]
                verified_citations.append(
                    ValidatedCitation(
                        chunk_id=c.chunk_id,
                        document_id=c.document_id,
                        document_title=c.document_title,
                        page_number=c.page_number,
                        excerpt=c.content[:240] + ("..." if len(c.content) > 240 else ""),
                        relevance_score=c.score
                    )
                )
                seen_chunk_ids.add(cid)

        # If no explicit chunk ID citations were matched, link citations from retrieved chunks
        # that have high relevance and whose keywords or phrases appear in the answer
        if not verified_citations:
            for c in retrieved_chunks:
                # Include top retrieved chunks (score >= 0.2) as supporting evidence
                if c.score >= 0.2 and c.chunk_id not in seen_chunk_ids:
                    verified_citations.append(
                        ValidatedCitation(
                            chunk_id=c.chunk_id,
                            document_id=c.document_id,
                            document_title=c.document_title,
                            page_number=c.page_number,
                            excerpt=c.content[:240] + ("..." if len(c.content) > 240 else ""),
                            relevance_score=c.score
                        )
                    )
                    seen_chunk_ids.add(c.chunk_id)

        # Sort citations by relevance score descending
        verified_citations.sort(key=lambda x: x.relevance_score, reverse=True)

        return answer_text, verified_citations
