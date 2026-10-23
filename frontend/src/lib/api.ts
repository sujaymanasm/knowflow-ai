import {
  Workspace,
  Document,
  DocumentChunk,
  Conversation,
  ConversationDetail,
  Message,
  SearchResponse,
  EvaluationRun,
  DashboardStats,
  HealthStatus,
  UserFeedback
} from '../types/api';

const API_BASE = (import.meta.env.VITE_API_BASE_URL as string)?.replace(/\/+$/, '') || '/api/v1';

async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    let errorDetail = 'API request failed';
    try {
      const data = await res.json();
      errorDetail = data.detail || errorDetail;
    } catch {
      errorDetail = `HTTP ${res.status}: ${res.statusText}`;
    }
    throw new Error(errorDetail);
  }
  if (res.status === 204) {
    return null as unknown as T;
  }
  return res.json() as Promise<T>;
}

export const api = {
  // Health
  getHealth: (): Promise<HealthStatus> =>
    fetch(`${API_BASE}/health`).then(res => handleResponse<HealthStatus>(res)),

  // Dashboard
  getDashboardStats: (workspaceId?: string): Promise<DashboardStats> => {
    const url = workspaceId
      ? `${API_BASE}/dashboard/stats?workspace_id=${workspaceId}`
      : `${API_BASE}/dashboard/stats`;
    return fetch(url).then(res => handleResponse<DashboardStats>(res));
  },

  // Workspaces
  listWorkspaces: (): Promise<Workspace[]> =>
    fetch(`${API_BASE}/workspaces`).then(res => handleResponse<Workspace[]>(res)),

  createWorkspace: (name: string, description?: string): Promise<Workspace> =>
    fetch(`${API_BASE}/workspaces`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, description }),
    }).then(res => handleResponse<Workspace>(res)),

  updateWorkspace: (id: string, name: string, description?: string): Promise<Workspace> =>
    fetch(`${API_BASE}/workspaces/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, description }),
    }).then(res => handleResponse<Workspace>(res)),

  deleteWorkspace: (id: string): Promise<void> =>
    fetch(`${API_BASE}/workspaces/${id}`, { method: 'DELETE' }).then(res => handleResponse<void>(res)),

  // Documents
  listDocuments: (workspaceId?: string, statusFilter?: string, search?: string): Promise<Document[]> => {
    const params = new URLSearchParams();
    if (workspaceId) params.append('workspace_id', workspaceId);
    if (statusFilter) params.append('status', statusFilter);
    if (search) params.append('search', search);
    return fetch(`${API_BASE}/documents?${params.toString()}`).then(res => handleResponse<Document[]>(res));
  },

  getDocument: (id: string): Promise<Document> =>
    fetch(`${API_BASE}/documents/${id}`).then(res => handleResponse<Document>(res)),

  getDocumentChunks: (id: string): Promise<DocumentChunk[]> =>
    fetch(`${API_BASE}/documents/${id}/chunks`).then(res => handleResponse<DocumentChunk[]>(res)),

  uploadDocument: (file: File, workspaceId: string, title?: string): Promise<Document> => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('workspace_id', workspaceId);
    if (title) formData.append('title', title);
    return fetch(`${API_BASE}/documents/upload`, {
      method: 'POST',
      body: formData,
    }).then(res => handleResponse<Document>(res));
  },

  reindexDocument: (id: string): Promise<Document> =>
    fetch(`${API_BASE}/documents/${id}/reindex`, { method: 'POST' }).then(res => handleResponse<Document>(res)),

  retryDocument: (id: string): Promise<Document> =>
    fetch(`${API_BASE}/documents/${id}/retry`, { method: 'POST' }).then(res => handleResponse<Document>(res)),

  deleteDocument: (id: string): Promise<void> =>
    fetch(`${API_BASE}/documents/${id}`, { method: 'DELETE' }).then(res => handleResponse<void>(res)),

  // Conversations
  listConversations: (workspaceId: string): Promise<Conversation[]> =>
    fetch(`${API_BASE}/conversations?workspace_id=${workspaceId}`).then(res => handleResponse<Conversation[]>(res)),

  getConversation: (id: string): Promise<ConversationDetail> =>
    fetch(`${API_BASE}/conversations/${id}`).then(res => handleResponse<ConversationDetail>(res)),

  createConversation: (workspaceId: string, title?: string): Promise<Conversation> =>
    fetch(`${API_BASE}/conversations`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ workspace_id: workspaceId, title }),
    }).then(res => handleResponse<Conversation>(res)),

  updateConversation: (id: string, title: string): Promise<Conversation> =>
    fetch(`${API_BASE}/conversations/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title }),
    }).then(res => handleResponse<Conversation>(res)),

  deleteConversation: (id: string): Promise<void> =>
    fetch(`${API_BASE}/conversations/${id}`, { method: 'DELETE' }).then(res => handleResponse<void>(res)),

  // Messages & RAG Query
  askQuestion: (
    conversationId: string,
    workspaceId: string,
    question: string,
    documentId?: string,
    topK: number = 4
  ): Promise<Message> =>
    fetch(`${API_BASE}/conversations/${conversationId}/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        question,
        workspace_id: workspaceId,
        document_id: documentId,
        top_k: topK,
      }),
    }).then(res => handleResponse<Message>(res)),

  submitFeedback: (messageId: string, rating: 'helpful' | 'unhelpful', feedbackText?: string): Promise<UserFeedback> =>
    fetch(`${API_BASE}/messages/${messageId}/feedback`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rating, feedback_text: feedbackText }),
    }).then(res => handleResponse<UserFeedback>(res)),

  // Search
  search: (
    workspaceId: string,
    query: string,
    searchType: 'semantic' | 'keyword' | 'hybrid' = 'hybrid',
    topK: number = 5,
    documentId?: string
  ): Promise<SearchResponse> =>
    fetch(`${API_BASE}/search`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        workspace_id: workspaceId,
        query,
        search_type: searchType,
        top_k: topK,
        document_id: documentId,
      }),
    }).then(res => handleResponse<SearchResponse>(res)),

  // Evaluations
  triggerEvaluation: (workspaceId: string, name?: string): Promise<EvaluationRun> =>
    fetch(`${API_BASE}/evaluations/run`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ workspace_id: workspaceId, name }),
    }).then(res => handleResponse<EvaluationRun>(res)),

  listEvaluations: (workspaceId: string): Promise<EvaluationRun[]> =>
    fetch(`${API_BASE}/evaluations?workspace_id=${workspaceId}`).then(res => handleResponse<EvaluationRun[]>(res)),

  getEvaluation: (id: string): Promise<EvaluationRun> =>
    fetch(`${API_BASE}/evaluations/${id}`).then(res => handleResponse<EvaluationRun>(res)),
};
