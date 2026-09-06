import { useEffect, useState, useCallback } from 'react';
import { getSystemContractMatrix } from '../system-contract-matrix.api';
import type {
  SystemContractMatrixResponseDTO,
  InteroperabilityCellDTO,
  InteroperabilityState,
  SystemContractMatrixOverallStatus,
} from '../system-contract-matrix.types';

interface SystemContractMatrixViewProps {
  projectId: string;
}

export function SystemContractMatrixView({ projectId }: SystemContractMatrixViewProps) {
  const [data, setData] = useState<SystemContractMatrixResponseDTO | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedCell, setSelectedCell] = useState<InteroperabilityCellDTO | null>(null);
  const [stateFilter, setStateFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const loadMatrix = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await getSystemContractMatrix(projectId);
      setData(res.data);
    } catch (err: unknown) {
      const msg = err && typeof err === 'object' && 'message' in err ? String((err as { message: string }).message) : 'Failed to load cross-project contract matrix';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    let isSubscribed = true;
    const fetchMatrix = async () => {
      try {
        const res = await getSystemContractMatrix(projectId);
        if (isSubscribed) {
          setData(res.data);
          setLoading(false);
        }
      } catch (err: unknown) {
        if (isSubscribed) {
          const msg = err && typeof err === 'object' && 'message' in err ? String((err as { message: string }).message) : 'Failed to load cross-project contract matrix';
          setError(msg);
          setLoading(false);
        }
      }
    };
    void fetchMatrix();
    return () => {
      isSubscribed = false;
    };
  }, [projectId]);

  const getStateBadgeStyle = (state: InteroperabilityState) => {
    switch (state) {
      case 'ALIGNED':
        return { background: '#e8f5e9', color: '#2e7d32', border: '1px solid #a5d6a7', label: 'ALIGNED' };
      case 'STRUCTURALLY_MISALIGNED':
        return { background: '#fff3e0', color: '#e65100', border: '1px solid #ffe0b2', label: 'MISALIGNED' };
      case 'BREAKING_CONTRACT_DELTA':
        return { background: '#ffebee', color: '#c62828', border: '1px solid #ffcdd2', label: 'BREAKING' };
      case 'UNSUPPORTED_CONTRACT':
        return { background: '#ede7f6', color: '#512da8', border: '1px solid #d1c4e9', label: 'UNSUPPORTED' };
      case 'MISSING_AUTHORITATIVE_CONTRACT':
        return { background: '#fff8e1', color: '#f57f17', border: '1px solid #ffe082', label: 'MISSING' };
      case 'INDETERMINATE':
        return { background: '#f3e5f5', color: '#8e24aa', border: '1px solid #e1bee7', label: 'INDETERMINATE' };
      case 'NO_RELEVANT_CONTRACT_DEPENDENCY':
      default:
        return { background: '#f5f5f5', color: '#757575', border: '1px solid #e0e0e0', label: 'NO DEPENDENCY' };
    }
  };

  const getOverallStatusBadge = (status: SystemContractMatrixOverallStatus) => {
    switch (status) {
      case 'FULL_COMPATIBILITY':
        return { background: '#e8f5e9', color: '#2e7d32', border: '1px solid #a5d6a7', label: 'FULL COMPATIBILITY' };
      case 'PARTIAL_MISALIGNMENT':
        return { background: '#fff3e0', color: '#e65100', border: '1px solid #ffe0b2', label: 'PARTIAL MISALIGNMENT' };
      case 'BREAKING_INCOMPATIBILITY':
        return { background: '#ffebee', color: '#c62828', border: '1px solid #ffcdd2', label: 'BREAKING INCOMPATIBILITY' };
      case 'INDETERMINATE':
      default:
        return { background: '#f3e5f5', color: '#8e24aa', border: '1px solid #e1bee7', label: 'INDETERMINATE' };
    }
  };

  if (loading) {
    return (
      <div style={{ padding: '1.5rem', background: '#fff', border: '1px solid #e0e0e0', borderRadius: '8px', marginTop: '1.5rem' }}>
        <p style={{ margin: 0, color: '#666' }}>Loading cross-project contract interoperability matrix...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div style={{ padding: '1.5rem', background: '#fff', border: '1px solid #e0e0e0', borderRadius: '8px', marginTop: '1.5rem' }}>
        <h3 style={{ margin: '0 0 0.5rem 0', color: '#333' }}>Cross-Project Contract Interoperability Matrix</h3>
        <p style={{ color: '#c62828', margin: '0 0 1rem 0' }}>{error || 'No data available'}</p>
        <button
          type="button"
          onClick={() => void loadMatrix()}
          style={{ padding: '0.4rem 0.8rem', background: '#1976d2', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
        >
          Retry
        </button>
      </div>
    );
  }

  const filteredHeaders = data.projectHeaders.filter((h) =>
    h.name.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  return (
    <div style={{ background: '#fff', border: '1px solid #e0e0e0', borderRadius: '8px', padding: '1.5rem', marginTop: '1.5rem' }}>
      {/* Header Title & Status */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.25rem' }}>
        <div>
          <h2 style={{ margin: '0 0 0.4rem 0', fontSize: '1.25rem', color: '#111' }}>
            Cross-Project Contract Interoperability Matrix & Topology Compatibility
          </h2>
          <p style={{ margin: 0, color: '#666', fontSize: '0.85rem' }}>
            Structural OpenAPI contract compatibility, baseline identity alignment, and dependency precedence taxonomy across authorized system topology
          </p>
        </div>
        <span
          style={{
            padding: '0.4rem 0.85rem',
            borderRadius: '16px',
            fontSize: '0.85rem',
            fontWeight: 'bold',
            ...getOverallStatusBadge(data.overallStatus),
          }}
        >
          {getOverallStatusBadge(data.overallStatus).label}
        </span>
      </div>

      {/* Summary KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
        <div style={{ background: '#f8f9fa', border: '1px solid #e9ecef', borderRadius: '6px', padding: '1rem' }}>
          <span style={{ fontSize: '0.75rem', color: '#6c757d', fontWeight: 600, textTransform: 'uppercase' }}>
            Authorized Projects
          </span>
          <div style={{ fontSize: '1.6rem', fontWeight: 'bold', color: '#111', marginTop: '0.2rem' }}>
            {data.authorizedProjectCount}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#6c757d', marginTop: '0.25rem' }}>
            Matrix: {data.matrixDimensions}
          </div>
        </div>

        <div style={{ background: '#f8f9fa', border: '1px solid #e9ecef', borderRadius: '6px', padding: '1rem' }}>
          <span style={{ fontSize: '0.75rem', color: '#6c757d', fontWeight: 600, textTransform: 'uppercase' }}>
            Aligned Contracts Ratio
          </span>
          <div style={{ fontSize: '1.6rem', fontWeight: 'bold', color: '#2e7d32', marginTop: '0.2rem' }}>
            {data.alignedPairPercentage}%
          </div>
          <div style={{ fontSize: '0.75rem', color: '#6c757d', marginTop: '0.25rem' }}>
            Structural identity alignment
          </div>
        </div>

        <div style={{ background: '#f8f9fa', border: '1px solid #e9ecef', borderRadius: '6px', padding: '1rem' }}>
          <span style={{ fontSize: '0.75rem', color: '#6c757d', fontWeight: 600, textTransform: 'uppercase' }}>
            Active Baseline Coverage
          </span>
          <div style={{ fontSize: '1.6rem', fontWeight: 'bold', color: '#0288d1', marginTop: '0.2rem' }}>
            {data.activeBaselineCoveragePercentage}%
          </div>
          <div style={{ fontSize: '0.75rem', color: '#6c757d', marginTop: '0.25rem' }}>
            Projects with active baseline
          </div>
        </div>

        <div style={{ background: '#f8f9fa', border: '1px solid #e9ecef', borderRadius: '6px', padding: '1rem' }}>
          <span style={{ fontSize: '0.75rem', color: '#6c757d', fontWeight: 600, textTransform: 'uppercase' }}>
            Critical Incompatibilities
          </span>
          <div
            style={{
              fontSize: '1.6rem',
              fontWeight: 'bold',
              color: data.criticalIncompatibilities.length > 0 ? '#c62828' : '#2e7d32',
              marginTop: '0.2rem',
            }}
          >
            {data.criticalIncompatibilities.length}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#6c757d', marginTop: '0.25rem' }}>
            Breaking/misaligned boundaries
          </div>
        </div>
      </div>

      {/* Axis & Privacy Info Banner */}
      <div style={{ background: '#e3f2fd', border: '1px solid #90caf9', borderRadius: '6px', padding: '0.75rem 1rem', marginBottom: '1.25rem', fontSize: '0.825rem', color: '#0d47a1' }}>
        <strong>Directional Relationship Analysis (A → B):</strong> Rows represent Consumer Projects. Columns represent Provider Projects. Each cell [Row, Col] represents contract alignment from Consumer to Provider. Evaluates OpenAPI structural delta taxonomy. Does not claim runtime code execution compatibility.
      </div>

      {/* Filter Toolbar */}
      <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center', marginBottom: '1rem' }}>
        <div style={{ flex: '1 1 200px' }}>
          <input
            type="text"
            placeholder="Search project name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ width: '100%', padding: '0.45rem 0.75rem', borderRadius: '4px', border: '1px solid #ccc', fontSize: '0.85rem' }}
          />
        </div>
        <div>
          <select
            value={stateFilter}
            onChange={(e) => setStateFilter(e.target.value)}
            style={{ padding: '0.45rem 0.75rem', borderRadius: '4px', border: '1px solid #ccc', fontSize: '0.85rem' }}
          >
            <option value="ALL">All States</option>
            <option value="ALIGNED">ALIGNED</option>
            <option value="STRUCTURALLY_MISALIGNED">STRUCTURALLY MISALIGNED</option>
            <option value="BREAKING_CONTRACT_DELTA">BREAKING CONTRACT DELTA</option>
            <option value="UNSUPPORTED_CONTRACT">UNSUPPORTED CONTRACT</option>
            <option value="MISSING_AUTHORITATIVE_CONTRACT">MISSING AUTHORITATIVE CONTRACT</option>
            <option value="INDETERMINATE">INDETERMINATE</option>
          </select>
        </div>
      </div>

      {/* Matrix Table */}
      <div style={{ overflowX: 'auto', border: '1px solid #e0e0e0', borderRadius: '6px', marginBottom: '1.5rem' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem', textAlign: 'left' }}>
          <thead>
            <tr style={{ background: '#f5f5f5', borderBottom: '2px solid #e0e0e0' }}>
              <th style={{ padding: '0.75rem 1rem', background: '#fafafa', borderRight: '2px solid #e0e0e0', fontWeight: 'bold', width: '220px' }}>
                Consumer (Row) \ Provider (Col)
              </th>
              {filteredHeaders.map((header) => (
                <th key={header.projectId} style={{ padding: '0.75rem 1rem', fontWeight: 600, borderRight: '1px solid #e0e0e0', whiteSpace: 'nowrap' }}>
                  {header.name}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filteredHeaders.map((rowHeader) => {
              const rowIndex = data.projectHeaders.findIndex((h) => h.projectId === rowHeader.projectId);
              const rowCells = data.matrix[rowIndex] || [];

              return (
                <tr key={rowHeader.projectId} style={{ borderBottom: '1px solid #e0e0e0' }}>
                  <td style={{ padding: '0.75rem 1rem', background: '#fafafa', borderRight: '2px solid #e0e0e0', fontWeight: 'bold', fontSize: '0.85rem' }}>
                    {rowHeader.name}
                  </td>
                  {filteredHeaders.map((colHeader) => {
                    const colIndex = data.projectHeaders.findIndex((h) => h.projectId === colHeader.projectId);
                    const cell = rowCells[colIndex];
                    if (!cell) {
                      return <td key={colHeader.projectId} style={{ padding: '0.75rem 1rem', borderRight: '1px solid #e0e0e0' }}>-</td>;
                    }

                    const badge = getStateBadgeStyle(cell.interoperabilityState);
                    const isMatchFilter = stateFilter === 'ALL' || cell.interoperabilityState === stateFilter;
                    const isSelf = cell.rowProjectId === cell.colProjectId;

                    return (
                      <td
                        key={colHeader.projectId}
                        onClick={() => setSelectedCell(cell)}
                        style={{
                          padding: '0.6rem 0.8rem',
                          borderRight: '1px solid #e0e0e0',
                          cursor: 'pointer',
                          opacity: isMatchFilter ? 1 : 0.25,
                          background: isSelf ? '#fafafa' : '#fff',
                        }}
                      >
                        {isSelf ? (
                          <span style={{ color: '#aaa', fontSize: '0.75rem' }}>Self</span>
                        ) : (
                          <div style={{ display: 'inline-flex', flexDirection: 'column', gap: '0.2rem' }}>
                            <span
                              style={{
                                padding: '0.2rem 0.5rem',
                                borderRadius: '4px',
                                fontSize: '0.725rem',
                                fontWeight: 'bold',
                                textTransform: 'uppercase',
                                ...badge,
                              }}
                            >
                              {badge.label}
                            </span>
                            {cell.relationshipType === 'CONSUMER_TO_PROVIDER' && (
                              <span style={{ fontSize: '0.7rem', color: '#666' }}>
                                Consumer → Provider
                              </span>
                            )}
                          </div>
                        )}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Critical Incompatibilities List */}
      {data.criticalIncompatibilities.length > 0 && (
        <div style={{ marginBottom: '1.5rem' }}>
          <h3 style={{ margin: '0 0 0.75rem 0', fontSize: '1rem', color: '#c62828' }}>
            Critical Incompatibilities & Required Actions
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {data.criticalIncompatibilities.map((item, idx) => (
              <div
                key={`${item.consumerProjectId}_${item.providerProjectId}_${idx}`}
                style={{
                  background: '#ffebee',
                  border: '1px solid #ffcdd2',
                  borderRadius: '6px',
                  padding: '0.85rem 1rem',
                  fontSize: '0.85rem',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.3rem' }}>
                  <strong style={{ color: '#b71c1c' }}>
                    {item.consumerProjectName} → {item.providerProjectName}
                  </strong>
                  <span style={{ fontWeight: 'bold', color: '#c62828', fontSize: '0.75rem' }}>
                    {item.interoperabilityState}
                  </span>
                </div>
                <div style={{ color: '#444', marginBottom: '0.4rem' }}>
                  Action: {item.remediationAction}
                </div>
                <div style={{ fontSize: '0.75rem', color: '#666' }}>
                  Provider Active Baseline: {item.activeProviderBaselineVersion || 'None'} | Referenced Target: {item.referencedConsumerBaselineVersion || 'None'}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Cell Detail Modal */}
      {selectedCell && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
          }}
        >
          <div
            style={{
              background: '#fff',
              borderRadius: '8px',
              padding: '1.5rem',
              width: '90%',
              maxWidth: '550px',
              boxShadow: '0 4px 16px rgba(0,0,0,0.2)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 style={{ margin: 0, fontSize: '1.1rem' }}>Interoperability Boundary Details</h3>
              <button
                type="button"
                onClick={() => setSelectedCell(null)}
                style={{ background: 'none', border: 'none', fontSize: '1.2rem', cursor: 'pointer', color: '#666' }}
              >
                ✕
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: '0.85rem' }}>
              <div>
                <strong>Consumer Project:</strong> {selectedCell.rowProjectName}
              </div>
              <div>
                <strong>Provider Project:</strong> {selectedCell.colProjectName}
              </div>
              <div>
                <strong>Relationship Type:</strong> {selectedCell.relationshipType}
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <strong>State:</strong>
                <span
                  style={{
                    padding: '0.2rem 0.6rem',
                    borderRadius: '4px',
                    fontSize: '0.75rem',
                    fontWeight: 'bold',
                    ...getStateBadgeStyle(selectedCell.interoperabilityState),
                  }}
                >
                  {selectedCell.interoperabilityState} (Tier {selectedCell.precedenceTier})
                </span>
              </div>

              <div style={{ background: '#f8f9fa', padding: '0.75rem', borderRadius: '4px', border: '1px solid #e0e0e0' }}>
                <div><strong>Contract Count:</strong> {selectedCell.contractCount}</div>
                <div><strong>Aligned Contracts:</strong> {selectedCell.alignedContractCount}</div>
                <div><strong>Misaligned Contracts:</strong> {selectedCell.misalignedContractCount}</div>
                <div><strong>Breaking Deltas:</strong> {selectedCell.breakingDeltaCount}</div>
              </div>

              <div>
                <strong>Active Provider Baseline Version:</strong> {selectedCell.activeProviderBaselineVersion || 'None'}
              </div>
              <div>
                <strong>Referenced Consumer Baseline Version:</strong> {selectedCell.referencedConsumerBaselineVersion || 'None'}
              </div>

              {selectedCell.indeterminacyReason && (
                <div style={{ color: '#8e24aa', background: '#f3e5f5', padding: '0.5rem', borderRadius: '4px' }}>
                  <strong>Indeterminacy Reason:</strong> {selectedCell.indeterminacyReason}
                </div>
              )}

              {selectedCell.remediationAction && (
                <div style={{ color: '#e65100', background: '#fff3e0', padding: '0.5rem', borderRadius: '4px' }}>
                  <strong>Remediation Action:</strong> {selectedCell.remediationAction}
                </div>
              )}
            </div>

            <div style={{ marginTop: '1.25rem', textAlign: 'right' }}>
              <button
                type="button"
                onClick={() => setSelectedCell(null)}
                style={{ padding: '0.4rem 0.8rem', background: '#1976d2', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
