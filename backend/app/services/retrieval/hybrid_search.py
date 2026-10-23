import time
import re
from typing import List, Optional, Dict, Any
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.entities import DocumentChunk, Document
from app.services.retrieval.vector_store import VectorStoreService, RetrievedChunk

class HybridSearchService:
    @staticmethod
    async def search(
        session: AsyncSession,
        workspace_id: str,
        query: str,
        search_type: str = "hybrid",
        top_k: int = 5,
        document_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Executes semantic, keyword, or hybrid search with measured retrieval latency.
        """
        start_time = time.perf_counter()

        if search_type == "semantic":
            results = await VectorStoreService.search(
                session=session,
                workspace_id=workspace_id,
                query=query,
                top_k=top_k,
                document_id=document_id
            )
            for r in results:
                r.search_method = "semantic"
        elif search_type == "keyword":
            results = await HybridSearchService._keyword_search(
                session=session,
                workspace_id=workspace_id,
                query=query,
                top_k=top_k,
                document_id=document_id
            )
        else:  # hybrid
            results = await HybridSearchService._hybrid_search(
                session=session,
                workspace_id=workspace_id,
                query=query,
                top_k=top_k,
                document_id=document_id
            )

        latency_ms = round((time.perf_counter() - start_time) * 1000, 2)

        return {
            "query": query,
            "search_type": search_type,
            "retrieval_latency_ms": latency_ms,
            "total_results": len(results),
            "results": [r.to_dict() for r in results]
        }

    @staticmethod
    async def _keyword_search(
        session: AsyncSession,
        workspace_id: str,
        query: str,
        top_k: int = 5,
        document_id: Optional[str] = None
    ) -> List[RetrievedChunk]:
        """
        Keyword-based retrieval using token overlap and frequency.
        """
        query_terms = set(re.findall(r'\b\w+\b', query.lower()))
        if not query_terms:
            return []

        stmt = (
            select(DocumentChunk, Document.title)
            .join(Document, DocumentChunk.document_id == Document.id)
            .where(DocumentChunk.workspace_id == workspace_id)
            .where(Document.status == "Indexed")
        )
        if document_id:
            stmt = stmt.where(DocumentChunk.document_id == document_id)

        rows = (await session.execute(stmt)).all()
        scored: List[RetrievedChunk] = []

        for chunk, doc_title in rows:
            chunk_tokens = re.findall(r'\b\w+\b', chunk.content.lower())
            if not chunk_tokens:
                continue

            # Term frequency scoring with length normalization
            match_count = sum(1 for t in chunk_tokens if t in query_terms)
            if match_count > 0:
                score = match_count / (len(chunk_tokens) ** 0.5 + 1.0)
                scored.append(
                    RetrievedChunk(
                        chunk_id=chunk.id,
                        document_id=chunk.document_id,
                        document_title=doc_title,
                        page_number=chunk.page_number,
                        content=chunk.content,
                        score=score,
                        search_method="keyword"
                    )
                )

        scored.sort(key=lambda x: x.score, reverse=True)
        return scored[:top_k]

    @staticmethod
    async def _hybrid_search(
        session: AsyncSession,
        workspace_id: str,
        query: str,
        top_k: int = 5,
        document_id: Optional[str] = None
    ) -> List[RetrievedChunk]:
        """
        Combines semantic and keyword searches using Reciprocal Rank Fusion (RRF).
        RRF Score = sum( 1 / (60 + rank) )
        """
        semantic_results = await VectorStoreService.search(
            session=session,
            workspace_id=workspace_id,
            query=query,
            top_k=top_k * 2,
            document_id=document_id
        )
        keyword_results = await HybridSearchService._keyword_search(
            session=session,
            workspace_id=workspace_id,
            query=query,
            top_k=top_k * 2,
            document_id=document_id
        )

        rrf_scores: Dict[str, float] = {}
        chunks_map: Dict[str, RetrievedChunk] = {}
        RRF_K = 60

        for rank, chunk in enumerate(semantic_results):
            rrf_scores[chunk.chunk_id] = rrf_scores.get(chunk.chunk_id, 0.0) + (1.0 / (RRF_K + rank + 1))
            chunks_map[chunk.chunk_id] = chunk

        for rank, chunk in enumerate(keyword_results):
            rrf_scores[chunk.chunk_id] = rrf_scores.get(chunk.chunk_id, 0.0) + (1.0 / (RRF_K + rank + 1))
            if chunk.chunk_id not in chunks_map:
                chunks_map[chunk.chunk_id] = chunk

        # Order by combined RRF score
        sorted_ids = sorted(rrf_scores.keys(), key=lambda cid: rrf_scores[cid], reverse=True)
        final_results: List[RetrievedChunk] = []

        for cid in sorted_ids[:top_k]:
            item = chunks_map[cid]
            item.score = round(rrf_scores[cid], 5)
            item.search_method = "hybrid (RRF)"
            final_results.append(item)

        return final_results
