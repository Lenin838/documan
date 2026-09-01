import { useEffect, useState, useCallback } from 'react';
import type {
  ProjectGovernanceResponse,
  GovernanceEvaluationResult,
} from '../features/governance/governance.types';
import {
  getProjectGovernance,
  updateProjectGovernance,
  evaluateProjectGovernance,
} from '../features/governance/governance.api';

interface GovernanceSectionProps {
  projectId: string;
  isOwnerOrAdmin: boolean;
}

export function GovernanceSection({
  projectId,
  isOwnerOrAdmin,
}: GovernanceSectionProps) {
  const [data, setData] = useState<ProjectGovernanceResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [evaluating, setEvaluating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [evalResult, setEvalResult] = useState<GovernanceEvaluationResult | null>(null);

  const loadData = useCallback(async () => {
    try {
      const res = await getProjectGovernance(projectId);
      setData(res);
      setError(null);
    } catch (err: unknown) {
      setError((err as Error).message || 'Failed to load governance metrics');
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    let active = true;
    getProjectGovernance(projectId)
      .then((res) => {
        if (active) {
          setData(res);
          setError(null);
          setLoading(false);
        }
      })
      .catch((err: unknown) => {
        if (active) {
          setError((err as Error).message || 'Failed to load governance metrics');
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [projectId]);

  const handleToggleGovernance = async (enabled: boolean) => {
    if (!data) return;
    try {
      setSaving(true);
      const updated = await updateProjectGovernance(projectId, {
        isGovernanceEnabled: enabled,
      });
      setData(updated);
    } catch (err: unknown) {
      alert((err as Error).message || 'Failed to update governance settings');
    } finally {
      setSaving(false);
    }
  };

  const handleMaxDaysChange = async (days: number) => {
    if (!data) return;
    try {
      setSaving(true);
      const updated = await updateProjectGovernance(projectId, {
        maxUnreviewedDays: days,
      });
      setData(updated);
    } catch (err: unknown) {
      alert((err as Error).message || 'Failed to update threshold');
    } finally {
      setSaving(false);
    }
  };

  const handleEvaluate = async () => {
    try {
      setEvaluating(true);
      const res = await evaluateProjectGovernance(projectId);
      setEvalResult(res);
      await loadData();
    } catch (err: unknown) {
      alert((err as Error).message || 'Failed to evaluate governance');
    } finally {
      setEvaluating(false);
    }
  };

  if (loading) {
    return <div className="p-4 text-sm text-gray-500">Loading documentation governance...</div>;
  }

  if (error || !data) {
    return <div className="p-4 text-sm text-red-500">{error || 'Governance unavailable'}</div>;
  }

  const { health, governanceSettings } = data;

  return (
    <div className="bg-white rounded-lg border p-6 space-y-6 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">
            Documentation Governance & Health
          </h3>
          <p className="text-sm text-gray-500">
            Automated staleness policies and documentation freshness tracking.
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <span
            className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${
              health.freshnessPercentage >= 80
                ? 'bg-green-100 text-green-800'
                : health.freshnessPercentage >= 50
                ? 'bg-yellow-100 text-yellow-800'
                : 'bg-red-100 text-red-800'
            }`}
          >
            {health.freshnessPercentage}% Fresh
          </span>

          {isOwnerOrAdmin && (
            <button
              onClick={() => void handleEvaluate()}
              disabled={evaluating}
              className="px-3 py-1.5 bg-blue-600 text-white rounded text-xs font-medium hover:bg-blue-700 disabled:opacity-50"
            >
              {evaluating ? 'Evaluating...' : 'Evaluate Now'}
            </button>
          )}
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-3 bg-gray-50 rounded border text-center">
          <div className="text-xl font-bold text-gray-800">{health.totalDocuments}</div>
          <div className="text-xs text-gray-500">Total Documents</div>
        </div>
        <div className="p-3 bg-gray-50 rounded border text-center">
          <div className="text-xl font-bold text-gray-800">{health.eligibleDocuments}</div>
          <div className="text-xs text-gray-500">Tracked Documents</div>
        </div>
        <div className="p-3 bg-green-50 rounded border text-center">
          <div className="text-xl font-bold text-green-700">{health.approvedFreshCount}</div>
          <div className="text-xs text-green-600">Fresh Approved</div>
        </div>
        <div className="p-3 bg-amber-50 rounded border text-center">
          <div className="text-xl font-bold text-amber-700">{health.staleCount}</div>
          <div className="text-xs text-amber-600">Stale / Needs Review</div>
        </div>
      </div>

      {/* Governance Settings Form (Owner/Admin only) */}
      {isOwnerOrAdmin && (
        <div className="pt-4 border-t space-y-4">
          <h4 className="text-sm font-semibold text-gray-800">Project Staleness Policy</h4>
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-700">Automated Governance Engine</span>
            <input
              type="checkbox"
              checked={governanceSettings.isGovernanceEnabled}
              disabled={saving}
              onChange={(e) => void handleToggleGovernance(e.target.checked)}
              aria-label="Automated Governance Engine"
              className="h-4 w-4 text-blue-600 rounded"
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <span className="text-sm text-gray-700">Max Unreviewed Threshold</span>
              <p className="text-xs text-gray-500">
                Flag documents as STALE if unreviewed for more than X days
              </p>
            </div>
            <select
              value={governanceSettings.maxUnreviewedDays}
              disabled={saving || !governanceSettings.isGovernanceEnabled}
              onChange={(e) => void handleMaxDaysChange(Number(e.target.value))}
              aria-label="Max Unreviewed Threshold"
              className="px-2 py-1 border rounded text-xs text-gray-800 bg-white"
            >
              <option value={14}>14 Days</option>
              <option value={30}>30 Days</option>
              <option value={60}>60 Days</option>
              <option value={90}>90 Days (Default)</option>
              <option value={180}>180 Days</option>
              <option value={365}>365 Days</option>
            </select>
          </div>
        </div>
      )}

      {/* Evaluation Results Banner */}
      {evalResult && (
        <div className="p-3 bg-blue-50 border border-blue-200 rounded text-xs text-blue-800 space-y-1">
          <div className="font-semibold">
            Evaluation Complete: Evaluated {evalResult.evaluatedDocumentsCount} documents, {evalResult.staleTransitionsCount} transitioned to STALE.
          </div>
          {evalResult.transitions.map((t) => (
            <div key={t.documentId} className="ml-2">
              • <strong>{t.title}</strong>: {t.reason}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
