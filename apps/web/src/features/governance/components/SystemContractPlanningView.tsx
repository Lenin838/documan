import { useEffect, useState, useCallback } from 'react';
import { generateContractChangePlan } from '../system-contract-plan.api';
import type {
  SystemContractPlanResponseDTO,
  CandidateChangeActionDTO,
  ActionRole,
} from '../system-contract-plan.types';

interface SystemContractPlanningViewProps {
  projectId: string;
  onNavigateToPackageDrawer?: ((draftPayload: unknown) => void) | undefined;
}

export function SystemContractPlanningView({ projectId, onNavigateToPackageDrawer }: SystemContractPlanningViewProps) {
  const [data, setData] = useState<SystemContractPlanResponseDTO | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [severityFilter, setSeverityFilter] = useState<'ALL' | 'BREAKING_ONLY' | 'MISALIGNED_ONLY'>('ALL');
  const [selectedAlternativeMap, setSelectedAlternativeMap] = useState<Record<string, string>>({});
  const [showDraftDrawer, setShowDraftDrawer] = useState(false);

  const loadPlan = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await generateContractChangePlan(projectId, { severityFilter });
      setData(res.data);

      // Initialize default strategy selections
      const initialMap: Record<string, string> = {};
      if (res.data?.candidateActions) {
        for (const act of res.data.candidateActions) {
          if (act.alternativeActionIds.length > 0) {
            // Group mutually exclusive alternatives
            const pairKey = [act.actionId, ...act.alternativeActionIds].sort().join('_');
            if (!initialMap[pairKey]) {
              // Default to Consumer Adaptation if available, else first action
              const consumerAct = [act, ...res.data.candidateActions.filter(a => act.alternativeActionIds.includes(a.actionId))]
                .find(a => a.actionRole === 'CONSUMER_ADAPTATION');
              initialMap[pairKey] = consumerAct ? consumerAct.actionId : act.actionId;
            }
          }
        }
      }
      setSelectedAlternativeMap(initialMap);
    } catch (err: unknown) {
      const msg = err && typeof err === 'object' && 'message' in err ? String((err as { message: string }).message) : 'Failed to generate contract change plan';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [projectId, severityFilter]);

  useEffect(() => {
    let isSubscribed = true;
    const fetchPlan = async () => {
      try {
        const res = await generateContractChangePlan(projectId, { severityFilter });
        if (isSubscribed) {
          setData(res.data);
          setLoading(false);
        }
      } catch (err: unknown) {
        if (isSubscribed) {
          const msg = err && typeof err === 'object' && 'message' in err ? String((err as { message: string }).message) : 'Failed to generate contract change plan';
          setError(msg);
          setLoading(false);
        }
      }
    };
    void fetchPlan();
    return () => {
      isSubscribed = false;
    };
  }, [projectId, severityFilter]);

  const handleSelectAlternative = (pairKey: string, actionId: string) => {
    setSelectedAlternativeMap((prev) => ({ ...prev, [pairKey]: actionId }));
  };

  const getRoleBadgeStyle = (role: ActionRole) => {
    switch (role) {
      case 'CONSUMER_ADAPTATION':
        return { background: '#e3f2fd', color: '#1565c0', border: '1px solid #90caf9', label: 'CONSUMER ADAPTATION' };
      case 'PROVIDER_COMPATIBILITY_RESTORATION':
        return { background: '#fff3e0', color: '#e65100', border: '1px solid #ffe0b2', label: 'PROVIDER RESTORATION' };
      case 'COORDINATED_REALIGNMENT':
        return { background: '#e8f5e9', color: '#2e7d32', border: '1px solid #a5d6a7', label: 'COORDINATED REALIGNMENT' };
      case 'AUTHORITY_COMPLETION':
      default:
        return { background: '#f3e5f5', color: '#7b1fa2', border: '1px solid #ce93d8', label: 'AUTHORITY COMPLETION' };
    }
  };

  if (loading) {
    return (
      <div style={{ padding: '1.5rem', background: '#fff', border: '1px solid #e0e0e0', borderRadius: '8px', marginTop: '1.5rem' }}>
        <p style={{ margin: 0, color: '#666' }}>Generating deterministic system contract change plan...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: '1.5rem', background: '#ffebee', border: '1px solid #ffcdd2', borderRadius: '8px', color: '#c62828', marginTop: '1.5rem' }}>
        <h4 style={{ margin: '0 0 0.5rem 0' }}>Planning Error</h4>
        <p style={{ margin: 0 }}>{error}</p>
        <button onClick={() => void loadPlan()} style={{ marginTop: '1rem', padding: '0.5rem 1rem', background: '#c62828', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
          Retry
        </button>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div style={{ marginTop: '1.5rem', background: '#fff', border: '1px solid #e0e0e0', borderRadius: '8px', padding: '1.5rem' }}>
      {/* Header Banner & Mandatory Disclaimer */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid #e0e0e0', paddingBottom: '1rem', marginBottom: '1.5rem' }}>
        <div>
          <h3 style={{ margin: '0 0 0.25rem 0', color: '#212121' }}>System-Wide Contract Change Plan</h3>
          <p style={{ margin: 0, color: '#666', fontSize: '0.9rem' }}>
            Derived evidence-backed change actions & draft package synthesis for project topology.
          </p>
        </div>
        <div style={{ textAlign: 'right' }}>
          <span style={{ fontSize: '0.8rem', color: '#757575' }}>Evaluated: {new Date(data.evaluatedAt).toLocaleString()}</span>
        </div>
      </div>

      {/* Mandatory Disclaimer Box */}
      <div style={{ background: '#eef6fc', border: '1px solid #b6d4fe', borderRadius: '6px', padding: '0.75rem 1rem', marginBottom: '1.5rem', color: '#084298' }}>
        <strong>DISCLAIMER:</strong> This is a proposed change plan. It does not execute or approve changes.
      </div>

      {/* Summary Metrics & Severity Filter */}
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
        <div style={{ background: '#f5f5f5', border: '1px solid #e0e0e0', borderRadius: '6px', padding: '0.75rem 1rem', flex: 1, minWidth: '180px' }}>
          <div style={{ fontSize: '0.8rem', color: '#666' }}>Contract Problems</div>
          <div style={{ fontSize: '1.4rem', fontWeight: 'bold', color: '#212121' }}>{data.summary.totalContractProblems}</div>
        </div>
        <div style={{ background: '#f5f5f5', border: '1px solid #e0e0e0', borderRadius: '6px', padding: '0.75rem 1rem', flex: 1, minWidth: '180px' }}>
          <div style={{ fontSize: '0.8rem', color: '#666' }}>Candidate Actions</div>
          <div style={{ fontSize: '1.4rem', fontWeight: 'bold', color: '#212121' }}>{data.summary.candidateActionsCount}</div>
        </div>
        <div style={{ background: '#f5f5f5', border: '1px solid #e0e0e0', borderRadius: '6px', padding: '0.75rem 1rem', flex: 1, minWidth: '180px' }}>
          <div style={{ fontSize: '0.8rem', color: '#666' }}>Alternative Strategies</div>
          <div style={{ fontSize: '1.4rem', fontWeight: 'bold', color: data.summary.hasAlternatives ? '#e65100' : '#2e7d32' }}>
            {data.summary.hasAlternatives ? 'Yes (Selectable)' : 'None'}
          </div>
        </div>
        <div>
          <label style={{ fontSize: '0.85rem', color: '#666', marginRight: '0.5rem' }}>Filter Severity:</label>
          <select
            value={severityFilter}
            onChange={(e) => setSeverityFilter(e.target.value as 'ALL' | 'BREAKING_ONLY' | 'MISALIGNED_ONLY')}
            style={{ padding: '0.4rem 0.6rem', borderRadius: '4px', border: '1px solid #ccc' }}
          >
            <option value="ALL">All Findings</option>
            <option value="BREAKING_ONLY">Breaking Deltas Only</option>
            <option value="MISALIGNED_ONLY">Misalignments Only</option>
          </select>
        </div>
      </div>

      {/* Truncation Warning */}
      {data.summary.isTruncated && (
        <div style={{ background: '#fff3e0', border: '1px solid #ffe0b2', color: '#e65100', padding: '0.75rem 1rem', borderRadius: '6px', marginBottom: '1.5rem' }}>
          ⚠️ Topology bounds reached. Candidate actions truncated to maximum limit of 50.
        </div>
      )}

      {/* Section 1: Candidate Actions Roster */}
      <h4 style={{ margin: '0 0 1rem 0', color: '#212121', borderBottom: '1px solid #eee', paddingBottom: '0.5rem' }}>
        1. Candidate Change Actions & Evidence
      </h4>

      {data.candidateActions.length === 0 ? (
        <div style={{ padding: '1.5rem', background: '#f9f9f9', border: '1px solid #eee', borderRadius: '6px', color: '#666', textAlign: 'center' }}>
          No contract problems or candidate change actions detected for this project topology.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '2rem' }}>
          {data.candidateActions.map((action: CandidateChangeActionDTO) => {
            const roleBadge = getRoleBadgeStyle(action.actionRole);
            const isAlternative = action.alternativeActionIds.length > 0;
            const pairKey = isAlternative ? [action.actionId, ...action.alternativeActionIds].sort().join('_') : '';
            const isSelected = isAlternative ? selectedAlternativeMap[pairKey] === action.actionId : true;

            return (
              <div
                key={action.actionId}
                style={{
                  border: isSelected ? '2px solid #1976d2' : '1px solid #e0e0e0',
                  borderRadius: '8px',
                  padding: '1rem',
                  background: isSelected ? '#f8fafd' : '#fafafa',
                  opacity: isAlternative && !isSelected ? 0.65 : 1,
                  transition: 'all 0.2s ease',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <span style={{ fontWeight: 'bold', color: '#1565c0', background: '#e3f2fd', padding: '0.2rem 0.5rem', borderRadius: '4px', fontSize: '0.85rem' }}>
                      {action.actionId}
                    </span>
                    <span style={{ background: roleBadge.background, color: roleBadge.color, border: roleBadge.border, padding: '0.25rem 0.6rem', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 'bold' }}>
                      {roleBadge.label}
                    </span>
                    <span style={{ fontSize: '0.8rem', color: '#666' }}>Proposal Type: <code>{action.candidateProposalType}</code></span>
                  </div>

                  {/* Alternative Selector Toggle */}
                  {isAlternative && (
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', cursor: 'pointer', fontSize: '0.85rem', color: '#1565c0', fontWeight: 'bold' }}>
                      <input
                        type="radio"
                        name={`alt_pair_${pairKey}`}
                        checked={isSelected}
                        onChange={() => handleSelectAlternative(pairKey, action.actionId)}
                      />
                      Select Strategy ({action.actionRole === 'CONSUMER_ADAPTATION' ? 'Consumer Adapt' : 'Provider Restore'})
                    </label>
                  )}
                </div>

                <h5 style={{ margin: '0 0 0.5rem 0', color: '#212121', fontSize: '1rem' }}>{action.title}</h5>
                <p style={{ margin: '0 0 0.75rem 0', color: '#555', fontSize: '0.9rem' }}>{action.description}</p>

                {/* Authoritative Evidence Box */}
                <div style={{ background: '#fff', border: '1px solid #e0e0e0', borderRadius: '6px', padding: '0.75rem', fontSize: '0.85rem' }}>
                  <strong style={{ color: '#424242' }}>AUTHORITATIVE EVIDENCE:</strong>
                  <ul style={{ margin: '0.25rem 0 0 1.25rem', padding: 0, color: '#616161' }}>
                    <li>State: <code>{action.relevantEvidence.interoperabilityState}</code></li>
                    {action.relevantEvidence.deltaType && <li>Delta: <code>{action.relevantEvidence.deltaType}</code></li>}
                    {action.relevantEvidence.endpointKey && <li>Endpoint: <code>{action.relevantEvidence.endpointKey}</code></li>}
                    <li>Reason: {action.relevantEvidence.reason}</li>
                    <li>Downstream Affected Docs: {action.relevantEvidence.affectedDownstreamDocumentsCount}</li>
                  </ul>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Section 2: Informational Dependency Sequence */}
      <h4 style={{ margin: '0 0 1rem 0', color: '#212121', borderBottom: '1px solid #eee', paddingBottom: '0.5rem' }}>
        2. Informational Dependency-Ordered Action Sequence
      </h4>
      <div style={{ background: '#f5f5f5', border: '1px solid #e0e0e0', borderRadius: '6px', padding: '1rem', marginBottom: '2rem' }}>
        <p style={{ margin: '0 0 0.75rem 0', fontSize: '0.85rem', color: '#666' }}>
          <em>Note: This sequence is an informational recommendation based on topological depth. Execution ordering is non-binding and preserved for human review.</em>
        </p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', alignItems: 'center' }}>
          {data.dependencyOrderedSequence.map((actId, idx) => (
            <div key={actId} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ background: '#1565c0', color: '#fff', padding: '0.3rem 0.7rem', borderRadius: '4px', fontSize: '0.85rem', fontWeight: 'bold' }}>
                {idx + 1}. {actId}
              </span>
              {idx < data.dependencyOrderedSequence.length - 1 && <span style={{ color: '#9e9e9e', fontWeight: 'bold' }}>→</span>}
            </div>
          ))}
        </div>
      </div>

      {/* Section 3: Draft Change Package Preview & Handoff */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #e0e0e0', paddingTop: '1.5rem' }}>
        <div>
          <h4 style={{ margin: '0 0 0.25rem 0', color: '#212121' }}>Draft Change Package Payload</h4>
          <p style={{ margin: 0, color: '#666', fontSize: '0.85rem' }}>
            Non-persistent Phase 16 draft structure ({data.draftChangePackage.candidateProposals.length} candidate proposals).
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button
            onClick={() => setShowDraftDrawer(!showDraftDrawer)}
            style={{ padding: '0.6rem 1.2rem', background: '#f5f5f5', color: '#333', border: '1px solid #ccc', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}
          >
            {showDraftDrawer ? 'Hide Draft JSON' : 'Preview Draft JSON'}
          </button>

          <button
            onClick={() => {
              if (onNavigateToPackageDrawer) {
                onNavigateToPackageDrawer(data.draftChangePackage);
              } else {
                alert(`Proceeding to Phase 16 Change Package creation with draft payload for "${data.draftChangePackage.draftPackageName}".`);
              }
            }}
            style={{ padding: '0.6rem 1.2rem', background: '#1976d2', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}
          >
            Continue to Phase 16 Change Package →
          </button>
        </div>
      </div>

      {/* Draft JSON Preview Drawer */}
      {showDraftDrawer && (
        <div style={{ marginTop: '1rem', background: '#263238', color: '#eceff1', padding: '1rem', borderRadius: '6px', overflowX: 'auto', fontSize: '0.85rem' }}>
          <pre style={{ margin: 0, fontFamily: 'monospace' }}>
            {JSON.stringify(data.draftChangePackage, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}
