/* eslint-disable @typescript-eslint/no-explicit-any, react-hooks/exhaustive-deps, react-hooks/set-state-in-effect */
import React, { useState, useEffect, useCallback } from 'react';
import {
  fetchSystemGovernanceTimeline,
  fetchHistoricalSystemGate,
} from '../system-governance-lineage.api.js';
import type {
  SystemGovernanceTimelineResult,
  HistoricalSystemGateResult,
  TimelineEntry,
} from '../system-governance-lineage.types.js';

interface SystemGovernanceLineageTimelineProps {
  projectId: string;
}

export const SystemGovernanceLineageTimeline: React.FC<SystemGovernanceLineageTimelineProps> = ({
  projectId,
}) => {
  const [timelineData, setTimelineData] = useState<SystemGovernanceTimelineResult | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Point-in-time historical evaluation state
  const [selectedTimestamp, setSelectedTimestamp] = useState<string>('');
  const [historicalGateResult, setHistoricalGateResult] = useState<HistoricalSystemGateResult | null>(null);
  const [evaluatingHistorical, setEvaluatingHistorical] = useState<boolean>(false);

  const loadTimeline = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await fetchSystemGovernanceTimeline(projectId);
      setTimelineData(data);
    } catch (err: unknown) {
      const errorObj = err as { response?: { data?: { message?: string } }; message?: string };
      setError(errorObj?.response?.data?.message || errorObj.message || 'Failed to load governance timeline');
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    if (projectId) {
      void loadTimeline();
    }
  }, [projectId, loadTimeline]);

  const handleEvaluateHistorical = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTimestamp) return;
    try {
      setEvaluatingHistorical(true);
      const result = await fetchHistoricalSystemGate(projectId, selectedTimestamp);
      setHistoricalGateResult(result);
    } catch (err: unknown) {
      const errorObj = err as { response?: { data?: { message?: string } }; message?: string };
      alert(errorObj?.response?.data?.message || errorObj.message || 'Failed to evaluate historical gate');
    } finally {
      setEvaluatingHistorical(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PASSED':
        return <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">PASSED</span>;
      case 'PASSED_WITH_WAIVER':
        return <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-500/20 text-amber-400 border border-amber-500/30">PASSED_WITH_WAIVER</span>;
      case 'BLOCKED':
        return <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-rose-500/20 text-rose-400 border border-rose-500/30">BLOCKED</span>;
      case 'INDETERMINATE':
      default:
        return <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-slate-500/20 text-slate-400 border border-slate-500/30">{status}</span>;
    }
  };

  const getCausalityBadge = (causality: string) => {
    switch (causality) {
      case 'PROVEN_CAUSALITY':
        return <span className="px-2 py-0.5 rounded text-xs font-medium bg-purple-500/20 text-purple-300 border border-purple-500/30">PROVEN_CAUSALITY</span>;
      case 'ASSOCIATED_EVENT':
        return <span className="px-2 py-0.5 rounded text-xs font-medium bg-blue-500/20 text-blue-300 border border-blue-500/30">ASSOCIATED_EVENT</span>;
      case 'OBSERVED_EVENT':
      default:
        return <span className="px-2 py-0.5 rounded text-xs font-medium bg-slate-500/20 text-slate-400 border border-slate-500/30">OBSERVED_EVENT</span>;
    }
  };

  return (
    <div className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-6 backdrop-blur-md shadow-xl text-slate-100 space-y-6">
      <div className="flex items-center justify-between border-b border-slate-800 pb-4">
        <div>
          <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
            <span>System Governance Lineage & Longitudinal Timeline</span>
            <span className="text-xs font-mono font-normal px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
              Phase 22
            </span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Historical point-in-time gate reconstruction, causal transition attribution, and state-diff lineage engine.
          </p>
        </div>
        <button
          onClick={() => void loadTimeline()}
          disabled={loading}
          className="px-3 py-1.5 rounded-lg bg-indigo-600/80 hover:bg-indigo-500 text-xs font-medium transition-all shadow-md disabled:opacity-50"
        >
          {loading ? 'Refreshing...' : 'Refresh Timeline'}
        </button>
      </div>

      {/* Point-in-Time Historical Inspector Bar */}
      <form onSubmit={(e) => void handleEvaluateHistorical(e)} className="bg-slate-950/40 p-4 rounded-lg border border-slate-800 flex flex-wrap items-center gap-4">
        <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
          Point-in-Time Historical Gate Inspector:
        </span>
        <input
          type="datetime-local"
          value={selectedTimestamp}
          onChange={(e) => setSelectedTimestamp(e.target.value)}
          className="px-3 py-1.5 rounded bg-slate-900 border border-slate-700 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
        />
        <button
          type="submit"
          disabled={evaluatingHistorical || !selectedTimestamp}
          className="px-4 py-1.5 rounded bg-emerald-600 hover:bg-emerald-500 text-xs font-medium text-white transition-all shadow disabled:opacity-50"
        >
          {evaluatingHistorical ? 'Evaluating T_hist...' : 'Evaluate at T'}
        </button>
      </form>

      {/* Historical Evaluation Results Panel */}
      {historicalGateResult && (
        <div className="bg-slate-950/60 p-4 rounded-lg border border-indigo-500/30 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-indigo-300">
              HISTORICAL RECONSTRUCTION AT {new Date(historicalGateResult.evaluatedAtTimestamp).toLocaleString()}
            </span>
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400">Reconstruction Completeness:</span>
              <span className={`text-xs font-semibold ${historicalGateResult.reconstructionCompleteness === 'COMPLETE' ? 'text-emerald-400' : 'text-amber-400'}`}>
                {historicalGateResult.reconstructionCompleteness}
              </span>
            </div>
          </div>
          {historicalGateResult.completenessReason && (
            <p className="text-xs text-amber-300 bg-amber-500/10 p-2 rounded border border-amber-500/20">
              Note: {historicalGateResult.completenessReason}
            </p>
          )}
          <div className="flex items-center gap-4 pt-2">
            <span className="text-xs text-slate-400">System Release Status:</span>
            {getStatusBadge(historicalGateResult.systemReleaseStatus)}
            <span className="text-xs text-slate-400 ml-4">Blocking Dependencies:</span>
            <span className="text-xs font-bold text-slate-200">{historicalGateResult.subsystems.blockingDependencies.length}</span>
          </div>
        </div>
      )}

      {/* Error state */}
      {error && (
        <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-lg text-rose-400 text-xs">
          {error}
        </div>
      )}

      {/* Timeline Stream */}
      {loading ? (
        <div className="p-8 text-center text-slate-400 text-xs">Loading historical timeline entries...</div>
      ) : timelineData && timelineData.entries.length === 0 ? (
        <div className="p-8 text-center text-slate-500 text-xs">
          No governance events found in the evaluated 30-day timeline window.
        </div>
      ) : (
        <div className="space-y-4 relative before:absolute before:inset-0 before:left-3.5 before:w-0.5 before:bg-slate-800">
          {timelineData?.entries.map((entry: TimelineEntry) => (
            <div key={entry.entryId} className="relative pl-9 flex flex-col gap-1.5 group">
              <div className="absolute left-2 top-1.5 w-3 h-3 rounded-full bg-slate-700 border-2 border-indigo-400 group-hover:scale-125 transition-all" />
              <div className="bg-slate-950/40 border border-slate-800/80 rounded-lg p-3 hover:border-slate-700 transition-all space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-mono text-slate-400">
                    {new Date(entry.timestamp).toLocaleString()}
                  </span>
                  <div className="flex items-center gap-2">
                    {getCausalityBadge(entry.causalityClassification)}
                    <span className="font-mono text-[10px] text-slate-500 px-1.5 py-0.5 rounded bg-slate-900 border border-slate-800">
                      {entry.eventType}
                    </span>
                  </div>
                </div>

                <p className="text-xs font-medium text-slate-200">{entry.summary}</p>

                {entry.derivedTransition && entry.derivedTransition.gateStateChanged && (
                  <div className="pt-2 border-t border-slate-800/60 flex items-center gap-2 text-xs">
                    <span className="text-slate-400">Derived Gate Transition:</span>
                    {getStatusBadge(entry.derivedTransition.previousStatus)}
                    <span className="text-slate-500">➔</span>
                    {getStatusBadge(entry.derivedTransition.newStatus)}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
