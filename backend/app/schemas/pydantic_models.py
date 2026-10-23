from datetime import datetime
from typing import List, Optional, Literal
from pydantic import BaseModel, Field

# --- Workspace Schemas ---
class WorkspaceBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=128)
    description: Optional[str] = None

class WorkspaceCreate(WorkspaceBase):
    pass

class WorkspaceUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=128)
    description: Optional[str] = None

class WorkspaceResponse(WorkspaceBase):
    id: str
    document_count: int = 0
    conversation_count: int = 0
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}

# --- Document Schemas ---
class DocumentResponse(BaseModel):
    id: str
    workspace_id: str
    title: str
    original_filename: str
    file_type: str
    file_size_bytes: int
    page_count: int
    status: str
    error_message: Optional[str] = None
    chunk_count: int = 0
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}

class DocumentChunkResponse(BaseModel):
    id: str
    document_id: str
    chunk_index: int
    content: str
    page_number: int
    token_count: int

    model_config = {"from_attributes": True}

# --- Citation Schemas ---
class CitationResponse(BaseModel):
    id: str
    chunk_id: str
    document_id: str
    document_title: str
    page_number: int
    excerpt: str
    relevance_score: float

    model_config = {"from_attributes": True}

# --- Feedback Schemas ---
class FeedbackCreate(BaseModel):
    rating: Literal["helpful", "unhelpful"]
    feedback_text: Optional[str] = None

class FeedbackResponse(BaseModel):
    id: str
    message_id: str
    rating: str
    feedback_text: Optional[str] = None
    created_at: datetime

    model_config = {"from_attributes": True}

# --- Message & Conversation Schemas ---
class MessageResponse(BaseModel):
    id: str
    conversation_id: str
    role: str
    content: str
    retrieval_latency_ms: Optional[float] = None
    generation_latency_ms: Optional[float] = None
    is_simulated: bool = False
    citations: List[CitationResponse] = []
    feedback: Optional[FeedbackResponse] = None
    created_at: datetime

    model_config = {"from_attributes": True}

class ConversationCreate(BaseModel):
    workspace_id: str
    title: Optional[str] = "New Conversation"

class ConversationUpdate(BaseModel):
    title: str = Field(..., min_length=1, max_length=255)

class ConversationResponse(BaseModel):
    id: str
    workspace_id: str
    title: str
    created_at: datetime
    updated_at: datetime
    message_count: int = 0
    last_message_preview: Optional[str] = None

    model_config = {"from_attributes": True}

class ConversationDetailResponse(ConversationResponse):
    messages: List[MessageResponse] = []

class AskQuestionRequest(BaseModel):
    question: str = Field(..., min_length=1, max_length=4000)
    workspace_id: str
    document_id: Optional[str] = None  # Optional filter to specific document
    top_k: Optional[int] = Field(default=4, ge=1, le=10)

# --- Search Schemas ---
class SearchRequest(BaseModel):
    query: str = Field(..., min_length=1, max_length=1000)
    workspace_id: str
    document_id: Optional[str] = None
    search_type: Literal["semantic", "keyword", "hybrid"] = "hybrid"
    top_k: int = Field(default=5, ge=1, le=20)

class SearchResultItem(BaseModel):
    chunk_id: str
    document_id: str
    document_title: str
    page_number: int
    content: str
    score: float
    search_method: str

class SearchResponse(BaseModel):
    query: str
    search_type: str
    retrieval_latency_ms: float
    total_results: int
    results: List[SearchResultItem]

# --- Evaluation Schemas ---
class EvaluationRunRequest(BaseModel):
    workspace_id: str
    name: Optional[str] = "RAG Benchmark Suite"

class EvaluationExampleResponse(BaseModel):
    id: str
    question: str
    expected_doc_title: str
    retrieved_doc_title: Optional[str]
    hit_at_k: bool
    reciprocal_rank: float
    generated_answer: Optional[str]
    citation_verified: bool
    notes: Optional[str]

    model_config = {"from_attributes": True}

class EvaluationRunResponse(BaseModel):
    id: str
    workspace_id: str
    name: str
    total_examples: int
    recall_at_k: float
    mrr: float
    avg_latency_ms: float
    faithfulness_score: float
    status: str
    created_at: datetime
    examples: List[EvaluationExampleResponse] = []

    model_config = {"from_attributes": True}

# --- Dashboard & System Schemas ---
class IngestionJobResponse(BaseModel):
    id: str
    document_id: str
    status: str
    error_message: Optional[str]
    started_at: datetime
    completed_at: Optional[datetime]

    model_config = {"from_attributes": True}

class DashboardStatsResponse(BaseModel):
    total_documents: int
    indexed_documents: int
    total_workspaces: int
    total_conversations: int
    failed_jobs_count: int
    is_demo_mode: bool
    embedding_model: str
    llm_model: str
    recent_documents: List[DocumentResponse]
    recent_conversations: List[ConversationResponse]
    recent_jobs: List[IngestionJobResponse]
