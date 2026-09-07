import { useEffect, useState, useCallback } from 'react';
import {
  getSystemGovernanceGate,
  grantSystemGovernanceWaiver,
  listSystemGovernanceWaivers,
  revokeSystemGovernanceWaiver,
} from '../system-topology-governance-gate.api';
import type {
  SystemGovernanceGateResponse,
  SystemReleaseStatus,
  SystemGovernanceWaiverDTO,
  BlockingDependency,
} from '../system-topology-governance-gate.types';
import { SystemTopologySimulationSandbox } from './SystemTopologySimulationSandbox';
import { SystemGovernanceLineageTimeline } from './SystemGovernanceLineageTimeline';
import { ContractEvolutionAnalyzer } from './ContractEvolutionAnalyzer';
import { TraceabilityAuditView } from './TraceabilityAuditView';
import { SystemContractMatrixView } from './SystemContractMatrixView';
import { SystemContractPlanningView } from './SystemContractPlanningView';

interface SystemGovernanceGateSectionProps {
  projectId: string;
}

export function SystemGovernanceGateSection({ projectId }: SystemGovernanceGateSectionProps) {
  const [data, setData] = useState<SystemGovernanceGateResponse | null>(null);
  const [waivers, setWaivers] = useState<SystemGovernanceWaiverDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionError, setActionError] = useState('');
  const [actionSuccess, setActionSuccess] = useState('');

  // Modal State for Granting Waiver
  const [selectedDep, setSelectedDep] = useState<BlockingDependency | null>(null);
  const [waiverReason, setWaiverReason] = useState('');
  const [expiresInDays, setExpiresInDays] = useState(30);
  const [submittingWaiver, setSubmittingWaiver] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [gateRes, waiversRes] = await Promise.all([
        getSystemGovernanceGate(projectId),
        listSystemGovernanceWaivers(projectId, true, true).catch(() => ({ data: [] })),
      ]);
      setData(gateRes.data);
      setWaivers(waiversRes.data);
      setError('');
    } catch {
      setError('Failed to load system topology governance gate evaluation.');
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    let isSubscribed = true;
    const fetchInitial = async () => {
      try {
        const [gateRes, waiversRes] = await Promise.all([
          getSystemGovernanceGate(projectId),
          listSystemGovernanceWaivers(projectId, true, true).catch(() => ({ data: [] })),
        ]);
        if (isSubscribed) {
          setData(gateRes.data);
          setWaivers(waiversRes.data);
          setError('');
          setLoading(false);
        }
      } catch {
        if (isSubscribed) {
          setError('Failed to load system topology governance gate evaluation.');
          setLoading(false);
        }
      }
    };
    void fetchInitial();
    return () => {
      isSubscribed = false;
    };
  }, [projectId]);

  const getStatusBadgeStyle = (status: SystemReleaseStatus) => {
    switch (status) {
      case 'PASSED':
        return { background: '#e8f5e9', color: '#2e7d32', border: '1px solid #a5d6a7' };
      case 'PASSED_WITH_WAIVER':
        return { background: '#e0f2f1', color: '#004d40', border: '1px solid #80cbc4' };
      case 'BLOCKED':
        return { background: '#ffebee', color: '#c62828', border: '1px solid #ef9a9a' };
      case 'INDETERMINATE':
        return { background: '#f3e5f5', color: '#6a1b9a', border: '1px solid #ce93d8' };
      case 'GOVERNANCE_DISABLED':
      default:
        return { background: '#fff3e0', color: '#e65100', border: '1px solid #ffcc80' };
    }
  };

  const handleGrantWaiverSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDep) return;

    setSubmittingWaiver(true);
    setActionError('');
    setActionSuccess('');

    try {
      await grantSystemGovernanceWaiver(projectId, {
        targetProviderProjectId: selectedDep.providerProjectId,
        targetDocumentId: selectedDep.targetDocumentId ?? null,
        contractVersionNumber: selectedDep.contractVersionNumber ?? null,
        blockerType: selectedDep.blockerType,
        reason: waiverReason.trim(),
        expiresInDays,
      });

      setActionSuccess(`Governance waiver granted successfully for ${selectedDep.providerProjectName}.`);
      setSelectedDep(null);
      setWaiverReason('');
      void loadData();
    } catch (err: unknown) {
      const errMsg =
        err && typeof err === 'object' && 'response' in err
          ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
          : 'Failed to grant governance waiver.';
      setActionError(errMsg || 'Failed to grant governance waiver.');
    } finally {
      setSubmittingWaiver(false);
    }
  };

  const handleRevokeWaiver = async (waiverId: string) => {
    setActionError('');
    setActionSuccess('');
    try {
      await revokeSystemGovernanceWaiver(projectId, waiverId, 'Manual revocation from System Governance panel');
      setActionSuccess('Waiver revoked successfully.');
      void loadData();
    } catch (err: unknown) {
      const errMsg =
        err && typeof err === 'object' && 'response' in err
          ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
          : 'Failed to revoke waiver.';
      setActionError(errMsg || 'Failed to revoke waiver.');
    }
  };

  if (loading) {
    return (
      <div style={{ padding: '1.5rem', background: '#fff', border: '1px solid #e0e0e0', borderRadius: '8px', marginBottom: '2rem' }}>
        <p style={{ margin: 0, color: '#666' }}>Evaluating system topology governance gate...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div style={{ padding: '1.5rem', background: '#fff', border: '1px solid #e0e0e0', borderRadius: '8px', marginBottom: '2rem' }}>
        <h3 style={{ margin: '0 0 0.5rem 0', color: '#333' }}>Cross-Project System Topology Governance Gate</h3>
        <p style={{ color: '#c62828', margin: '0 0 1rem 0' }}>{error || 'No data available'}</p>
        <button
          type="button"
          onClick={() => {
            void loadData();
          }}
          style={{ padding: '0.4rem 0.8rem', cursor: 'pointer' }}
        >
          Retry
        </button>
      </div>
    );
  }

  const { systemReleaseStatus, summary, evidence } = data;
  const activeWaiversList = waivers.filter((w) => w.scopeState === 'ACTIVE' && !w.isRevoked);

  return (
    <div style={{ background: '#fff', border: '1px solid #e0e0e0', borderRadius: '8px', padding: '1.5rem', marginBottom: '2rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.25rem' }}>
        <div>
          <h2 style={{ margin: '0 0 0.4rem 0', fontSize: '1.25rem' }}>Cross-Project System Topology Governance Gate</h2>
          <p style={{ margin: 0, color: '#666', fontSize: '0.9rem' }}>
            Topology-aware system release readiness synthesizing local gate, baseline alignment, attestation provenance, and policy waivers
          </p>
        </div>
        <span
          style={{
            padding: '0.4rem 0.85rem',
            borderRadius: '16px',
            fontSize: '0.85rem',
            fontWeight: 'bold',
            ...getStatusBadgeStyle(systemReleaseStatus),
          }}
        >
          {systemReleaseStatus === 'GOVERNANCE_DISABLED' ? 'GOVERNANCE DISABLED' : systemReleaseStatus}
        </span>
      </div>

      {actionSuccess && (
        <div style={{ padding: '0.75rem 1rem', background: '#e8f5e9', border: '1px solid #a5d6a7', borderRadius: '6px', color: '#2e7d32', marginBottom: '1rem', fontSize: '0.85rem' }}>
          {actionSuccess}
        </div>
      )}
      {actionError && (
        <div style={{ padding: '0.75rem 1rem', background: '#ffebee', border: '1px solid #ef9a9a', borderRadius: '6px', color: '#c62828', marginBottom: '1rem', fontSize: '0.85rem' }}>
          {actionError}
        </div>
      )}

      {/* Overview Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
        <div style={{ background: '#f8f9fa', border: '1px solid #e9ecef', borderRadius: '6px', padding: '1rem' }}>
          <span style={{ fontSize: '0.8rem', color: '#6c757d', fontWeight: 600, textTransform: 'uppercase' }}>
            Root Local Gate Freshness
          </span>
          <div style={{ fontSize: '1.75rem', fontWeight: 'bold', color: '#111', marginTop: '0.2rem' }}>
            {evidence.rootLocalGate.freshnessPercentage}%
          </div>
          <div style={{ fontSize: '0.75rem', color: '#6c757d', marginTop: '0.25rem' }}>
            Status: {evidence.rootLocalGate.status}
          </div>
        </div>

        <div style={{ background: '#f8f9fa', border: '1px solid #e9ecef', borderRadius: '6px', padding: '1rem' }}>
          <span style={{ fontSize: '0.8rem', color: '#6c757d', fontWeight: 600, textTransform: 'uppercase' }}>
            System Contract Alignment Score
          </span>
          <div style={{ fontSize: '1.75rem', fontWeight: 'bold', color: evidence.baselineAlignment.alignmentScore !== null ? '#111' : '#888', marginTop: '0.2rem' }}>
            {evidence.baselineAlignment.alignmentScore !== null ? `${evidence.baselineAlignment.alignmentScore.toFixed(1)}%` : 'N/A'}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#6c757d', marginTop: '0.25rem' }}>
            State: {evidence.baselineAlignment.aggregateState}
          </div>
        </div>
      </div>

      {/* Summary Pills */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', padding: '0.75rem 1rem', background: '#f1f3f5', borderRadius: '6px', marginBottom: '1.5rem', fontSize: '0.85rem' }}>
        <div><strong>Total Dependencies:</strong> {summary.totalDependencies}</div>
        <div style={{ color: '#666' }}>•</div>
        <div style={{ color: '#2e7d32' }}><strong>Aligned:</strong> {summary.alignedDependencies}</div>
        <div style={{ color: '#666' }}>•</div>
        <div style={{ color: '#c62828' }}><strong>Misaligned:</strong> {summary.misalignedDependencies}</div>
        <div style={{ color: '#666' }}>•</div>
        <div style={{ color: '#6a1b9a' }}><strong>Indeterminate:</strong> {summary.indeterminateDependencies}</div>
        <div style={{ color: '#666' }}>•</div>
        <div style={{ color: '#004d40' }}><strong>Waived:</strong> {summary.waivedBlockers ?? 0}</div>
        <div style={{ color: '#666' }}>•</div>
        <div style={{ color: '#c62828' }}><strong>Blocked Providers:</strong> {summary.blockedProviders}</div>
      </div>

      {/* Blocking Dependencies List */}
      {evidence.blockingDependencies.length === 0 ? (
        <div style={{ padding: '1.25rem', background: '#e8f5e9', borderRadius: '6px', border: '1px solid #c8e6c9', color: '#2e7d32', fontSize: '0.9rem' }}>
          ✓ All authorized cross-project contract dependencies and local gates are fully satisfied and passing.
        </div>
      ) : (
        <div style={{ marginBottom: '1.5rem' }}>
          <h3 style={{ fontSize: '1rem', margin: '0 0 0.75rem 0', color: '#333' }}>
            Cross-Project Dependency Status ({evidence.blockingDependencies.length})
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {evidence.blockingDependencies.map((dep, index) => {
              const isWaived = dep.isWaived;
              return (
                <div
                  key={`${dep.providerProjectId}_${index}`}
                  style={{
                    border: isWaived ? '1px solid #80cbc4' : '1px solid #ef9a9a',
                    background: isWaived ? '#e0f2f1' : '#ffebee',
                    borderRadius: '6px',
                    padding: '1rem',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.3rem' }}>
                    <div style={{ fontWeight: 'bold', fontSize: '0.95rem', color: isWaived ? '#004d40' : '#c62828' }}>
                      <span>{dep.providerProjectName}</span>
                      <span style={{ color: '#888', margin: '0 0.4rem' }}>/</span>
                      <span>{dep.providerDocumentTitle}</span>
                    </div>
                    {isWaived ? (
                      <span style={{ background: '#004d40', color: '#fff', fontSize: '0.7rem', padding: '0.15rem 0.5rem', borderRadius: '12px', fontWeight: 'bold' }}>
                        WAIVED
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setSelectedDep(dep)}
                        style={{
                          background: '#fff',
                          border: '1px solid #c62828',
                          color: '#c62828',
                          padding: '0.2rem 0.6rem',
                          borderRadius: '4px',
                          fontSize: '0.75rem',
                          fontWeight: 'bold',
                          cursor: 'pointer',
                        }}
                      >
                        Grant Waiver
                      </button>
                    )}
                  </div>
                  <div style={{ fontSize: '0.85rem', color: '#444', marginBottom: '0.5rem' }}>
                    {dep.reason}
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', fontSize: '0.75rem' }}>
                    <span style={{ background: '#fff', color: '#333', padding: '0.15rem 0.4rem', borderRadius: '4px', border: '1px solid #ccc' }}>
                      Blocker: {dep.blockerType}
                    </span>
                    {!dep.governanceEvidence.providerGovernanceEnabled && (
                      <span style={{ background: '#fff3e0', color: '#e65100', padding: '0.15rem 0.4rem', borderRadius: '4px', border: '1px solid #ffe0b2' }}>
                        Provider Governance Disabled
                      </span>
                    )}
                    {!dep.governanceEvidence.providerAttested && (
                      <span style={{ background: '#ffebee', color: '#c62828', padding: '0.15rem 0.4rem', borderRadius: '4px', border: '1px solid #ef9a9a' }}>
                        Unattested Baseline
                      </span>
                    )}
                    {dep.governanceEvidence.attestationStale && (
                      <span style={{ background: '#ffebee', color: '#c62828', padding: '0.15rem 0.4rem', borderRadius: '4px', border: '1px solid #ef9a9a' }}>
                        Attestation Stale
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Active System Governance Waivers Roster */}
      {activeWaiversList.length > 0 && (
        <div style={{ borderTop: '1px solid #e0e0e0', paddingTop: '1.25rem' }}>
          <h3 style={{ fontSize: '1rem', margin: '0 0 0.75rem 0', color: '#004d40' }}>
            Active System Governance Waivers ({activeWaiversList.length})
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {activeWaiversList.map((w) => (
              <div
                key={w._id}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  background: '#f8f9fa',
                  border: '1px solid #dee2e6',
                  borderRadius: '6px',
                  padding: '0.75rem 1rem',
                  fontSize: '0.85rem',
                }}
              >
                <div>
                  <div style={{ fontWeight: 'bold', color: '#333' }}>
                    <span>{w.blockerType}</span>
                    <span style={{ color: '#888', margin: '0 0.4rem' }}>•</span>
                    <span style={{ color: '#666' }}>Reason: {w.reason}</span>
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#666', marginTop: '0.2rem' }}>
                    Expires: {new Date(w.expiresAt).toLocaleDateString()}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => void handleRevokeWaiver(w._id)}
                  style={{
                    background: '#fff',
                    border: '1px solid #c62828',
                    color: '#c62828',
                    padding: '0.25rem 0.6rem',
                    borderRadius: '4px',
                    fontSize: '0.75rem',
                    cursor: 'pointer',
                  }}
                >
                  Revoke
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Phase 21: What-If Simulation Sandbox */}
      <SystemTopologySimulationSandbox projectId={projectId} />

      {/* Phase 22: System Governance Lineage & Longitudinal Timeline */}
      <SystemGovernanceLineageTimeline projectId={projectId} />

      {/* Phase 23: Cross-Project Contract Evolution Intelligence Analyzer */}
      <ContractEvolutionAnalyzer providerProjectId={projectId} token={localStorage.getItem('token') || ''} />

      {/* Phase 24: End-to-End Document Traceability Completeness & Gap Audit Engine */}
      <TraceabilityAuditView documentId={data?.evidence?.blockingDependencies?.[0]?.targetDocumentId || ''} />

      {/* Phase 25: Cross-Project Contract Interoperability Matrix & Topology Compatibility Analyzer */}
      <SystemContractMatrixView projectId={projectId} />

      {/* Phase 26: System-Wide Contract Change Planning & Multi-Project Change Package Synthesis */}
      <SystemContractPlanningView projectId={projectId} />

      {/* Grant Waiver Modal */}
      {selectedDep && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: '#fff', borderRadius: '8px', padding: '1.5rem', width: '90%', maxWidth: '500px', boxShadow: '0 4px 12px rgba(0,0,0,0.15)' }}>
            <h3 style={{ margin: '0 0 1rem 0', fontSize: '1.1rem' }}>Grant System Governance Waiver</h3>
            <p style={{ fontSize: '0.85rem', color: '#666', marginBottom: '1rem' }}>
              Target: <strong>{selectedDep.providerProjectName}</strong> ({selectedDep.blockerType})
            </p>
            <form onSubmit={(e) => void handleGrantWaiverSubmit(e)}>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 'bold', marginBottom: '0.3rem' }}>
                  Waiver Rationale / Reason *
                </label>
                <textarea
                  required
                  rows={3}
                  value={waiverReason}
                  onChange={(e) => setWaiverReason(e.target.value)}
                  placeholder="Explain why this governance exception is accepted..."
                  style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #ccc', fontSize: '0.85rem' }}
                />
              </div>

              <div style={{ marginBottom: '1.25rem' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 'bold', marginBottom: '0.3rem' }}>
                  Duration (Days)
                </label>
                <input
                  type="number"
                  min={1}
                  max={365}
                  value={expiresInDays}
                  onChange={(e) => setExpiresInDays(parseInt(e.target.value, 10) || 30)}
                  style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #ccc', fontSize: '0.85rem' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                <button
                  type="button"
                  onClick={() => setSelectedDep(null)}
                  disabled={submittingWaiver}
                  style={{ padding: '0.4rem 0.8rem', background: '#fff', border: '1px solid #ccc', borderRadius: '4px', cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingWaiver}
                  style={{ padding: '0.4rem 0.8rem', background: '#004d40', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}
                >
                  {submittingWaiver ? 'Granting...' : 'Grant Waiver'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
