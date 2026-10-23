import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
  MessageSquare,
  Plus,
  Trash2,
  Edit2,
  Check,
  X,
  Send,
  Sparkles,
  FileCheck2,
  ExternalLink,
  ThumbsUp,
  ThumbsDown,
  Copy,
  Info,
  ChevronRight,
  BookOpen,
  Loader2
} from 'lucide-react';
import { api } from '../lib/api';
import { useWorkspace } from '../context/WorkspaceContext';
import { Conversation, Message, Citation, Document } from '../types/api';

export const ChatPage: React.FC = () => {
  const { currentWorkspace, activeModelInfo } = useWorkspace();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const docFilterParam = searchParams.get('doc');

  // Conversations
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConvId, setActiveConvId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoadingConvs, setIsLoadingConvs] = useState(false);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);

  // Available Documents in Workspace for scoping
  const [workspaceDocs, setWorkspaceDocs] = useState<Document[]>([]);
  const [selectedDocId, setSelectedDocId] = useState<string | null>(docFilterParam || null);

  // Input & Query Execution
  const [questionText, setQuestionText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [copyFeedback, setCopyFeedback] = useState<string | null>(null);

  // Right Panel: Citation Inspector
  const [inspectedCitation, setInspectedCitation] = useState<Citation | null>(null);

  // Conversation Renaming
  const [editingConvId, setEditingConvId] = useState<string | null>(null);
  const [newConvTitle, setNewConvTitle] = useState('');

  // Feedback modal state
  const [feedbackMessageId, setFeedbackMessageId] = useState<string | null>(null);
  const [feedbackRating, setFeedbackRating] = useState<'helpful' | 'unhelpful'>('helpful');
  const [feedbackText, setFeedbackText] = useState('');

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isSubmitting]);

  // Load workspace docs
  useEffect(() => {
    if (!currentWorkspace) return;
    api.listDocuments(currentWorkspace.id, 'Indexed').then(setWorkspaceDocs).catch(() => {});
  }, [currentWorkspace?.id]);

  // Load conversations
  const loadConversations = async (autoSelectFirst = true) => {
    if (!currentWorkspace) return;
    setIsLoadingConvs(true);
    try {
      const convs = await api.listConversations(currentWorkspace.id);
      setConversations(convs);

      if (autoSelectFirst && convs.length > 0) {
        setActiveConvId(convs[0].id);
      } else if (convs.length === 0) {
        setActiveConvId(null);
        setMessages([]);
      }
    } catch (err) {
      console.error('Failed to load conversations:', err);
    } finally {
      setIsLoadingConvs(false);
    }
  };

  useEffect(() => {
    loadConversations(true);
  }, [currentWorkspace?.id]);

  // Load messages when activeConvId changes
  useEffect(() => {
    if (!activeConvId) {
      setMessages([]);
      return;
    }

    setIsLoadingMessages(true);
    api.getConversation(activeConvId)
      .then((detail) => {
        setMessages(detail.messages);
      })
      .catch((err) => {
        console.error('Failed to fetch conversation details:', err);
      })
      .finally(() => {
        setIsLoadingMessages(false);
      });
  }, [activeConvId]);

  // Handle New Conversation
  const handleCreateNewConv = async () => {
    if (!currentWorkspace) return;
    try {
      const newConv = await api.createConversation(currentWorkspace.id, "New Conversation");
      setConversations([newConv, ...conversations]);
      setActiveConvId(newConv.id);
      setMessages([]);
      setInspectedCitation(null);
    } catch (err: any) {
      alert(`Failed to create conversation: ${err.message}`);
    }
  };

  // Handle Rename Conversation
  const handleRenameConv = async (convId: string) => {
    if (!newConvTitle.trim()) return;
    try {
      const updated = await api.updateConversation(convId, newConvTitle.trim());
      setConversations(conversations.map(c => c.id === convId ? { ...c, title: updated.title } : c));
      setEditingConvId(null);
      setNewConvTitle('');
    } catch (err: any) {
      alert(`Rename failed: ${err.message}`);
    }
  };

  // Handle Delete Conversation
  const handleDeleteConv = async (convId: string) => {
    if (!confirm("Are you sure you want to delete this conversation?")) return;
    try {
      await api.deleteConversation(convId);
      const remaining = conversations.filter(c => c.id !== convId);
      setConversations(remaining);
      if (activeConvId === convId) {
        if (remaining.length > 0) {
          setActiveConvId(remaining[0].id);
        } else {
          setActiveConvId(null);
          setMessages([]);
        }
      }
    } catch (err: any) {
      alert(`Delete failed: ${err.message}`);
    }
  };

  // Handle Ask Question
  const handleSendMessage = async (customPrompt?: string) => {
    const textToSend = customPrompt || questionText;
    if (!textToSend.trim() || !currentWorkspace || isSubmitting) return;

    let targetConvId = activeConvId;

    // If no active conversation, create one first
    if (!targetConvId) {
      try {
        const newConv = await api.createConversation(currentWorkspace.id, textToSend.slice(0, 35));
        setConversations([newConv, ...conversations]);
        targetConvId = newConv.id;
        setActiveConvId(newConv.id);
      } catch (err: any) {
        alert(`Failed to create conversation: ${err.message}`);
        return;
      }
    }

    // Add optimistic user message
    const tempUserMsg: Message = {
      id: `temp-${Date.now()}`,
      conversation_id: targetConvId,
      role: 'user',
      content: textToSend.trim(),
      retrieval_latency_ms: null,
      generation_latency_ms: null,
      is_simulated: false,
      citations: [],
      feedback: null,
      created_at: new Date().toISOString(),
    };

    setMessages(prev => [...prev, tempUserMsg]);
    setQuestionText('');
    setIsSubmitting(true);

    try {
      const assistantMsg = await api.askQuestion(
        targetConvId,
        currentWorkspace.id,
        textToSend.trim(),
        selectedDocId || undefined,
        4
      );

      setMessages(prev => [...prev, assistantMsg]);

      // If assistant message has citations, auto-inspect top citation
      if (assistantMsg.citations && assistantMsg.citations.length > 0) {
        setInspectedCitation(assistantMsg.citations[0]);
      }

      // Refresh conversations list to update title and timestamps
      api.listConversations(currentWorkspace.id).then(setConversations);
    } catch (err: any) {
      // Add error message as assistant bubble
      const errorMsg: Message = {
        id: `err-${Date.now()}`,
        conversation_id: targetConvId,
        role: 'assistant',
        content: `**Error:** ${err.message || 'Failed to process question. Please verify your document indexing status.'}`,
        retrieval_latency_ms: null,
        generation_latency_ms: null,
        is_simulated: false,
        citations: [],
        feedback: null,
        created_at: new Date().toISOString(),
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCopy = (text: string, msgId: string) => {
    navigator.clipboard.writeText(text);
    setCopyFeedback(msgId);
    setTimeout(() => setCopyFeedback(null), 2000);
  };

  const handleSubmitFeedback = async () => {
    if (!feedbackMessageId) return;
    try {
      const fb = await api.submitFeedback(feedbackMessageId, feedbackRating, feedbackText);
      setMessages(messages.map(m => m.id === feedbackMessageId ? { ...m, feedback: fb } : m));
      setFeedbackMessageId(null);
      setFeedbackText('');
    } catch (err: any) {
      alert(`Feedback submission failed: ${err.message}`);
    }
  };

  // Starter Questions
  const starterQuestions = [
    "What is the core architecture and ingestion workflow of KnowFlow AI?",
    "How does chunk overlap prevent sentence fragmentation during vector retrieval?",
    "Explain the mechanics of Reciprocal Rank Fusion (RRF) in hybrid search.",
    "How does the citation validation pipeline prevent AI hallucination?"
  ];

  return (
    <div className="flex-1 flex overflow-hidden h-[calc(100vh-4rem)]">
      {/* 1. LEFT SIDEBAR: Conversations & Workspaces */}
      <div className="w-64 sm:w-72 border-r border-surface-border bg-surface/50 flex flex-col shrink-0">
        {/* New Chat Button */}
        <div className="p-3 border-b border-surface-border">
          <button
            onClick={handleCreateNewConv}
            className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-primary-600 hover:bg-primary-500 text-white text-xs font-medium transition-colors shadow-lg shadow-primary-600/20"
          >
            <Plus className="w-4 h-4" />
            <span>New Chat</span>
          </button>
        </div>

        {/* Conversation List */}
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          <div className="px-2 py-1 text-[10px] font-mono font-semibold uppercase text-slate-500 tracking-wider">
            Conversations
          </div>

          {isLoadingConvs ? (
            <div className="p-4 text-center text-xs text-slate-500">
              <Loader2 className="w-4 h-4 animate-spin mx-auto mb-1 text-primary-400" />
              Loading history...
            </div>
          ) : conversations.length === 0 ? (
            <div className="p-4 text-center text-xs text-slate-500">
              No conversations yet. Start a new chat!
            </div>
          ) : (
            conversations.map((c) => {
              const isActive = activeConvId === c.id;
              const isEditing = editingConvId === c.id;

              return (
                <div
                  key={c.id}
                  onClick={() => !isEditing && setActiveConvId(c.id)}
                  className={`group relative flex items-center justify-between p-2 rounded-xl text-xs cursor-pointer transition-all ${
                    isActive
                      ? 'bg-surface border border-primary-500/40 text-primary-300 shadow-sm'
                      : 'text-slate-400 hover:bg-surface-muted/50 hover:text-slate-200'
                  }`}
                >
                  <div className="flex items-center gap-2 truncate mr-1">
                    <MessageSquare className="w-3.5 h-3.5 shrink-0 text-slate-500 group-hover:text-primary-400" />
                    {isEditing ? (
                      <input
                        type="text"
                        autoFocus
                        value={newConvTitle}
                        onChange={(e) => setNewConvTitle(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleRenameConv(c.id);
                          if (e.key === 'Escape') setEditingConvId(null);
                        }}
                        className="bg-background border border-primary-500 rounded px-1.5 py-0.5 text-xs text-white focus:outline-none w-32"
                      />
                    ) : (
                      <span className="truncate">{c.title}</span>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    {isEditing ? (
                      <>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRenameConv(c.id);
                          }}
                          className="p-1 hover:text-emerald-400"
                        >
                          <Check className="w-3 h-3" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingConvId(null);
                          }}
                          className="p-1 hover:text-slate-400"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingConvId(c.id);
                            setNewConvTitle(c.title);
                          }}
                          className="p-1 hover:text-slate-200"
                          title="Rename"
                        >
                          <Edit2 className="w-3 h-3" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteConv(c.id);
                          }}
                          className="p-1 hover:text-rose-400"
                          title="Delete"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Scoped Document Filter */}
        <div className="p-3 border-t border-surface-border bg-background/50">
          <label className="block text-[10px] font-mono uppercase text-slate-400 mb-1.5">
            Scope Search To Document:
          </label>
          <select
            value={selectedDocId || ''}
            onChange={(e) => setSelectedDocId(e.target.value || null)}
            className="w-full bg-surface border border-surface-border rounded-lg text-xs text-slate-200 px-2.5 py-1.5 focus:outline-none focus:border-primary-500"
          >
            <option value="">All Workspace Documents ({workspaceDocs.length})</option>
            {workspaceDocs.map(d => (
              <option key={d.id} value={d.id}>
                {d.title}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* 2. CENTER: Chat History & Input */}
      <div className="flex-1 flex flex-col bg-background min-w-0">
        {/* Chat Header */}
        <div className="px-6 py-3 border-b border-surface-border bg-surface/30 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h2 className="text-sm font-semibold text-white truncate max-w-sm">
              {conversations.find(c => c.id === activeConvId)?.title || 'Knowledge Assistant'}
            </h2>
            {selectedDocId && (
              <span className="hidden sm:inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-primary-500/10 text-primary-400 border border-primary-500/20 font-mono">
                Scoped: {workspaceDocs.find(d => d.id === selectedDocId)?.title}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[11px] font-mono text-slate-500">
              Provider: {activeModelInfo.llm}
            </span>
          </div>
        </div>

        {/* Message Feed */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
          {isLoadingMessages ? (
            <div className="flex flex-col items-center justify-center h-full space-y-2">
              <Loader2 className="w-6 h-6 text-primary-400 animate-spin" />
              <p className="text-xs text-slate-400">Loading conversation messages...</p>
            </div>
          ) : messages.length === 0 ? (
            /* Empty State with Starter Prompts */
            <div className="max-w-2xl mx-auto py-12 text-center space-y-6">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-primary-600 to-accent-cyan flex items-center justify-center mx-auto shadow-lg shadow-primary-500/20">
                <Sparkles className="w-6 h-6 text-white" />
              </div>

              <div>
                <h3 className="text-lg font-bold text-white">Ask your workspace documents anything</h3>
                <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
                  KnowFlow AI retrieves relevant passages, cites exact document pages, and strictly answers based on verifiable evidence.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-left pt-2">
                {starterQuestions.map((sq, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSendMessage(sq)}
                    className="p-3.5 rounded-xl bg-surface border border-surface-border hover:border-primary-500/50 hover:bg-surface-muted/50 text-xs text-slate-300 transition-all group"
                  >
                    <p className="font-medium group-hover:text-primary-300 flex items-center justify-between">
                      <span>"{sq}"</span>
                      <ChevronRight className="w-3.5 h-3.5 text-slate-500 group-hover:text-primary-400 shrink-0" />
                    </p>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            /* Messages List */
            messages.map((msg) => {
              const isUser = msg.role === 'user';

              return (
                <div
                  key={msg.id}
                  className={`flex flex-col ${isUser ? 'items-end' : 'items-start'} max-w-3xl mx-auto w-full`}
                >
                  <div
                    className={`rounded-2xl px-5 py-4 max-w-2xl text-xs leading-relaxed space-y-3 ${
                      isUser
                        ? 'bg-primary-600 text-white rounded-br-sm shadow-md'
                        : 'bg-surface border border-surface-border text-slate-200 rounded-bl-sm shadow-sm'
                    }`}
                  >
                    {/* Role Tag & Latency */}
                    {!isUser && (
                      <div className="flex items-center justify-between pb-2 border-b border-surface-border/60 text-[10px] font-mono text-slate-400">
                        <span className="flex items-center gap-1 text-primary-400 font-semibold">
                          <Sparkles className="w-3 h-3" />
                          KnowFlow Evidence Engine
                        </span>
                        {msg.retrieval_latency_ms !== null && (
                          <span>
                            Retrieval: {msg.retrieval_latency_ms}ms &bull; Gen: {msg.generation_latency_ms}ms
                          </span>
                        )}
                      </div>
                    )}

                    {/* Content (Render Markdown-like text) */}
                    <div className="whitespace-pre-wrap font-sans text-xs sm:text-[13px] leading-relaxed">
                      {msg.content}
                    </div>

                    {/* Citations Pill Bar (Assistant only) */}
                    {!isUser && msg.citations && msg.citations.length > 0 && (
                      <div className="pt-2 border-t border-surface-border/60 space-y-1.5">
                        <span className="text-[10px] font-mono uppercase text-slate-400 block font-semibold">
                          Supporting Citations ({msg.citations.length}):
                        </span>
                        <div className="flex flex-wrap gap-2">
                          {msg.citations.map((c, cIdx) => (
                            <button
                              key={c.id || cIdx}
                              onClick={() => setInspectedCitation(c)}
                              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-medium border transition-colors ${
                                inspectedCitation?.id === c.id
                                  ? 'bg-primary-500/20 text-primary-200 border-primary-500'
                                  : 'bg-surface-muted/60 text-slate-300 border-surface-border hover:border-slate-500'
                              }`}
                            >
                              <FileCheck2 className="w-3 h-3 text-primary-400" />
                              <span className="truncate max-w-[130px]">{c.document_title}</span>
                              <span className="font-mono text-[9px] px-1 rounded bg-background/50">p.{c.page_number}</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Actions row under assistant message */}
                  {!isUser && (
                    <div className="flex items-center gap-3 mt-1.5 text-[11px] text-slate-500 px-2">
                      <button
                        onClick={() => handleCopy(msg.content, msg.id)}
                        className="hover:text-slate-300 flex items-center gap-1 transition-colors"
                      >
                        <Copy className="w-3 h-3" />
                        <span>{copyFeedback === msg.id ? 'Copied!' : 'Copy'}</span>
                      </button>

                      <span>&bull;</span>

                      <button
                        onClick={() => {
                          setFeedbackMessageId(msg.id);
                          setFeedbackRating('helpful');
                        }}
                        className={`hover:text-emerald-400 flex items-center gap-1 transition-colors ${
                          msg.feedback?.rating === 'helpful' ? 'text-emerald-400 font-bold' : ''
                        }`}
                      >
                        <ThumbsUp className="w-3 h-3" />
                        <span>Helpful</span>
                      </button>

                      <button
                        onClick={() => {
                          setFeedbackMessageId(msg.id);
                          setFeedbackRating('unhelpful');
                        }}
                        className={`hover:text-rose-400 flex items-center gap-1 transition-colors ${
                          msg.feedback?.rating === 'unhelpful' ? 'text-rose-400 font-bold' : ''
                        }`}
                      >
                        <ThumbsDown className="w-3 h-3" />
                        <span>Unhelpful</span>
                      </button>
                    </div>
                  )}
                </div>
              );
            })
          )}

          {/* Typing / Processing indicator */}
          {isSubmitting && (
            <div className="flex items-center gap-2 max-w-3xl mx-auto p-4 rounded-xl bg-surface border border-surface-border text-xs text-primary-400 animate-pulse">
              <Loader2 className="w-4 h-4 animate-spin text-primary-400" />
              <span>Retrieving vector passages and synthesizing grounded answer...</span>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input Bar */}
        <div className="p-4 border-t border-surface-border bg-surface/40">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            className="max-w-3xl mx-auto relative flex items-center gap-2"
          >
            <textarea
              rows={1}
              value={questionText}
              onChange={(e) => setQuestionText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSendMessage();
                }
              }}
              placeholder="Ask a question about the indexed workspace documents..."
              className="flex-1 bg-background border border-surface-border rounded-xl px-4 py-3 text-xs sm:text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-primary-500 transition-colors resize-none pr-12"
            />

            <button
              type="submit"
              disabled={isSubmitting || !questionText.trim()}
              className="absolute right-2 p-2 rounded-lg bg-primary-600 hover:bg-primary-500 disabled:opacity-40 text-white transition-colors"
            >
              {isSubmitting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </button>
          </form>
          <p className="text-[10px] text-center text-slate-500 mt-2">
            Answers are strictly grounded in retrieved passages with verified citations. Press Enter to send.
          </p>
        </div>
      </div>

      {/* 3. RIGHT PANEL: Citation & Source Inspector */}
      <div className="w-80 lg:w-96 border-l border-surface-border bg-surface/30 p-4 flex flex-col shrink-0 overflow-y-auto">
        <div className="flex items-center justify-between pb-3 border-b border-surface-border mb-4">
          <div className="flex items-center gap-2">
            <FileCheck2 className="w-4 h-4 text-emerald-400" />
            <h3 className="text-xs font-semibold text-slate-200 uppercase tracking-wider font-mono">
              Citation Inspector
            </h3>
          </div>
          {inspectedCitation && (
            <button
              onClick={() => setInspectedCitation(null)}
              className="text-slate-400 hover:text-white text-xs"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {inspectedCitation ? (
          <div className="space-y-4 text-xs animate-in fade-in duration-150">
            {/* Document Header Card */}
            <div className="p-3.5 rounded-xl bg-surface border border-surface-border space-y-2">
              <span className="text-[10px] font-mono text-slate-400 uppercase">Source Document</span>
              <p className="font-semibold text-slate-100 text-sm">{inspectedCitation.document_title}</p>
              
              <div className="flex items-center justify-between pt-1 text-[11px] font-mono text-slate-400">
                <span>Page {inspectedCitation.page_number}</span>
                <span className="text-emerald-400 font-semibold">
                  Score: {inspectedCitation.relevance_score}
                </span>
              </div>
            </div>

            {/* Extracted Excerpt */}
            <div>
              <span className="text-[10px] font-mono text-slate-400 uppercase block mb-1.5 font-semibold">
                Retrieved Vector Passage
              </span>
              <div className="p-4 rounded-xl bg-background border border-surface-border text-slate-300 leading-relaxed text-xs">
                "{inspectedCitation.excerpt}"
              </div>
            </div>

            {/* Action: Open in Document Viewer */}
            <button
              onClick={() => navigate(`/viewer/${inspectedCitation.document_id}`)}
              className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-lg bg-surface border border-surface-border hover:border-slate-500 text-primary-400 hover:text-primary-300 font-medium text-xs transition-colors"
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>Open in Document Viewer</span>
              <ExternalLink className="w-3 h-3 ml-auto" />
            </button>
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-6 space-y-2">
            <Info className="w-8 h-8 text-slate-600" />
            <p className="text-xs font-medium text-slate-400">No citation selected</p>
            <p className="text-[11px] text-slate-500 leading-relaxed">
              Click on any supporting citation pill under an AI answer to inspect its original document source, page, and excerpt.
            </p>
          </div>
        )}
      </div>

      {/* Answer Feedback Modal */}
      {feedbackMessageId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-surface border border-surface-border rounded-xl w-full max-w-sm p-5 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-white">Answer Feedback</h3>
              <button
                onClick={() => setFeedbackMessageId(null)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div>
              <label className="block text-xs text-slate-400 mb-1">Feedback Note (Optional):</label>
              <textarea
                rows={3}
                value={feedbackText}
                onChange={(e) => setFeedbackText(e.target.value)}
                placeholder="What was helpful or what could be improved about this response?"
                className="w-full bg-background border border-surface-border rounded-lg p-2.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-primary-500 resize-none"
              />
            </div>

            <div className="flex justify-end gap-2">
              <button
                onClick={() => setFeedbackMessageId(null)}
                className="px-3 py-1.5 text-xs text-slate-400 hover:text-slate-200"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmitFeedback}
                className="px-4 py-1.5 bg-primary-600 hover:bg-primary-500 text-white rounded-lg text-xs font-medium"
              >
                Submit Feedback
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
