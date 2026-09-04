import type { DriftReport } from './baseline.types';

interface BaselineDriftSummaryCardProps {
  driftReport: DriftReport | null;
  onRefresh: () => void;
  onCreateBaseline: () => void;
  isOwnerOrAdmin: boolean;
}

export function BaselineDriftSummaryCard({
  driftReport,
  onRefresh,
  onCreateBaseline,
  isOwnerOrAdmin,
}: BaselineDriftSummaryCardProps) {
  if (!driftReport) return null;

  const {
    hasActiveBaseline,
    baselineVersionTag,
    driftScore,
    severity,
    summary,
    evaluatedAt,
  } = driftReport;

  const getSeverityBadge = () => {
    switch (severity) {
      case 'CLEAN':
        return <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-800">CLEAN</span>;
      case 'WARNING':
        return <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-400 border border-amber-300 dark:border-amber-800">WARNING</span>;
      case 'BLOCKING':
        return <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-rose-100 text-rose-800 dark:bg-rose-950/40 dark:text-rose-400 border border-rose-300 dark:border-rose-800">BLOCKING</span>;
      default:
        return null;
    }
  };

  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-6 shadow-sm mb-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-100 dark:border-gray-800 pb-4 mb-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">
              Authoritative Baseline & Drift Control
            </h3>
            {hasActiveBaseline && getSeverityBadge()}
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {hasActiveBaseline
              ? `Active Baseline: ${baselineVersionTag || 'v1.0.0'} (Evaluated at ${new Date(evaluatedAt).toLocaleString()})`
              : 'No active authoritative baseline established for this project.'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onRefresh}
            className="px-3 py-1.5 text-xs font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            Refresh Comparison
          </button>
          {isOwnerOrAdmin && (
            <button
              type="button"
              onClick={onCreateBaseline}
              className="px-3.5 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600 rounded-lg shadow-xs transition-colors"
            >
              {hasActiveBaseline ? 'Re-Baseline Project' : 'Create Initial Baseline'}
            </button>
          )}
        </div>
      </div>

      {hasActiveBaseline ? (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-100 dark:border-gray-800">
            <div className="text-xs text-gray-500 dark:text-gray-400">Drift Score</div>
            <div className="text-2xl font-extrabold text-indigo-600 dark:text-indigo-400 mt-1">
              {driftScore} <span className="text-xs text-gray-400 font-normal">/ 100</span>
            </div>
          </div>
          <div className="p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-100 dark:border-gray-800">
            <div className="text-xs text-gray-500 dark:text-gray-400">Version Drift</div>
            <div className={`text-2xl font-extrabold mt-1 ${summary.versionDriftCount > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-gray-700 dark:text-gray-300'}`}>
              {summary.versionDriftCount}
            </div>
          </div>
          <div className="p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-100 dark:border-gray-800">
            <div className="text-xs text-gray-500 dark:text-gray-400">Deletion Drift</div>
            <div className={`text-2xl font-extrabold mt-1 ${summary.deletionDriftCount > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-gray-700 dark:text-gray-300'}`}>
              {summary.deletionDriftCount}
            </div>
          </div>
          <div className="p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-100 dark:border-gray-800">
            <div className="text-xs text-gray-500 dark:text-gray-400">Verification Drift</div>
            <div className={`text-2xl font-extrabold mt-1 ${summary.verificationDriftCount > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-gray-700 dark:text-gray-300'}`}>
              {summary.verificationDriftCount}
            </div>
          </div>
          <div className="p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-100 dark:border-gray-800">
            <div className="text-xs text-gray-500 dark:text-gray-400">Relationship Drift</div>
            <div className={`text-2xl font-extrabold mt-1 ${summary.relationshipDriftCount > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-gray-700 dark:text-gray-300'}`}>
              {summary.relationshipDriftCount}
            </div>
          </div>
        </div>
      ) : (
        <div className="text-sm text-gray-600 dark:text-gray-400 py-2">
          Lock an authoritative documentation baseline to track version changes, structural relationships, and verification plan compliance over time.
        </div>
      )}
    </div>
  );
}
