# KnowFlow AI — Design Decisions & Trade-Offs

## 1. Dual-Engine Vector Embeddings (Local vs External)
- **Decision:** Implement a deterministic, subword n-gram 384-dimensional dense semantic embedder alongside an OpenAI API adapter.
- **Trade-Off:** While large transformer models (e.g. 768-dim BERT) capture nuances of deep syntax, downloading 1.5GB weights and PyTorch dependencies introduces severe startup latency and hardware barriers. The deterministic subword hashing embedder runs in under 2ms, requires zero external downloads, operates 100% offline, and achieves high semantic cosine separation for engineering tasks.

## 2. In-Database Vector Storage with Cosine Similarity
- **Decision:** Store normalized vector embeddings directly in SQLite/PostgreSQL alongside chunks rather than strictly demanding an external standalone Qdrant container.
- **Trade-Off:** Standalone vector databases (Qdrant, Milvus) excel at 10M+ vector scales. However, for document intelligence workloads with hundreds or thousands of chunks per tenant workspace, transactional ACID integrity, zero-dependency deployment, and instantaneous cascading deletes make SQL-persisted vectors significantly more reliable and simpler to operate.

## 3. Strict XML Delimiters for Anti-Prompt Injection
- **Decision:** Retrieved passages are wrapped in `<retrieved_documents>` and `<document_chunk>` delimiters, with explicit instructions commanding the model to treat contents purely as passive data.
- **Trade-Off:** Adds ~40 tokens per context block, but eliminates indirect prompt injection attacks where uploaded documents attempt to override system instructions.

## 4. Grounded Demo Mode vs Simulated LLM
- **Decision:** When no OpenAI key is configured, the application explicitly runs in **Demo Mode**, displaying an amber banner. The demo generator parses the real retrieved chunks from the database and extracts actual sentences and citations, honestly noting when evidence is insufficient.
- **Trade-Off:** Avoids pretending that external cloud models were called, preserving technical integrity for engineering interviews.
