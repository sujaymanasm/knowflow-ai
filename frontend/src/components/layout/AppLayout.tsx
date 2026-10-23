import React from 'react';
import { Outlet, Link } from 'react-router-dom';
import { Navbar } from './Navbar';
import { useWorkspace } from '../../context/WorkspaceContext';
import { Info, ExternalLink } from 'lucide-react';

export const AppLayout: React.FC = () => {
  const { isDemoMode, activeModelInfo } = useWorkspace();

  return (
    <div className="min-h-screen flex flex-col bg-background text-slate-100">
      {/* Demo Mode Notice Banner */}
      {isDemoMode && (
        <div className="bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent border-b border-amber-500/20 px-4 py-1.5 text-xs text-amber-300 flex items-center justify-between">
          <div className="max-w-7xl mx-auto w-full flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <Info className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <span>
                <strong>Demo Mode Active:</strong> Grounded deterministic synthesis & local dense embeddings (384-dim).
                To enable live generative LLMs, supply an <code className="bg-amber-500/20 px-1 py-0.5 rounded text-[10px] font-mono">OPENAI_API_KEY</code> in <code className="bg-amber-500/20 px-1 py-0.5 rounded text-[10px] font-mono">.env</code>.
              </span>
            </div>
            <Link
              to="/documents"
              className="text-amber-400 hover:text-amber-200 underline font-medium text-[11px] shrink-0"
            >
              Upload documents &rarr;
            </Link>
          </div>
        </div>
      )}

      {/* Main Navbar */}
      <Navbar />

      {/* Page Outlet */}
      <main className="flex-1 flex flex-col">
        <Outlet />
      </main>

      {/* Footer */}
      <footer className="border-t border-surface-border bg-surface/40 py-6 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-300">KnowFlow AI</span>
            <span>&bull;</span>
            <span>Document Intelligence & Grounded RAG Assistant</span>
          </div>
          <div className="flex items-center gap-6">
            <span>Model: {activeModelInfo.llm}</span>
            <span>Vector: {activeModelInfo.embedding}</span>
            <a
              href="/docs"
              target="_blank"
              rel="noreferrer"
              className="text-primary-400 hover:underline flex items-center gap-1"
            >
              API Swagger <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
};
