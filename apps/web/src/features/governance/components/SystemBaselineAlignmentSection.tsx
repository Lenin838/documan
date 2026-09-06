import { useEffect, useState, useCallback } from 'react';
import { getSystemBaselineAlignment } from '../system-baseline-alignment.api';
import type {
  SystemBaselineAlignmentResponse,
  AggregateAlignmentState,
  AlignmentUnitState,
} from '../system-baseline-alignment.types';

interface SystemBaselineAlignmentSectionProps {
  projectId: string;
}

export function SystemBaselineAlignmentSection({ projectId }: SystemBaselineAlignmentSectionProps) {
  const [data, setData] = useState<SystemBaselineAlignmentResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadAlignment = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await getSystemBaselineAlignment(projectId);
      setData(res.data);
      setError('');
    } catch {
      setError('Failed to load cross-project baseline alignment data.');
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    let active = true;
    getSystemBaselineAlignment(projectId)
      .then((res) => {
        if (active) {
          setData(res.data);
          setError('');
          setLoading(false);
        }
      })
      .catch(() => {
        if (active) {
          setError('Failed to load cross-project baseline alignment data.');
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [projectId]);

  const getAggregateBadgeStyle = (state: AggregateAlignmentState) => {
    switch (state) {
      case 'ALIGNED':
        return { background: '#e8f5e9', color: '#2e7d32', border: '1px solid #a5d6a7' };
      case 'PARTIALLY_ALIGNED':
        return { background: '#fff3e0', color: '#e65100', border: '1px solid #ffcc80' };
      case 'MISALIGNED':
        return { background: '#ffebee', color: '#c62828', border: '1px solid #ef9a9a' };
      case 'INDETERMINATE':
        return { background: '#f3e5f5', color: '#6a1b9a', border: '1px solid #ce93d8' };
      case 'ZERO_APPLICABLE_EVIDENCE':
      default:
        return { background: '#f5f5f5', color: '#616161', border: '1px solid #e0e0e0' };
    }
  };

  const getUnitBadgeStyle = (state: AlignmentUnitState) => {
    switch (state) {
      case 'ALIGNED':
        return { background: '#e8f5e9', color: '#2e7d32', border: '1px solid #a5d6a7' };
      case 'MISALIGNED':
        return { background: '#ffebee', color: '#c62828', border: '1px solid #ef9a9a' };
      case 'INDETERMINATE':
      default:
        return { background: '#f3e5f5', color: '#6a1b9a', border: '1px solid #ce93d8' };
    }
  };

  if (loading) {
    return (
      <div style={{ padding: '1.5rem', background: '#fff', border: '1px solid #e0e0e0', borderRadius: '8px' }}>
        <p style={{ margin: 0, color: '#666' }}>Loading cross-project baseline alignment...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div style={{ padding: '1.5rem', background: '#fff', border: '1px solid #e0e0e0', borderRadius: '8px' }}>
        <h3 style={{ margin: '0 0 0.5rem 0', color: '#333' }}>Cross-Project Baseline Contract Alignment</h3>
        <p style={{ color: '#c62828', margin: '0 0 1rem 0' }}>{error || 'No data available'}</p>
        <button
          type="button"
          onClick={() => {
            void loadAlignment();
          }}
          style={{ padding: '0.4rem 0.8rem', cursor: 'pointer' }}
        >
          Retry
        </button>
      </div>
    );
  }

  const { aggregateState, alignmentScore, evidenceCompleteness, summary, alignmentUnits } = data;

  return (
    <div style={{ background: '#fff', border: '1px solid #e0e0e0', borderRadius: '8px', padding: '1.5rem', marginBottom: '2rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.25rem' }}>
        <div>
          <h2 style={{ margin: '0 0 0.4rem 0', fontSize: '1.25rem' }}>Cross-Project Baseline Contract Alignment</h2>
          <p style={{ margin: 0, color: '#666', fontSize: '0.9rem' }}>
            Derived contract lineage & attestation verification across active project topology links
          </p>
        </div>
        <span
          style={{
            padding: '0.35rem 0.75rem',
            borderRadius: '16px',
            fontSize: '0.85rem',
            fontWeight: 'bold',
            ...getAggregateBadgeStyle(aggregateState),
          }}
        >
          {aggregateState.replace(/_/g, ' ')}
        </span>
      </div>

      {/* Dual Metric Gauge Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
        <div style={{ background: '#f8f9fa', border: '1px solid #e9ecef', borderRadius: '6px', padding: '1rem' }}>
          <span style={{ fontSize: '0.8rem', color: '#6c757d', fontWeight: 600, textTransform: 'uppercase' }}>
            System Alignment Score
          </span>
          <div style={{ fontSize: '1.75rem', fontWeight: 'bold', color: alignmentScore !== null ? '#111' : '#888', marginTop: '0.2rem' }}>
            {alignmentScore !== null ? `${alignmentScore.toFixed(1)}%` : 'N/A'}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#6c757d', marginTop: '0.25rem' }}>
            N_aligned / N_applicable × 100
          </div>
        </div>

        <div style={{ background: '#f8f9fa', border: '1px solid #e9ecef', borderRadius: '6px', padding: '1rem' }}>
          <span style={{ fontSize: '0.8rem', color: '#6c757d', fontWeight: 600, textTransform: 'uppercase' }}>
            Evidence Completeness
          </span>
          <div style={{ fontSize: '1.75rem', fontWeight: 'bold', color: evidenceCompleteness !== null ? '#111' : '#888', marginTop: '0.2rem' }}>
            {evidenceCompleteness !== null ? `${evidenceCompleteness.toFixed(1)}%` : 'N/A'}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#6c757d', marginTop: '0.25rem' }}>
            N_applicable / N_total × 100
          </div>
        </div>
      </div>

      {/* Population Summary Breakdown Pills */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', padding: '0.75rem 1rem', background: '#f1f3f5', borderRadius: '6px', marginBottom: '1.5rem', fontSize: '0.85rem' }}>
        <div><strong>Total Authorized Pairs:</strong> {summary.totalUnits}</div>
        <div style={{ color: '#666' }}>•</div>
        <div><strong>Applicable:</strong> {summary.applicableUnits}</div>
        <div style={{ color: '#666' }}>•</div>
        <div style={{ color: '#2e7d32' }}><strong>Aligned:</strong> {summary.alignedUnits}</div>
        <div style={{ color: '#666' }}>•</div>
        <div style={{ color: '#c62828' }}><strong>Misaligned:</strong> {summary.misalignedUnits}</div>
        <div style={{ color: '#666' }}>•</div>
        <div style={{ color: '#6a1b9a' }}><strong>Indeterminate:</strong> {summary.indeterminateUnits}</div>
      </div>

      {/* Alignment Units List */}
      {alignmentUnits.length === 0 ? (
        <div style={{ padding: '1.5rem', background: '#fafafa', borderRadius: '6px', textAlign: 'center', border: '1px solid #eee' }}>
          <p style={{ margin: 0, color: '#777', fontStyle: 'italic' }}>
            No applicable cross-project DEPENDS_ON document contract pairs found in authorized topology.
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {alignmentUnits.map((unit) => (
            <div
              key={unit.unitId}
              style={{
                border: '1px solid #e0e0e0',
                borderRadius: '6px',
                padding: '1rem',
                background: '#fff',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.5rem' }}>
                <div style={{ fontWeight: 'bold', fontSize: '0.95rem' }}>
                  <span>{unit.consumerProject.name}</span>
                  <span style={{ color: '#888', margin: '0 0.4rem' }}>/</span>
                  <span style={{ color: '#0066cc' }}>{unit.consumerDocument.title}</span>
                  <span style={{ color: '#555', margin: '0 0.5rem' }}>DEPENDS ON</span>
                  <span>{unit.providerProject.name}</span>
                  <span style={{ color: '#888', margin: '0 0.4rem' }}>/</span>
                  <span style={{ color: '#0066cc' }}>{unit.providerDocument.title}</span>
                </div>

                <span
                  style={{
                    padding: '0.2rem 0.5rem',
                    borderRadius: '12px',
                    fontSize: '0.75rem',
                    fontWeight: 'bold',
                    ...getUnitBadgeStyle(unit.alignmentState),
                  }}
                >
                  {unit.alignmentState}
                </span>
              </div>

              {/* Version Comparison */}
              <div style={{ fontSize: '0.85rem', color: '#444', display: 'flex', gap: '1.5rem', flexWrap: 'wrap', marginBottom: '0.5rem' }}>
                <div>
                  <span style={{ color: '#666' }}>Consumer Snapshot Ref: </span>
                  <strong>
                    {unit.consumerVersionRef ? `v${unit.consumerVersionRef.versionNumber}` : 'None'}
                  </strong>
                </div>
                <div>
                  <span style={{ color: '#666' }}>Provider Active Version: </span>
                  <strong>
                    {unit.providerActiveVersion ? `v${unit.providerActiveVersion.versionNumber}` : 'None'}
                  </strong>
                </div>
              </div>

              {/* Indeterminacy reason details if any */}
              {unit.indeterminacyReason && (
                <div style={{ fontSize: '0.8rem', color: '#6a1b9a', background: '#f3e5f5', padding: '0.3rem 0.6rem', borderRadius: '4px', marginTop: '0.4rem' }}>
                  Reason: {unit.indeterminacyReason.replace(/_/g, ' ')}
                </div>
              )}

              {/* Governance Evidence Badges */}
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginTop: '0.5rem', fontSize: '0.75rem' }}>
                {unit.governanceEvidence.providerAttested ? (
                  <span style={{ background: '#e8f5e9', color: '#2e7d32', padding: '0.15rem 0.4rem', borderRadius: '4px', border: '1px solid #c8e6c9' }}>
                    ✓ Attested (v{unit.governanceEvidence.attestationVersion})
                  </span>
                ) : (
                  <span style={{ background: '#fff3e0', color: '#e65100', padding: '0.15rem 0.4rem', borderRadius: '4px', border: '1px solid #ffe0b2' }}>
                    ! Provider Unattested
                  </span>
                )}

                {unit.governanceEvidence.attestationStale && (
                  <span style={{ background: '#ffebee', color: '#c62828', padding: '0.15rem 0.4rem', borderRadius: '4px', border: '1px solid #ffcdd2' }}>
                    ⚠ Attestation Stale (Head Drifted)
                  </span>
                )}

                {!unit.governanceEvidence.providerBaselinePresent && (
                  <span style={{ background: '#f3e5f5', color: '#6a1b9a', padding: '0.15rem 0.4rem', borderRadius: '4px' }}>
                    Missing Provider Active Baseline
                  </span>
                )}

                {!unit.governanceEvidence.consumerBaselinePresent && (
                  <span style={{ background: '#f3e5f5', color: '#6a1b9a', padding: '0.15rem 0.4rem', borderRadius: '4px' }}>
                    Missing Consumer Active Baseline
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
