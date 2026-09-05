import React from 'react';

export interface ActiveImpactSource {
  upstreamDocumentId: string;
  upstreamVersionNumber?: number;
  changeType: 'STALE' | 'DEPRECATED' | 'FILE_REPLACED';
  flaggedAt: string;
}

interface DocumentCrossProjectImpactSectionProps {
  needsVerification?: boolean;
  activeImpactSources?: ActiveImpactSource[];
}

export const DocumentCrossProjectImpactSection: React.FC<DocumentCrossProjectImpactSectionProps> = ({
  needsVerification = false,
  activeImpactSources = [],
}) => {
  return (
    <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <svg className="w-5 h-5 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
          <h3 className="text-sm font-semibold text-gray-900">
            Cross-Project Change Impact &amp; Contract Drift
          </h3>
        </div>
        {needsVerification ? (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-200">
            <svg className="w-3.5 h-3.5 mr-1 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            Verification Required
          </span>
        ) : (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
            <svg className="w-3.5 h-3.5 mr-1 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Contracts Aligned
          </span>
        )}
      </div>

      {activeImpactSources.length === 0 ? (
        <p className="text-xs text-gray-500 italic">
          No active cross-project upstream change impact or contract drift detected on this document.
        </p>
      ) : (
        <div className="space-y-2">
          <p className="text-xs font-medium text-gray-700">Active Upstream Contract Drift Sources:</p>
          <div className="space-y-2">
            {activeImpactSources.map((source, index) => (
              <div
                key={index}
                className="p-3 bg-amber-50 border border-amber-200 rounded-md flex items-center justify-between text-xs"
              >
                <div className="flex items-center gap-2">
                  <svg className="w-4 h-4 text-amber-600 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                  </svg>
                  <div>
                    <span className="font-semibold text-amber-900">
                      Upstream Contract Updated ({source.changeType})
                    </span>
                    <span className="text-amber-700 block text-[11px]">
                      Upstream Version: v{source.upstreamVersionNumber || 1} • Flagged:{' '}
                      {new Date(source.flaggedAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
