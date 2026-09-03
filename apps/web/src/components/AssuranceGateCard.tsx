import { useEffect, useState } from 'react';
import {
  getDocumentAssurance,
  grantGovernanceWaiver,
  revokeGovernanceWaiver,
} from '../features/assurance/assurance.api';
import type {
  DocumentAssuranceResult,
  AssuranceCheckResult,
} from '../features/assurance/assurance.types';

interface AssuranceGateCardProps {
  documentId: string;
}

export function AssuranceGateCard({ documentId }: AssuranceGateCardProps) {
  const [assuranceData, setAssuranceData] = useState<DocumentAssuranceResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Waiver Modal State
  const [selectedCheck, setSelectedCheck] = useState<AssuranceCheckResult | null>(null);
  const [waiverReason, setWaiverReason] = useState('');
  const [expiresInDays, setExpiresInDays] = useState(30);
  const [submittingWaiver, setSubmittingWaiver] = useState(false);
  const [waiverError, setWaiverError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    if (documentId) {
      getDocumentAssurance(documentId)
        .then((res) => {
          if (active) {
            setAssuranceData(res.data);
            setLoading(false);
          }
        })
        .catch((err: unknown) => {
          if (active) {
            const msg = err && typeof err === 'object' && 'response' in err
              ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
              : 'Failed to load document assurance gate data.';
            setError(msg || 'Failed to load document assurance gate data.');
            setLoading(false);
          }
        });
    }
    return () => {
      active = false;
    };
  }, [documentId]);

  const handleGrantWaiver = async () => {
    if (!selectedCheck || !waiverReason.trim()) return;
    try {
      setSubmittingWaiver(true);
      setWaiverError(null);
      const res = await grantGovernanceWaiver(documentId, selectedCheck.checkId, waiverReason, expiresInDays);
      setAssuranceData(res.data);
      setSelectedCheck(null);
      setWaiverReason('');
    } catch (err: unknown) {
      const msg = err && typeof err === 'object' && 'response' in err
        ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
        : 'Failed to grant governance waiver.';
      setWaiverError(msg || 'Failed to grant governance waiver.');
    } finally {
      setSubmittingWaiver(false);
    }
  };

  const handleRevokeWaiver = async (checkId: string) => {
    try {
      setLoading(true);
      const res = await revokeGovernanceWaiver(documentId, checkId);
      setAssuranceData(res.data);
    } catch (err: unknown) {
      const msg = err && typeof err === 'object' && 'response' in err
        ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
        : 'Failed to revoke waiver.';
      setError(msg || 'Failed to revoke waiver.');
    } finally {
      setLoading(false);
    }
  };

  if (loading && !assuranceData) {
    return (
      <div className="p-6 bg-white rounded-lg border border-gray-200 shadow-sm animate-pulse">
        <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
        <div className="h-4 bg-gray-200 rounded w-2/3"></div>
      </div>
    );
  }

  if (error && !assuranceData) {
    return (
      <div className="p-6 bg-rose-50 border border-rose-200 rounded-lg text-rose-800 text-sm">
        {error}
      </div>
    );
  }

  if (!assuranceData) return null;

  const { status, summary, checks = [], blockingReasons = [], remediations = [] } = assuranceData;

  const getStatusBadge = (st: string) => {
    switch (st) {
      case 'READY':
        return <span className="px-3 py-1 text-xs font-bold rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">READY</span>;
      case 'WARNING':
        return <span className="px-3 py-1 text-xs font-bold rounded-full bg-amber-100 text-amber-800 border border-amber-300">WARNING</span>;
      case 'BLOCKED':
        return <span className="px-3 py-1 text-xs font-bold rounded-full bg-rose-100 text-rose-800 border border-rose-300">BLOCKED</span>;
      case 'GOVERNANCE_DISABLED':
        return <span className="px-3 py-1 text-xs font-bold rounded-full bg-gray-100 text-gray-800 border border-gray-300">GOVERNANCE DISABLED</span>;
      default:
        return <span className="px-3 py-1 text-xs font-bold rounded-full bg-gray-100 text-gray-800">{st}</span>;
    }
  };

  const getCheckStatusBadge = (st: string) => {
    switch (st) {
      case 'PASSED':
        return <span className="px-2 py-0.5 text-xs font-semibold rounded bg-emerald-100 text-emerald-800">PASSED</span>;
      case 'FAILED':
        return <span className="px-2 py-0.5 text-xs font-semibold rounded bg-rose-100 text-rose-800">FAILED</span>;
      case 'WARNING':
        return <span className="px-2 py-0.5 text-xs font-semibold rounded bg-amber-100 text-amber-800">WARNING</span>;
      case 'WAIVED':
        return <span className="px-2 py-0.5 text-xs font-semibold rounded bg-purple-100 text-purple-800">WAIVED</span>;
      default:
        return <span className="px-2 py-0.5 text-xs font-semibold rounded bg-gray-100 text-gray-800">N/A</span>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Assurance Gate Summary Card */}
      <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h3 className="text-lg font-bold text-gray-900">Documentation Assurance & Governance Gate</h3>
            <p className="text-xs text-gray-500 mt-1">
              Automated governance readiness evaluation for release/approval. (Note: Human approval remains mandatory for factual correctness).
            </p>
          </div>
          <div>{getStatusBadge(status)}</div>
        </div>

        {/* Summary Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mt-6 pt-4 border-t border-gray-100">
          <div className="bg-gray-50 p-3 rounded text-center">
            <div className="text-xs font-medium text-gray-500">Total Checks</div>
            <div className="text-lg font-bold text-gray-900">{summary.totalChecks}</div>
          </div>
          <div className="bg-emerald-50 p-3 rounded text-center">
            <div className="text-xs font-medium text-emerald-700">Passed</div>
            <div className="text-lg font-bold text-emerald-800">{summary.passedCount}</div>
          </div>
          <div className="bg-amber-50 p-3 rounded text-center">
            <div className="text-xs font-medium text-amber-700">Warnings</div>
            <div className="text-lg font-bold text-amber-800">{summary.warningCount}</div>
          </div>
          <div className="bg-rose-50 p-3 rounded text-center">
            <div className="text-xs font-medium text-rose-700">Failed</div>
            <div className="text-lg font-bold text-rose-800">{summary.failedCount}</div>
          </div>
          <div className="bg-purple-50 p-3 rounded text-center">
            <div className="text-xs font-medium text-purple-700">Waived</div>
            <div className="text-lg font-bold text-purple-800">{summary.waivedCount}</div>
          </div>
        </div>
      </div>

      {/* Blocking Reasons Alert */}
      {blockingReasons.length > 0 && (
        <div className="bg-rose-50 border border-rose-200 p-4 rounded-lg">
          <h4 className="font-semibold text-rose-900 text-sm mb-2">Blocking Governance Reasons</h4>
          <ul className="list-disc list-inside space-y-1 text-xs text-rose-800">
            {blockingReasons.map((reason, idx) => (
              <li key={idx}>{reason}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Recommended Actions / Remediations */}
      {remediations.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 p-4 rounded-lg">
          <h4 className="font-semibold text-amber-900 text-sm mb-2">Recommended Actions</h4>
          <ul className="space-y-2">
            {remediations.map((rem, idx) => (
              <li key={idx} className="text-xs text-amber-800">
                <span className="font-bold">{rem.label}:</span> {rem.detail}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Granular Checklist Table */}
      <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
        <h4 className="font-bold text-gray-900 mb-4">Governance Checklist</h4>
        <div className="divide-y divide-gray-100">
          {checks.map((chk) => (
            <div key={chk.checkId} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="space-y-1 flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-sm text-gray-900">{chk.name}</span>
                  <span className="text-[10px] font-mono uppercase bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded">
                    {chk.category.replace(/_/g, ' ')}
                  </span>
                  {getCheckStatusBadge(chk.status)}
                </div>
                <div className="text-xs text-gray-600 font-sans">{chk.reason}</div>
                <div className="text-[11px] text-gray-400">
                  Actual: <span className="font-mono text-gray-700">{chk.actualValue}</span> | Expected: <span className="font-mono text-gray-700">{chk.expectedValue}</span>
                </div>
                {chk.waiver && (
                  <div className="text-[11px] text-purple-700 bg-purple-50 p-2 rounded border border-purple-100 mt-1">
                    <span className="font-bold">Waived by {chk.waiver.grantedBy.name}:</span> {chk.waiver.reason}
                    {chk.waiver.isVersionInvalidated && <span className="text-rose-600 font-bold ml-2">(Invalidated: Content Version Changed)</span>}
                  </div>
                )}
              </div>

              {/* Waiver Actions */}
              <div className="self-start sm:self-center">
                {chk.status === 'FAILED' && chk.isWaivable && (
                  <button
                    onClick={() => setSelectedCheck(chk)}
                    className="px-2 py-1 text-xs font-medium text-purple-700 bg-purple-50 hover:bg-purple-100 border border-purple-200 rounded transition-colors"
                  >
                    Grant Waiver
                  </button>
                )}
                {chk.status === 'WAIVED' && (
                  <button
                    onClick={() => handleRevokeWaiver(chk.checkId)}
                    className="px-2 py-1 text-xs font-medium text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded transition-colors"
                  >
                    Revoke Waiver
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Grant Waiver Modal */}
      {selectedCheck && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 max-w-md w-full shadow-xl space-y-4">
            <h3 className="text-lg font-bold text-gray-900">Grant Governance Waiver</h3>
            <p className="text-xs text-gray-600">
              Check: <span className="font-bold text-gray-900">{selectedCheck.name}</span>
            </p>

            {waiverError && <div className="p-3 text-xs bg-rose-50 text-rose-800 border border-rose-200 rounded">{waiverError}</div>}

            <div className="space-y-1">
              <label className="text-xs font-semibold text-gray-700">Waiver Reason *</label>
              <textarea
                value={waiverReason}
                onChange={(e) => setWaiverReason(e.target.value)}
                placeholder="Explain the technical or business justification for granting this waiver..."
                className="w-full text-xs p-2 border rounded focus:outline-none focus:ring-1 focus:ring-purple-500"
                rows={3}
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-gray-700">Expiration Duration (Days)</label>
              <input
                type="number"
                value={expiresInDays}
                onChange={(e) => setExpiresInDays(Number(e.target.value))}
                min={1}
                max={90}
                className="w-full text-xs p-2 border rounded"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setSelectedCheck(null)}
                className="px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-100 rounded"
              >
                Cancel
              </button>
              <button
                onClick={handleGrantWaiver}
                disabled={submittingWaiver || !waiverReason.trim()}
                className="px-3 py-1.5 text-xs font-bold text-white bg-purple-600 hover:bg-purple-700 disabled:opacity-50 rounded"
              >
                {submittingWaiver ? 'Granting...' : 'Grant Waiver'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
