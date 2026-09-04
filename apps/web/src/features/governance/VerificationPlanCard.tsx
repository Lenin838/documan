import React from 'react';
import type { VerificationPlanDetails } from './verification-plan.api';

interface VerificationPlanCardProps {
  plan: VerificationPlanDetails;
  onSelectPlan?: (planId: string) => void;
  onBypassPlan?: (planId: string) => void;
  isOwnerOrAdmin?: boolean;
}

export const VerificationPlanCard: React.FC<VerificationPlanCardProps> = ({
  plan,
  onSelectPlan,
  onBypassPlan,
  isOwnerOrAdmin = false,
}) => {
  const getBadgeStyle = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30';
      case 'COMPLETED_WITH_SKIPS':
        return 'bg-amber-500/10 text-amber-400 border-amber-500/30';
      case 'IN_PROGRESS':
        return 'bg-blue-500/10 text-blue-400 border-blue-500/30';
      case 'BYPASSED':
        return 'bg-purple-500/10 text-purple-400 border-purple-500/30';
      default:
        return 'bg-slate-500/10 text-slate-400 border-slate-500/30';
    }
  };

  const remaining = plan.totalTasks - plan.completedTasks - plan.skippedTasks;
  const progressPercent = plan.totalTasks > 0 ? Math.round(((plan.completedTasks + plan.skippedTasks) / plan.totalTasks) * 100) : 100;

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <span className="text-xs text-slate-400 font-mono">Trigger Version {plan.triggerVersion}</span>
          <h4 className="text-lg font-semibold text-slate-100 mt-1">
            Verification Plan ({plan.totalTasks} task{plan.totalTasks === 1 ? '' : 's'})
          </h4>
        </div>
        <span
          className={`px-3 py-1 text-xs font-semibold rounded-full border ${getBadgeStyle(plan.status)}`}
        >
          {plan.status.replace(/_/g, ' ')}
        </span>
      </div>

      {/* Progress Bar */}
      <div className="space-y-1.5">
        <div className="flex justify-between text-xs text-slate-400">
          <span>Progress</span>
          <span>{progressPercent}% ({plan.completedTasks} verified, {plan.skippedTasks} skipped, {remaining} open)</span>
        </div>
        <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden flex">
          <div
            className="bg-emerald-500 h-full transition-all duration-300"
            style={{ width: `${plan.totalTasks > 0 ? (plan.completedTasks / plan.totalTasks) * 100 : 100}%` }}
          />
          <div
            className="bg-amber-500 h-full transition-all duration-300"
            style={{ width: `${plan.totalTasks > 0 ? (plan.skippedTasks / plan.totalTasks) * 100 : 0}%` }}
          />
        </div>
      </div>

      {plan.bypassReason && (
        <div className="p-3 bg-purple-950/30 border border-purple-800/40 rounded-lg text-xs text-purple-300">
          <strong>Bypassed:</strong> {plan.bypassReason}
        </div>
      )}

      <div className="flex items-center justify-between pt-2 border-t border-slate-800 text-xs text-slate-400">
        <span>Created {new Date(plan.createdAt).toLocaleDateString()}</span>
        <div className="flex gap-2">
          {onSelectPlan && (
            <button
              type="button"
              onClick={() => onSelectPlan(plan._id)}
              className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-medium transition-colors"
            >
              View Checklist
            </button>
          )}
          {onBypassPlan && isOwnerOrAdmin && plan.status !== 'BYPASSED' && plan.status !== 'COMPLETED' && (
            <button
              type="button"
              onClick={() => onBypassPlan(plan._id)}
              className="px-3 py-1.5 bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 border border-purple-500/40 rounded-lg font-medium transition-colors"
            >
              Bypass Plan
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
