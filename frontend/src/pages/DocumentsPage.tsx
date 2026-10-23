import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Upload,
  Files,
  FileText,
  Trash2,
  RotateCw,
  Search,
  CheckCircle2,
  AlertCircle,
  Eye,
  MessageSquare,
  Loader2,
  Filter
} from 'lucide-react';
import { api } from '../lib/api';
import { useWorkspace } from '../context/WorkspaceContext';
import { Document } from '../types/api';
import { formatBytes, formatDate } from '../lib/utils';

export const DocumentsPage: React.FC = () => {
  const { currentWorkspace, refreshWorkspaces } = useWorkspace();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [documents, setDocuments] = useState<Document[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Upload state
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  // Deleting document state
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const loadDocuments = async () => {
    if (!currentWorkspace) return;
    setIsLoading(true);
    setError(null);
    try {
      const data = await api.listDocuments(
        currentWorkspace.id,
        statusFilter === 'all' ? undefined : statusFilter,
        search.trim() || undefined
      );
      setDocuments(data);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch documents');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadDocuments();
  }, [currentWorkspace?.id, statusFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loadDocuments();
  };

  const handleFileUpload = async (files: FileList | null) => {
    if (!files || files.length === 0 || !currentWorkspace) return;
    const file = files[0];

    // Validate size (25MB max)
    if (file.size > 25 * 1024 * 1024) {
      setUploadError("File exceeds maximum allowed size of 25MB.");
      return;
    }

    // Validate extension
    const ext = file.name.split('.').pop()?.toLowerCase();
    if (!['pdf', 'txt', 'md'].includes(ext || '')) {
      setUploadError("Only PDF (.pdf), Plain Text (.txt), and Markdown (.md) documents are supported.");
      return;
    }

    setIsUploading(true);
    setUploadError(null);
    setUploadSuccess(null);

    try {
      const uploadedDoc = await api.uploadDocument(file, currentWorkspace.id, file.name);
      setUploadSuccess(`Successfully ingested & indexed "${uploadedDoc.title}" (${uploadedDoc.chunk_count} vector chunks)`);
      await loadDocuments();
      await refreshWorkspaces();
    } catch (err: any) {
      setUploadError(err.message || 'Upload failed');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleReindex = async (docId: string) => {
    try {
      await api.reindexDocument(docId);
      await loadDocuments();
    } catch (err: any) {
      alert(`Reindex failed: ${err.message}`);
    }
  };

  const handleDelete = async (docId: string, title: string) => {
    if (!confirm(`Are you sure you want to delete "${title}" and all its vector embeddings?`)) return;

    setDeletingId(docId);
    try {
      await api.deleteDocument(docId);
      await loadDocuments();
      await refreshWorkspaces();
    } catch (err: any) {
      alert(`Delete failed: ${err.message}`);
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Document Library</h1>
          <p className="text-xs text-slate-400 mt-1">
            Manage files, chunking partitions, and vector embeddings in <span className="text-primary-400 font-semibold">{currentWorkspace?.name}</span>
          </p>
        </div>

        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading}
          className="flex items-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-500 disabled:opacity-50 text-white text-xs font-medium rounded-lg transition-colors shadow-lg shadow-primary-600/20"
        >
          <Upload className="w-3.5 h-3.5" />
          <span>Upload File</span>
        </button>
      </div>

      {/* Hidden File Input */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={(e) => handleFileUpload(e.target.files)}
        accept=".pdf,.txt,.md"
        className="hidden"
      />

      {/* Drag & Drop Upload Zone */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragOver(true);
        }}
        onDragLeave={() => setIsDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setIsDragOver(false);
          handleFileUpload(e.dataTransfer.files);
        }}
        className={`p-8 rounded-2xl border-2 border-dashed transition-all text-center ${
          isDragOver
            ? 'border-primary-500 bg-primary-500/10'
            : 'border-surface-border bg-surface/30 hover:border-slate-600 hover:bg-surface/50'
        }`}
      >
        <div className="max-w-md mx-auto space-y-3">
          <div className="w-12 h-12 rounded-xl bg-primary-500/10 text-primary-400 flex items-center justify-center mx-auto">
            {isUploading ? (
              <Loader2 className="w-6 h-6 animate-spin" />
            ) : (
              <Upload className="w-6 h-6" />
            )}
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-200">
              {isUploading ? 'Extracting text and generating embeddings...' : 'Drag and drop your PDF, TXT, or Markdown here'}
            </p>
            <p className="text-xs text-slate-400 mt-1">
              Supports .pdf, .txt, .md up to 25MB with page-level metadata tracking
            </p>
          </div>
          <button
            type="button"
            disabled={isUploading}
            onClick={() => fileInputRef.current?.click()}
            className="px-4 py-1.5 rounded-lg bg-surface border border-surface-border hover:border-slate-500 text-xs text-slate-300 font-medium transition-colors"
          >
            Browse from computer
          </button>
        </div>
      </div>

      {/* Feedback alerts */}
      {error && (
        <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-400 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}
      {uploadSuccess && (
        <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-400 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{uploadSuccess}</span>
        </div>
      )}
      {uploadError && (
        <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-400 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{uploadError}</span>
        </div>
      )}

      {/* Search & Filter Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 rounded-xl bg-surface border border-surface-border">
        <form onSubmit={handleSearchSubmit} className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search document titles..."
            className="w-full pl-9 pr-4 py-1.5 bg-background border border-surface-border rounded-lg text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-primary-500"
          />
        </form>

        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          <Filter className="w-3.5 h-3.5 text-slate-400" />
          <span className="text-xs text-slate-400">Status:</span>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-background border border-surface-border text-slate-200 text-xs rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-primary-500"
          >
            <option value="all">All Statuses</option>
            <option value="Indexed">Indexed</option>
            <option value="Processing">Processing</option>
            <option value="Uploaded">Uploaded</option>
            <option value="Failed">Failed</option>
          </select>
        </div>
      </div>

      {/* Documents Table */}
      <div className="rounded-xl bg-surface border border-surface-border overflow-hidden">
        {isLoading ? (
          <div className="py-20 flex flex-col items-center justify-center space-y-2">
            <Loader2 className="w-6 h-6 text-primary-400 animate-spin" />
            <p className="text-xs text-slate-400">Loading documents...</p>
          </div>
        ) : documents.length === 0 ? (
          <div className="text-center py-16 px-4">
            <Files className="w-10 h-10 text-slate-600 mx-auto mb-3" />
            <h3 className="text-sm font-semibold text-slate-300">No documents found</h3>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              {search
                ? `No documents matching "${search}". Clear search to view all.`
                : 'Upload your first document above to start indexing chunks and asking questions.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-surface-border bg-surface-muted/40 text-slate-400 font-mono text-[10px] uppercase">
                  <th className="py-3 px-4">Document Title</th>
                  <th className="py-3 px-4">Type</th>
                  <th className="py-3 px-4">Size</th>
                  <th className="py-3 px-4">Pages</th>
                  <th className="py-3 px-4">Vector Chunks</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Ingested At</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-border/60">
                {documents.map((doc) => (
                  <tr key={doc.id} className="hover:bg-surface-muted/30 transition-colors">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2.5">
                        <FileText className="w-4 h-4 text-primary-400 shrink-0" />
                        <div>
                          <p className="font-medium text-slate-200">{doc.title}</p>
                          <p className="text-[10px] text-slate-500 font-mono">{doc.original_filename}</p>
                        </div>
                      </div>
                    </td>

                    <td className="py-3 px-4">
                      <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-surface-muted border border-surface-border uppercase text-slate-300">
                        {doc.file_type}
                      </span>
                    </td>

                    <td className="py-3 px-4 font-mono text-[11px] text-slate-400">
                      {formatBytes(doc.file_size_bytes)}
                    </td>

                    <td className="py-3 px-4 font-mono text-[11px] text-slate-400">
                      {doc.page_count > 0 ? doc.page_count : '-'}
                    </td>

                    <td className="py-3 px-4 font-mono text-[11px] text-slate-400">
                      <span className="font-semibold text-slate-200">{doc.chunk_count}</span>
                    </td>

                    <td className="py-3 px-4">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-medium border ${
                          doc.status === 'Indexed'
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                            : doc.status === 'Processing'
                            ? 'bg-primary-500/10 text-primary-400 border-primary-500/20 animate-pulse'
                            : doc.status === 'Failed'
                            ? 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                            : 'bg-slate-500/10 text-slate-400 border-slate-500/20'
                        }`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            doc.status === 'Indexed'
                              ? 'bg-emerald-400'
                              : doc.status === 'Processing'
                              ? 'bg-primary-400 animate-ping'
                              : doc.status === 'Failed'
                              ? 'bg-rose-400'
                              : 'bg-slate-400'
                          }`}
                        />
                        {doc.status}
                      </span>
                      {doc.error_message && (
                        <p className="text-[10px] text-rose-400 mt-1 max-w-[200px] truncate" title={doc.error_message}>
                          {doc.error_message}
                        </p>
                      )}
                    </td>

                    <td className="py-3 px-4 text-slate-400 text-[11px]">
                      {formatDate(doc.created_at)}
                    </td>

                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {/* View in Document Viewer */}
                        <Link
                          to={`/viewer/${doc.id}`}
                          title="Inspect document & chunks"
                          className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-surface-border/60 transition-colors"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </Link>

                        {/* Ask question scoped to this doc */}
                        <button
                          onClick={() => navigate(`/chat?doc=${doc.id}`)}
                          title="Chat about this document"
                          className="p-1.5 rounded-lg text-primary-400 hover:text-primary-300 hover:bg-primary-500/10 transition-colors"
                        >
                          <MessageSquare className="w-3.5 h-3.5" />
                        </button>

                        {/* Reindex */}
                        <button
                          onClick={() => handleReindex(doc.id)}
                          title="Re-chunk and re-embed"
                          className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-surface-border/60 transition-colors"
                        >
                          <RotateCw className="w-3.5 h-3.5" />
                        </button>

                        {/* Delete */}
                        <button
                          onClick={() => handleDelete(doc.id, doc.title)}
                          disabled={deletingId === doc.id}
                          title="Delete document and vectors"
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors disabled:opacity-50"
                        >
                          {deletingId === doc.id ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <Trash2 className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
