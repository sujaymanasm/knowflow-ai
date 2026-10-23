import React, { useState, useEffect } from 'react';
import {
  CheckCircle2,
  XCircle,
  Play,
  RotateCw,
  BarChart2,
  Clock,
  ShieldCheck,
  Target,
  Loader2,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  Info
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Cell
} from 'recharts';
import { api } from '../lib/api';
import { useWorkspace } from '../context/WorkspaceContext';
import { EvaluationRun } from '../types/api';
import { formatDate } from '../lib/utils';

export const EvaluationsPage: React.FC = () => {
  const { currentWorkspace } = useWorkspace();

  const [runs, setRuns] = useState<EvaluationRun[]>([]);
  const [selectedRun, setSelectedRun] = useState<EvaluationRun | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isRunningEval, setIsRunningEval] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Expanded example inspection
  const [expandedExampleId, setExpandedExampleId] = useState<string | null>(null);

  const loadEvaluations = async () => {
    if (!currentWorkspace) return;
    setIsLoading(true);
    setError(null);
    try {
      const data = await api.listEvaluations(currentWorkspace.id);
      setRuns(data);
      if (data.length > 0) {
        setSelectedRun(data[0]);
      } else {
        setSelectedRun(null);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load evaluation runs');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadEvaluations();
  }, [currentWorkspace?.id]);

  const handleRunBenchmark = async () => {
    if (!currentWorkspace || isRunningEval) return;
    setIsRunningEval(true);
    setError(null);

    try {
      const newRun = await api.triggerEvaluation(currentWorkspace.id, "Standard RAG Benchmark Suite");
      setRuns([newRun, ...runs]);
      setSelectedRun(newRun);
    } catch (err: any) {
      setError(err.message || 'Evaluation run failed');
    } finally {
      setIsRunningEval(false);
    }
  };

  const chartData = selectedRun
    ? [
        { metric: 'Recall@k', value: Math.round(selectedRun.recall_at_k * 100), fill: '#3b82f6' },
        { metric: 'MRR', value: Math.round(selectedRun.mrr * 100), fill: '#06b6d4' },
        { metric: 'Faithfulness', value: Math.round(selectedRun.faithfulness_score * 100), fill: '#10b981' },
      ]
    : [];

  return (
    <div className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">RAG Evaluation Suite</h1>
          <p className="text-xs text-slate-400 mt-1">
            Deterministic benchmarking of retrieval recall, MRR, latency, and grounded citation faithfulness.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={loadEvaluations}
            disabled={isLoading || isRunningEval}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-surface border border-surface-border text-slate-300 hover:text-white text-xs font-medium transition-colors"
          >
            <RotateCw className="w-3.5 h-3.5" />
            <span>Refresh</span>
          </button>

          <button
            onClick={handleRunBenchmark}
            disabled={isRunningEval}
            className="flex items-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-500 disabled:opacity-50 text-white text-xs font-medium rounded-lg transition-colors shadow-lg shadow-primary-600/20"
          >
            {isRunningEval ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Executing Benchmark...</span>
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>Run Evaluation Benchmark</span>
              </>
            )}
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-400 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {isLoading ? (
        <div className="py-24 text-center space-y-2">
          <Loader2 className="w-8 h-8 text-primary-400 animate-spin mx-auto" />
          <p className="text-xs text-slate-400">Loading benchmark results...</p>
        </div>
      ) : !selectedRun ? (
        <div className="py-16 text-center bg-surface/30 rounded-2xl border border-surface-border p-8 space-y-4 max-w-xl mx-auto">
          <BarChart2 className="w-12 h-12 text-primary-400 mx-auto" />
          <div>
            <h3 className="text-base font-bold text-white">No Evaluation Runs Yet</h3>
            <p className="text-xs text-slate-400 mt-1">
              Execute the standard RAG benchmark suite to test retrieval hit rates, citation accuracy, and average pipeline latency against your workspace documents.
            </p>
          </div>
          <button
            onClick={handleRunBenchmark}
            disabled={isRunningEval}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary-600 hover:bg-primary-500 text-white text-xs font-medium rounded-xl transition-colors shadow-lg shadow-primary-600/20"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>Run Benchmark Suite Now</span>
          </button>
        </div>
      ) : (
        <>
          {/* Key Metrics Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Recall@k */}
            <div className="p-5 rounded-xl bg-surface border border-surface-border">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-slate-400">Recall @ k=4</span>
                <Target className="w-4 h-4 text-primary-400" />
              </div>
              <div className="mt-2 text-2xl font-bold text-white">
                {(selectedRun.recall_at_k * 100).toFixed(1)}%
              </div>
              <p className="text-[11px] text-slate-500 mt-1">Relevant chunk retrieved in top-k</p>
            </div>

            {/* Mean Reciprocal Rank */}
            <div className="p-5 rounded-xl bg-surface border border-surface-border">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-slate-400">Mean Reciprocal Rank (MRR)</span>
                <BarChart2 className="w-4 h-4 text-accent-cyan" />
              </div>
              <div className="mt-2 text-2xl font-bold text-accent-cyan">
                {selectedRun.mrr.toFixed(3)}
              </div>
              <p className="text-[11px] text-slate-500 mt-1">Rank score of first relevant chunk</p>
            </div>

            {/* Faithfulness Score */}
            <div className="p-5 rounded-xl bg-surface border border-surface-border">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-slate-400">Citation Faithfulness</span>
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
              </div>
              <div className="mt-2 text-2xl font-bold text-emerald-400">
                {(selectedRun.faithfulness_score * 100).toFixed(1)}%
              </div>
              <p className="text-[11px] text-slate-500 mt-1">Claims backed by verified citations</p>
            </div>

            {/* Average Latency */}
            <div className="p-5 rounded-xl bg-surface border border-surface-border">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-slate-400">Avg Pipeline Latency</span>
                <Clock className="w-4 h-4 text-amber-400" />
              </div>
              <div className="mt-2 text-2xl font-bold text-amber-400">
                {selectedRun.avg_latency_ms}ms
              </div>
              <p className="text-[11px] text-slate-500 mt-1">End-to-end query to answer</p>
            </div>
          </div>

          {/* Chart & Past Runs List */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Chart: Accuracy & Quality Distribution */}
            <div className="lg:col-span-7 p-6 rounded-xl bg-surface border border-surface-border">
              <h3 className="text-sm font-semibold text-white mb-1">Benchmark Metric Scores (%)</h3>
              <p className="text-xs text-slate-400 mb-4">Calculated across {selectedRun.total_examples} standard test questions</p>

              <div className="h-52 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 10, right: 20, left: -10, bottom: 5 }}>
                    <XAxis dataKey="metric" stroke="#94a3b8" fontSize={11} />
                    <YAxis domain={[0, 100]} stroke="#64748b" fontSize={11} unit="%" />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#111726', borderColor: '#1e293b', borderRadius: '8px', fontSize: '12px' }}
                      formatter={(val: any) => [`${val}%`, 'Score']}
                    />
                    <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                      {chartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Past Runs Selector */}
            <div className="lg:col-span-5 p-6 rounded-xl bg-surface border border-surface-border flex flex-col justify-between">
              <div>
                <h3 className="text-sm font-semibold text-white mb-3">Historical Evaluation Runs</h3>
                <div className="space-y-2 max-h-56 overflow-y-auto">
                  {runs.map((r) => (
                    <button
                      key={r.id}
                      onClick={() => setSelectedRun(r)}
                      className={`w-full text-left p-3 rounded-lg border text-xs transition-colors flex items-center justify-between ${
                        selectedRun.id === r.id
                          ? 'bg-primary-500/10 border-primary-500 text-primary-200'
                          : 'bg-background/40 border-surface-border text-slate-400 hover:border-slate-600'
                      }`}
                    >
                      <div>
                        <p className="font-semibold text-slate-200">{r.name}</p>
                        <p className="text-[10px] text-slate-500 font-mono">{formatDate(r.created_at)}</p>
                      </div>
                      <div className="text-right font-mono text-[11px]">
                        <span className="text-emerald-400">Recall: {(r.recall_at_k * 100).toFixed(0)}%</span>
                        <p className="text-slate-400">{r.avg_latency_ms}ms</p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              <div className="pt-4 border-t border-surface-border text-[11px] text-slate-500 flex items-center gap-1.5">
                <Info className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span>Deterministic metrics are mathematically computed from ground-truth document targets.</span>
              </div>
            </div>
          </div>

          {/* Detailed Test Examples Table */}
          <div className="p-6 rounded-xl bg-surface border border-surface-border">
            <h3 className="text-sm font-semibold text-white mb-4">
              Individual Benchmark Test Examples ({selectedRun.examples.length})
            </h3>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-surface-border text-slate-400 font-mono text-[10px] uppercase">
                    <th className="pb-3 px-3">Question</th>
                    <th className="pb-3 px-3">Retrieved Document</th>
                    <th className="pb-3 px-3">Hit @ k</th>
                    <th className="pb-3 px-3">Reciprocal Rank</th>
                    <th className="pb-3 px-3">Citation Verified</th>
                    <th className="pb-3 px-3 text-right">Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-border/50">
                  {selectedRun.examples.map((ex) => {
                    const isExpanded = expandedExampleId === ex.id;

                    return (
                      <React.Fragment key={ex.id}>
                        <tr className="hover:bg-surface-muted/30 transition-colors">
                          <td className="py-3 px-3 font-medium text-slate-200 max-w-[260px] truncate">
                            {ex.question}
                          </td>
                          <td className="py-3 px-3 text-slate-400 max-w-[200px] truncate">
                            {ex.retrieved_doc_title || 'None'}
                          </td>
                          <td className="py-3 px-3">
                            {ex.hit_at_k ? (
                              <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                                <CheckCircle2 className="w-3 h-3" /> PASS
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded border border-rose-500/20">
                                <XCircle className="w-3 h-3" /> MISS
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-3 font-mono text-[11px] text-slate-300">
                            {ex.reciprocal_rank.toFixed(2)}
                          </td>
                          <td className="py-3 px-3">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-medium ${
                                ex.citation_verified
                                  ? 'text-emerald-400 bg-emerald-500/10'
                                  : 'text-amber-400 bg-amber-500/10'
                              }`}
                            >
                              {ex.citation_verified ? 'Verified' : 'Uncited'}
                            </span>
                          </td>
                          <td className="py-3 px-3 text-right">
                            <button
                              onClick={() => setExpandedExampleId(isExpanded ? null : ex.id)}
                              className="text-primary-400 hover:text-primary-300 font-medium inline-flex items-center gap-1"
                            >
                              <span>{isExpanded ? 'Hide' : 'Inspect'}</span>
                              {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                            </button>
                          </td>
                        </tr>

                        {/* Expanded Drawer */}
                        {isExpanded && (
                          <tr className="bg-background/40">
                            <td colSpan={6} className="p-4 space-y-2 border-b border-surface-border">
                              <div>
                                <span className="text-[10px] font-mono text-slate-500 uppercase">Test Intent / Notes:</span>
                                <p className="text-xs text-slate-300">{ex.notes}</p>
                              </div>
                              <div className="pt-2">
                                <span className="text-[10px] font-mono text-primary-400 uppercase">Generated Grounded Answer:</span>
                                <div className="mt-1 p-3 rounded-lg bg-surface border border-surface-border text-xs text-slate-200 whitespace-pre-wrap leading-relaxed">
                                  {ex.generated_answer || 'No answer recorded.'}
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
