# KnowFlow AI — API Reference Documentation

All endpoints are versioned under `/api/v1`. Interactive OpenAPI Swagger documentation is available at `http://localhost:8000/docs`.

---

### 1. System & Health
#### `GET /api/v1/health`
Returns system health, version, demo mode status, and active models.
```json
{
  "status": "healthy",
  "service": "KnowFlow AI",
  "version": "1.0.0",
  "is_demo_mode": true,
  "database": "connected",
  "embedding_provider": "local",
  "embedding_model": "local-dense-384",
  "llm_model": "gpt-4o-mini"
}
```

#### `GET /api/v1/dashboard/stats?workspace_id={id}`
Returns aggregated document, conversation, job, and system metrics.

---

### 2. Workspaces
#### `POST /api/v1/workspaces`
Create a new tenant workspace.
```json
{
  "name": "Machine Learning Research",
  "description": "Technical papers on transformers and diffusion models"
}
```

#### `GET /api/v1/workspaces`
List all workspaces with document and conversation tallies.

#### `DELETE /api/v1/workspaces/{id}`
Deletes workspace and cascades all documents, chunks, and conversations.

---

### 3. Documents
#### `POST /api/v1/documents/upload`
Multipart upload supporting PDF, TXT, and Markdown up to 25MB.
- `file`: Binary file
- `workspace_id`: Target workspace UUID
- `title`: Optional custom document title

#### `GET /api/v1/documents?workspace_id={id}&status={status}&search={query}`
List documents with filtering.

#### `GET /api/v1/documents/{id}/chunks`
Returns extracted vector chunks, page numbers, token counts, and offsets.

#### `POST /api/v1/documents/{id}/reindex`
Re-extracts, re-chunks, and re-embeds the document.

#### `DELETE /api/v1/documents/{id}`
Deletes document, chunks, vectors, and physical file.

---

### 4. Conversations & Grounded Chat
#### `POST /api/v1/conversations`
Creates a chat conversation.

#### `POST /api/v1/conversations/{id}/messages`
Ask a question grounded in the workspace's documents.
```json
{
  "question": "What is the role of chunk overlap?",
  "workspace_id": "ws-12345",
  "document_id": null,
  "top_k": 4
}
```

#### `POST /api/v1/messages/{id}/feedback`
Submit user feedback on answer quality.
```json
{
  "rating": "helpful",
  "feedback_text": "Citations accurately matched page 2."
}
```

---

### 5. Multi-Mode Search
#### `POST /api/v1/search`
```json
{
  "workspace_id": "ws-12345",
  "query": "vector embedding cosine similarity",
  "search_type": "hybrid",
  "top_k": 5
}
```

---

### 6. Automated Evaluation
#### `POST /api/v1/evaluations/run`
Triggers automated RAG benchmark testing Recall@k, MRR, latency, and faithfulness.
