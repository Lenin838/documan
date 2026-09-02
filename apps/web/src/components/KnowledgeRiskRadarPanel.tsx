import React, { useEffect, useState } from 'react';
import type { ProjectKnowledgeRiskData } from '../features/documents/health.types';
import { fetchProjectKnowledgeRisk } from '../features/documents/health.api';

interface KnowledgeRiskRadarPanelProps {
  projectId: string;
  onSelectDocument?: (documentId: string) => void;
}

export const KnowledgeRiskRadarPanel: React.FC<KnowledgeRiskRadarPanelProps> = ({
  projectId,
  onSelectDocument,
}) => {
  const [data, setData] = useState<ProjectKnowledgeRiskData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);

  useEffect(() => {
    let isMounted = true;
    fetchProjectKnowledgeRisk(projectId, page, 10)
      .then((res) => {
        if (isMounted) {
          setData(res);
          setLoading(false);
        }
      })
      .catch((err: unknown) => {
        if (isMounted) {
          setError(err instanceof Error ? err.message : 'Failed to load project risk radar.');
          setLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [projectId, page]);

  if (loading) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm text-center text-xs text-gray-500">
        Loading Project Knowledge Risk Radar...
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-xs text-rose-700">
        {error || 'Failed to load risk radar.'}
      </div>
    );
  }

  const getRiskBadge = (level: string) => {
    switch (level) {
      case 'LOW':
        return 'bg-emerald-100 text-emerald-800 border-emerald-300';
      case 'MEDIUM':
        return 'bg-amber-100 text-amber-800 border-amber-300';
      case 'HIGH':
        return 'bg-orange-100 text-orange-800 border-orange-300';
      case 'CRITICAL':
        return 'bg-rose-100 text-rose-800 border-rose-300';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  return (
    <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden space-y-6 p-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-gray-100 pb-4">
        <div>
          <h2 className="text-base font-bold text-gray-900">Technical Knowledge Risk Radar</h2>
          <p className="text-xs text-gray-500">
            Permission-aware project documentation risk & health distribution
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <div className="text-right">
            <span className="text-xs text-gray-500 block">Avg Risk Score</span>
            <span className="text-lg font-extrabold text-gray-900">{data.averageRiskScore} / 100</span>
          </div>
          <div className="h-8 w-px bg-gray-200"></div>
          <div className="text-right">
            <span className="text-xs text-gray-500 block">Visible Docs</span>
            <span className="text-lg font-bold text-gray-900">{data.visibleDocumentCount}</span>
          </div>
        </div>
      </div>

      {/* Risk Distribution Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="rounded-lg border border-emerald-200 bg-emerald-50/50 p-3 text-center">
          <span className="text-xs font-medium text-emerald-800 block">LOW</span>
          <span className="text-xl font-extrabold text-emerald-900">{data.riskDistribution.LOW}</span>
        </div>
        <div className="rounded-lg border border-amber-200 bg-amber-50/50 p-3 text-center">
          <span className="text-xs font-medium text-amber-800 block">MEDIUM</span>
          <span className="text-xl font-extrabold text-amber-900">{data.riskDistribution.MEDIUM}</span>
        </div>
        <div className="rounded-lg border border-orange-200 bg-orange-50/50 p-3 text-center">
          <span className="text-xs font-medium text-orange-800 block">HIGH</span>
          <span className="text-xl font-extrabold text-orange-900">{data.riskDistribution.HIGH}</span>
        </div>
        <div className="rounded-lg border border-rose-200 bg-rose-50/50 p-3 text-center">
          <span className="text-xs font-medium text-rose-800 block">CRITICAL</span>
          <span className="text-xl font-extrabold text-rose-900">{data.riskDistribution.CRITICAL}</span>
        </div>
      </div>

      {/* Unassigned Steward Warning */}
      {data.unassignedStewardCount > 0 && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800 flex items-center justify-between">
          <span>
            ⚠️ <strong>{data.unassignedStewardCount}</strong> document(s) in this project have no explicit technical steward assigned.
          </span>
        </div>
      )}

      {/* High Risk Roster Table */}
      <div className="space-y-3">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500">
          High & Critical Risk Roster ({data.pagination.totalHighRisk})
        </h3>

        {data.highRiskDocuments.length === 0 ? (
          <p className="text-xs text-gray-400 italic py-2">
            No HIGH or CRITICAL risk documents detected in this project.
          </p>
        ) : (
          <div className="overflow-x-auto border border-gray-200 rounded-lg">
            <table className="min-w-full divide-y divide-gray-200 text-xs">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2.5 text-left font-semibold text-gray-600">Document Title</th>
                  <th className="px-4 py-2.5 text-left font-semibold text-gray-600">Risk Score</th>
                  <th className="px-4 py-2.5 text-left font-semibold text-gray-600">Primary Remediation</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {data.highRiskDocuments.map((doc) => (
                  <tr
                    key={doc.documentId}
                    onClick={() => onSelectDocument?.(doc.documentId)}
                    className="hover:bg-gray-50 cursor-pointer transition"
                  >
                    <td className="px-4 py-2.5 font-medium text-gray-900">{doc.title}</td>
                    <td className="px-4 py-2.5 whitespace-nowrap">
                      <span
                        className={`px-2 py-0.5 rounded text-xs font-bold border ${getRiskBadge(
                          doc.riskLevel,
                        )}`}
                      >
                        {doc.riskScore} ({doc.riskLevel})
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-gray-600">
                      {doc.primaryRemediation || 'Review document health'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {data.pagination.totalPages > 1 && (
          <div className="flex items-center justify-between pt-2 text-xs text-gray-500">
            <span>
              Page {data.pagination.page} of {data.pagination.totalPages}
            </span>
            <div className="flex space-x-2">
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="px-2.5 py-1 border rounded text-gray-600 hover:bg-gray-100 disabled:opacity-40"
              >
                Previous
              </button>
              <button
                disabled={page >= data.pagination.totalPages}
                onClick={() => setPage((p) => p + 1)}
                className="px-2.5 py-1 border rounded text-gray-600 hover:bg-gray-100 disabled:opacity-40"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
