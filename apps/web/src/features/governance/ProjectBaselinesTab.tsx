import { useEffect, useState, useCallback } from 'react';
import type { DocumentationBaseline, DriftReport } from './baseline.types';
import {
  getProjectBaselines,
  compareBaseline,
  createBaseline,
  triggerDriftVerificationPlan,
  archiveBaseline,
} from './baseline.api';
import { BaselineDriftSummaryCard } from './BaselineDriftSummaryCard';
import { DriftBreakdownTable } from './DriftBreakdownTable';
import { CreateBaselineModal } from './CreateBaselineModal';

interface ProjectBaselinesTabProps {
  projectId: string;
  isOwnerOrAdmin: boolean;
}

export function ProjectBaselinesTab({
  projectId,
  isOwnerOrAdmin,
}: ProjectBaselinesTabProps) {
  const [baselines, setBaselines] = useState<DocumentationBaseline[]>([]);
  const [driftReport, setDriftReport] = useState<DriftReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [showModal, setShowModal] = useState(false);

  const refreshData = useCallback(async () => {
    try {
      const [baselinesRes, driftRes] = await Promise.all([
        getProjectBaselines(projectId),
        compareBaseline(projectId).catch(() => null),
      ]);
      setBaselines(baselinesRes);
      setDriftReport(driftRes);
      setError(null);
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } }; message?: string };
      setError(e?.response?.data?.message || e.message || 'Failed to load baseline data');
    }
  }, [projectId]);

  useEffect(() => {
    let active = true;
    Promise.all([
      getProjectBaselines(projectId),
      compareBaseline(projectId).catch(() => null),
    ])
      .then(([baselinesRes, driftRes]) => {
        if (active) {
          setBaselines(baselinesRes);
          setDriftReport(driftRes);
          setError(null);
          setLoading(false);
        }
      })
      .catch((err: unknown) => {
        if (active) {
          const e = err as { response?: { data?: { message?: string } }; message?: string };
          setError(e?.response?.data?.message || e.message || 'Failed to load baseline data');
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [projectId]);

  const handleCreateBaseline = async (data: { name: string; versionTag: string; description?: string }) => {
    await createBaseline(projectId, data);
    await refreshData();
  };

  const handleTriggerPlan = async (documentId: string, versionNumber: number) => {
    await triggerDriftVerificationPlan(projectId, documentId, versionNumber);
    await refreshData();
  };

  const handleArchiveBaseline = async (baselineId: string) => {
    if (!confirm('Are you sure you want to archive this historical baseline?')) return;
    try {
      await archiveBaseline(projectId, baselineId);
      await refreshData();
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } }; message?: string };
      alert(e?.response?.data?.message || e.message || 'Failed to archive baseline');
    }
  };

  if (loading) {
    return (
      <div className="p-8 text-center text-xs text-gray-500 dark:text-gray-400">
        Loading authoritative baselines...
      </div>
    );
  }

  const activeBaseline = baselines.find((b) => b.isActive);

  return (
    <div className="space-y-6">
      {error && (
        <div className="p-4 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900 rounded-xl text-xs text-rose-700 dark:text-rose-400">
          {error}
        </div>
      )}

      <BaselineDriftSummaryCard
        driftReport={driftReport}
        onRefresh={() => void refreshData()}
        onCreateBaseline={() => setShowModal(true)}
        isOwnerOrAdmin={isOwnerOrAdmin}
      />

      {driftReport && driftReport.hasActiveBaseline && (
        <DriftBreakdownTable
          projectId={projectId}
          driftedDocuments={driftReport.driftedDocuments}
          relationshipDrifts={driftReport.relationshipDrifts}
          onTriggerPlan={handleTriggerPlan}
          isOwnerOrAdmin={isOwnerOrAdmin}
        />
      )}

      {/* Baseline History */}
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-6 shadow-xs">
        <h4 className="text-sm font-bold text-gray-900 dark:text-gray-100 mb-4">
          Baseline Version History ({baselines.length})
        </h4>

        {baselines.length === 0 ? (
          <p className="text-xs text-gray-500 dark:text-gray-400">
            No baseline snapshots recorded yet.
          </p>
        ) : (
          <div className="divide-y divide-gray-100 dark:divide-gray-800">
            {baselines.map((b) => (
              <div key={b._id} className="py-3.5 flex items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-xs text-gray-900 dark:text-gray-100">
                      {b.name}
                    </span>
                    <span className="font-mono text-[11px] px-2 py-0.5 rounded bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300">
                      {b.versionTag}
                    </span>
                    {b.isActive && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-800">
                        ACTIVE
                      </span>
                    )}
                    {b.isArchived && (
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400">
                        ARCHIVED
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    {b.description || 'No description provided.'} • {b.documentSnapshots.length} docs, {b.relationshipSnapshots.length} relationships • Created {new Date(b.createdAt).toLocaleDateString()}
                  </p>
                </div>

                {isOwnerOrAdmin && !b.isActive && !b.isArchived && (
                  <button
                    type="button"
                    onClick={() => void handleArchiveBaseline(b._id)}
                    className="px-2.5 py-1 text-xs text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded transition-colors"
                  >
                    Archive
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <CreateBaselineModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        onSubmit={handleCreateBaseline}
        isRebaseline={!!activeBaseline}
      />
    </div>
  );
}
