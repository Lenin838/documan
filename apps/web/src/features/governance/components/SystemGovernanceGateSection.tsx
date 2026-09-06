import { useEffect, useState, useCallback } from 'react';
import { getSystemGovernanceGate } from '../system-topology-governance-gate.api';
import type {
  SystemGovernanceGateResponse,
  SystemReleaseStatus,
} from '../system-topology-governance-gate.types';

interface SystemGovernanceGateSectionProps {
  projectId: string;
}

export function SystemGovernanceGateSection({ projectId }: SystemGovernanceGateSectionProps) {
  const [data, setData] = useState<SystemGovernanceGateResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadGate = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await getSystemGovernanceGate(projectId);
      setData(res.data);
      setError('');
    } catch {
      setError('Failed to load system topology governance gate evaluation.');
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    let active = true;
    getSystemGovernanceGate(projectId)
      .then((res) => {
        if (active) {
          setData(res.data);
          setError('');
          setLoading(false);
        }
      })
      .catch(() => {
        if (active) {
          setError('Failed to load system topology governance gate evaluation.');
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [projectId]);

  const getStatusBadgeStyle = (status: SystemReleaseStatus) => {
    switch (status) {
      case 'PASSED':
        return { background: '#e8f5e9', color: '#2e7d32', border: '1px solid #a5d6a7' };
      case 'BLOCKED':
        return { background: '#ffebee', color: '#c62828', border: '1px solid #ef9a9a' };
      case 'INDETERMINATE':
        return { background: '#f3e5f5', color: '#6a1b9a', border: '1px solid #ce93d8' };
      case 'GOVERNANCE_DISABLED':
      default:
        return { background: '#fff3e0', color: '#e65100', border: '1px solid #ffcc80' };
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
            void loadGate();
          }}
          style={{ padding: '0.4rem 0.8rem', cursor: 'pointer' }}
        >
          Retry
        </button>
      </div>
    );
  }

  const { systemReleaseStatus, summary, evidence } = data;

  return (
    <div style={{ background: '#fff', border: '1px solid #e0e0e0', borderRadius: '8px', padding: '1.5rem', marginBottom: '2rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.25rem' }}>
        <div>
          <h2 style={{ margin: '0 0 0.4rem 0', fontSize: '1.25rem' }}>Cross-Project System Topology Governance Gate</h2>
          <p style={{ margin: 0, color: '#666', fontSize: '0.9rem' }}>
            Topology-aware system release readiness synthesizing local gate, baseline alignment, and attestation provenance
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
        <div style={{ color: '#c62828' }}><strong>Blocked Providers:</strong> {summary.blockedProviders}</div>
      </div>

      {/* Blocking Dependencies List */}
      {evidence.blockingDependencies.length === 0 ? (
        <div style={{ padding: '1.25rem', background: '#e8f5e9', borderRadius: '6px', border: '1px solid #c8e6c9', color: '#2e7d32', fontSize: '0.9rem' }}>
          ✓ All authorized cross-project contract dependencies and local gates are fully satisfied and passing.
        </div>
      ) : (
        <div>
          <h3 style={{ fontSize: '1rem', margin: '0 0 0.75rem 0', color: '#c62828' }}>
            Blocking System Release Dependencies ({evidence.blockingDependencies.length})
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {evidence.blockingDependencies.map((dep, index) => (
              <div
                key={`${dep.providerProjectId}_${index}`}
                style={{
                  border: '1px solid #ef9a9a',
                  background: '#ffebee',
                  borderRadius: '6px',
                  padding: '1rem',
                }}
              >
                <div style={{ fontWeight: 'bold', fontSize: '0.95rem', color: '#c62828', marginBottom: '0.3rem' }}>
                  <span>{dep.providerProjectName}</span>
                  <span style={{ color: '#888', margin: '0 0.4rem' }}>/</span>
                  <span>{dep.providerDocumentTitle}</span>
                </div>
                <div style={{ fontSize: '0.85rem', color: '#444', marginBottom: '0.5rem' }}>
                  {dep.reason}
                </div>
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', fontSize: '0.75rem' }}>
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
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
