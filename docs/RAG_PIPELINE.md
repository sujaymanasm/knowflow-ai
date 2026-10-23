# KnowFlow AI — Detailed RAG Pipeline Specification

## 1. Document Ingestion & Extraction
- **Format Support:** Supports PDF (`pypdf`), Plain Text (`.txt`), and Markdown (`.md`).
- **Page Metadata Preservation:** Documents are parsed page by page. Each extracted segment retains its 1-indexed `page_number` and character length.
- **Scanned Document Detection:** For pure raster image PDFs containing no extracted characters, the system flags the document with an explicit warning indicating that OCR is required.

## 2. Text Chunking
- **Recursive Sliding Window:** Splitting occurs along natural paragraph and sentence delimiters.
- **Configurable Parameters:**
  - `CHUNK_SIZE`: 500 characters (~125 tokens)
  - `CHUNK_OVERLAP`: 100 characters (~25 tokens)
- **Why Chunk Overlap Matters:**
  Without overlap, clauses spanning chunk boundaries (e.g., "The critical failure occurred because..." at the tail of chunk N, "...the safety valve was stuck" at the head of chunk N+1) lose syntactic coherence. Overlap guarantees that cross-clause semantics are maintained in at least one vector representation.

## 3. Vector Embeddings
- **Dimension:** 384 dimensions (matching `all-MiniLM-L6-v2` standard).
- **Engine Options:**
  1. *Local Deterministic Embedder:* Generates normalized feature vectors using subword n-grams, token weighting, and L2 normalization. Instant execution (<2ms), zero GPU requirement, 100% offline reliability.
  2. *OpenAI Provider:* Compatible with `text-embedding-3-small` via API key.
- **Normalization:** Vectors are unit-normalized such that the Euclidean dot product is equivalent to cosine similarity:
  \[
  \text{Similarity}(\vec{u}, \vec{v}) = \vec{u} \cdot \vec{v} \in [-1.0, 1.0]
  \]

## 4. Hybrid Retrieval & Reciprocal Rank Fusion (RRF)
- **Dense Vector Search:** High-recall conceptual matching.
- **Lexical Keyword Search:** High-precision token/symbol matching.
- **RRF Merge:**
  \[
  RRF(d) = \sum_{m \in \{\text{dense}, \text{sparse}\}} \frac{1}{60 + \text{rank}_m(d)}
  \]

## 5. Grounded Generation & Citation Verification
- When an answer is synthesized, the Citation Validator checks every referenced chunk ID against the retrieved passages.
- Any fabricated citation ID is removed.
- If no retrieved chunk matches the query with a similarity score \(\ge 0.2\), the engine honestly reports insufficient evidence rather than guessing.
