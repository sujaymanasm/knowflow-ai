import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  Clock,
  FileCheck2,
  Loader2,
  MessageSquare
} from 'lucide-react';
import { api } from '../lib/api';
import { useWorkspace } from '../context/WorkspaceContext';
import { SearchResponse, Document } from '../types/api';

export const SearchPage: React.FC = () => {
  const { currentWorkspace } = useWorkspace();
  const navigate = useNavigate();

  const [query, setQuery] = useState('');
  const [searchType, setSearchType] = useState<'hybrid' | 'semantic' | 'keyword'>('hybrid');
  const [topK, setTopK] = useState(5);
  const [selectedDocId, setSelectedDocId] = useState<string>('');

  const [workspaceDocs, setWorkspaceDocs] = useState<Document[]>([]);
  const [searchResponse, setSearchResponse] = useState<SearchResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!currentWorkspace) return;
    api.listDocuments(currentWorkspace.id, 'Indexed').then(setWorkspaceDocs).catch(() => {});
  }, [currentWorkspace?.id]);

  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!query.trim() || !currentWorkspace) return;

    setIsLoading(true);
    setError(null);

    try {
      const resp = await api.search(
        currentWorkspace.id,
        query.trim(),
        searchType,
        topK,
        selectedDocId || undefined
      );
      setSearchResponse(resp);
    } catch (err: any) {
      setError(err.message || 'Search execution failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight">Search Explorer</h1>
        <p className="text-xs text-slate-400 mt-1">
          Perform multi-mode vector and keyword queries against <span className="text-primary-400 font-semibold">{currentWorkspace?.name}</span>
        </p>
      </div>

      {/* Search Formulation Box */}
      <div className="p-6 rounded-2xl bg-surface border border-surface-border shadow-xl space-y-5">
        <form onSubmit={handleSearch} className="space-y-4">
          <div className="relative">
            <Search className="w-5 h-5 text-slate-500 absolute left-4 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Enter search query or concept (e.g. 'vector chunk overlap architecture', 'cosine similarity metrics')..."
              className="w-full pl-12 pr-28 py-3.5 bg-background border border-surface-border rounded-xl text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-primary-500 shadow-inner"
            />
            <button
              type="submit"
              disabled={isLoading || !query.trim()}
              className="absolute right-2 top-1/2 -translate-y-1/2 px-5 py-2 bg-primary-600 hover:bg-primary-500 disabled:opacity-40 text-white rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Searching</span>
                </>
              ) : (
                <span>Retrieve</span>
              )}
            </button>
          </div>

          {/* Controls: Mode, Top-K, Scoped Doc */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
            {/* Search Mode */}
            <div>
              <label className="block text-[10px] font-mono uppercase text-slate-400 mb-1.5">
                Retrieval Method:
              </label>
              <div className="grid grid-cols-3 gap-1.5 p-1 bg-background border border-surface-border rounded-lg text-xs">
                {(['hybrid', 'semantic', 'keyword'] as const).map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setSearchType(m)}
                    className={`py-1.5 text-center capitalize rounded-md font-medium transition-all ${
                      searchType === m
                        ? 'bg-primary-600 text-white shadow-sm'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {m}
                  </button>
                ))}
              </div>
            </div>

            {/* Top-K Results */}
            <div>
              <div className="flex items-center justify-between text-[10px] font-mono uppercase text-slate-400 mb-1.5">
                <span>Top-K Results:</span>
                <span className="text-primary-400 font-bold">{topK}</span>
              </div>
              <input
                type="range"
                min="1"
                max="20"
                value={topK}
                onChange={(e) => setTopK(parseInt(e.target.value))}
                className="w-full accent-primary-500 bg-background h-2 rounded-lg cursor-pointer"
              />
            </div>

            {/* Document Filter */}
            <div>
              <label className="block text-[10px] font-mono uppercase text-slate-400 mb-1.5">
                Target Document Filter:
              </label>
              <select
                value={selectedDocId}
                onChange={(e) => setSelectedDocId(e.target.value)}
                className="w-full bg-background border border-surface-border rounded-lg text-xs text-slate-200 px-3 py-2 focus:outline-none focus:border-primary-500"
              >
                <option value="">All Documents in Workspace</option>
                {workspaceDocs.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.title}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </form>
      </div>

      {/* Error Message */}
      {error && (
        <div className="p-4 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-400 text-xs">
          {error}
        </div>
      )}

      {/* Results Section */}
      {searchResponse && (
        <div className="space-y-4">
          {/* Metrics summary banner */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3.5 rounded-xl bg-surface/50 border border-surface-border text-xs">
            <div className="flex items-center gap-2 text-slate-300">
              <span className="font-semibold text-white">Results ({searchResponse.total_results}):</span>
              <span>Matched via <strong className="text-primary-400 uppercase font-mono">{searchResponse.search_type}</strong></span>
            </div>

            <div className="flex items-center gap-2 text-slate-400 font-mono text-[11px]">
              <Clock className="w-3.5 h-3.5 text-slate-500" />
              <span>Retrieval Latency: <strong className="text-slate-200">{searchResponse.retrieval_latency_ms}ms</strong></span>
            </div>
          </div>

          {/* Results List */}
          {searchResponse.results.length === 0 ? (
            <div className="p-12 text-center bg-surface/30 rounded-xl border border-surface-border text-slate-400 text-xs">
              No matching passages found for your query. Try broadening your keywords or check if documents are indexed.
            </div>
          ) : (
            <div className="space-y-3">
              {searchResponse.results.map((item, idx) => (
                <div
                  key={item.chunk_id || idx}
                  className="p-5 rounded-xl bg-surface border border-surface-border hover:border-slate-600 transition-all space-y-3"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2.5 border-b border-surface-border/50 text-xs">
                    <div className="flex items-center gap-2">
                      <FileCheck2 className="w-4 h-4 text-primary-400 shrink-0" />
                      <span className="font-semibold text-slate-200">{item.document_title}</span>
                      <span className="px-1.5 py-0.5 rounded bg-surface-muted text-[10px] font-mono text-slate-400">
                        Page {item.page_number}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 font-mono text-[11px]">
                      <span className="px-2 py-0.5 rounded bg-primary-500/10 text-primary-300 border border-primary-500/20">
                        Method: {item.search_method}
                      </span>
                      <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold">
                        Score: {item.score}
                      </span>
                    </div>
                  </div>

                  <p className="text-xs sm:text-sm text-slate-300 leading-relaxed whitespace-pre-wrap">
                    {item.content}
                  </p>

                  <div className="flex items-center justify-between pt-2 text-xs">
                    <span className="font-mono text-[10px] text-slate-500">Chunk ID: {item.chunk_id.slice(0, 12)}...</span>
                    <button
                      onClick={() => navigate(`/chat?doc=${item.document_id}`)}
                      className="text-primary-400 hover:text-primary-300 flex items-center gap-1 font-medium"
                    >
                      <MessageSquare className="w-3.5 h-3.5" />
                      <span>Chat About This Passage &rarr;</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
