import { useState } from 'react';
import { simulateSystemTopologyGate } from '../system-topology-simulation.api';
import type {
  SystemTopologySimulationResponse,
  ProposedBaselineOverlay,
  ProposedAttestationOverlay,
  CandidateWaiverOverlay,
  ProposedTopologyLinkOverlay,
} from '../system-topology-simulation.types';
import type { SystemReleaseStatus, SystemBlockerType } from '../system-topology-governance-gate.types';

interface SystemTopologySimulationSandboxProps {
  projectId: string;
}

export function SystemTopologySimulationSandbox({ projectId }: SystemTopologySimulationSandboxProps) {
  const [proposedBaselines, setProposedBaselines] = useState<ProposedBaselineOverlay[]>([]);
  const [proposedAttestations, setProposedAttestations] = useState<ProposedAttestationOverlay[]>([]);
  const [candidateWaivers, setCandidateWaivers] = useState<CandidateWaiverOverlay[]>([]);
  const [proposedTopologyLinks, setProposedTopologyLinks] = useState<ProposedTopologyLinkOverlay[]>([]);

  const [simulationResult, setSimulationResult] = useState<SystemTopologySimulationResponse | null>(null);
  const [simulating, setSimulating] = useState(false);
  const [simulationError, setSimulationError] = useState('');

  // Form input states for adding overlays
  const [baselineProviderId, setBaselineProviderId] = useState('');
  const [baselineDocId, setBaselineDocId] = useState('');
  const [baselineVersion, setBaselineVersion] = useState(1);

  const [attestationProviderId, setAttestationProviderId] = useState('');
  const [attestationPkgId, setAttestationPkgId] = useState('');
  const [attestationVerNum, setAttestationVerNum] = useState(1);

  const [waiverProviderId, setWaiverProviderId] = useState('');
  const [waiverBlockerType, setWaiverBlockerType] = useState<SystemBlockerType>('CONTRACT_MISALIGNED');
  const [waiverReason, setWaiverReason] = useState('');
  const [waiverDocId, setWaiverDocId] = useState('');

  const [topologyTargetId, setTopologyTargetId] = useState('');
  const [topologyDepType, setTopologyDepType] = useState<'DEPENDS_ON' | 'REFERENCES'>('DEPENDS_ON');
  const [topologyAction, setTopologyAction] = useState<'ADD' | 'REMOVE'>('ADD');

  const handleRunSimulation = async () => {
    setSimulating(true);
    setSimulationError('');
    try {
      const res = await simulateSystemTopologyGate(projectId, {
        rootProjectId: projectId,
        proposedBaselines: proposedBaselines.length > 0 ? proposedBaselines : undefined,
        proposedAttestations: proposedAttestations.length > 0 ? proposedAttestations : undefined,
        candidateWaivers: candidateWaivers.length > 0 ? candidateWaivers : undefined,
        proposedTopologyLinks: proposedTopologyLinks.length > 0 ? proposedTopologyLinks : undefined,
      });
      setSimulationResult(res.data);
    } catch (err: unknown) {
      const msg =
        err && typeof err === 'object' && 'response' in err
          ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
          : 'Failed to run what-if simulation.';
      setSimulationError(msg || 'Failed to run what-if simulation.');
    } finally {
      setSimulating(false);
    }
  };

  const handleResetOverlays = () => {
    setProposedBaselines([]);
    setProposedAttestations([]);
    setCandidateWaivers([]);
    setProposedTopologyLinks([]);
    setSimulationResult(null);
    setSimulationError('');
  };

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

  return (
    <div style={{ marginTop: '2rem', borderTop: '2px dashed #0288d1', paddingTop: '1.5rem' }}>
      <div style={{ background: '#f0f4f8', border: '1px solid #b3e5fc', borderRadius: '8px', padding: '1.25rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
          <div>
            <h3 style={{ margin: 0, color: '#0277bd', fontSize: '1.15rem' }}>
              What-If Simulation Sandbox
            </h3>
            <p style={{ margin: '0.2rem 0 0 0', color: '#555', fontSize: '0.85rem' }}>
              Simulate hypothetical baseline overlays, attestations, policy waivers, and topology changes without altering live data.
            </p>
          </div>
          <span style={{ background: '#e1f5fe', color: '#0277bd', border: '1px solid #81d4fa', padding: '0.25rem 0.65rem', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 'bold' }}>
            HYPOTHETICAL SIMULATION
          </span>
        </div>

        {/* Disclaimer Banner */}
        <div style={{ background: '#fff8e1', border: '1px solid #ffe082', color: '#856404', padding: '0.6rem 0.85rem', borderRadius: '6px', fontSize: '0.8rem', marginBottom: '1.25rem' }}>
          💡 <strong>Hypothetical What-If Simulation — In-Memory Only.</strong> Does not alter authoritative project, baseline, attestation, or waiver governance state.
        </div>

        {simulationError && (
          <div style={{ padding: '0.6rem 0.85rem', background: '#ffebee', border: '1px solid #ef9a9a', color: '#c62828', borderRadius: '6px', fontSize: '0.85rem', marginBottom: '1rem' }}>
            {simulationError}
          </div>
        )}

        {/* Hypothetical Overlays Setup Panel */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem', marginBottom: '1.25rem' }}>
          {/* Overlay 1: Proposed Baseline */}
          <div style={{ background: '#fff', border: '1px solid #cfd8dc', borderRadius: '6px', padding: '0.85rem' }}>
            <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '0.85rem', color: '#37474f' }}>1. Proposed Baseline Overlay</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', fontSize: '0.8rem' }}>
              <input
                placeholder="Provider Project ID (24-hex)"
                value={baselineProviderId}
                onChange={(e) => setBaselineProviderId(e.target.value)}
                style={{ padding: '0.35rem', borderRadius: '4px', border: '1px solid #ccc' }}
              />
              <input
                placeholder="Target Document ID (24-hex)"
                value={baselineDocId}
                onChange={(e) => setBaselineDocId(e.target.value)}
                style={{ padding: '0.35rem', borderRadius: '4px', border: '1px solid #ccc' }}
              />
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                <span>Version:</span>
                <input
                  type="number"
                  min={1}
                  value={baselineVersion}
                  onChange={(e) => setBaselineVersion(parseInt(e.target.value, 10) || 1)}
                  style={{ width: '60px', padding: '0.35rem', borderRadius: '4px', border: '1px solid #ccc' }}
                />
                <button
                  type="button"
                  onClick={() => {
                    if (baselineProviderId && baselineDocId) {
                      setProposedBaselines([...proposedBaselines, { providerProjectId: baselineProviderId, targetDocumentId: baselineDocId, versionNumber: baselineVersion }]);
                      setBaselineProviderId('');
                      setBaselineDocId('');
                    }
                  }}
                  style={{ background: '#0288d1', color: '#fff', border: 'none', borderRadius: '4px', padding: '0.35rem 0.6rem', cursor: 'pointer', fontWeight: 'bold' }}
                >
                  Add
                </button>
              </div>
            </div>
            {proposedBaselines.length > 0 && (
              <div style={{ marginTop: '0.5rem', fontSize: '0.75rem', color: '#555' }}>
                {proposedBaselines.map((b, idx) => (
                  <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.2rem' }}>
                    <span>Doc {b.targetDocumentId.slice(-6)} → v{b.versionNumber}</span>
                    <button type="button" onClick={() => setProposedBaselines(proposedBaselines.filter((_, i) => i !== idx))} style={{ color: '#c62828', border: 'none', background: 'none', cursor: 'pointer' }}>×</button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Overlay 2: Proposed Attestation */}
          <div style={{ background: '#fff', border: '1px solid #cfd8dc', borderRadius: '6px', padding: '0.85rem' }}>
            <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '0.85rem', color: '#37474f' }}>2. Hypothetical Attestation</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', fontSize: '0.8rem' }}>
              <input
                placeholder="Provider Project ID (24-hex)"
                value={attestationProviderId}
                onChange={(e) => setAttestationProviderId(e.target.value)}
                style={{ padding: '0.35rem', borderRadius: '4px', border: '1px solid #ccc' }}
              />
              <input
                placeholder="Change Package ID (Optional)"
                value={attestationPkgId}
                onChange={(e) => setAttestationPkgId(e.target.value)}
                style={{ padding: '0.35rem', borderRadius: '4px', border: '1px solid #ccc' }}
              />
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                <span>Version:</span>
                <input
                  type="number"
                  min={1}
                  value={attestationVerNum}
                  onChange={(e) => setAttestationVerNum(parseInt(e.target.value, 10) || 1)}
                  style={{ width: '60px', padding: '0.35rem', borderRadius: '4px', border: '1px solid #ccc' }}
                />
                <button
                  type="button"
                  onClick={() => {
                    if (attestationProviderId) {
                      setProposedAttestations([...proposedAttestations, { providerProjectId: attestationProviderId, changePackageId: attestationPkgId || undefined, attestationVersion: attestationVerNum }]);
                      setAttestationProviderId('');
                      setAttestationPkgId('');
                    }
                  }}
                  style={{ background: '#0288d1', color: '#fff', border: 'none', borderRadius: '4px', padding: '0.35rem 0.6rem', cursor: 'pointer', fontWeight: 'bold' }}
                >
                  Add
                </button>
              </div>
            </div>
            {proposedAttestations.length > 0 && (
              <div style={{ marginTop: '0.5rem', fontSize: '0.75rem', color: '#555' }}>
                {proposedAttestations.map((a, idx) => (
                  <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.2rem' }}>
                    <span>Project {a.providerProjectId.slice(-6)} → Attest v{a.attestationVersion}</span>
                    <button type="button" onClick={() => setProposedAttestations(proposedAttestations.filter((_, i) => i !== idx))} style={{ color: '#c62828', border: 'none', background: 'none', cursor: 'pointer' }}>×</button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Overlay 3: Candidate Waiver */}
          <div style={{ background: '#fff', border: '1px solid #cfd8dc', borderRadius: '6px', padding: '0.85rem' }}>
            <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '0.85rem', color: '#37474f' }}>3. Candidate Policy Waiver</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', fontSize: '0.8rem' }}>
              <input
                placeholder="Target Provider Project ID"
                value={waiverProviderId}
                onChange={(e) => setWaiverProviderId(e.target.value)}
                style={{ padding: '0.35rem', borderRadius: '4px', border: '1px solid #ccc' }}
              />
              <select
                value={waiverBlockerType}
                onChange={(e) => setWaiverBlockerType(e.target.value as SystemBlockerType)}
                style={{ padding: '0.35rem', borderRadius: '4px', border: '1px solid #ccc' }}
              >
                <option value="CONTRACT_MISALIGNED">CONTRACT_MISALIGNED</option>
                <option value="PROVIDER_ATTESTATION_MISSING">PROVIDER_ATTESTATION_MISSING</option>
                <option value="PROVIDER_ATTESTATION_STALE">PROVIDER_ATTESTATION_STALE</option>
                <option value="PROVIDER_LOCAL_GATE_BLOCKED">PROVIDER_LOCAL_GATE_BLOCKED</option>
                <option value="PROVIDER_GOVERNANCE_DISABLED">PROVIDER_GOVERNANCE_DISABLED</option>
              </select>
              <input
                placeholder="Hypothetical Waiver Reason"
                value={waiverReason}
                onChange={(e) => setWaiverReason(e.target.value)}
                style={{ padding: '0.35rem', borderRadius: '4px', border: '1px solid #ccc' }}
              />
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <input
                  placeholder="Target Doc ID (Optional)"
                  value={waiverDocId}
                  onChange={(e) => setWaiverDocId(e.target.value)}
                  style={{ width: '100%', padding: '0.35rem', borderRadius: '4px', border: '1px solid #ccc' }}
                />
                <button
                  type="button"
                  onClick={() => {
                    if (waiverProviderId && waiverReason) {
                      setCandidateWaivers([...candidateWaivers, { targetProviderProjectId: waiverProviderId, blockerType: waiverBlockerType, reason: waiverReason, targetDocumentId: waiverDocId || null }]);
                      setWaiverProviderId('');
                      setWaiverReason('');
                      setWaiverDocId('');
                    }
                  }}
                  style={{ background: '#0288d1', color: '#fff', border: 'none', borderRadius: '4px', padding: '0.35rem 0.6rem', cursor: 'pointer', fontWeight: 'bold' }}
                >
                  Add
                </button>
              </div>
            </div>
            {candidateWaivers.length > 0 && (
              <div style={{ marginTop: '0.5rem', fontSize: '0.75rem', color: '#555' }}>
                {candidateWaivers.map((w, idx) => (
                  <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.2rem' }}>
                    <span>{w.blockerType} ({w.reason.slice(0, 15)}...)</span>
                    <button type="button" onClick={() => setCandidateWaivers(candidateWaivers.filter((_, i) => i !== idx))} style={{ color: '#c62828', border: 'none', background: 'none', cursor: 'pointer' }}>×</button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Overlay 4: Proposed Topology Link */}
          <div style={{ background: '#fff', border: '1px solid #cfd8dc', borderRadius: '6px', padding: '0.85rem' }}>
            <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '0.85rem', color: '#37474f' }}>4. Proposed Topology Link</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', fontSize: '0.8rem' }}>
              <input
                placeholder="Target Project ID"
                value={topologyTargetId}
                onChange={(e) => setTopologyTargetId(e.target.value)}
                style={{ padding: '0.35rem', borderRadius: '4px', border: '1px solid #ccc' }}
              />
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <select
                  value={topologyDepType}
                  onChange={(e) => setTopologyDepType(e.target.value as 'DEPENDS_ON' | 'REFERENCES')}
                  style={{ padding: '0.35rem', borderRadius: '4px', border: '1px solid #ccc', flex: 1 }}
                >
                  <option value="DEPENDS_ON">DEPENDS_ON</option>
                  <option value="REFERENCES">REFERENCES</option>
                </select>
                <select
                  value={topologyAction}
                  onChange={(e) => setTopologyAction(e.target.value as 'ADD' | 'REMOVE')}
                  style={{ padding: '0.35rem', borderRadius: '4px', border: '1px solid #ccc' }}
                >
                  <option value="ADD">ADD</option>
                  <option value="REMOVE">REMOVE</option>
                </select>
                <button
                  type="button"
                  onClick={() => {
                    if (topologyTargetId) {
                      setProposedTopologyLinks([...proposedTopologyLinks, { targetProjectId: topologyTargetId, dependencyType: topologyDepType, action: topologyAction }]);
                      setTopologyTargetId('');
                    }
                  }}
                  style={{ background: '#0288d1', color: '#fff', border: 'none', borderRadius: '4px', padding: '0.35rem 0.6rem', cursor: 'pointer', fontWeight: 'bold' }}
                >
                  Add
                </button>
              </div>
            </div>
            {proposedTopologyLinks.length > 0 && (
              <div style={{ marginTop: '0.5rem', fontSize: '0.75rem', color: '#555' }}>
                {proposedTopologyLinks.map((t, idx) => (
                  <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.2rem' }}>
                    <span>{t.action} {t.dependencyType} → {t.targetProjectId.slice(-6)}</span>
                    <button type="button" onClick={() => setProposedTopologyLinks(proposedTopologyLinks.filter((_, i) => i !== idx))} style={{ color: '#c62828', border: 'none', background: 'none', cursor: 'pointer' }}>×</button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Action Controls */}
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', marginBottom: '1.25rem' }}>
          <button
            type="button"
            onClick={() => void handleRunSimulation()}
            disabled={simulating}
            style={{
              padding: '0.5rem 1.2rem',
              background: '#0288d1',
              color: '#fff',
              border: 'none',
              borderRadius: '4px',
              fontWeight: 'bold',
              cursor: 'pointer',
              fontSize: '0.85rem',
            }}
          >
            {simulating ? 'Evaluating What-If Simulation...' : 'Run What-If Simulation'}
          </button>
          <button
            type="button"
            onClick={handleResetOverlays}
            disabled={simulating}
            style={{
              padding: '0.5rem 1rem',
              background: '#fff',
              border: '1px solid #b0bec5',
              color: '#455a64',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '0.85rem',
            }}
          >
            Reset Overlays
          </button>
        </div>

        {/* Simulation Output Display */}
        {simulationResult && (
          <div style={{ background: '#fff', border: '1px solid #b2ebf2', borderRadius: '8px', padding: '1.25rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', borderBottom: '1px solid #e0f7fa', paddingBottom: '0.75rem' }}>
              <h4 style={{ margin: 0, fontSize: '1rem', color: '#006064' }}>Simulation Impact Evaluation Results</h4>
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                <span style={{ fontSize: '0.75rem', color: '#00838f' }}>
                  Status: <strong>{simulationResult.simulationStatus}</strong>
                </span>
              </div>
            </div>

            {/* Side-by-Side Comparison */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.25rem' }}>
              {/* CURRENT */}
              <div style={{ background: '#fafafa', border: '1px solid #e0e0e0', borderRadius: '6px', padding: '1rem' }}>
                <div style={{ fontSize: '0.75rem', fontWeight: 'bold', color: '#757575', textTransform: 'uppercase', marginBottom: '0.4rem' }}>
                  CURRENT AUTHORITATIVE STATE
                </div>
                <div style={{ display: 'inline-block', padding: '0.35rem 0.75rem', borderRadius: '12px', fontSize: '0.85rem', fontWeight: 'bold', ...getStatusBadgeStyle(simulationResult.baselineResult.systemReleaseStatus) }}>
                  {simulationResult.baselineResult.systemReleaseStatus}
                </div>
                <div style={{ fontSize: '0.8rem', color: '#555', marginTop: '0.75rem' }}>
                  Unwaived Blockers: <strong>{simulationResult.baselineResult.summary.unwaivedBlockers}</strong>
                </div>
                <div style={{ fontSize: '0.8rem', color: '#555', marginTop: '0.2rem' }}>
                  Waived Blockers: <strong>{simulationResult.baselineResult.summary.waivedBlockers}</strong>
                </div>
              </div>

              {/* SIMULATED */}
              <div style={{ background: '#e0f7fa', border: '1px solid #80deea', borderRadius: '6px', padding: '1rem' }}>
                <div style={{ fontSize: '0.75rem', fontWeight: 'bold', color: '#00838f', textTransform: 'uppercase', marginBottom: '0.4rem' }}>
                  HYPOTHETICAL SIMULATED STATE
                </div>
                <div style={{ display: 'inline-block', padding: '0.35rem 0.75rem', borderRadius: '12px', fontSize: '0.85rem', fontWeight: 'bold', ...getStatusBadgeStyle(simulationResult.simulatedResult.systemReleaseStatus) }}>
                  {simulationResult.simulatedResult.systemReleaseStatus}
                </div>
                <div style={{ fontSize: '0.8rem', color: '#006064', marginTop: '0.75rem' }}>
                  Unwaived Blockers: <strong>{simulationResult.simulatedResult.summary.unwaivedBlockers}</strong>
                </div>
                <div style={{ fontSize: '0.8rem', color: '#006064', marginTop: '0.2rem' }}>
                  Waived Blockers: <strong>{simulationResult.simulatedResult.summary.waivedBlockers}</strong>
                </div>
              </div>
            </div>

            {/* Delta Highlights */}
            <div style={{ background: '#f1f8e9', border: '1px solid #c5e1a5', borderRadius: '6px', padding: '0.85rem', fontSize: '0.85rem', color: '#33691e' }}>
              <div style={{ fontWeight: 'bold', marginBottom: '0.3rem' }}>
                Impact Summary & Delta:
              </div>
              <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                <div>
                  Status Changed: <strong>{simulationResult.delta.statusChanged ? 'YES ⚡' : 'NO'}</strong>
                </div>
                <div>
                  Blockers Resolved: <strong>{simulationResult.delta.resolvedBlockerCount}</strong>
                </div>
                <div>
                  Newly Waived: <strong>{simulationResult.delta.newlyWaivedBlockers}</strong>
                </div>
                <div>
                  New Unwaived Blockers: <strong>{simulationResult.delta.newUnwaivedBlockers}</strong>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
