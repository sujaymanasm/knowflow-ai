# KnowFlow AI — Document Intelligence & Grounded RAG Assistant

[![React](https://img.shields.io/badge/Frontend-React%2018%20%2B%20Vite%20%2B%20TypeScript-blue)](https://react.dev/)
[![FastAPI](https://img.shields.io/badge/Backend-FastAPI%20%2B%20Python%203.12-teal)](https://fastapi.tiangolo.com/)
[![Tailwind CSS](https://img.shields.io/badge/Styling-Tailwind%20CSS-38bdf8)](https://tailwindcss.com/)
[![RAG Pipeline](https://img.shields.io/badge/Architecture-Hybrid%20RAG%20%2B%20RRF-indigo)](docs/RAG_PIPELINE.md)
[![Tests](https://img.shields.io/badge/Tests-Pytest%20Passing-emerald)](backend/tests/)

KnowFlow AI is a high-performance, evidence-based Document Intelligence and Retrieval-Augmented Generation (RAG) web application. It enables users to upload technical documents, PDFs, and Markdown files, ask complex questions, and receive grounded answers supported by verifiable, page-level source citations.

---

## Key Features

- **Document Ingestion & Page Tracking:** Extracts text from PDFs and plain text files with exact page boundary preservation and empty-document detection.
- **Recursive Sliding-Window Chunking:** Splits text with 100-character overlap to preserve semantic continuity across clauses.
- **Dual Vector Embedding Engine:** Built-in 384-dimensional dense semantic embedder with optional OpenAI `text-embedding-3-small` support.
- **Hybrid Retrieval & Reciprocal Rank Fusion (RRF):** Combines dense vector cosine similarity with sparse BM25 keyword matching for optimal recall and precision.
- **Anti-Prompt-Injection Defenses:** Isolates retrieved passages in bounded `<retrieved_documents>` delimiters, commanding the LLM to treat inputs strictly as untrusted data.
- **Citation Auditing Engine:** Cross-references generated citations against retrieved chunk IDs, stripping hallucinated references.
- **ChatGPT-Style Workspace:** Split-screen UI with conversation management, citation inspector panel, and user feedback collection.
- **Automated RAG Evaluation Suite:** Measures Recall@k, Mean Reciprocal Rank (MRR), Faithfulness, and retrieval latency.
- **Honest Demo Mode:** Runs out-of-the-box without external API keys or credentials using grounded deterministic synthesis.

---

## Project Structure

```text
knowflow-ai/
├── backend/
│   ├── app/
│   │   ├── api/v1/endpoints/   # Health, Workspaces, Documents, Chat, Search, Evaluations
│   │   ├── core/               # Settings, Async Database Engine
│   │   ├── models/             # SQLAlchemy 2.0 Async Models
│   │   ├── schemas/            # Pydantic v2 Request/Response Models
│   │   ├── services/
│   │   │   ├── ingestion/      # Extractor & Sliding-Window Chunker
│   │   │   ├── embeddings/     # 384-dim Dense Semantic Vector Engine
│   │   │   ├── retrieval/      # Vector Store & Hybrid Search (RRF)
│   │   │   ├── rag/            # Context Builder, Generator & Citation Validator
│   │   │   └── evaluation/     # Benchmarking Suite (Recall@k, MRR)
│   │   └── main.py             # FastAPI App & Lifespan Seeder
│   ├── tests/                  # Pytest Automated Test Suite
│   ├── requirements.txt
│   └── Dockerfile
├── frontend/
│   ├── src/
│   │   ├── components/         # Navbar, Layout, Modals
│   │   ├── context/            # Global Workspace Context
│   │   ├── lib/                # Typed API Client, Utilities
│   │   ├── pages/              # Landing, Dashboard, Documents, Chat, Viewer, Search, Eval
│   │   ├── types/              # TypeScript API Interfaces
│   │   ├── App.tsx             # React Router v6 Configuration
│   │   └── main.tsx
│   ├── package.json
│   ├── tailwind.config.js
│   ├── vite.config.ts
│   └── Dockerfile
├── sample_data/                # Sample Markdown & Text Technical Documents
├── docs/                       # Architecture, RAG Pipeline, API Reference, Interview Prep
├── docker-compose.yml
├── .env.example
└── README.md
```

---

## Quick Start Guide

### Prerequisites
- Python 3.12+
- Node.js 18+ and npm

### 1. Start Backend API
```bash
cd backend
python -m venv venv
.\venv\Scripts\activate       # On Windows (or source venv/bin/activate on Linux/macOS)
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```
*Backend Swagger documentation will be available at `http://localhost:8000/docs`.*

### 2. Start Frontend Application
In a separate terminal:
```bash
cd frontend
npm install
npm run dev
```
*Frontend application will be accessible at `http://localhost:5173`.*

---

## Configuration & Environment Variables

Copy `.env.example` to `backend/.env`:
```ini
PROJECT_NAME="KnowFlow AI"
DATABASE_URL="sqlite+aiosqlite:///./knowflow.db"

# Embedding Configuration
EMBEDDING_PROVIDER="local"     # 'local' (zero API keys needed) or 'openai'
EMBEDDING_MODEL="local-dense-384"

# Optional LLM Key
# Leave blank to run in Demo Mode with local grounded deterministic synthesis
OPENAI_API_KEY=""
LLM_MODEL="gpt-4o-mini"
```

---

## Running Automated Tests

Run backend tests using pytest:
```bash
cd backend
.\venv\Scripts\pytest -v
```

**Test Results:**
- `test_health_check`: PASSED
- `test_workspace_crud_and_dashboard`: PASSED
- `test_text_extraction_and_chunking`: PASSED
- `test_semantic_embedding_cosine_similarity`: PASSED
- `test_context_construction_and_anti_injection`: PASSED
- `test_citation_validation`: PASSED

---

## Documentation Links

- [System Architecture & Mermaid Diagrams](docs/ARCHITECTURE.md)
- [Detailed RAG Pipeline Specification](docs/RAG_PIPELINE.md)
- [API Reference](docs/API_REFERENCE.md)
- [Design Decisions & Trade-Offs](docs/DESIGN_DECISIONS.md)
- [Evaluation Methodology & Results](docs/EVALUATION.md)
- [Technical Interview Prep Guide](docs/INTERVIEW_PREP.md)
- [5-Minute Demonstration Script](docs/DEMO_SCRIPT.md)
- [Known Limitations & Roadmap](docs/KNOWN_LIMITATIONS.md)
