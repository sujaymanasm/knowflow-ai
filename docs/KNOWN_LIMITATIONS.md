# KnowFlow AI — Known Limitations & Future Roadmap

## Known Limitations

1. **OCR on Pure Image Scanned PDFs:**
   - Text extraction currently utilizes `pypdf` which extracts digital text streams. Scanned raster image PDFs without embedded OCR text are flagged with an informational message rather than running Tesseract or cloud OCR.
2. **Synchronous Ingestion for Large Files:**
   - Files are currently processed synchronously during upload. Very large PDF books (>100 pages) may take several seconds to chunk and embed. An asynchronous Celery/Redis worker queue is recommended for enterprise scale.
3. **Authentication & Multi-User RBAC:**
   - Multi-tenancy is partitioned by `workspace_id`. Full OAuth2 JWT user authentication and role-based access control (RBAC) are omitted to simplify local portfolio evaluation.
4. **Vector Scale Limits:**
   - In-database SQLite vector cosine computation operates with high efficiency up to ~100,000 chunks. For multi-million chunk scale, an external Qdrant or Milvus cluster should be provisioned.

---

## Top 3 High-Value Engineering Improvements

1. **Asynchronous Distributed Task Queue (Celery + Redis):**
   Decouple PDF parsing, OCR, and embedding generation into background worker pools with WebSocket progress streaming.
2. **Cross-Encoder Reranking Model:**
   Add a secondary cross-encoder reranker (e.g. `bge-reranker-base`) after initial top-20 hybrid retrieval to further boost MRR.
3. **Full RBAC & Document Permissions:**
   Implement JWT authentication with organization-level access controls and document-level visibility rules.
