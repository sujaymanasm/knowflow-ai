from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from app.core.config import settings
from app.core.database import init_db, AsyncSessionLocal
from app.api.v1.router import api_router
from app.models.entities import Workspace, Document, DocumentChunk, IngestionJob
from app.services.ingestion.extractor import DocumentExtractor
from app.services.ingestion.chunker import TextChunker
from app.services.embeddings.embedder import EmbeddingService
from sqlalchemy import select
import os

async def seed_initial_knowledge_base():
    """
    Seeds a default workspace and starter technical whitepaper if database is empty.
    Allows users to immediately test search, RAG chat, and citations without needing
    to find sample PDFs first!
    """
    async with AsyncSessionLocal() as session:
        # Check if workspaces exist
        result = await session.execute(select(Workspace).limit(1))
        existing_ws = result.scalar_one_or_none()
        if existing_ws:
            return  # Already seeded

        # Create Default Workspace
        ws = Workspace(
            name="AI Architecture & Engineering",
            description="Engineering research papers, system design briefs, and RAG architecture documentation."
        )
        session.add(ws)
        await session.flush()

        # Create starter document
        sample_title = "RAG System Architecture & Evaluation Guide.md"
        sample_path = os.path.join(settings.UPLOAD_DIR, "rag_guide_sample.md")
        sample_content = (
            "# KnowFlow AI: Retrieval-Augmented Generation (RAG) Architecture\n\n"
            "## 1. Executive Summary\n"
            "Retrieval-Augmented Generation (RAG) combines dense vector retrieval with large language models "
            "to ground AI responses in authoritative enterprise knowledge bases. This architecture mitigates "
            "hallucinations, enforces factual boundaries, and provides verifiable source citations.\n\n"
            "## 2. Ingestion Pipeline & Text Chunking\n"
            "During ingestion, raw unstructured documents such as PDFs, technical specifications, and text files "
            "are parsed with structural page preservation. A recursive sliding window text chunker splits content "
            "into passages (default 500 characters with 100 character overlap). Chunk overlap is crucial because "
            "it prevents sentence fragmentation across boundaries and preserves semantic continuity.\n\n"
            "## 3. Dense Vector Embeddings and Vector Search\n"
            "Each chunk is encoded into a 384-dimensional dense semantic embedding. Dense embeddings capture "
            "conceptual semantic relationships rather than mere exact keyword matches. When a query is issued, "
            "the query embedding is computed, and cosine similarity is evaluated across chunks strictly isolated "
            "to the tenant's workspace.\n\n"
            "## 4. Hybrid Retrieval & Reciprocal Rank Fusion (RRF)\n"
            "While vector search excels at high-level semantic recall, keyword search (lexical term-frequency) "
            "excels at precise entity and token matching. KnowFlow AI provides Hybrid Search combining dense "
            "cosine similarity and lexical matching using Reciprocal Rank Fusion (RRF with k=60), maximizing both "
            "precision and recall.\n\n"
            "## 5. Citation Validation and Hallucination Prevention\n"
            "To guarantee grounding, generated responses are audited through a Citation Validation pipeline. "
            "Every cited reference is verified against the retrieved context passages, checking page numbers, "
            "character boundaries, and chunk relevance scores. Claims lacking supporting context are rejected.\n\n"
            "## 6. Performance and Evaluation Metrics\n"
            "RAG system quality is measured using Hit@k, Mean Reciprocal Rank (MRR), Faithfulness, and retrieval latency. "
            "Typical vector retrieval operates in 5-25ms, while full generation completes in under 800ms."
        )
        with open(sample_path, "w", encoding="utf-8") as f:
            f.write(sample_content)

        doc = Document(
            workspace_id=ws.id,
            title="RAG System Architecture & Evaluation Guide",
            original_filename="rag_guide_sample.md",
            file_type="md",
            file_size_bytes=len(sample_content.encode("utf-8")),
            page_count=2,
            storage_path=sample_path,
            status="Indexed"
        )
        session.add(doc)
        await session.flush()

        # Extract, chunk, embed, and store
        pages, _ = DocumentExtractor.extract_text(sample_path, "md")
        chunks = TextChunker.chunk_pages(pages, chunk_size=400, chunk_overlap=80)
        chunk_texts = [c.content for c in chunks]
        embeddings = await EmbeddingService.get_embeddings(chunk_texts)

        for item, emb in zip(chunks, embeddings):
            chunk_rec = DocumentChunk(
                document_id=doc.id,
                workspace_id=ws.id,
                chunk_index=item.chunk_index,
                content=item.content,
                page_number=item.page_number,
                char_offset_start=item.char_offset_start,
                char_offset_end=item.char_offset_end,
                token_count=item.token_count,
                embedding_json=EmbeddingService.serialize_vector(emb)
            )
            session.add(chunk_rec)

        job = IngestionJob(
            document_id=doc.id,
            status="completed"
        )
        session.add(job)
        await session.commit()
        print(f"[Seed] Successfully seeded default workspace '{ws.name}' and starter document.")

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Initialize tables and seed initial data
    await init_db()
    try:
        await seed_initial_knowledge_base()
    except Exception as e:
        print(f"[Seed Warning] Could not seed starter data: {e}")
    yield
    # Shutdown

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="Enterprise-grade Document Intelligence and RAG Assistant API with grounded citations.",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc"
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# API Router
app.include_router(api_router, prefix=settings.API_V1_STR)

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    return JSONResponse(
        status_code=500,
        content={"detail": f"Internal Server Error: {str(exc)}"}
    )
