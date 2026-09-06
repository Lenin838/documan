/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState, useEffect, useCallback } from 'react';
import type { ITraceabilityAuditResponse, TraceabilitySeverity, RequirementStatus } from '../system-traceability-audit.types';
import { getTraceabilityAudit } from '../system-traceability-audit.api';

interface TraceabilityAuditViewProps {
  documentId?: string;
  currentVersionNumber?: number;
}

export const TraceabilityAuditView: React.FC<TraceabilityAuditViewProps> = ({
  documentId: initialDocumentId = '',
  currentVersionNumber,
}) => {
  const [docIdInput, setDocIdInput] = useState<string>(initialDocumentId);
  const [versionInput, setVersionInput] = useState<string>(
    currentVersionNumber ? String(currentVersionNumber) : '',
  );
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [audit, setAudit] = useState<ITraceabilityAuditResponse | null>(null);

  const fetchAudit = useCallback(
    async (targetDocId: string, verNum?: number) => {
      if (!targetDocId.trim()) return;
      setLoading(true);
      setError(null);
      try {
        const res = await getTraceabilityAudit(targetDocId.trim(), verNum);
        setAudit(res.data);
      } catch (err: any) {
        setError(err.response?.data?.message || err.message || 'Failed to fetch traceability audit');
        setAudit(null);
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  useEffect(() => {
    if (initialDocumentId) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      fetchAudit(initialDocumentId, currentVersionNumber);
    }
  }, [initialDocumentId, currentVersionNumber, fetchAudit]);

  const handleRunAudit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!docIdInput.trim()) {
      setError('Please provide a valid Document ID to perform a traceability audit.');
      return;
    }
    const parsedVer = versionInput.trim() ? parseInt(versionInput.trim(), 10) : undefined;
    if (versionInput.trim() && (isNaN(parsedVer!) || parsedVer! < 1)) {
      setError('Please enter a valid version number >= 1, or leave empty for latest active version.');
      return;
    }
    fetchAudit(docIdInput.trim(), parsedVer);
  };

  const getTraceabilityStatusBadge = (status: string) => {
    switch (status) {
      case 'COMPLETE':
        return (
          <span style={{ background: '#065f46', color: '#a7f3d0', padding: '4px 12px', borderRadius: '6px', fontSize: '0.85rem', fontWeight: 700 }}>
            COMPLETE
          </span>
        );
      case 'INCOMPLETE':
        return (
          <span style={{ background: '#78350f', color: '#fde68a', padding: '4px 12px', borderRadius: '6px', fontSize: '0.85rem', fontWeight: 700 }}>
            INCOMPLETE GAPS DETECTED
          </span>
        );
      default:
        return (
          <span style={{ background: '#374151', color: '#d1d5db', padding: '4px 12px', borderRadius: '6px', fontSize: '0.85rem', fontWeight: 700 }}>
            INDETERMINATE
          </span>
        );
    }
  };

  const getRequirementStatusBadge = (status: RequirementStatus) => {
    switch (status) {
      case 'APPLICABLE_AND_PRESENT':
        return (
          <span style={{ background: '#064e3b', color: '#6ee7b7', padding: '2px 8px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 600 }}>
            PRESENT
          </span>
        );
      case 'APPLICABLE_AND_MISSING':
        return (
          <span style={{ background: '#7f1d1d', color: '#fca5a5', padding: '2px 8px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 600 }}>
            MISSING
          </span>
        );
      case 'APPLICABLE_BUT_INDETERMINATE':
        return (
          <span style={{ background: '#312e81', color: '#c7d2fe', padding: '2px 8px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 600 }}>
            INDETERMINATE
          </span>
        );
      case 'NOT_APPLICABLE':
      default:
        return (
          <span style={{ background: '#374151', color: '#9ca3af', padding: '2px 8px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 600 }}>
            NOT APPLICABLE
          </span>
        );
    }
  };

  const getSeverityBadge = (sev: TraceabilitySeverity) => {
    switch (sev) {
      case 'CRITICAL':
        return (
          <span style={{ background: '#991b1b', color: '#fef2f2', padding: '2px 8px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 700 }}>
            CRITICAL
          </span>
        );
      case 'WARNING':
        return (
          <span style={{ background: '#92400e', color: '#fffbeb', padding: '2px 8px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 700 }}>
            WARNING
          </span>
        );
      case 'INFO':
      default:
        return (
          <span style={{ background: '#1e40af', color: '#eff6ff', padding: '2px 8px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 700 }}>
            INFO
          </span>
        );
    }
  };

  return (
    <div style={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: '8px', padding: '20px', color: '#f8fafc', marginTop: '24px' }}>
      {/* Header */}
      <div style={{ borderBottom: '1px solid #1e293b', paddingBottom: '12px', marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h3 style={{ margin: 0, fontSize: '1.15rem', color: '#38bdf8', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>🔍</span> End-to-End Document Traceability Audit Engine
          </h3>
          <p style={{ margin: '4px 0 0 0', fontSize: '0.85rem', color: '#94a3b8' }}>
            Read-only gap analysis auditing active document version completeness across relationships, changes, verifications, evidence, baselines, and contracts.
          </p>
        </div>
        <div>
          {audit && getTraceabilityStatusBadge(audit.traceabilityStatus)}
        </div>
      </div>

      {/* Audit Query Form */}
      <form onSubmit={handleRunAudit} style={{ display: 'grid', gridTemplateColumns: '1fr 180px auto', gap: '12px', alignItems: 'end', marginBottom: '20px' }}>
        <div>
          <label style={{ fontSize: '0.75rem', color: '#cbd5e1', display: 'block', marginBottom: '4px' }}>
            Document ID *
          </label>
          <input
            type="text"
            placeholder="e.g. 6500a1b2c3d4..."
            value={docIdInput}
            onChange={(e) => setDocIdInput(e.target.value)}
            style={{ width: '100%', padding: '7px 12px', background: '#1e293b', border: '1px solid #334155', borderRadius: '6px', color: '#fff', fontSize: '0.85rem' }}
          />
        </div>
        <div>
          <label style={{ fontSize: '0.75rem', color: '#cbd5e1', display: 'block', marginBottom: '4px' }}>
            Version Number (Optional)
          </label>
          <input
            type="number"
            min="1"
            placeholder="Latest Active"
            value={versionInput}
            onChange={(e) => setVersionInput(e.target.value)}
            style={{ width: '100%', padding: '7px 12px', background: '#1e293b', border: '1px solid #334155', borderRadius: '6px', color: '#fff', fontSize: '0.85rem' }}
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          style={{ padding: '8px 18px', background: '#0284c7', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem' }}
        >
          {loading ? 'Auditing...' : 'Run Audit'}
        </button>
      </form>

      {/* Error display */}
      {error && (
        <div style={{ background: '#450a0a', border: '1px solid #991b1b', color: '#fca5a5', padding: '12px', borderRadius: '6px', marginBottom: '16px', fontSize: '0.85rem' }}>
          ⚠️ {error}
        </div>
      )}

      {/* Audit Results */}
      {audit && (
        <div>
          {/* Completeness Summary Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px', marginBottom: '20px' }}>
            <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '6px', padding: '12px' }}>
              <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Completeness Ratio</div>
              <div style={{ fontSize: '1.4rem', fontWeight: 700, color: audit.completeness.completenessPercentage === 100 ? '#34d399' : '#f59e0b', marginTop: '4px' }}>
                {audit.completeness.completenessPercentage !== null ? `${audit.completeness.completenessPercentage}%` : 'N/A'}
              </div>
            </div>

            <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '6px', padding: '12px' }}>
              <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Satisfied / Applicable</div>
              <div style={{ fontSize: '1.4rem', fontWeight: 700, color: '#f8fafc', marginTop: '4px' }}>
                {audit.completeness.satisfiedRequirementsCount} / {audit.completeness.applicableRequirementsCount}
              </div>
            </div>

            <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '6px', padding: '12px' }}>
              <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Missing Gaps</div>
              <div style={{ fontSize: '1.4rem', fontWeight: 700, color: audit.completeness.missingRequirementsCount > 0 ? '#f87171' : '#34d399', marginTop: '4px' }}>
                {audit.completeness.missingRequirementsCount}
              </div>
            </div>

            <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '6px', padding: '12px' }}>
              <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Indeterminate Items</div>
              <div style={{ fontSize: '1.4rem', fontWeight: 700, color: audit.completeness.indeterminateRequirementsCount > 0 ? '#818cf8' : '#94a3b8', marginTop: '4px' }}>
                {audit.completeness.indeterminateRequirementsCount}
              </div>
            </div>
          </div>

          {/* Audit Gaps List */}
          {audit.gaps.length > 0 && (
            <div style={{ marginBottom: '20px', background: '#1e1b4b', border: '1px solid #3730a3', borderRadius: '6px', padding: '16px' }}>
              <h4 style={{ margin: '0 0 12px 0', fontSize: '0.95rem', color: '#a5b4fc', display: 'flex', alignItems: 'center', gap: '6px' }}>
                ⚠️ Identified Traceability Gaps ({audit.gaps.length})
              </h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {audit.gaps.map((gap, idx) => (
                  <div key={idx} style={{ background: '#0f172a', border: '1px solid #312e81', borderRadius: '6px', padding: '12px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                      <span style={{ fontWeight: 600, fontSize: '0.85rem', color: '#f8fafc' }}>
                        {gap.gapType}
                      </span>
                      {getSeverityBadge(gap.severity)}
                    </div>
                    <p style={{ margin: '4px 0', fontSize: '0.8rem', color: '#cbd5e1' }}>
                      {gap.explanation}
                    </p>
                    <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '6px', display: 'flex', gap: '16px' }}>
                      <span>Source: <code>{gap.authoritativeSource}</code></span>
                      {gap.linkedEntityId && <span>Entity ID: <code>{gap.linkedEntityId}</code></span>}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#a7f3d0', marginTop: '6px', fontStyle: 'italic' }}>
                      💡 Guidance: {gap.remediation}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Requirements Graph Breakdown */}
          <div>
            <h4 style={{ margin: '0 0 12px 0', fontSize: '0.95rem', color: '#e2e8f0' }}>
              Traceability Requirement Graph Evaluation
            </h4>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
                <thead>
                  <tr style={{ background: '#1e293b', borderBottom: '1px solid #334155', textAlign: 'left' }}>
                    <th style={{ padding: '8px 12px', color: '#94a3b8' }}>Requirement Branch</th>
                    <th style={{ padding: '8px 12px', color: '#94a3b8' }}>Status</th>
                    <th style={{ padding: '8px 12px', color: '#94a3b8' }}>Authoritative Source</th>
                    <th style={{ padding: '8px 12px', color: '#94a3b8' }}>Evaluation Details</th>
                  </tr>
                </thead>
                <tbody>
                  {audit.requirements.map((req, idx) => (
                    <tr key={idx} style={{ borderBottom: '1px solid #1e293b' }}>
                      <td style={{ padding: '8px 12px', fontWeight: 600, color: '#f1f5f9' }}>
                        {req.requirementType}
                      </td>
                      <td style={{ padding: '8px 12px' }}>
                        {getRequirementStatusBadge(req.status)}
                      </td>
                      <td style={{ padding: '8px 12px', color: '#cbd5e1' }}>
                        <code>{req.authoritativeSource}</code>
                      </td>
                      <td style={{ padding: '8px 12px', color: '#94a3b8' }}>
                        {req.explanation}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div style={{ marginTop: '16px', fontSize: '0.7rem', color: '#64748b', textAlign: 'right' }}>
            Audited Document: <code>{audit.documentId}</code> | Version: v{audit.selectedVersionNumber} | Evaluated At: {new Date(audit.evaluatedAt).toLocaleString()}
          </div>
        </div>
      )}
    </div>
  );
};
