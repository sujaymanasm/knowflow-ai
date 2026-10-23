import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Sparkles,
  ArrowRight,
  ShieldCheck,
  BookOpen,
  Cpu,
  Layers,
  FileCheck2,
  BarChart2
} from 'lucide-react';

export const LandingPage: React.FC = () => {
  // Interactive Product Preview State
  const [selectedQuestion, setSelectedQuestion] = useState(0);
  const [activeCitation, setActiveCitation] = useState<number | null>(null);

  const previewScenarios = [
    {
      question: "How does vector chunk overlap prevent context fragmentation?",
      answer: "Chunk overlap preserves linguistic context across segment boundaries. In KnowFlow AI, adjacent passages share 100 characters of overlap, ensuring compound sentences, cross-clause relationships, and semantic continuity are not abruptly severed.",
      sourceDoc: "RAG System Architecture & Evaluation Guide.md",
      page: 1,
      excerpt: "A recursive sliding window text chunker splits content into passages (default 500 characters with 100 character overlap). Chunk overlap is crucial because it prevents sentence fragmentation across boundaries and preserves semantic continuity.",
      score: 0.94
    },
    {
      question: "What is the benefit of Reciprocal Rank Fusion (RRF) in hybrid retrieval?",
      answer: "RRF merges dense vector semantic scores with sparse BM25 keyword rankings using reciprocal rank weighting. This ensures that exact technical terminology and abstract conceptual matches both receive optimal relevance ranking.",
      sourceDoc: "RAG System Architecture & Evaluation Guide.md",
      page: 2,
      excerpt: "KnowFlow AI provides Hybrid Search combining dense cosine similarity and lexical matching using Reciprocal Rank Fusion (RRF with k=60), maximizing both precision and recall.",
      score: 0.89
    }
  ];

  const currentScenario = previewScenarios[selectedQuestion];

  return (
    <div className="flex-1 flex flex-col">
      {/* Hero Section */}
      <section className="relative overflow-hidden pt-16 pb-20 border-b border-surface-border">
        {/* Subtle grid background */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b12_1px,transparent_1px),linear-gradient(to_bottom,#1e293b12_1px,transparent_1px)] bg-[size:32px_32px]" />
        
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary-500/10 border border-primary-500/30 text-primary-400 text-xs font-medium mb-6 animate-pulse">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Document Intelligence & Grounded RAG Assistant</span>
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-white tracking-tight leading-tight max-w-4xl mx-auto">
            Extract Truth, <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary-400 via-accent-cyan to-primary-300">Verify Facts</span>, and Eliminate Hallucinations.
          </h1>

          <p className="mt-6 text-base sm:text-lg text-slate-400 max-w-2xl mx-auto leading-relaxed">
            Upload complex technical documentation, research papers, and corporate briefs.
            KnowFlow AI delivers evidence-grounded answers supported by exact page citations,
            semantic vector search, and anti-injection context boundaries.
          </p>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
            <Link
              to="/dashboard"
              className="flex items-center gap-2 px-6 py-3 rounded-xl bg-primary-600 hover:bg-primary-500 text-white font-medium text-sm transition-all shadow-xl shadow-primary-600/25 hover:shadow-primary-500/35"
            >
              <span>Start Exploring</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              to="/documents"
              className="flex items-center gap-2 px-6 py-3 rounded-xl bg-surface border border-surface-border hover:border-slate-600 text-slate-200 font-medium text-sm transition-colors"
            >
              <BookOpen className="w-4 h-4 text-primary-400" />
              <span>Document Library</span>
            </Link>
          </div>
        </div>
      </section>

      {/* Interactive Product Preview Section */}
      <section className="py-16 bg-surface/30 border-b border-surface-border">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-10">
            <span className="text-xs font-mono font-semibold uppercase tracking-wider text-primary-400">Live Component Simulation</span>
            <h2 className="text-2xl sm:text-3xl font-bold text-white mt-1">Interactive RAG Execution Preview</h2>
            <p className="text-xs text-slate-400 mt-2 max-w-xl mx-auto">
              Select a sample prompt below to inspect the real-time retrieved passage, confidence score, and verifiable page citation.
            </p>
          </div>

          {/* Interactive Shell */}
          <div className="bg-surface border border-surface-border rounded-2xl shadow-2xl overflow-hidden">
            {/* Window Header */}
            <div className="px-6 py-3.5 border-b border-surface-border bg-surface-muted/60 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-rose-500/80 inline-block" />
                <span className="w-3 h-3 rounded-full bg-amber-500/80 inline-block" />
                <span className="w-3 h-3 rounded-full bg-emerald-500/80 inline-block" />
                <span className="ml-3 text-xs font-mono text-slate-400">knowflow-rag://workspace/engineering</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-400 font-mono">
                <span className="w-2 h-2 rounded-full bg-emerald-400" />
                <span>Vector Index Ready (384-dim)</span>
              </div>
            </div>

            {/* Prompt Selector Pills */}
            <div className="p-4 bg-background/50 border-b border-surface-border flex flex-wrap gap-2">
              {previewScenarios.map((sc, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    setSelectedQuestion(idx);
                    setActiveCitation(null);
                  }}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all text-left ${
                    selectedQuestion === idx
                      ? 'bg-primary-600 text-white shadow-md'
                      : 'bg-surface border border-surface-border text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {sc.question}
                </button>
              ))}
            </div>

            {/* Split Preview Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-12 min-h-[380px]">
              {/* Question & Answer Column */}
              <div className="lg:col-span-7 p-6 border-b lg:border-b-0 lg:border-r border-surface-border space-y-5">
                <div>
                  <span className="text-[10px] font-mono uppercase text-slate-500">User Query</span>
                  <p className="text-sm font-semibold text-slate-200 mt-1 flex items-start gap-2">
                    <span className="text-primary-400 font-bold">&gt;</span>
                    {currentScenario.question}
                  </p>
                </div>

                <div className="pt-2">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-mono uppercase text-primary-400 flex items-center gap-1.5">
                      <Sparkles className="w-3 h-3" />
                      Grounded Synthesis
                    </span>
                    <span className="text-[10px] font-mono text-slate-500">Latency: 14ms (Retrieval) + 110ms</span>
                  </div>
                  <div className="p-4 rounded-xl bg-background border border-surface-border text-sm text-slate-300 leading-relaxed">
                    {currentScenario.answer}
                  </div>
                </div>

                {/* Citation Pill */}
                <div className="pt-1">
                  <span className="text-[10px] font-mono uppercase text-slate-500 block mb-2">Supporting Citation</span>
                  <button
                    onClick={() => setActiveCitation(activeCitation === selectedQuestion ? null : selectedQuestion)}
                    className="flex items-center gap-2 px-3 py-2 rounded-lg bg-primary-500/10 border border-primary-500/30 text-primary-300 hover:bg-primary-500/20 text-xs transition-colors"
                  >
                    <FileCheck2 className="w-4 h-4 text-primary-400" />
                    <span className="font-medium">{currentScenario.sourceDoc}</span>
                    <span className="px-1.5 py-0.5 rounded bg-primary-500/20 text-[10px] font-mono">Page {currentScenario.page}</span>
                    <span className="text-slate-400 text-[11px] ml-auto">Sim: {currentScenario.score} &rarr; Click to inspect</span>
                  </button>
                </div>
              </div>

              {/* Verified Source Excerpt Column */}
              <div className="lg:col-span-5 p-6 bg-background/30 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-[11px] font-mono uppercase text-slate-400 font-semibold flex items-center gap-1.5">
                      <ShieldCheck className="w-4 h-4 text-emerald-400" />
                      Audited Document Evidence
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-mono">
                      Verified Match
                    </span>
                  </div>

                  <div className="p-3.5 rounded-xl bg-surface border border-surface-border text-xs text-slate-300 space-y-2">
                    <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono pb-2 border-b border-surface-border">
                      <span className="truncate">{currentScenario.sourceDoc}</span>
                      <span className="shrink-0">Page {currentScenario.page}</span>
                    </div>
                    <blockquote className="italic border-l-2 border-primary-400 pl-3 py-1 text-slate-200">
                      "{currentScenario.excerpt}"
                    </blockquote>
                  </div>
                </div>

                <div className="mt-4 pt-4 border-t border-surface-border text-[11px] text-slate-400 flex items-center justify-between">
                  <span>Cosine Similarity: <strong className="text-white">{currentScenario.score}</strong></span>
                  <Link to="/chat" className="text-primary-400 hover:underline flex items-center gap-1 font-medium">
                    Try Live Chat <ArrowRight className="w-3 h-3" />
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 3-Step RAG Workflow */}
      <section className="py-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-14">
          <span className="text-xs font-mono font-semibold uppercase tracking-wider text-primary-400">Architecture Pipeline</span>
          <h2 className="text-3xl font-bold text-white mt-1">How KnowFlow AI Operates</h2>
          <p className="text-sm text-slate-400 mt-2 max-w-xl mx-auto">
            From raw PDFs to strictly grounded answers with verifiable source tracking.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Step 1 */}
          <div className="p-6 rounded-2xl bg-surface border border-surface-border relative group hover:border-primary-500/50 transition-all">
            <div className="w-12 h-12 rounded-xl bg-primary-500/10 border border-primary-500/30 flex items-center justify-center text-primary-400 font-mono text-lg font-bold mb-5 group-hover:scale-105 transition-transform">
              01
            </div>
            <h3 className="text-base font-semibold text-white">Ingest & Chunk</h3>
            <p className="text-xs text-slate-400 mt-2 leading-relaxed">
              PDFs and text documents are parsed with exact page boundary preservation. A recursive sliding window splits text into overlapping chunks, preventing fragmented statements.
            </p>
          </div>

          {/* Step 2 */}
          <div className="p-6 rounded-2xl bg-surface border border-surface-border relative group hover:border-primary-500/50 transition-all">
            <div className="w-12 h-12 rounded-xl bg-accent-cyan/10 border border-accent-cyan/30 flex items-center justify-center text-accent-cyan font-mono text-lg font-bold mb-5 group-hover:scale-105 transition-transform">
              02
            </div>
            <h3 className="text-base font-semibold text-white">Embed & Index</h3>
            <p className="text-xs text-slate-400 mt-2 leading-relaxed">
              Every chunk is transformed into a dense 384-dimensional vector embedding. Vectors are indexed with tenant workspace isolation and indexed for lightning-fast retrieval.
            </p>
          </div>

          {/* Step 3 */}
          <div className="p-6 rounded-2xl bg-surface border border-surface-border relative group hover:border-primary-500/50 transition-all">
            <div className="w-12 h-12 rounded-xl bg-accent-emerald/10 border border-accent-emerald/30 flex items-center justify-center text-accent-emerald font-mono text-lg font-bold mb-5 group-hover:scale-105 transition-transform">
              03
            </div>
            <h3 className="text-base font-semibold text-white">Retrieve & Validate</h3>
            <p className="text-xs text-slate-400 mt-2 leading-relaxed">
              At query time, hybrid vector search retrieves the top-k relevant passages. The response is constructed inside injection-safe delimiters and verified against retrieved chunks.
            </p>
          </div>
        </div>
      </section>

      {/* Feature Grid */}
      <section className="py-16 bg-surface/20 border-t border-surface-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="p-5 rounded-xl bg-surface border border-surface-border">
              <Cpu className="w-6 h-6 text-primary-400 mb-3" />
              <h4 className="text-sm font-semibold text-white">Hybrid Retrieval & RRF</h4>
              <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
                Combines dense vector similarity with sparse BM25 token matching for pinpoint precision.
              </p>
            </div>

            <div className="p-5 rounded-xl bg-surface border border-surface-border">
              <ShieldCheck className="w-6 h-6 text-accent-emerald mb-3" />
              <h4 className="text-sm font-semibold text-white">Citation Auditing</h4>
              <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
                Rejects hallucinated references. Every citation maps to an actual chunk in the vector index.
              </p>
            </div>

            <div className="p-5 rounded-xl bg-surface border border-surface-border">
              <BarChart2 className="w-6 h-6 text-accent-cyan mb-3" />
              <h4 className="text-sm font-semibold text-white">Automated Evaluation</h4>
              <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
                Built-in benchmarking measuring Recall@k, Mean Reciprocal Rank (MRR), and faithfulness.
              </p>
            </div>

            <div className="p-5 rounded-xl bg-surface border border-surface-border">
              <Layers className="w-6 h-6 text-accent-indigo mb-3" />
              <h4 className="text-sm font-semibold text-white">Multi-Tenant Isolation</h4>
              <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
                Rigid workspace partitioning ensures documents and chats never leak across boundaries.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Call to Action Banner */}
      <section className="py-16 text-center border-t border-surface-border">
        <div className="max-w-4xl mx-auto px-4">
          <h2 className="text-3xl font-bold text-white">Ready to examine your documents?</h2>
          <p className="text-sm text-slate-400 mt-2">
            Upload your technical documents and experience reliable, grounded document intelligence.
          </p>
          <div className="mt-6 flex justify-center gap-4">
            <Link
              to="/chat"
              className="px-6 py-2.5 rounded-xl bg-primary-600 hover:bg-primary-500 text-white font-medium text-xs transition-colors"
            >
              Open AI Chat Workspace &rarr;
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
};
