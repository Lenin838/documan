/* eslint-disable react-hooks/set-state-in-effect */
import React, { useState, useEffect } from 'react';
import { auditReleaseCertificateComplianceDrift } from './governance.api';
import type {
  ReleaseCertificateComplianceAuditDTO,
  BaselineDeltaItemDTO,
  ContractDeltaItemDTO,
  WaiverDeltaItemDTO,
  AttestationDeltaItemDTO,
} from './governance.types';

interface ReleaseCertificateComplianceAuditViewProps {
  certificateId: string;
  projectId?: string;
}

export const ReleaseCertificateComplianceAuditView: React.FC<ReleaseCertificateComplianceAuditViewProps> = ({
  certificateId,
}) => {
  const [auditData, setAuditData] = useState<ReleaseCertificateComplianceAuditDTO | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<
    'topology' | 'baselines' | 'contracts' | 'waivers' | 'attestations'
  >('baselines');

  const runAudit = async (certId: string) => {
    if (!certId) return;
    try {
      setLoading(true);
      setError(null);
      const data = await auditReleaseCertificateComplianceDrift(certId);
      setAuditData(data);
    } catch (err: unknown) {
      const errorObj = err as { response?: { data?: { message?: string } }; message?: string };
      setError(errorObj.response?.data?.message || errorObj.message || 'Failed to execute compliance drift audit');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (certificateId) {
      runAudit(certificateId);
    }
  }, [certificateId]);

  if (loading) {
    return (
      <div className="p-6 bg-slate-900 text-slate-200 rounded-xl border border-slate-800 animate-pulse">
        <div className="h-6 w-1/3 bg-slate-800 rounded mb-4"></div>
        <div className="h-4 w-2/3 bg-slate-800 rounded mb-6"></div>
        <div className="grid grid-cols-5 gap-4 mb-6">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-20 bg-slate-800 rounded-lg"></div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 bg-red-950/40 text-red-200 rounded-xl border border-red-800/50">
        <h3 className="font-semibold text-lg mb-2">Compliance Drift Audit Error</h3>
        <p className="text-sm text-red-300">{error}</p>
        <button
          onClick={() => runAudit(certificateId)}
          className="mt-4 px-4 py-2 bg-red-800 hover:bg-red-700 text-white text-xs font-semibold rounded-lg transition-colors"
        >
          Retry Audit
        </button>
      </div>
    );
  }

  if (!auditData) return null;

  const {
    auditMetadata,
    complianceStatus,
    complianceReason,
    varianceExplanations = [],
    nextReviewConsiderations = [],
    varianceSummary,
    topologyDeltas,
    baselineDeltas = [],
    contractDeltas = [],
    waiverDeltas = [],
    attestationDeltas = [],
  } = auditData;

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'FULLY_COMPLIANT':
        return (
          <span className="px-3 py-1 bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 rounded-full text-xs font-bold uppercase tracking-wider">
            ✓ FULLY COMPLIANT
          </span>
        );
      case 'COMPLIANT_WITH_EXCEPTIONS':
        return (
          <span className="px-3 py-1 bg-sky-500/20 text-sky-300 border border-sky-500/40 rounded-full text-xs font-bold uppercase tracking-wider">
            ℹ COMPLIANT WITH EXCEPTIONS
          </span>
        );
      case 'NON_COMPLIANT_DRIFT':
        return (
          <span className="px-3 py-1 bg-rose-500/20 text-rose-300 border border-rose-500/40 rounded-full text-xs font-bold uppercase tracking-wider">
            ⚠ NON-COMPLIANT DRIFT
          </span>
        );
      case 'INDETERMINATE_EVIDENCE':
      default:
        return (
          <span className="px-3 py-1 bg-amber-500/20 text-amber-300 border border-amber-500/40 rounded-full text-xs font-bold uppercase tracking-wider">
            ❓ INDETERMINATE EVIDENCE
          </span>
        );
    }
  };

  return (
    <div className="p-6 bg-slate-900 text-slate-100 rounded-xl border border-slate-800 shadow-2xl space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between pb-4 border-b border-slate-800 gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-bold tracking-tight text-white">
              Release Compliance Drift & Post-Certification Audit
            </h2>
            {getStatusBadge(complianceStatus)}
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Certified Release Tag: <span className="text-slate-200 font-mono">{auditMetadata.releaseTag}</span> ({new Date(auditMetadata.certifiedAt).toLocaleString()})
            {' • '}
            Live Audit Target (T_now): <span className="text-slate-200 font-mono">{new Date(auditMetadata.auditTimestamp).toLocaleString()}</span>
          </p>
          {complianceReason && (
            <p className="text-xs text-slate-300 italic mt-1.5">{complianceReason}</p>
          )}
        </div>
        <div className="flex items-center gap-3 text-xs bg-slate-800/80 px-3 py-2 rounded-lg border border-slate-700">
          <div>
            <span className="text-slate-400">Cert Status:</span>{' '}
            <span className="font-semibold text-slate-200">{auditMetadata.certificateStatus}</span>
          </div>
          <div className="h-3 w-px bg-slate-700"></div>
          <div>
            <span className="text-slate-400">Live Readiness:</span>{' '}
            <span className="font-semibold text-slate-200">{auditMetadata.liveSystemReleaseStatus}</span>
          </div>
        </div>
      </div>

      {/* 5 Variance Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <div
          onClick={() => setActiveTab('topology')}
          className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
            activeTab === 'topology'
              ? 'bg-indigo-950/60 border-indigo-500/60 shadow-lg shadow-indigo-950/50'
              : 'bg-slate-800/50 border-slate-700/60 hover:bg-slate-800'
          }`}
        >
          <div className="text-xs font-medium text-slate-400">Topology Deltas</div>
          <div className="text-2xl font-bold text-slate-100 mt-1">{varianceSummary?.topologyVarianceCount || 0}</div>
        </div>

        <div
          onClick={() => setActiveTab('baselines')}
          className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
            activeTab === 'baselines'
              ? 'bg-indigo-950/60 border-indigo-500/60 shadow-lg shadow-indigo-950/50'
              : 'bg-slate-800/50 border-slate-700/60 hover:bg-slate-800'
          }`}
        >
          <div className="text-xs font-medium text-slate-400">Baseline Deltas</div>
          <div className="text-2xl font-bold text-slate-100 mt-1">{varianceSummary?.baselineVarianceCount || 0}</div>
        </div>

        <div
          onClick={() => setActiveTab('contracts')}
          className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
            activeTab === 'contracts'
              ? 'bg-indigo-950/60 border-indigo-500/60 shadow-lg shadow-indigo-950/50'
              : 'bg-slate-800/50 border-slate-700/60 hover:bg-slate-800'
          }`}
        >
          <div className="text-xs font-medium text-slate-400">Contract Deltas</div>
          <div className="text-2xl font-bold text-slate-100 mt-1">{varianceSummary?.contractVarianceCount || 0}</div>
        </div>

        <div
          onClick={() => setActiveTab('waivers')}
          className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
            activeTab === 'waivers'
              ? 'bg-indigo-950/60 border-indigo-500/60 shadow-lg shadow-indigo-950/50'
              : 'bg-slate-800/50 border-slate-700/60 hover:bg-slate-800'
          }`}
        >
          <div className="text-xs font-medium text-slate-400">Waiver Deltas</div>
          <div className="text-2xl font-bold text-slate-100 mt-1">{varianceSummary?.waiverVarianceCount || 0}</div>
        </div>

        <div
          onClick={() => setActiveTab('attestations')}
          className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
            activeTab === 'attestations'
              ? 'bg-indigo-950/60 border-indigo-500/60 shadow-lg shadow-indigo-950/50'
              : 'bg-slate-800/50 border-slate-700/60 hover:bg-slate-800'
          }`}
        >
          <div className="text-xs font-medium text-slate-400">Attestation Deltas</div>
          <div className="text-2xl font-bold text-slate-100 mt-1">{varianceSummary?.attestationVarianceCount || 0}</div>
        </div>
      </div>

      {/* Explanations & Next-Review Considerations */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="p-4 bg-slate-800/40 border border-slate-800 rounded-xl">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300 mb-2">
            Evidence-Backed Variance Explanations
          </h4>
          <ul className="space-y-1.5 text-xs text-slate-300">
            {varianceExplanations.map((exp: string, idx: number) => (
              <li key={idx} className="flex items-start gap-2">
                <span className="text-indigo-400 mt-0.5">•</span>
                <span>{exp}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="p-4 bg-slate-800/40 border border-slate-800 rounded-xl">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300 mb-2">
            Informational Next-Review Considerations
          </h4>
          <ul className="space-y-1.5 text-xs text-slate-300">
            {nextReviewConsiderations.map((con: string, idx: number) => (
              <li key={idx} className="flex items-start gap-2">
                <span className="text-sky-400 mt-0.5 font-bold">→</span>
                <span>{con}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Interactive Tabs for Granular Differential Drilling */}
      <div className="border-t border-slate-800 pt-4">
        <div className="flex border-b border-slate-800 mb-4 gap-2">
          {(['baselines', 'contracts', 'waivers', 'topology', 'attestations'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 text-xs font-semibold uppercase tracking-wider border-b-2 transition-colors ${
                activeTab === tab
                  ? 'border-indigo-500 text-indigo-300 bg-indigo-950/20'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Tab Content Panels */}
        <div className="bg-slate-950/50 rounded-xl p-4 border border-slate-800/80 min-h-[160px]">
          {activeTab === 'baselines' && (
            <div className="space-y-2">
              <h5 className="text-xs font-bold text-slate-300 mb-2">Documentation Baseline Version Deltas</h5>
              {baselineDeltas.length === 0 ? (
                <p className="text-xs text-slate-500 italic">No baseline deltas detected.</p>
              ) : (
                baselineDeltas.map((b: BaselineDeltaItemDTO, i: number) => (
                  <div key={i} className="flex items-center justify-between p-2.5 bg-slate-900 rounded border border-slate-800 text-xs">
                    <div>
                      <span className="font-semibold text-slate-200">{b.projectName}</span>{' '}
                      <span className="text-slate-400 font-mono">({b.certifiedVersionTag} → {b.liveVersionTag || 'N/A'})</span>
                    </div>
                    <span className="px-2 py-0.5 bg-slate-800 text-slate-300 rounded font-mono text-[10px]">
                      {b.deltaType}
                    </span>
                  </div>
                ))
              )}
            </div>
          )}

          {activeTab === 'contracts' && (
            <div className="space-y-2">
              <h5 className="text-xs font-bold text-slate-300 mb-2">OpenAPI Structural Contract Deltas</h5>
              {contractDeltas.length === 0 ? (
                <p className="text-xs text-slate-500 italic">No structural contract deltas detected.</p>
              ) : (
                contractDeltas.map((c: ContractDeltaItemDTO, i: number) => (
                  <div key={i} className="flex items-center justify-between p-2.5 bg-slate-900 rounded border border-slate-800 text-xs">
                    <div>
                      <span className="font-semibold text-slate-200">{c.deltaCode}</span>:{' '}
                      <span className="text-slate-300">{c.description}</span>
                    </div>
                    <span className={`px-2 py-0.5 rounded font-bold text-[10px] ${
                      c.riskTier === 'BREAKING' ? 'bg-rose-500/20 text-rose-300' : 'bg-slate-800 text-slate-300'
                    }`}>
                      {c.riskTier}
                    </span>
                  </div>
                ))
              )}
            </div>
          )}

          {activeTab === 'waivers' && (
            <div className="space-y-2">
              <h5 className="text-xs font-bold text-slate-300 mb-2">Governance Policy Waiver Deltas</h5>
              {waiverDeltas.length === 0 ? (
                <p className="text-xs text-slate-500 italic">No waiver deltas detected.</p>
              ) : (
                waiverDeltas.map((w: WaiverDeltaItemDTO, i: number) => (
                  <div key={i} className="flex items-center justify-between p-2.5 bg-slate-900 rounded border border-slate-800 text-xs">
                    <div>
                      <span className="font-semibold text-slate-200">{w.blockerType}</span>{' '}
                      <span className="text-slate-400">({w.explanation})</span>
                    </div>
                    <span className="px-2 py-0.5 bg-slate-800 text-slate-300 rounded font-mono text-[10px]">
                      {w.deltaType}
                    </span>
                  </div>
                ))
              )}
            </div>
          )}

          {activeTab === 'topology' && (
            <div className="space-y-2">
              <h5 className="text-xs font-bold text-slate-300 mb-2">Connected System Topology Deltas</h5>
              <div className="grid grid-cols-2 gap-4 text-xs">
                <div>
                  <h6 className="font-medium text-slate-400 mb-1">Added Nodes ({topologyDeltas?.addedNodes?.length || 0})</h6>
                  {(topologyDeltas?.addedNodes || []).map((n: { projectId: string; projectName: string }, i: number) => (
                    <div key={i} className="p-1.5 bg-slate-900 rounded border border-slate-800 text-slate-200 mb-1">
                      {n.projectName}
                    </div>
                  ))}
                </div>
                <div>
                  <h6 className="font-medium text-slate-400 mb-1">Removed Nodes ({topologyDeltas?.removedNodes?.length || 0})</h6>
                  {(topologyDeltas?.removedNodes || []).map((n: { projectId: string; projectName: string }, i: number) => (
                    <div key={i} className="p-1.5 bg-slate-900 rounded border border-slate-800 text-slate-200 mb-1">
                      {n.projectName}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'attestations' && (
            <div className="space-y-2">
              <h5 className="text-xs font-bold text-slate-300 mb-2">Fulfillment Attestation Deltas</h5>
              {attestationDeltas.length === 0 ? (
                <p className="text-xs text-slate-500 italic">No attestation deltas detected.</p>
              ) : (
                attestationDeltas.map((a: AttestationDeltaItemDTO, i: number) => (
                  <div key={i} className="flex items-center justify-between p-2.5 bg-slate-900 rounded border border-slate-800 text-xs">
                    <div>
                      <span className="font-semibold text-slate-200">{a.packageName}</span>{' '}
                      <span className="text-slate-400 font-mono">({a.explanation})</span>
                    </div>
                    <span className="px-2 py-0.5 bg-slate-800 text-slate-300 rounded font-mono text-[10px]">
                      {a.deltaType}
                    </span>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
