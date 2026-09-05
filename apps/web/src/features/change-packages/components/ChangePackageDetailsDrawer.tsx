/* eslint-disable @typescript-eslint/no-explicit-any, react-hooks/set-state-in-effect */
import React, { useEffect, useState, useCallback } from 'react';
import type { DocumentChangePackage, PackageSimulationResultDTO, PackageStalenessResult } from '../change-package.types';
import {
  getChangePackageDetails,
  simulateChangePackage,
  acceptChangePackage,
  updatePackageStatus,
} from '../change-package.api';

interface ChangePackageDetailsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  packageId: string;
  onPackageUpdated: () => void;
}

export const ChangePackageDetailsDrawer: React.FC<ChangePackageDetailsDrawerProps> = ({
  isOpen,
  onClose,
  packageId,
  onPackageUpdated,
}) => {
  const [pkg, setPkg] = useState<DocumentChangePackage | null>(null);
  const [staleness, setStaleness] = useState<PackageStalenessResult | null>(null);
  const [simulation, setSimulation] = useState<PackageSimulationResultDTO | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSimulating, setIsSimulating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actionMsg, setActionMsg] = useState<string | null>(null);

  const fetchDetails = useCallback(async () => {
    try {
      const res = await getChangePackageDetails(packageId);
      setPkg(res.package);
      setStaleness(res.staleness);
      if (res.package.simulationResultCache) {
        setSimulation(res.package.simulationResultCache);
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to fetch package details');
    } finally {
      setLoading(false);
    }
  }, [packageId]);

  useEffect(() => {
    if (isOpen && packageId) {
      void fetchDetails();
    }
  }, [isOpen, packageId, fetchDetails]);

  if (!isOpen) return null;

  const handleSimulate = async () => {
    setIsSimulating(true);
    setError(null);
    try {
      const res = await simulateChangePackage(packageId);
      setSimulation(res.simulation);
      setActionMsg('Aggregate multi-document simulation completed');
      fetchDetails();
      onPackageUpdated();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Simulation failed');
    } finally {
      setIsSimulating(false);
    }
  };

  const handleStatusChange = async (status: 'UNDER_REVIEW' | 'REJECTED' | 'DISCARDED') => {
    try {
      await updatePackageStatus(packageId, status);
      setActionMsg(`Package status updated to ${status}`);
      fetchDetails();
      onPackageUpdated();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to update status');
    }
  };

  const handleAccept = async () => {
    try {
      const res = await acceptChangePackage(packageId);
      setActionMsg(`PACKAGE ACCEPTED! ${res.handoffPayload.nextSteps}`);
      fetchDetails();
      onPackageUpdated();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to accept package');
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-slate-900/50 backdrop-blur-sm">
      <div className="absolute inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-4xl bg-slate-900 border-l border-slate-800 text-slate-100 flex flex-col shadow-2xl">
          {/* Header */}
          <div className="p-6 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono font-bold text-indigo-400 text-sm">{loading ? 'Loading...' : pkg?.packageNumber || 'PKG'}</span>
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                  pkg?.status === 'ACCEPTED' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40' :
                  pkg?.status === 'UNDER_REVIEW' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40' :
                  'bg-indigo-500/20 text-indigo-300 border border-indigo-500/40'
                }`}>
                  {pkg?.status}
                </span>
                {staleness?.isStale && (
                  <span className="px-2 py-0.5 bg-rose-500/20 text-rose-300 border border-rose-500/40 rounded text-[10px] font-bold">
                    STALE
                  </span>
                )}
              </div>
              <h2 className="text-xl font-bold text-white mt-1">{pkg?.title || 'Change Package Details'}</h2>
            </div>
            <button onClick={onClose} className="p-2 text-slate-400 hover:text-white rounded-lg">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6 text-xs">
            {error && (
              <div className="p-4 bg-rose-950/60 border border-rose-800 text-rose-300 rounded-xl text-xs flex items-center gap-2">
                <svg className="w-4 h-4 text-rose-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>{error}</span>
              </div>
            )}
            {actionMsg && (
              <div className="p-4 bg-indigo-950/60 border border-indigo-800 text-indigo-200 rounded-xl text-xs flex items-center gap-2">
                <svg className="w-4 h-4 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
                <span>{actionMsg}</span>
              </div>
            )}

            {/* Action Bar */}
            <div className="flex items-center gap-3">
              <button
                onClick={handleSimulate}
                disabled={isSimulating}
                className="flex-1 py-2.5 px-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-semibold transition disabled:opacity-50 flex items-center justify-center gap-2"
              >
                <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                  <path d="M8 5v14l11-7z" />
                </svg>
                {isSimulating ? 'Simulating Package...' : 'Run Aggregate Read-Only Simulation'}
              </button>

              {pkg?.status === 'DRAFT' || pkg?.status === 'SIMULATED' ? (
                <button
                  onClick={() => handleStatusChange('UNDER_REVIEW')}
                  className="py-2.5 px-4 bg-amber-600 hover:bg-amber-500 text-white rounded-xl font-semibold transition"
                >
                  Submit Review
                </button>
              ) : null}

              {pkg?.status === 'UNDER_REVIEW' ? (
                <>
                  <button
                    onClick={handleAccept}
                    className="py-2.5 px-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-semibold transition"
                  >
                    Accept Package
                  </button>
                  <button
                    onClick={() => handleStatusChange('REJECTED')}
                    className="py-2.5 px-4 bg-rose-600 hover:bg-rose-500 text-white rounded-xl font-semibold transition"
                  >
                    Reject
                  </button>
                </>
              ) : null}
            </div>

            {/* Attached Proposals List */}
            <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-4 space-y-3">
              <h3 className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                Constituent Proposals ({pkg?.proposals?.length || 0})
              </h3>
              <div className="space-y-2">
                {pkg?.proposals?.map((prop: any) => (
                  <div key={prop._id || prop} className="p-3 bg-slate-900 border border-slate-800 rounded-lg flex justify-between items-center">
                    <div>
                      <span className="font-mono font-bold text-indigo-300 mr-2">{prop.proposalNumber || prop}</span>
                      <span className="text-slate-200 font-medium">{prop.title || 'Proposal'}</span>
                    </div>
                    <span className="px-2 py-0.5 bg-slate-800 text-slate-400 rounded text-[10px] font-mono">
                      {prop.proposalType || 'DOCUMENT_UPDATE'}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Simulation Results Output */}
            {simulation && (
              <div className="bg-slate-950/90 border border-indigo-500/40 rounded-xl p-5 space-y-4 shadow-xl">
                <div className="flex justify-between items-center border-b border-slate-800 pb-3">
                  <h4 className="text-sm font-bold text-white flex items-center gap-2">
                    <span className="px-2.5 py-0.5 bg-indigo-500/20 text-indigo-300 text-[10px] rounded uppercase font-mono border border-indigo-500/40">
                      Aggregate Simulation Output
                    </span>
                    <span>Status: <strong className="text-indigo-400">{simulation.simulationStatus}</strong></span>
                  </h4>
                </div>

                {/* Conflicts Panel */}
                {simulation.conflicts.length > 0 && (
                  <div className="p-4 bg-rose-950/60 border border-rose-800 rounded-xl space-y-2">
                    <h5 className="text-xs font-bold text-rose-300 flex items-center gap-1.5">
                      <svg className="w-4 h-4 text-rose-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                      </svg>
                      Inter-Proposal Conflicts ({simulation.conflicts.length})
                    </h5>
                    {simulation.conflicts.map((c, idx) => (
                      <div key={idx} className="p-2 bg-slate-900 border border-rose-900 rounded text-rose-200">
                        <strong className="block text-[11px] text-rose-400">{c.conflictClass}</strong>
                        <span>{c.description}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Metrics */}
                <div className="grid grid-cols-3 gap-3 text-xs">
                  <div className="p-3 bg-slate-900 border border-slate-800 rounded-lg">
                    <span className="text-[10px] text-slate-400 block mb-1">Joint Release Gate</span>
                    <span className={`font-bold ${
                      simulation.predictedState.predictedJointGateStatus === 'PASSED' ? 'text-emerald-400' : 'text-amber-400'
                    }`}>
                      {simulation.predictedState.predictedJointGateStatus}
                    </span>
                  </div>
                  <div className="p-3 bg-slate-900 border border-slate-800 rounded-lg">
                    <span className="text-[10px] text-slate-400 block mb-1">Combined Evidence</span>
                    <span className="font-bold text-indigo-300">
                      {simulation.predictedState.predictedEvidenceScore}%
                    </span>
                  </div>
                  <div className="p-3 bg-slate-900 border border-slate-800 rounded-lg">
                    <span className="text-[10px] text-slate-400 block mb-1">Deduplicated Blast Radius</span>
                    <span className="font-bold text-white">
                      {simulation.predictedState.impactCascade.totalImpactedCount} Docs
                    </span>
                  </div>
                </div>

                {/* Deduplicated Blast Radius Roster */}
                {simulation.predictedState.impactCascade.impactedDocuments.length > 0 && (
                  <div className="space-y-2">
                    <h5 className="text-xs font-semibold text-slate-300">Deduplicated Impacted Roster</h5>
                    <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                      {simulation.predictedState.impactCascade.impactedDocuments.map((doc, idx) => (
                        <div key={idx} className="p-3 bg-slate-900 border border-slate-800 rounded-lg space-y-1">
                          <div className="flex justify-between items-center">
                            <span className="font-medium text-slate-200">{doc.title}</span>
                            <span className="text-[10px] text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/20">
                              Min Depth: {doc.minDepth}
                            </span>
                          </div>
                          {doc.impactDetails.map((detail, dIdx) => (
                            <p key={dIdx} className="text-[11px] text-slate-400">
                              • <span className="font-mono text-indigo-300">{detail.category}</span>: {detail.description}
                            </p>
                          ))}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
