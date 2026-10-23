import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  FileText,
  ChevronLeft,
  ChevronRight,
  MessageSquare,
  Search,
  Loader2
} from 'lucide-react';
import { api } from '../lib/api';
import { Document, DocumentChunk } from '../types/api';
import { formatBytes } from '../lib/utils';

export const DocumentViewerPage: React.FC = () => {
  const { documentId } = useParams<{ documentId: string }>();
  const navigate = useNavigate();

  const [document, setDocument] = useState<Document | null>(null);
  const [chunks, setChunks] = useState<DocumentChunk[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Viewer navigation
  const [currentPage, setCurrentPage] = useState(1);
  const [searchInDoc, setSearchInDoc] = useState('');
  const [activeChunkIndex, setActiveChunkIndex] = useState<number | null>(null);

  useEffect(() => {
    if (!documentId) return;

    setIsLoading(true);
    setError(null);

    Promise.all([
      api.getDocument(documentId),
      api.getDocumentChunks(documentId),
    ])
      .then(([docData, chunksData]) => {
        setDocument(docData);
        setChunks(chunksData);
        if (chunksData.length > 0) {
          setCurrentPage(chunksData[0].page_number);
        }
      })
      .catch((err) => {
        setError(err.message || 'Failed to load document details');
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [documentId]);

  // Filter chunks for current page
  const pageChunks = chunks.filter((c) => c.page_number === currentPage);
  const totalPages = document?.page_count || Math.max(1, ...chunks.map((c) => c.page_number));

  // Search filter across chunks
  const filteredChunks = chunks.filter(
    (c) => !searchInDoc || c.content.toLowerCase().includes(searchInDoc.toLowerCase())
  );

  return (
    <div className="flex-1 flex flex-col h-[calc(100vh-4rem)] overflow-hidden bg-background">
      {/* Top Header Bar */}
      <div className="px-6 py-3 border-b border-surface-border bg-surface/40 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/documents')}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-surface-border/50 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h1 className="text-sm font-semibold text-white flex items-center gap-2">
              <FileText className="w-4 h-4 text-primary-400" />
              {document ? document.title : 'Loading Document...'}
            </h1>
            {document && (
              <p className="text-[10px] text-slate-400 font-mono">
                {document.original_filename} &bull; {formatBytes(document.file_size_bytes)} &bull; {document.chunk_count} Vector Chunks
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3">
          {document && (
            <button
              onClick={() => navigate(`/chat?doc=${document.id}`)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary-600 hover:bg-primary-500 text-white text-xs font-medium transition-colors shadow-lg shadow-primary-600/20"
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span>Ask Document</span>
            </button>
          )}
        </div>
      </div>

      {isLoading ? (
        <div className="flex-1 flex flex-col items-center justify-center space-y-2">
          <Loader2 className="w-8 h-8 text-primary-400 animate-spin" />
          <p className="text-xs text-slate-400">Loading document pages and chunks...</p>
        </div>
      ) : error ? (
        <div className="m-6 p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs">
          {error}
        </div>
      ) : (
        <div className="flex-1 flex overflow-hidden">
          {/* Main Document Reading Area */}
          <div className="flex-1 flex flex-col min-w-0 border-r border-surface-border overflow-hidden">
            {/* Page Navigation Toolbar */}
            <div className="px-6 py-2.5 border-b border-surface-border bg-surface-muted/30 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage <= 1}
                  className="p-1 rounded-md bg-surface border border-surface-border text-slate-300 disabled:opacity-40 hover:border-slate-500 transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="text-xs font-mono text-slate-300">
                  Page <strong className="text-white">{currentPage}</strong> of {totalPages}
                </span>
                <button
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage >= totalPages}
                  className="p-1 rounded-md bg-surface border border-surface-border text-slate-300 disabled:opacity-40 hover:border-slate-500 transition-colors"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>

              <div className="text-[11px] font-mono text-slate-400">
                {pageChunks.length} chunk{pageChunks.length !== 1 ? 's' : ''} on this page
              </div>
            </div>

            {/* Document Page Content Viewer */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {pageChunks.length === 0 ? (
                <div className="p-8 text-center bg-surface/20 rounded-xl border border-surface-border/50 text-slate-400 text-xs">
                  <p>No extracted passages recorded on page {currentPage}.</p>
                </div>
              ) : (
                pageChunks.map((chunk) => {
                  const isHighlighted = activeChunkIndex === chunk.chunk_index;

                  return (
                    <div
                      key={chunk.id}
                      onClick={() => setActiveChunkIndex(chunk.chunk_index)}
                      className={`p-5 rounded-xl border text-xs sm:text-sm leading-relaxed transition-all cursor-pointer ${
                        isHighlighted
                          ? 'bg-primary-500/10 border-primary-500/60 shadow-lg shadow-primary-500/10 text-slate-100'
                          : 'bg-surface/50 border-surface-border hover:border-slate-600 text-slate-300'
                      }`}
                    >
                      <div className="flex items-center justify-between pb-2 mb-2 border-b border-surface-border/50 text-[10px] font-mono text-slate-400">
                        <span>Chunk #{chunk.chunk_index + 1} &bull; Page {chunk.page_number}</span>
                        <span>{chunk.token_count} approx tokens</span>
                      </div>
                      <p className="whitespace-pre-wrap">{chunk.content}</p>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Right Sidebar: All Chunks & In-Doc Search */}
          <div className="w-80 lg:w-96 bg-surface/30 flex flex-col shrink-0 overflow-hidden">
            {/* Search within document */}
            <div className="p-3 border-b border-surface-border">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchInDoc}
                  onChange={(e) => setSearchInDoc(e.target.value)}
                  placeholder="Find passage in chunks..."
                  className="w-full pl-8 pr-3 py-1.5 bg-background border border-surface-border rounded-lg text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-primary-500"
                />
              </div>
            </div>

            {/* Chunks List */}
            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              <div className="px-1 text-[10px] font-mono font-semibold uppercase text-slate-400">
                Extracted Vector Chunks ({filteredChunks.length})
              </div>

              {filteredChunks.map((c) => (
                <button
                  key={c.id}
                  onClick={() => {
                    setCurrentPage(c.page_number);
                    setActiveChunkIndex(c.chunk_index);
                  }}
                  className={`w-full text-left p-3 rounded-xl border text-xs transition-colors ${
                    activeChunkIndex === c.chunk_index
                      ? 'bg-primary-500/10 border-primary-500 text-primary-200'
                      : 'bg-surface border-surface-border hover:border-slate-600 text-slate-400'
                  }`}
                >
                  <div className="flex items-center justify-between text-[10px] font-mono text-slate-500 mb-1">
                    <span>Page {c.page_number}</span>
                    <span>Chunk #{c.chunk_index + 1}</span>
                  </div>
                  <p className="line-clamp-2 text-slate-300">{c.content}</p>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
