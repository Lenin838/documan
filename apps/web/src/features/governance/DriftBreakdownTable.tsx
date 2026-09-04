import { useState } from 'react';
import type { DocumentDriftDetail, RelationshipDriftDetail } from './baseline.types';

interface DriftBreakdownTableProps {
  projectId: string;
  driftedDocuments: DocumentDriftDetail[];
  relationshipDrifts: RelationshipDriftDetail[];
  onTriggerPlan: (documentId: string, versionNumber: number) => Promise<void>;
  isOwnerOrAdmin: boolean;
}

export function DriftBreakdownTable({
  driftedDocuments,
  relationshipDrifts,
  onTriggerPlan,
  isOwnerOrAdmin,
}: DriftBreakdownTableProps) {
  const [triggeringDocId, setTriggeringDocId] = useState<string | null>(null);

  const handleTrigger = async (docId: string, verNum?: number) => {
    if (!verNum) return;
    setTriggeringDocId(docId);
    try {
      await onTriggerPlan(docId, verNum);
    } finally {
      setTriggeringDocId(null);
    }
  };

  const hasNoDrift = driftedDocuments.length === 0 && relationshipDrifts.length === 0;

  if (hasNoDrift) {
    return (
      <div className="bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900 rounded-xl p-6 text-center my-4">
        <div className="text-emerald-800 dark:text-emerald-300 font-semibold text-sm">
          ✓ Authoritative Baseline Verification Passed
        </div>
        <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-1">
          Current documentation state is 100% synchronized with the active baseline lock.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 my-4">
      {driftedDocuments.length > 0 && (
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl overflow-hidden shadow-xs">
          <div className="px-5 py-3.5 border-b border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/30 flex items-center justify-between">
            <h4 className="text-sm font-bold text-gray-900 dark:text-gray-100">
              Document Drift Breakdown ({driftedDocuments.length})
            </h4>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-gray-100/70 dark:bg-gray-800/60 text-gray-600 dark:text-gray-400 font-semibold border-b border-gray-200 dark:border-gray-800">
                <tr>
                  <th className="px-4 py-2.5">Document</th>
                  <th className="px-4 py-2.5">Baseline vs Current</th>
                  <th className="px-4 py-2.5">Drift Dimensions</th>
                  <th className="px-4 py-2.5">Severity</th>
                  <th className="px-4 py-2.5">Details</th>
                  {isOwnerOrAdmin && <th className="px-4 py-2.5 text-right">Action</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {driftedDocuments.map((doc) => (
                  <tr key={doc.documentId} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/30">
                    <td className="px-4 py-3 font-semibold text-gray-900 dark:text-gray-100">
                      {doc.documentTitle}
                    </td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-400 font-mono">
                      v{doc.baselineVersionNumber ?? '-'} → v{doc.currentVersionNumber ?? '-'}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {doc.driftDimensions.map((dim) => (
                          <span key={dim} className="px-1.5 py-0.5 text-[10px] font-medium rounded bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300">
                            {dim}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full ${doc.severity === 'BLOCKING' ? 'bg-rose-100 text-rose-800 dark:bg-rose-950/40 dark:text-rose-400' : 'bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-400'}`}>
                        {doc.severity}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-500 dark:text-gray-400 max-w-xs truncate">
                      {doc.details.join(' ')}
                    </td>
                    {isOwnerOrAdmin && (
                      <td className="px-4 py-3 text-right whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => handleTrigger(doc.documentId, doc.currentVersionNumber || doc.baselineVersionNumber)}
                          disabled={triggeringDocId === doc.documentId}
                          className="px-2.5 py-1 text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 rounded border border-indigo-200 dark:border-indigo-800 transition-colors disabled:opacity-50"
                        >
                          {triggeringDocId === doc.documentId ? 'Triggering...' : 'Trigger Verification Plan'}
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {relationshipDrifts.length > 0 && (
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl overflow-hidden shadow-xs">
          <div className="px-5 py-3.5 border-b border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/30">
            <h4 className="text-sm font-bold text-gray-900 dark:text-gray-100">
              Relationship Topology Drift ({relationshipDrifts.length})
            </h4>
          </div>
          <div className="p-4 space-y-2 text-xs">
            {relationshipDrifts.map((rel, idx) => (
              <div key={idx} className="flex items-center justify-between p-2.5 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                <span className="text-gray-700 dark:text-gray-300 font-mono">
                  [{rel.changeType}] Type: {rel.relationshipType}
                </span>
                <span className="text-gray-500 dark:text-gray-400">{rel.details}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
