import React, { useState } from 'react';
import type { VerificationTaskItem } from './verification-plan.api';

interface VerificationTaskChecklistProps {
  tasks: VerificationTaskItem[];
  onUpdateStatus: (taskId: string, status: 'IN_REVIEW' | 'VERIFIED' | 'SKIPPED', skipReason?: string) => Promise<void>;
  isOwnerOrAdmin?: boolean;
}

export const VerificationTaskChecklist: React.FC<VerificationTaskChecklistProps> = ({
  tasks,
  onUpdateStatus,
  isOwnerOrAdmin = false,
}) => {
  const [skippingTaskId, setSkippingTaskId] = useState<string | null>(null);
  const [skipReasonText, setSkipReasonText] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [loadingTaskId, setLoadingTaskId] = useState<string | null>(null);

  const handleStatusChange = async (taskId: string, status: 'IN_REVIEW' | 'VERIFIED' | 'SKIPPED', reason?: string) => {
    try {
      setErrorMsg('');
      setLoadingTaskId(taskId);
      await onUpdateStatus(taskId, status, reason);
      if (status === 'SKIPPED') {
        setSkippingTaskId(null);
        setSkipReasonText('');
      }
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to update task status');
    } finally {
      setLoadingTaskId(null);
    }
  };

  const submitSkip = (taskId: string) => {
    if (skipReasonText.trim().length < 10) {
      setErrorMsg('Skip reason must be at least 10 characters long');
      return;
    }
    handleStatusChange(taskId, 'SKIPPED', skipReasonText.trim());
  };

  const getMethodBadgeStyle = (method: string) => {
    switch (method) {
      case 'EVIDENCE_RENEWAL':
        return 'bg-purple-500/10 text-purple-400 border-purple-500/30';
      case 'API_ALIGNMENT':
        return 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30';
      case 'TECHNICAL_REVIEW':
        return 'bg-amber-500/10 text-amber-400 border-amber-500/30';
      default:
        return 'bg-blue-500/10 text-blue-400 border-blue-500/30';
    }
  };

  const getTaskStatusStyle = (status: string) => {
    switch (status) {
      case 'VERIFIED':
        return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30';
      case 'SKIPPED':
        return 'bg-amber-500/10 text-amber-400 border-amber-500/30';
      case 'IN_REVIEW':
        return 'bg-blue-500/10 text-blue-400 border-blue-500/30';
      default:
        return 'bg-slate-500/10 text-slate-400 border-slate-500/30';
    }
  };

  return (
    <div className="space-y-4">
      {errorMsg && (
        <div className="p-3 bg-red-950/40 border border-red-800/50 rounded-lg text-xs text-red-300">
          {errorMsg}
        </div>
      )}

      {tasks.map((task) => {
        const targetTitle = typeof task.targetDocumentId === 'object' ? task.targetDocumentId.title : 'Target Document';
        const stewardName = typeof task.assignedStewardId === 'object' ? task.assignedStewardId.name : 'Assigned Steward';
        const isLoading = loadingTaskId === task._id;

        return (
          <div key={task._id} className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-3">
            <div className="flex items-start justify-between">
              <div>
                <h5 className="text-base font-semibold text-slate-100">{targetTitle}</h5>
                <div className="flex flex-wrap gap-2 mt-1">
                  <span className={`px-2.5 py-0.5 text-xs font-semibold rounded-full border ${getMethodBadgeStyle(task.verificationMethod)}`}>
                    {task.verificationMethod.replace(/_/g, ' ')}
                  </span>
                  <span className={`px-2.5 py-0.5 text-xs font-semibold rounded-full border ${getTaskStatusStyle(task.status)}`}>
                    {task.status}
                  </span>
                </div>
              </div>
              <span className="text-xs text-slate-400">Steward: {stewardName}</span>
            </div>

            {/* Impact Explanations */}
            <div className="space-y-1 bg-slate-950/50 p-3 rounded-lg border border-slate-800/80 text-xs text-slate-300">
              <strong className="text-slate-400 block mb-1">Impact Analysis & Verification Guidance:</strong>
              {task.impactExplanations.map((exp, idx) => (
                <p key={idx} className="leading-relaxed">• {exp}</p>
              ))}
            </div>

            {task.skipReason && (
              <div className="p-2.5 bg-amber-950/30 border border-amber-800/40 rounded-lg text-xs text-amber-300">
                <strong>Skip Reason:</strong> {task.skipReason}
              </div>
            )}

            {/* Action Buttons */}
            {task.status !== 'VERIFIED' && task.status !== 'SKIPPED' && (
              <div className="pt-2 flex flex-wrap gap-2 items-center">
                {task.status === 'OPEN' && (
                  <button
                    type="button"
                    disabled={isLoading}
                    onClick={() => handleStatusChange(task._id, 'IN_REVIEW')}
                    className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium rounded-lg transition-colors"
                  >
                    Start Review
                  </button>
                )}

                <button
                  type="button"
                  disabled={isLoading}
                  onClick={() => handleStatusChange(task._id, 'VERIFIED')}
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium rounded-lg transition-colors"
                >
                  Mark Verified
                </button>

                {isOwnerOrAdmin && (
                  <button
                    type="button"
                    disabled={isLoading}
                    onClick={() => {
                      setSkippingTaskId(task._id);
                      setSkipReasonText('');
                    }}
                    className="px-3 py-1.5 bg-amber-600/20 hover:bg-amber-600/30 text-amber-300 border border-amber-500/40 text-xs font-medium rounded-lg transition-colors"
                  >
                    Skip Task
                  </button>
                )}
              </div>
            )}

            {/* Skip Modal / Form Inline */}
            {skippingTaskId === task._id && (
              <div className="mt-3 p-3 bg-slate-950 border border-amber-800/50 rounded-lg space-y-2">
                <label className="block text-xs font-medium text-amber-300">
                  Provide mandatory skip reason (minimum 10 characters):
                </label>
                <textarea
                  rows={2}
                  value={skipReasonText}
                  onChange={(e) => setSkipReasonText(e.target.value)}
                  placeholder="Explain why this verification task is being skipped..."
                  className="w-full p-2 bg-slate-900 border border-slate-700 rounded text-xs text-slate-200 focus:outline-none focus:border-amber-500"
                />
                <div className="flex gap-2 justify-end">
                  <button
                    type="button"
                    onClick={() => setSkippingTaskId(null)}
                    className="px-3 py-1 bg-slate-800 text-slate-300 text-xs rounded hover:bg-slate-700"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => submitSkip(task._id)}
                    className="px-3 py-1 bg-amber-600 text-white text-xs font-medium rounded hover:bg-amber-500"
                  >
                    Confirm Skip
                  </button>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};
