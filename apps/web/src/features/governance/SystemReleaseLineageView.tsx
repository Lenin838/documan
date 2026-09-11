/* eslint-disable @typescript-eslint/no-explicit-any, react-hooks/set-state-in-effect */
import React, { useState, useEffect } from 'react';
import { getCertificateLineageGraph, compareReleaseCertificates } from './governance.api';
import { ReleaseCertificateComplianceAuditView } from './ReleaseCertificateComplianceAuditView';

interface SystemReleaseLineageViewProps {
  projectId: string;
  projectName?: string;
}

export const SystemReleaseLineageView: React.FC<SystemReleaseLineageViewProps> = ({
  projectId,
  projectName = 'Project',
}) => {
  const [lineageData, setLineageData] = useState<any | null>(null);
  const [loadingLineage, setLoadingLineage] = useState<boolean>(true);
  const [lineageError, setLineageError] = useState<string | null>(null);

  const [sourceCertId, setSourceCertId] = useState<string>('');
  const [targetCertId, setTargetCertId] = useState<string>('');
  const [comparisonResult, setComparisonResult] = useState<any | null>(null);
  const [loadingCompare, setLoadingCompare] = useState<boolean>(false);
  const [compareError, setCompareError] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<'topology' | 'baselines' | 'contracts' | 'waivers' | 'attestations'>('baselines');

  const fetchLineage = async () => {
    try {
      setLoadingLineage(true);
      setLineageError(null);
      const data = await getCertificateLineageGraph(projectId);
      setLineageData(data);
      if (data && data.lineageNodes && data.lineageNodes.length >= 2) {
        // Default select target as newest (index 0) and source as older (index 1)
        setTargetCertId(data.lineageNodes[0].certificateId);
        setSourceCertId(data.lineageNodes[1].certificateId);
      } else if (data && data.lineageNodes && data.lineageNodes.length === 1) {
        setTargetCertId(data.lineageNodes[0].certificateId);
        setSourceCertId(data.lineageNodes[0].certificateId);
      }
    } catch (err: any) {
      setLineageError(err.response?.data?.message || err.message || 'Failed to fetch release lineage');
    } finally {
      setLoadingLineage(false);
    }
  };

  useEffect(() => {
    fetchLineage();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  const handleCompare = async () => {
    if (!sourceCertId || !targetCertId) return;
    try {
      setLoadingCompare(true);
      setCompareError(null);
      const data = await compareReleaseCertificates({
        sourceCertificateId: sourceCertId,
        targetCertificateId: targetCertId,
      });
      setComparisonResult(data);
    } catch (err: any) {
      setCompareError(err.response?.data?.message || err.message || 'Comparison failed');
    } finally {
      setLoadingCompare(false);
    }
  };

  return (
    <div style={{ padding: '24px', backgroundColor: '#0f172a', color: '#f8fafc', borderRadius: '12px', marginTop: '24px' }}>
      {/* Header Banner */}
      <div style={{ marginBottom: '20px', padding: '12px 16px', backgroundColor: '#1e293b', borderLeft: '4px solid #3b82f6', borderRadius: '6px' }}>
        <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 600, color: '#60a5fa' }}>
          Release Certificate Lineage & Evolution
        </h3>
        <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#94a3b8' }}>
          DERIVED ANALYTICAL LINEAGE reconstructed from Phase 27 supersedesCertificateId links for {projectName}.
        </p>
      </div>

      {/* Lineage Graph Section */}
      {loadingLineage ? (
        <div style={{ padding: '20px', textAlign: 'center', color: '#94a3b8' }}>Loading supersession lineage...</div>
      ) : lineageError ? (
        <div style={{ padding: '12px', backgroundColor: '#451a1a', color: '#f87171', borderRadius: '6px', marginBottom: '20px' }}>
          {lineageError}
        </div>
      ) : (
        <div style={{ marginBottom: '24px', padding: '16px', backgroundColor: '#1e293b', borderRadius: '8px' }}>
          <h4 style={{ margin: '0 0 12px 0', fontSize: '14px', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#cbd5e1' }}>
            Supersession Lineage Chain / Graph
          </h4>
          {lineageData?.lineageNodes?.length === 0 ? (
            <div style={{ fontSize: '13px', color: '#94a3b8' }}>No certificates found for this project.</div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', overflowX: 'auto', paddingBottom: '8px' }}>
              {lineageData?.lineageNodes?.map((node: any, idx: number) => (
                <React.Fragment key={node.certificateId}>
                  <div
                    style={{
                      padding: '10px 14px',
                      backgroundColor: '#334155',
                      borderRadius: '8px',
                      border: node.certificateStatus === 'ACTIVE' ? '1px solid #10b981' : '1px solid #475569',
                      minWidth: '160px',
                    }}
                  >
                    <div style={{ fontSize: '14px', fontWeight: 600, color: '#f1f5f9' }}>{node.releaseTag}</div>
                    <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '2px' }}>
                      {new Date(node.certifiedAt).toLocaleDateString()}
                    </div>
                    <div style={{ marginTop: '6px' }}>
                      <span
                        style={{
                          fontSize: '10px',
                          padding: '2px 6px',
                          borderRadius: '4px',
                          fontWeight: 600,
                          backgroundColor:
                            node.certificateStatus === 'ACTIVE'
                              ? '#065f46'
                              : node.certificateStatus === 'REVOKED'
                              ? '#991b1b'
                              : '#9a3412',
                          color: '#fff',
                        }}
                      >
                        {node.certificateStatus}
                      </span>
                    </div>
                  </div>
                  {idx < lineageData.lineageNodes.length - 1 && (
                    <div style={{ color: '#64748b', fontSize: '18px', fontWeight: 'bold' }}>← supersedes</div>
                  )}
                </React.Fragment>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Comparison Workbench Controls */}
      <div style={{ padding: '16px', backgroundColor: '#1e293b', borderRadius: '8px', marginBottom: '24px' }}>
        <h4 style={{ margin: '0 0 12px 0', fontSize: '14px', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#cbd5e1' }}>
          Certificate Comparison Workbench
        </h4>
        <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <div>
            <label style={{ display: 'block', fontSize: '12px', color: '#94a3b8', marginBottom: '4px' }}>Source Certificate (Older)</label>
            <select
              value={sourceCertId}
              onChange={(e) => setSourceCertId(e.target.value)}
              style={{ padding: '8px 12px', backgroundColor: '#0f172a', color: '#fff', border: '1px solid #475569', borderRadius: '6px', minWidth: '200px' }}
            >
              <option value="">Select Source Certificate</option>
              {lineageData?.lineageNodes?.map((n: any) => (
                <option key={n.certificateId} value={n.certificateId}>
                  {n.releaseTag} ({new Date(n.certifiedAt).toLocaleDateString()})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '12px', color: '#94a3b8', marginBottom: '4px' }}>Target Certificate (Newer)</label>
            <select
              value={targetCertId}
              onChange={(e) => setTargetCertId(e.target.value)}
              style={{ padding: '8px 12px', backgroundColor: '#0f172a', color: '#fff', border: '1px solid #475569', borderRadius: '6px', minWidth: '200px' }}
            >
              <option value="">Select Target Certificate</option>
              {lineageData?.lineageNodes?.map((n: any) => (
                <option key={n.certificateId} value={n.certificateId}>
                  {n.releaseTag} ({new Date(n.certifiedAt).toLocaleDateString()})
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={handleCompare}
            disabled={loadingCompare || !sourceCertId || !targetCertId}
            style={{
              padding: '8px 20px',
              backgroundColor: loadingCompare ? '#475569' : '#2563eb',
              color: '#fff',
              border: 'none',
              borderRadius: '6px',
              fontWeight: 600,
              cursor: loadingCompare ? 'not-allowed' : 'pointer',
            }}
          >
            {loadingCompare ? 'Comparing...' : 'Compare Release Certificates'}
          </button>
        </div>

        {compareError && (
          <div style={{ marginTop: '12px', padding: '8px 12px', backgroundColor: '#451a1a', color: '#f87171', borderRadius: '6px', fontSize: '13px' }}>
            {compareError}
          </div>
        )}
      </div>

      {/* Comparison Results */}
      {comparisonResult && (
        <div>
          {/* Trajectory Banner */}
          <div
            style={{
              padding: '16px',
              borderRadius: '8px',
              marginBottom: '20px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              backgroundColor:
                comparisonResult.trajectory?.classification === 'IMPROVED'
                  ? '#064e3b'
                  : comparisonResult.trajectory?.classification === 'DEGRADED'
                  ? '#7f1d1d'
                  : '#1e293b',
              border: '1px solid #334155',
            }}
          >
            <div>
              <div style={{ fontSize: '12px', textTransform: 'uppercase', color: '#94a3b8' }}>System Evolution Trajectory</div>
              <div style={{ fontSize: '20px', fontWeight: 700, marginTop: '2px', color: '#fff' }}>
                {comparisonResult.trajectory?.classification}
              </div>
            </div>

            <div style={{ display: 'flex', gap: '24px' }}>
              <div>
                <div style={{ fontSize: '11px', color: '#94a3b8' }}>Δ Alignment Score</div>
                <div style={{ fontSize: '16px', fontWeight: 600, color: comparisonResult.trajectory?.deltaAlignmentScore > 0 ? '#34d399' : '#f87171' }}>
                  {comparisonResult.trajectory?.deltaAlignmentScore !== null
                    ? `${comparisonResult.trajectory?.deltaAlignmentScore > 0 ? '+' : ''}${comparisonResult.trajectory?.deltaAlignmentScore}%`
                    : 'N/A (No Applicable Contracts)'}
                </div>
              </div>

              <div>
                <div style={{ fontSize: '11px', color: '#94a3b8' }}>Δ Active Waivers</div>
                <div style={{ fontSize: '16px', fontWeight: 600, color: comparisonResult.trajectory?.deltaWaiverCount <= 0 ? '#34d399' : '#f87171' }}>
                  {comparisonResult.trajectory?.deltaWaiverCount > 0 ? `+${comparisonResult.trajectory?.deltaWaiverCount}` : comparisonResult.trajectory?.deltaWaiverCount}
                </div>
              </div>

              <div>
                <div style={{ fontSize: '11px', color: '#94a3b8' }}>Breaking Contract Deltas</div>
                <div style={{ fontSize: '16px', fontWeight: 600, color: comparisonResult.trajectory?.hasBreakingContractDeltas ? '#f87171' : '#34d399' }}>
                  {comparisonResult.trajectory?.hasBreakingContractDeltas ? 'YES (Breaking Changes)' : 'NONE (Safe)'}
                </div>
              </div>
            </div>
          </div>

          {/* Differential Tabs */}
          <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid #334155', marginBottom: '16px' }}>
            {(['baselines', 'contracts', 'waivers', 'topology', 'attestations'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                style={{
                  padding: '8px 16px',
                  backgroundColor: activeTab === tab ? '#3b82f6' : 'transparent',
                  color: activeTab === tab ? '#fff' : '#94a3b8',
                  border: 'none',
                  borderTopLeftRadius: '6px',
                  borderTopRightRadius: '6px',
                  cursor: 'pointer',
                  fontWeight: 600,
                  textTransform: 'capitalize',
                }}
              >
                {tab}
              </button>
            ))}
          </div>

          {/* Tab Contents */}
          <div style={{ padding: '16px', backgroundColor: '#1e293b', borderRadius: '8px' }}>
            {activeTab === 'baselines' && (
              <div>
                <h4 style={{ margin: '0 0 12px 0', fontSize: '14px', color: '#cbd5e1' }}>Baseline Version Deltas</h4>
                {comparisonResult.baselineDeltas?.length === 0 ? (
                  <div style={{ color: '#94a3b8', fontSize: '13px' }}>Zero baseline version changes detected.</div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {comparisonResult.baselineDeltas?.map((b: any, idx: number) => (
                      <div key={idx} style={{ padding: '8px 12px', backgroundColor: '#0f172a', borderRadius: '6px', display: 'flex', justifyContent: 'space-between' }}>
                        <div>
                          <strong>{b.projectName}</strong> ({b.sourceVersionTag || 'N/A'} → {b.targetVersionTag || 'N/A'})
                        </div>
                        <span style={{ fontSize: '12px', padding: '2px 6px', borderRadius: '4px', backgroundColor: '#3b82f6', color: '#fff' }}>
                          {b.deltaType}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'contracts' && (
              <div>
                <h4 style={{ margin: '0 0 12px 0', fontSize: '14px', color: '#cbd5e1' }}>Structural Contract Deltas (Phase 23)</h4>
                {comparisonResult.contractDeltas?.length === 0 ? (
                  <div style={{ color: '#94a3b8', fontSize: '13px' }}>Zero structural contract diffs detected between baseline versions.</div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {comparisonResult.contractDeltas?.map((c: any, idx: number) => (
                      <div key={idx} style={{ padding: '8px 12px', backgroundColor: '#0f172a', borderRadius: '6px', borderLeft: c.impactSeverity === 'CRITICAL' ? '4px solid #ef4444' : '4px solid #3b82f6' }}>
                        <div style={{ fontSize: '13px', fontWeight: 600, color: '#f1f5f9' }}>
                          [{c.endpointMethod}] {c.endpointPath} - {c.deltaType}
                        </div>
                        <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '2px' }}>{c.description}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'waivers' && (
              <div>
                <h4 style={{ margin: '0 0 12px 0', fontSize: '14px', color: '#cbd5e1' }}>Policy Waiver Evolution</h4>
                {comparisonResult.waiverDeltas?.length === 0 ? (
                  <div style={{ color: '#94a3b8', fontSize: '13px' }}>Zero waiver shifts detected between certifications.</div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {comparisonResult.waiverDeltas?.map((w: any, idx: number) => (
                      <div key={idx} style={{ padding: '8px 12px', backgroundColor: '#0f172a', borderRadius: '6px', display: 'flex', justifyContent: 'space-between' }}>
                        <div>
                          <strong>{w.blockerType}</strong> (Scope: {w.waiverScope || 'ALL'})
                        </div>
                        <span style={{ fontSize: '12px', padding: '2px 6px', borderRadius: '4px', backgroundColor: w.deltaType === 'RESOLVED' ? '#10b981' : '#f59e0b', color: '#fff' }}>
                          {w.deltaType}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'topology' && (
              <div>
                <h4 style={{ margin: '0 0 12px 0', fontSize: '14px', color: '#cbd5e1' }}>Topology Node & Edge Deltas</h4>
                <div style={{ fontSize: '13px', color: '#94a3b8' }}>
                  Added Nodes: {comparisonResult.topologyDeltas?.addedNodes?.length || 0} |
                  Removed Nodes: {comparisonResult.topologyDeltas?.removedNodes?.length || 0} |
                  Unchanged Nodes: {comparisonResult.topologyDeltas?.unchangedNodes?.length || 0}
                </div>
              </div>
            )}

            {activeTab === 'attestations' && (
              <div>
                <h4 style={{ margin: '0 0 12px 0', fontSize: '14px', color: '#cbd5e1' }}>Attestation Evidence Coverage Deltas</h4>
                <div style={{ fontSize: '13px', color: '#94a3b8' }}>
                  Attestations in comparison: {comparisonResult.attestationDeltas?.length || 0} items evaluated.
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {targetCertId && (
        <div style={{ marginTop: '24px' }}>
          <ReleaseCertificateComplianceAuditView certificateId={targetCertId} projectId={projectId} />
        </div>
      )}
    </div>
  );
};
