import React, { useState } from 'react';
import { NavLink, Link } from 'react-router-dom';
import {
  Layers,
  LayoutDashboard,
  Files,
  MessageSquare,
  Search,
  CheckCircle2,
  ChevronDown,
  Plus,
  Sparkles,
  Zap
} from 'lucide-react';
import { useWorkspace } from '../../context/WorkspaceContext';
import { CreateWorkspaceModal } from '../workspaces/CreateWorkspaceModal';

export const Navbar: React.FC = () => {
  const { workspaces, currentWorkspace, setCurrentWorkspace, isDemoMode, activeModelInfo } = useWorkspace();
  const [isWorkspaceMenuOpen, setIsWorkspaceMenuOpen] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const navItems = [
    { label: 'Overview', path: '/', icon: Sparkles },
    { label: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
    { label: 'Documents', path: '/documents', icon: Files },
    { label: 'AI Chat', path: '/chat', icon: MessageSquare },
    { label: 'Search', path: '/search', icon: Search },
    { label: 'Evaluation', path: '/evaluations', icon: CheckCircle2 },
  ];

  return (
    <>
      <header className="sticky top-0 z-40 w-full border-b border-surface-border bg-background/80 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <div className="flex items-center gap-8">
              <Link to="/" className="flex items-center gap-2.5 group">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-primary-600 to-accent-cyan flex items-center justify-center shadow-lg shadow-primary-500/20 group-hover:scale-105 transition-transform">
                  <Layers className="w-5 h-5 text-white" />
                </div>
                <div>
                  <span className="text-base font-bold tracking-tight text-white flex items-center gap-1.5">
                    KnowFlow <span className="text-primary-400 font-extrabold text-xs uppercase px-1.5 py-0.5 rounded bg-primary-500/10 border border-primary-500/20">AI</span>
                  </span>
                  <p className="text-[10px] text-slate-400 font-mono tracking-wider">DOCUMENT INTELLIGENCE</p>
                </div>
              </Link>

              {/* Navigation Links */}
              <nav className="hidden md:flex items-center space-x-1">
                {navItems.map((item) => {
                  const Icon = item.icon;
                  return (
                    <NavLink
                      key={item.path}
                      to={item.path}
                      className={({ isActive }) =>
                        `flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                          isActive
                            ? 'bg-surface text-primary-400 border border-primary-500/30 shadow-sm'
                            : 'text-slate-400 hover:text-slate-200 hover:bg-surface-muted/60'
                        }`
                      }
                    >
                      <Icon className="w-3.5 h-3.5" />
                      <span>{item.label}</span>
                    </NavLink>
                  );
                })}
              </nav>
            </div>

            {/* Right Controls */}
            <div className="flex items-center gap-3">
              {/* Demo Mode Badge */}
              <div
                title={`Embedding: ${activeModelInfo.embedding} | LLM: ${activeModelInfo.llm}`}
                className={`hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium border ${
                  isDemoMode
                    ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                    : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                }`}
              >
                <Zap className="w-3 h-3" />
                <span>{isDemoMode ? 'Demo Mode (Simulated LLM)' : 'Live Model Connected'}</span>
              </div>

              {/* Workspace Selector */}
              <div className="relative">
                <button
                  onClick={() => setIsWorkspaceMenuOpen(!isWorkspaceMenuOpen)}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-surface border border-surface-border hover:border-slate-600 text-xs font-medium text-slate-200 transition-colors"
                >
                  <span className="w-2 h-2 rounded-full bg-primary-400 animate-pulse" />
                  <span className="max-w-[130px] truncate">
                    {currentWorkspace ? currentWorkspace.name : 'Select Workspace'}
                  </span>
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                </button>

                {isWorkspaceMenuOpen && (
                  <div
                    onMouseLeave={() => setIsWorkspaceMenuOpen(false)}
                    className="absolute right-0 mt-2 w-64 rounded-xl bg-surface border border-surface-border shadow-2xl py-1.5 z-50 animate-in fade-in zoom-in-95"
                  >
                    <div className="px-3 py-1.5 text-[10px] font-semibold tracking-wider text-slate-400 uppercase">
                      Workspaces ({workspaces.length})
                    </div>

                    <div className="max-h-56 overflow-y-auto py-1 divide-y divide-surface-border/40">
                      {workspaces.map((ws) => (
                        <button
                          key={ws.id}
                          onClick={() => {
                            setCurrentWorkspace(ws);
                            setIsWorkspaceMenuOpen(false);
                          }}
                          className={`w-full text-left px-3 py-2 text-xs flex items-center justify-between hover:bg-surface-muted transition-colors ${
                            currentWorkspace?.id === ws.id
                              ? 'bg-primary-500/10 text-primary-300 font-semibold'
                              : 'text-slate-300'
                          }`}
                        >
                          <div className="truncate mr-2">
                            <p className="truncate">{ws.name}</p>
                            <p className="text-[10px] text-slate-500">{ws.document_count} documents</p>
                          </div>
                          {currentWorkspace?.id === ws.id && (
                            <span className="w-1.5 h-1.5 rounded-full bg-primary-400" />
                          )}
                        </button>
                      ))}
                    </div>

                    <div className="pt-1.5 border-t border-surface-border px-2">
                      <button
                        onClick={() => {
                          setIsWorkspaceMenuOpen(false);
                          setIsModalOpen(true);
                        }}
                        className="w-full flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary-600/20 text-primary-400 hover:bg-primary-600/30 text-xs font-medium transition-colors"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>New Workspace</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </header>

      <CreateWorkspaceModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </>
  );
};
