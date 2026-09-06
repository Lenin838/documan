/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState } from 'react';

import type { ContractEvolutionDeltaResponseDTO } from '../system-contract-evolution.types';
import { fetchContractEvolutionDelta } from '../system-contract-evolution.api';

interface ContractEvolutionAnalyzerProps {
  providerProjectId: string;
  token: string;
}

export const ContractEvolutionAnalyzer: React.FC<ContractEvolutionAnalyzerProps> = ({
  providerProjectId,
  token,
}) => {
  const [providerDocumentId, setProviderDocumentId] = useState('');
  const [baselineIdA, setBaselineIdA] = useState('');
  const [baselineIdB, setBaselineIdB] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<ContractEvolutionDeltaResponseDTO | null>(null);

  const handleRunAnalysis = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!providerDocumentId.trim() || !baselineIdA.trim() || !baselineIdB.trim()) {
      setError('Please provide Provider Document ID, Baseline A ID/Version, and Baseline B ID/Version');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const result = await fetchContractEvolutionDelta(
        providerProjectId,
        providerDocumentId.trim(),
        baselineIdA.trim(),
        baselineIdB.trim(),
        token,
      );
      setData(result);
    } catch (err: any) {
      setError(err.message || 'Failed to calculate contract evolution delta');
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  const getRiskBadge = (risk: string) => {
    switch (risk) {
      case 'BREAKING':
        return <span style={{ background: '#7f1d1d', color: '#fca5a5', padding: '2px 8px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 600 }}>BREAKING</span>;
      case 'WARNING':
        return <span style={{ background: '#78350f', color: '#fde68a', padding: '2px 8px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 600 }}>WARNING</span>;
      default:
        return <span style={{ background: '#1e3a8a', color: '#93c5fd', padding: '2px 8px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 600 }}>NON_BREAKING</span>;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'COMPLETE':
        return <span style={{ background: '#065f46', color: '#a7f3d0', padding: '4px 10px', borderRadius: '6px', fontSize: '0.85rem', fontWeight: 600 }}>ANALYSIS COMPLETE</span>;
      case 'UNSUPPORTED_CONTRACT_STRUCTURE':
        return <span style={{ background: '#78350f', color: '#fde68a', padding: '4px 10px', borderRadius: '6px', fontSize: '0.85rem', fontWeight: 600 }}>UNSUPPORTED STRUCTURE</span>;
      default:
        return <span style={{ background: '#374151', color: '#d1d5db', padding: '4px 10px', borderRadius: '6px', fontSize: '0.85rem', fontWeight: 600 }}>INDETERMINATE EVIDENCE</span>;
    }
  };

  return (
    <div style={{ marginTop: '24px', background: '#0f172a', border: '1px solid #1e293b', borderRadius: '8px', padding: '20px', color: '#f8fafc' }}>
      <div style={{ borderBottom: '1px solid #1e293b', paddingBottom: '12px', marginBottom: '16px' }}>
        <h3 style={{ margin: 0, fontSize: '1.15rem', color: '#38bdf8', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span>🔄</span> Cross-Project Contract Evolution Intelligence Analyzer
        </h3>
        <p style={{ margin: '4px 0 0 0', fontSize: '0.85rem', color: '#94a3b8' }}>
          Perform deterministic structural diffing between baseline versions to inspect breaking API deltas and topological blast radius.
        </p>
      </div>

      <form onSubmit={handleRunAnalysis} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr auto', gap: '12px', alignItems: 'end', marginBottom: '20px' }}>
        <div>
          <label style={{ display: 'block', fontSize: '0.75rem', color: '#cbd5e1', marginBottom: '4px' }}>Provider Document ID</label>
          <input
            type="text"
            placeholder="e.g. 6500a1b2c3d4..."
            value={providerDocumentId}
            onChange={(e) => setProviderDocumentId(e.target.value)}
            style={{ width: '100%', padding: '8px 12px', background: '#1e293b', border: '1px solid #334155', borderRadius: '6px', color: '#fff', fontSize: '0.85rem' }}
          />
        </div>
        <div>
          <label style={{ display: 'block', fontSize: '0.75rem', color: '#cbd5e1', marginBottom: '4px' }}>Baseline A (Version / ID)</label>
          <input
            type="text"
            placeholder="e.g. 1.0.0"
            value={baselineIdA}
            onChange={(e) => setBaselineIdA(e.target.value)}
            style={{ width: '100%', padding: '8px 12px', background: '#1e293b', border: '1px solid #334155', borderRadius: '6px', color: '#fff', fontSize: '0.85rem' }}
          />
        </div>
        <div>
          <label style={{ display: 'block', fontSize: '0.75rem', color: '#cbd5e1', marginBottom: '4px' }}>Baseline B (Version / ID)</label>
          <input
            type="text"
            placeholder="e.g. 2.0.0"
            value={baselineIdB}
            onChange={(e) => setBaselineIdB(e.target.value)}
            style={{ width: '100%', padding: '8px 12px', background: '#1e293b', border: '1px solid #334155', borderRadius: '6px', color: '#fff', fontSize: '0.85rem' }}
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          style={{ padding: '8px 16px', background: '#0284c7', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer', fontSize: '0.85rem' }}
        >
          {loading ? 'Analyzing...' : 'Analyze Deltas'}
        </button>
      </form>

      {error && (
        <div style={{ background: '#450a0a', border: '1px solid #991b1b', color: '#fca5a5', padding: '12px', borderRadius: '6px', marginBottom: '16px', fontSize: '0.85rem' }}>
          <strong>Error:</strong> {error}
        </div>
      )}

      {data && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#1e293b', padding: '12px 16px', borderRadius: '6px', marginBottom: '16px' }}>
            <div>
              <div style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Contract Evolution Scope</div>
              <div style={{ fontSize: '0.95rem', fontWeight: 600, color: '#f8fafc' }}>
                Baseline {data.providerBaselineA?.version || 'A'} ➔ Baseline {data.providerBaselineB?.version || 'B'}
              </div>
            </div>
            <div>{getStatusBadge(data.analysisStatus)}</div>
          </div>

          {data.analysisStatus !== 'COMPLETE' && (
            <div style={{ background: '#451a03', border: '1px solid #78350f', color: '#fde68a', padding: '14px', borderRadius: '6px', marginBottom: '16px', fontSize: '0.85rem' }}>
              <strong>Bounded Analysis Status:</strong> {data.unsupportedReason || 'Contract structure cannot be deterministically evaluated.'}
            </div>
          )}

          {/* Blast Radius Card */}
          <div style={{ gridTemplateColumns: '1fr 1fr 1fr', display: 'grid', gap: '12px', marginBottom: '20px' }}>
            <div style={{ background: '#1e293b', padding: '12px', borderRadius: '6px', textAlign: 'center' }}>
              <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Affected Projects / Reachable</div>
              <div style={{ fontSize: '1.2rem', fontWeight: 700, color: '#38bdf8' }}>
                {data.blastRadius.affectedProjectsCount} / {data.blastRadius.reachableProjectsCount}
              </div>
              <div style={{ fontSize: '0.75rem', color: '#cbd5e1' }}>
                {data.blastRadius.projectBlastRadiusRatio !== null ? `${(data.blastRadius.projectBlastRadiusRatio * 100).toFixed(1)}% Ratio` : 'N/A'}
              </div>
            </div>

            <div style={{ background: '#1e293b', padding: '12px', borderRadius: '6px', textAlign: 'center' }}>
              <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Affected Documents / Reachable</div>
              <div style={{ fontSize: '1.2rem', fontWeight: 700, color: '#f43f5e' }}>
                {data.blastRadius.affectedDocumentsCount} / {data.blastRadius.reachableDocumentsCount}
              </div>
              <div style={{ fontSize: '0.75rem', color: '#cbd5e1' }}>
                {data.blastRadius.documentBlastRadiusRatio !== null ? `${(data.blastRadius.documentBlastRadiusRatio * 100).toFixed(1)}% Ratio` : 'N/A'}
              </div>
            </div>

            <div style={{ background: '#1e293b', padding: '12px', borderRadius: '6px', textAlign: 'center' }}>
              <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Structural Deltas Total</div>
              <div style={{ fontSize: '1.2rem', fontWeight: 700, color: '#fbbf24' }}>
                {data.contractDeltas.length}
              </div>
              <div style={{ fontSize: '0.75rem', color: '#cbd5e1' }}>
                {data.contractDeltas.filter((d) => d.riskTier === 'BREAKING').length} Breaking
              </div>
            </div>
          </div>

          {/* Structural Deltas Table */}
          {data.contractDeltas.length > 0 && (
            <div style={{ marginBottom: '20px' }}>
              <h4 style={{ fontSize: '0.95rem', color: '#cbd5e1', marginBottom: '8px' }}>Deterministic Structural Deltas</h4>
              <div style={{ overflowX: 'auto', background: '#1e293b', borderRadius: '6px' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem', textAlign: 'left' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid #334155', color: '#94a3b8' }}>
                      <th style={{ padding: '8px 12px' }}>Risk</th>
                      <th style={{ padding: '8px 12px' }}>Delta Code</th>
                      <th style={{ padding: '8px 12px' }}>Target Path / Method</th>
                      <th style={{ padding: '8px 12px' }}>Description</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.contractDeltas.map((delta, idx) => (
                      <tr key={idx} style={{ borderBottom: '1px solid #334155' }}>
                        <td style={{ padding: '8px 12px' }}>{getRiskBadge(delta.riskTier)}</td>
                        <td style={{ padding: '8px 12px', fontFamily: 'monospace', color: '#f8fafc' }}>{delta.deltaCode}</td>
                        <td style={{ padding: '8px 12px', fontFamily: 'monospace', color: '#38bdf8' }}>
                          {delta.method ? `${delta.method} ${delta.path}` : delta.fieldPath || '-'}
                        </td>
                        <td style={{ padding: '8px 12px', color: '#cbd5e1' }}>{delta.description}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* DEPENDENCY_ORDERED_IMPACT_SEQUENCE List */}
          {data.dependencyOrderedImpactSequence.length > 0 && (
            <div>
              <h4 style={{ fontSize: '0.95rem', color: '#cbd5e1', marginBottom: '8px' }}>
                Topological Impact Sequence (DEPENDENCY_ORDERED_IMPACT_SEQUENCE)
              </h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {data.dependencyOrderedImpactSequence.map((item, idx) => (
                  <div key={idx} style={{ background: '#1e293b', borderLeft: '4px solid #38bdf8', padding: '10px 14px', borderRadius: '4px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#f8fafc' }}>
                        [Depth {item.depth}] {item.consumerProjectName} ➔ {item.consumerDocumentTitle}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '2px' }}>
                        Referenced Baseline Version: v{item.consumerReferencedVersion} • Category: {item.impactCategory}
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                      <span style={{ background: '#7f1d1d', color: '#fca5a5', padding: '2px 6px', borderRadius: '4px', fontSize: '0.7rem', fontWeight: 600 }}>
                        {item.implications.alignmentConsequence}
                      </span>
                      <span style={{ background: item.implications.governanceConsequence === 'PASSED_WITH_WAIVER' ? '#78350f' : '#991b1b', color: item.implications.governanceConsequence === 'PASSED_WITH_WAIVER' ? '#fde68a' : '#fecaca', padding: '2px 6px', borderRadius: '4px', fontSize: '0.7rem', fontWeight: 600 }}>
                        {item.implications.governanceConsequence}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
