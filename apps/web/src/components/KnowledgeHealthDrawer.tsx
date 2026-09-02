import React, { useState } from 'react';
import type { KnowledgeHealthData } from '../features/documents/health.types';
import { updateDocumentSteward } from '../features/documents/health.api';

interface KnowledgeHealthDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  health: KnowledgeHealthData | null;
  canEdit: boolean;
  onHealthUpdated: (updatedHealth: KnowledgeHealthData) => void;
}

export const KnowledgeHealthDrawer: React.FC<KnowledgeHealthDrawerProps> = ({
  isOpen,
  onClose,
  health,
  canEdit,
  onHealthUpdated,
}) => {
  const [stewardIdInput, setStewardIdInput] = useState('');
  const [isUpdatingSteward, setIsUpdatingSteward] = useState(false);
  const [stewardError, setStewardError] = useState<string | null>(null);

  if (!isOpen || !health) return null;

  const handleUpdateSteward = async (newStewardId: string | null) => {
    try {
      setIsUpdatingSteward(true);
      setStewardError(null);
      const res = await updateDocumentSteward(health.documentId, newStewardId);
      onHealthUpdated(res.health);
      setStewardIdInput('');
    } catch (err: unknown) {
      const errorMsg =
        err instanceof Error ? err.message : 'Failed to update document steward.';
      setStewardError(errorMsg);
    } finally {
      setIsUpdatingSteward(false);
    }
  };

  const getRiskBadgeColor = (level: string) => {
    switch (level) {
      case 'LOW':
        return 'bg-emerald-100 text-emerald-800 border-emerald-300';
      case 'MEDIUM':
        return 'bg-amber-100 text-amber-800 border-amber-300';
      case 'HIGH':
        return 'bg-orange-100 text-orange-800 border-orange-300';
      case 'CRITICAL':
        return 'bg-rose-100 text-rose-800 border-rose-300';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-black/40 backdrop-blur-sm transition-opacity">
      <div className="absolute inset-y-0 right-0 flex max-w-full pl-10">
        <div className="w-screen max-w-md bg-white shadow-2xl">
          {/* Drawer Header */}
          <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4 bg-gray-50">
            <div>
              <h2 className="text-lg font-bold text-gray-900">Knowledge Health & Risk</h2>
              <p className="text-xs text-gray-500">Document ID: {health.documentId}</p>
            </div>
            <button
              onClick={onClose}
              className="rounded-md p-1.5 text-gray-400 hover:bg-gray-200 hover:text-gray-600 transition"
            >
              ✕
            </button>
          </div>

          <div className="h-[calc(100vh-80px)] overflow-y-auto p-6 space-y-6">
            {/* Health Score & Level Overview */}
            <div className="rounded-xl border border-gray-200 bg-gray-50 p-5 text-center shadow-sm">
              <div className="flex justify-between items-center mb-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                  Health Score
                </span>
                <span
                  className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${getRiskBadgeColor(
                    health.riskLevel,
                  )}`}
                >
                  {health.riskLevel} RISK
                </span>
              </div>
              <div className="text-4xl font-extrabold text-gray-900 mb-1">
                {health.healthScore}
                <span className="text-sm font-normal text-gray-500"> / 100</span>
              </div>
              <p className="text-xs text-gray-600">
                Risk Score: <strong className="text-gray-800">{health.riskScore}</strong> / 100
              </p>
            </div>

            {/* Effective Contact / Steward */}
            <div className="rounded-xl border border-gray-200 p-4 space-y-3">
              <div className="flex justify-between items-center">
                <h3 className="text-sm font-semibold text-gray-900">Operational Responsibility</h3>
                <span className="text-xs text-gray-500">
                  {health.effectiveContact?.isExplicitSteward
                    ? 'Technical Steward'
                    : 'Owner (Default Contact)'}
                </span>
              </div>

              {health.effectiveContact ? (
                <div className="flex items-center space-x-3 bg-gray-50 p-3 rounded-lg border border-gray-100">
                  <div className="h-9 w-9 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-sm">
                    {health.effectiveContact.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {health.effectiveContact.name}
                    </p>
                    <p className="text-xs text-gray-500 truncate">{health.effectiveContact.email}</p>
                  </div>
                </div>
              ) : (
                <p className="text-xs text-amber-700 bg-amber-50 p-2.5 rounded border border-amber-200">
                  No active steward or owner assigned.
                </p>
              )}

              {canEdit && (
                <div className="mt-3 pt-3 border-t border-gray-100 space-y-2">
                  <label className="block text-xs font-medium text-gray-700">
                    Assign / Transfer Steward (User ID)
                  </label>
                  <div className="flex space-x-2">
                    <input
                      type="text"
                      placeholder="Enter User ID..."
                      value={stewardIdInput}
                      onChange={(e) => setStewardIdInput(e.target.value)}
                      className="flex-1 text-xs px-2.5 py-1.5 border border-gray-300 rounded focus:ring-1 focus:ring-indigo-500"
                    />
                    <button
                      disabled={!stewardIdInput.trim() || isUpdatingSteward}
                      onClick={() => handleUpdateSteward(stewardIdInput.trim())}
                      className="px-3 py-1.5 text-xs font-medium bg-indigo-600 text-white rounded hover:bg-indigo-700 disabled:opacity-50"
                    >
                      Assign
                    </button>
                    {health.effectiveContact?.isExplicitSteward && (
                      <button
                        disabled={isUpdatingSteward}
                        onClick={() => handleUpdateSteward(null)}
                        className="px-2.5 py-1.5 text-xs font-medium text-rose-700 bg-rose-50 border border-rose-200 rounded hover:bg-rose-100"
                      >
                        Clear
                      </button>
                    )}
                  </div>
                  {stewardError && <p className="text-xs text-rose-600 mt-1">{stewardError}</p>}
                </div>
              )}
            </div>

            {/* Remediation Guidance */}
            {health.remediations.length > 0 && (
              <div className="space-y-2">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                  Recommended Remediation Actions
                </h3>
                <div className="space-y-2">
                  {health.remediations.map((action, idx) => (
                    <div
                      key={idx}
                      className="rounded-lg border border-amber-200 bg-amber-50/60 p-3 text-xs space-y-1"
                    >
                      <span className="font-semibold text-amber-900 block">{action.label}</span>
                      <p className="text-amber-800">{action.detail}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Risk Factor Breakdown */}
            <div className="space-y-3">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                Risk Factor Breakdown
              </h3>

              {Object.entries(health.factors).map(([key, factor]) => (
                <div
                  key={key}
                  className={`rounded-lg border p-3.5 space-y-1.5 text-xs ${
                    factor.triggered
                      ? 'border-rose-200 bg-rose-50/40'
                      : 'border-gray-200 bg-white'
                  }`}
                >
                  <div className="flex justify-between items-center">
                    <span className="font-semibold capitalize text-gray-800">{key} Risk</span>
                    <span className="font-mono text-xs font-medium text-gray-700">
                      {factor.score} / {factor.maxScore} pts
                    </span>
                  </div>

                  {factor.reasons.length > 0 ? (
                    <ul className="space-y-1 pl-4 list-disc text-gray-600">
                      {factor.reasons.map((r, rIdx) => (
                        <li key={rIdx}>
                          <strong className="text-gray-800">{r.label}:</strong> {r.detail}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-gray-400 italic">No detected risk in this category.</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
