# Retrieval-Augmented Generation (RAG) Architecture Overview

## 1. Introduction
Retrieval-Augmented Generation (RAG) is an architectural framework that enhances the reasoning and output fidelity of Large Language Models (LLMs) by augmenting prompt contexts with dynamic, authoritative knowledge retrieved from external vector databases and document stores.

## 2. Ingestion and Document Chunking
Raw unstructured knowledge (PDFs, Markdown, and plain text) undergoes normalization, semantic page tracking, and sliding-window recursive chunking. Typical window parameters employ 400-500 characters with 80-100 character overlaps. This overlap prevents fragmented clauses from severing compound statements at arbitrary partition borders.

## 3. Dense Vector Embeddings
Chunks are mapped into continuous vector spaces using models such as all-MiniLM-L6-v2 or text-embedding-3-small (384 to 1536 dimensions). Vector similarity is evaluated using Cosine Distance:
\[
\text{Cosine Similarity} = \frac{\mathbf{A} \cdot \mathbf{B}}{\|\mathbf{A}\|_2 \|\mathbf{B}\|_2}
\]

## 4. Hybrid Search and Reciprocal Rank Fusion
To balance high-level semantic retrieval with strict keyword matching, hybrid search combines dense vector cosine scoring with sparse BM25 term-frequency ranking using Reciprocal Rank Fusion:
\[
RRF\_Score(d) = \sum_{m \in M} \frac{1}{k + r_m(d)}
\]
where \(k = 60\) acts as a smoothing parameter to prevent any single retrieval method from completely dominating the ranking distribution.

## 5. Citation Auditing and Grounding
A post-processing verification engine cross-references generated claims against chunk IDs in the retrieved context block. Hallucinated references to uncited or absent document chunks are systematically pruned before presentation to the client.
