import time
from typing import List, Dict, Any, Optional
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.entities import DocumentChunk, Document
from app.services.embeddings.embedder import EmbeddingService

class RetrievedChunk:
    def __init__(
        self,
        chunk_id: str,
        document_id: str,
        document_title: str,
        page_number: int,
        content: str,
        score: float,
        search_method: str = "semantic"
    ):
        self.chunk_id = chunk_id
        self.document_id = document_id
        self.document_title = document_title
        self.page_number = page_number
        self.content = content
        self.score = round(score, 4)
        self.search_method = search_method

    def to_dict(self) -> Dict[str, Any]:
        return {
            "chunk_id": self.chunk_id,
            "document_id": self.document_id,
            "document_title": self.document_title,
            "page_number": self.page_number,
            "content": self.content,
            "score": self.score,
            "search_method": self.search_method,
        }

class VectorStoreService:
    @staticmethod
    async def search(
        session: AsyncSession,
        workspace_id: str,
        query: str,
        top_k: int = 4,
        document_id: Optional[str] = None
    ) -> List[RetrievedChunk]:
        """
        Retrieves top-k most semantically relevant chunks for a workspace using vector similarity.
        Enforces strict workspace isolation.
        """
        # 1. Compute query vector
        query_vector = await EmbeddingService.get_embedding(query)

        # 2. Query candidate chunks from DB
        stmt = (
            select(DocumentChunk, Document.title)
            .join(Document, DocumentChunk.document_id == Document.id)
            .where(DocumentChunk.workspace_id == workspace_id)
            .where(Document.status == "Indexed")
        )
        if document_id:
            stmt = stmt.where(DocumentChunk.document_id == document_id)

        result = await session.execute(stmt)
        rows = result.all()

        scored_chunks: List[RetrievedChunk] = []

        for chunk, doc_title in rows:
            if not chunk.embedding_json:
                continue
            chunk_vector = EmbeddingService.deserialize_vector(chunk.embedding_json)
            if not chunk_vector:
                continue

            similarity = EmbeddingService.cosine_similarity(query_vector, chunk_vector)
            scored_chunks.append(
                RetrievedChunk(
                    chunk_id=chunk.id,
                    document_id=chunk.document_id,
                    document_title=doc_title,
                    page_number=chunk.page_number,
                    content=chunk.content,
                    score=similarity,
                    search_method="semantic"
                )
            )

        # 3. Sort descending by score and return top-k
        scored_chunks.sort(key=lambda x: x.score, reverse=True)
        return scored_chunks[:top_k]
