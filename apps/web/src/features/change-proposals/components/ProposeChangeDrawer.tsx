/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState } from 'react';
import type { ProposalType, ProposedChangePayload, SimulationResult } from '../change-proposal.types';
import { runEphemeralSimulation, createChangeProposal } from '../change-proposal.api';

interface ProposeChangeDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  documentId: string;
  projectId: string;
  documentTitle: string;
  initialContent?: string;
}

export const ProposeChangeDrawer: React.FC<ProposeChangeDrawerProps> = ({
  isOpen,
  onClose,
  documentId,
  projectId,
  documentTitle,
  initialContent = '',
}) => {
  const [proposalType, setProposalType] = useState<ProposalType>('DOCUMENT_CONTENT_UPDATE');
  const [title, setTitle] = useState(`Proposal: Update ${documentTitle}`);
  const [description, setDescription] = useState('');
  const [proposedContent, setProposedContent] = useState(initialContent);
  const [contractSchemaText, setContractSchemaText] = useState('{\n  "type": "object",\n  "properties": {}\n}');
  const [targetVersionType, setTargetVersionType] = useState<'MAJOR' | 'MINOR' | 'PATCH'>('MINOR');
  const [isSimulating, setIsSimulating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [simulation, setSimulation] = useState<SimulationResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const buildProposedChange = (): ProposedChangePayload => {
    const payload: ProposedChangePayload = {
      targetVersionType,
    };
    if (proposalType === 'DOCUMENT_CONTENT_UPDATE') {
      payload.content = proposedContent;
    } else if (proposalType === 'TECHNICAL_CONTRACT_UPDATE') {
      try {
        payload.contractSchema = JSON.parse(contractSchemaText);
      } catch {
        payload.contractSchema = {};
      }
    } else if (proposalType === 'DEPRECATION_PROPOSAL') {
      payload.changeDescription = description || 'Proposed document deprecation';
    }
    return payload;
  };

  const handleSimulate = async () => {
    setError(null);
    setIsSimulating(true);
    try {
      const payload = buildProposedChange();
      const res = await runEphemeralSimulation(documentId, proposalType, payload);
      setSimulation(res);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Simulation failed');
    } finally {
      setIsSimulating(false);
    }
  };

  const handleSaveProposal = async () => {
    setError(null);
    setSuccessMsg(null);
    setIsSaving(true);
    try {
      const payload = buildProposedChange();
      await createChangeProposal(projectId, documentId, title, proposalType, payload, description);
      setSuccessMsg('Proposal created successfully as DRAFT');
      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to save proposal');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-slate-900/50 backdrop-blur-sm">
      <div className="absolute inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-3xl bg-slate-900 border-l border-slate-800 text-slate-100 flex flex-col shadow-2xl">
          {/* Header */}
          <div className="p-6 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <svg className="w-5 h-5 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Pre-Change Simulation &amp; Proposal
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                Simulate hypothetical changes for <span className="font-semibold text-slate-200">{documentTitle}</span> without mutating authoritative state.
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Body Content */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {error && (
              <div className="p-4 bg-rose-950/60 border border-rose-800 text-rose-300 rounded-xl text-sm flex items-center gap-3">
                <svg className="w-5 h-5 text-rose-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <span>{error}</span>
              </div>
            )}
            {successMsg && (
              <div className="p-4 bg-emerald-950/60 border border-emerald-800 text-emerald-300 rounded-xl text-sm flex items-center gap-3">
                <svg className="w-5 h-5 text-emerald-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>{successMsg}</span>
              </div>
            )}

            {/* Proposal Parameters Form */}
            <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-5 space-y-4">
              <h3 className="text-sm font-semibold text-slate-200 uppercase tracking-wider">1. Proposal Parameters</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">Proposal Type</label>
                  <select
                    value={proposalType}
                    onChange={(e) => setProposalType(e.target.value as ProposalType)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                  >
                    <option value="DOCUMENT_CONTENT_UPDATE">Content Revision Update</option>
                    <option value="TECHNICAL_CONTRACT_UPDATE">Technical Contract Schema Update</option>
                    <option value="RELATIONSHIP_UPDATE">Relationship Update</option>
                    <option value="DEPRECATION_PROPOSAL">Deprecation Proposal</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">Target Version Increment</label>
                  <select
                    value={targetVersionType}
                    onChange={(e) => setTargetVersionType(e.target.value as any)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                  >
                    <option value="MINOR">MINOR (v.X.0)</option>
                    <option value="MAJOR">MAJOR (v.X.0.0 breaking)</option>
                    <option value="PATCH">PATCH (v.X.X)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Proposal Title</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Rationale / Description</label>
                <input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Optional description or rationale..."
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                />
              </div>

              {proposalType === 'DOCUMENT_CONTENT_UPDATE' && (
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">Proposed Markdown Content</label>
                  <textarea
                    rows={6}
                    value={proposedContent}
                    onChange={(e) => setProposedContent(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-xs font-mono text-slate-200 focus:outline-none focus:border-indigo-500"
                    placeholder="Enter updated documentation content..."
                  />
                </div>
              )}

              {proposalType === 'TECHNICAL_CONTRACT_UPDATE' && (
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">Proposed OpenAPI / JSON Schema</label>
                  <textarea
                    rows={6}
                    value={contractSchemaText}
                    onChange={(e) => setContractSchemaText(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-xs font-mono text-slate-200 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              )}
            </div>

            {/* Simulation Controls */}
            <div className="flex gap-3">
              <button
                onClick={handleSimulate}
                disabled={isSimulating}
                className="flex-1 py-2.5 px-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/20 transition disabled:opacity-50"
              >
                <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                  <path d="M8 5v14l11-7z" />
                </svg>
                {isSimulating ? 'Running In-Memory Simulation...' : 'Run Read-Only Simulation'}
              </button>
              <button
                onClick={handleSaveProposal}
                disabled={isSaving}
                className="py-2.5 px-4 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 border border-slate-700 transition disabled:opacity-50"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
                </svg>
                Save Proposal
              </button>
            </div>

            {/* Simulation Results Output */}
            {simulation && (
              <div className="bg-slate-950/90 border border-indigo-500/30 rounded-xl p-5 space-y-5 shadow-inner">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-1 bg-indigo-500/20 text-indigo-300 text-[10px] font-bold rounded-md tracking-wide uppercase border border-indigo-500/40">
                      PREDICTED SIMULATION OUTPUT
                    </span>
                    <span className="text-xs text-slate-400">
                      Status: <strong className="text-white">{simulation.simulationStatus}</strong>
                    </span>
                  </div>
                  <span className="text-[11px] text-slate-500">
                    {new Date(simulation.simulatedAt).toLocaleTimeString()}
                  </span>
                </div>

                {/* State Comparison Header */}
                <div className="grid grid-cols-2 gap-4 bg-slate-900/80 p-4 rounded-xl border border-slate-800">
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase font-semibold">Authoritative Current State</span>
                    <div className="mt-1 space-y-1 text-xs">
                      <p className="text-slate-300">Version: <span className="font-semibold text-white">v{simulation.authoritativeState.version}.0</span></p>
                      <p className="text-slate-300">Status: <span className="font-semibold text-emerald-400">{simulation.authoritativeState.status}</span></p>
                    </div>
                  </div>
                  <div className="border-l border-slate-800 pl-4">
                    <span className="text-[10px] text-amber-400 uppercase font-semibold">Predicted Simulated State</span>
                    <div className="mt-1 space-y-1 text-xs">
                      <p className="text-slate-300">Predicted Version: <span className="font-semibold text-indigo-300">v{simulation.predictedState.predictedVersion}</span></p>
                      <p className="text-slate-300">Predicted Gate: <span className={`ml-1 font-semibold ${
                          simulation.predictedState.predictedGateStatus === 'PASSED' ? 'text-emerald-400' : 'text-amber-400'
                        }`}>
                          {simulation.predictedState.predictedGateStatus}
                        </span>
                      </p>
                    </div>
                  </div>
                </div>

                {/* Predicted Metrics Grid */}
                <div className="grid grid-cols-3 gap-3 text-xs">
                  <div className="p-3 bg-slate-900 border border-slate-800 rounded-lg">
                    <span className="text-[10px] text-slate-400 block mb-1">Baseline Drift</span>
                    <span className={`font-bold ${simulation.predictedState.predictedDriftStatus === 'IN_SYNC' ? 'text-emerald-400' : 'text-amber-400'}`}>
                      {simulation.predictedState.predictedDriftStatus}
                    </span>
                  </div>
                  <div className="p-3 bg-slate-900 border border-slate-800 rounded-lg">
                    <span className="text-[10px] text-slate-400 block mb-1">Evidence Coverage</span>
                    <span className="font-bold text-indigo-300">
                      {simulation.predictedState.predictedEvidenceScore}%
                    </span>
                  </div>
                  <div className="p-3 bg-slate-900 border border-slate-800 rounded-lg">
                    <span className="text-[10px] text-slate-400 block mb-1">Impacted Docs</span>
                    <span className="font-bold text-white">
                      {simulation.predictedState.impactCascade.totalImpactedCount}
                    </span>
                  </div>
                </div>

                {/* Blast Radius List */}
                {simulation.predictedState.impactCascade.impactedDocuments.length > 0 && (
                  <div>
                    <h4 className="text-xs font-semibold text-slate-300 mb-2 flex items-center gap-1.5">
                      <svg className="w-4 h-4 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                      </svg>
                      Predicted Impacted Blast Radius ({simulation.predictedState.impactCascade.impactedDocuments.length})
                    </h4>
                    <div className="space-y-1.5 max-h-32 overflow-y-auto pr-1">
                      {simulation.predictedState.impactCascade.impactedDocuments.map((doc, idx) => (
                        <div key={idx} className="p-2 bg-slate-900 border border-slate-800 rounded-lg text-xs flex justify-between items-center">
                          <span className="text-slate-200 font-medium">{doc.title}</span>
                          <span className="text-[10px] text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/20">
                            Depth {doc.depth}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Predicted Verification Tasks */}
                {simulation.predictedState.predictedVerificationTasks.length > 0 && (
                  <div>
                    <h4 className="text-xs font-semibold text-slate-300 mb-2 flex items-center gap-1.5">
                      <svg className="w-4 h-4 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                      </svg>
                      Predicted Verification Requirements ({simulation.predictedState.predictedVerificationTasks.length})
                    </h4>
                    <div className="space-y-1.5 max-h-32 overflow-y-auto pr-1">
                      {simulation.predictedState.predictedVerificationTasks.map((t, idx) => (
                        <div key={idx} className="p-2 bg-slate-900/90 border border-slate-800 rounded-lg text-xs">
                          <div className="flex justify-between items-center mb-1">
                            <span className="font-semibold text-slate-200">{t.taskType}</span>
                            <span className="text-[9px] px-1.5 py-0.5 bg-amber-500/20 text-amber-300 rounded uppercase">
                              {t.priority} Priority
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-400">{t.description}</p>
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
