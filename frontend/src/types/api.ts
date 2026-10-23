export interface Workspace {
  id: string;
  name: string;
  description: string | null;
  document_count: number;
  conversation_count: number;
  created_at: string;
  updated_at: string;
}

export interface Document {
  id: string;
  workspace_id: string;
  title: string;
  original_filename: string;
  file_type: string;
  file_size_bytes: number;
  page_count: number;
  status: 'Uploaded' | 'Processing' | 'Indexed' | 'Failed';
  error_message: string | null;
  chunk_count: number;
  created_at: string;
  updated_at: string;
}

export interface DocumentChunk {
  id: string;
  document_id: string;
  chunk_index: number;
  content: string;
  page_number: number;
  token_count: number;
}

export interface Citation {
  id: string;
  chunk_id: string;
  document_id: string;
  document_title: string;
  page_number: number;
  excerpt: string;
  relevance_score: number;
}

export interface UserFeedback {
  id: string;
  message_id: string;
  rating: 'helpful' | 'unhelpful';
  feedback_text: string | null;
  created_at: string;
}

export interface Message {
  id: string;
  conversation_id: string;
  role: 'user' | 'assistant';
  content: string;
  retrieval_latency_ms: number | null;
  generation_latency_ms: number | null;
  is_simulated: boolean;
  citations: Citation[];
  feedback: UserFeedback | null;
  created_at: string;
}

export interface Conversation {
  id: string;
  workspace_id: string;
  title: string;
  created_at: string;
  updated_at: string;
  message_count: number;
  last_message_preview: string | null;
}

export interface ConversationDetail extends Conversation {
  messages: Message[];
}

export interface SearchResultItem {
  chunk_id: string;
  document_id: string;
  document_title: string;
  page_number: number;
  content: string;
  score: number;
  search_method: string;
}

export interface SearchResponse {
  query: string;
  search_type: 'semantic' | 'keyword' | 'hybrid';
  retrieval_latency_ms: number;
  total_results: number;
  results: SearchResultItem[];
}

export interface EvaluationExample {
  id: string;
  question: string;
  expected_doc_title: string;
  retrieved_doc_title: string | null;
  hit_at_k: boolean;
  reciprocal_rank: number;
  generated_answer: string | null;
  citation_verified: boolean;
  notes: string | null;
}

export interface EvaluationRun {
  id: string;
  workspace_id: string;
  name: string;
  total_examples: number;
  recall_at_k: number;
  mrr: number;
  avg_latency_ms: number;
  faithfulness_score: number;
  status: string;
  created_at: string;
  examples: EvaluationExample[];
}

export interface IngestionJob {
  id: string;
  document_id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  error_message: string | null;
  started_at: string;
  completed_at: string | null;
}

export interface DashboardStats {
  total_documents: number;
  indexed_documents: number;
  total_workspaces: number;
  total_conversations: number;
  failed_jobs_count: number;
  is_demo_mode: boolean;
  embedding_model: string;
  llm_model: string;
  recent_documents: Document[];
  recent_conversations: Conversation[];
  recent_jobs: IngestionJob[];
}

export interface HealthStatus {
  status: 'healthy' | 'degraded';
  service: string;
  version: string;
  is_demo_mode: boolean;
  database: string;
  embedding_provider: string;
  embedding_model: string;
  llm_model: string;
}
