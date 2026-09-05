/* eslint-disable @typescript-eslint/no-explicit-any, react-hooks/set-state-in-effect, react-hooks/exhaustive-deps */
import React, { useEffect, useState } from 'react';
import type { DocumentChangeProposal, SimulationResult } from '../change-proposal.types';
import {
  listProjectProposals,
  simulateProposal,
  updateProposalStatus,
  acceptProposal,
} from '../change-proposal.api';

interface ProjectProposalsTabProps {
  projectId: string;
}

export const ProjectProposalsTab: React.FC<ProjectProposalsTabProps> = ({ projectId }) => {
  const [proposals, setProposals] = useState<DocumentChangeProposal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionMsg, setActionMsg] = useState<string | null>(null);
  const [activeSimulation, setActiveSimulation] = useState<SimulationResult | null>(null);

  const fetchProposals = async () => {
    setLoading(true);
    try {
      const res = await listProjectProposals(projectId);
      setProposals(res);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to fetch proposals');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProposals();
  }, [projectId]);

  const handleSimulate = async (proposalId: string) => {
    try {
      setActionMsg('Running re-simulation...');
      const res = await simulateProposal(proposalId);
      setActionMsg('Simulation completed and fingerprint refreshed');
      fetchProposals();
      setActiveSimulation(res.simulation);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Simulation failed');
    }
  };

  const handleStatusChange = async (proposalId: string, status: 'UNDER_REVIEW' | 'REJECTED' | 'DISCARDED') => {
    try {
      await updateProposalStatus(proposalId, status);
      setActionMsg(`Proposal status updated to ${status}`);
      fetchProposals();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Status update failed');
    }
  };

  const handleAccept = async (proposalId: string) => {
    try {
      const res = await acceptProposal(proposalId);
      setActionMsg(`Proposal ACCEPTED! ${res.handoffPayload.nextSteps}`);
      fetchProposals();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to accept proposal');
    }
  };

  if (loading) {
    return (
      <div className="p-8 text-center text-slate-400 text-xs flex items-center justify-center gap-2">
        <svg className="w-4 h-4 animate-spin text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
        </svg>
        Loading project change proposals...
      </div>
    );
  }

  return (
    <div className="space-y-6">
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

      {proposals.length === 0 ? (
        <div className="p-12 text-center bg-slate-900/60 border border-slate-800 rounded-2xl space-y-3">
          <svg className="w-10 h-10 text-slate-600 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <h3 className="text-sm font-semibold text-slate-300">No Change Proposals Found</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Engineers and technical writers can simulate and submit pre-change proposals directly from the Document Details page.
          </p>
        </div>
      ) : (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-950/80 text-[11px] font-semibold text-slate-400 uppercase tracking-wider border-b border-slate-800">
                <th className="py-3.5 px-4">Proposal #</th>
                <th className="py-3.5 px-4">Target Document</th>
                <th className="py-3.5 px-4">Type</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4">Created</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 text-xs text-slate-200">
              {proposals.map((prop) => {
                const docTitle = typeof prop.targetDocumentId === 'object' ? prop.targetDocumentId?.title : 'Document';
                return (
                  <tr key={prop._id} className="hover:bg-slate-800/40 transition">
                    <td className="py-3.5 px-4 font-mono font-bold text-indigo-300">
                      {prop.proposalNumber}
                    </td>
                    <td className="py-3.5 px-4 font-medium text-slate-200">
                      {docTitle}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="px-2 py-0.5 bg-slate-800 text-slate-300 rounded text-[10px] font-medium border border-slate-700">
                        {prop.proposalType}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        prop.status === 'ACCEPTED' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40' :
                        prop.status === 'REJECTED' ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40' :
                        prop.status === 'UNDER_REVIEW' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40' :
                        'bg-indigo-500/20 text-indigo-300 border border-indigo-500/40'
                      }`}>
                        {prop.status}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-slate-400 text-[11px]">
                      {new Date(prop.createdAt).toLocaleDateString()}
                    </td>
                    <td className="py-3.5 px-4 text-right space-x-2">
                      <button
                        onClick={() => handleSimulate(prop._id)}
                        className="px-2.5 py-1 bg-indigo-600/80 hover:bg-indigo-600 text-white rounded text-[11px] font-medium transition inline-flex items-center gap-1"
                      >
                        <svg className="w-3 h-3 fill-current" viewBox="0 0 24 24">
                          <path d="M8 5v14l11-7z" />
                        </svg>
                        Simulate
                      </button>

                      {prop.status === 'DRAFT' || prop.status === 'SIMULATED' ? (
                        <button
                          onClick={() => handleStatusChange(prop._id, 'UNDER_REVIEW')}
                          className="px-2.5 py-1 bg-amber-600/80 hover:bg-amber-600 text-white rounded text-[11px] font-medium transition"
                        >
                          Submit Review
                        </button>
                      ) : null}

                      {prop.status === 'UNDER_REVIEW' ? (
                        <>
                          <button
                            onClick={() => handleAccept(prop._id)}
                            className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-[11px] font-medium transition"
                          >
                            Accept
                          </button>
                          <button
                            onClick={() => handleStatusChange(prop._id, 'REJECTED')}
                            className="px-2.5 py-1 bg-rose-600 hover:bg-rose-500 text-white rounded text-[11px] font-medium transition"
                          >
                            Reject
                          </button>
                        </>
                      ) : null}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {activeSimulation && (
        <div className="bg-slate-950/90 border border-indigo-500/40 rounded-2xl p-6 space-y-4 shadow-xl">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h4 className="text-sm font-bold text-white flex items-center gap-2">
              <span className="px-2.5 py-0.5 bg-indigo-500/20 text-indigo-300 text-[10px] rounded uppercase font-mono border border-indigo-500/40">
                Simulation Output
              </span>
              <span>Status: <strong className="text-indigo-400">{activeSimulation.simulationStatus}</strong></span>
            </h4>
            <button
              onClick={() => setActiveSimulation(null)}
              className="text-xs text-slate-400 hover:text-white"
            >
              Close
            </button>
          </div>
          <div className="grid grid-cols-3 gap-4 text-xs">
            <div className="p-3 bg-slate-900 border border-slate-800 rounded-xl">
              <span className="text-slate-400 text-[11px] block">Predicted Gate</span>
              <span className="text-emerald-400 font-bold text-sm">
                {activeSimulation.predictedState.predictedGateStatus}
              </span>
            </div>
            <div className="p-3 bg-slate-900 border border-slate-800 rounded-xl">
              <span className="text-slate-400 text-[11px] block">Predicted Evidence Score</span>
              <span className="text-indigo-300 font-bold text-sm">
                {activeSimulation.predictedState.predictedEvidenceScore}%
              </span>
            </div>
            <div className="p-3 bg-slate-900 border border-slate-800 rounded-xl">
              <span className="text-slate-400 text-[11px] block">Predicted Impact Count</span>
              <span className="text-white font-bold text-sm">
                {activeSimulation.predictedState.impactCascade.totalImpactedCount}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
