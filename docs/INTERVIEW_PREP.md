# KnowFlow AI — Technical Interview Preparation Guide

This guide provides deep-dive answers to technical questions you may encounter when presenting KnowFlow AI during senior software engineering and AI/ML interviews.

---

### Q1: "Why did you implement Chunk Overlap, and how did you decide on 500/100 characters?"
**Answer:**
"Without overlap, arbitrary sliding window splits can sever clauses in compound sentences (e.g., 'The system failed because...' in chunk N and '...the sensor malfunctioned' in chunk N+1). The 100-character overlap (~25 tokens) provides sufficient linguistic context to ensure that complete syntactic ideas remain intact in at least one chunk. We chose 500 characters because it matches single semantic concepts well within 384-dimensional embedding models while keeping context bounded."

---

### Q2: "What is Reciprocal Rank Fusion (RRF) and why combine dense and sparse search?"
**Answer:**
"Dense vector search excels at broad semantic recall, but struggles with specific numbers, UUIDs, or niche technical acronyms. BM25 sparse keyword search excels at token matching but fails with synonyms. RRF normalizes both ranks:
\[
RRF(d) = \sum \frac{1}{60 + \text{rank}(d)}
\]
The constant \(k=60\) prevents outlier high ranks from dominating, yielding a balanced hybrid score that maximizes both recall and precision."

---

### Q3: "How do you defend against Indirect Prompt Injection in uploaded documents?"
**Answer:**
"Retrieved chunks are untrusted external inputs. In KnowFlow AI, retrieved passages are wrapped in `<retrieved_documents>` XML containers, with sanitized tags. The system prompt instructs the LLM that content inside these tags is purely passive reference data and that any imperative commands inside them must be ignored."

---

### Q4: "How does the Citation Validation pipeline work?"
**Answer:**
"Before delivering answers to the user, the citation validator audits the answer text for citation markers. It verifies that every cited chunk ID belongs to the actual set of retrieved chunks for that query. If an LLM invents or hallucinates an unretrieved chunk, the validator rejects it, preserving answer grounding."

---

### Q5: "How did you design workspace tenant isolation?"
**Answer:**
"Tenant isolation is enforced at the database and query layer. Every document chunk has an indexed `workspace_id` foreign key. All vector similarity and keyword search SQL queries strictly enforce `WHERE workspace_id = :target_id`, guaranteeing zero vector cross-contamination between workspaces."
