import React, { useEffect, useState } from 'react';
import { getDocumentEvidence, getReverseDocument } from '../features/evidence/evidence.api';
import type {
  DerivedEvidenceItem,
  EvidenceCoverageResponse,
  SourceDocumentSummary,
} from '../features/evidence/evidence.types';

interface EvidencePanelProps {
  documentId: string;
}

export const EvidencePanel: React.FC<EvidencePanelProps> = ({ documentId }) => {
  const [evidenceData, setEvidenceData] = useState<EvidenceCoverageResponse | null>(null);
  const [reverseDocs, setReverseDocs] = useState<SourceDocumentSummary[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    Promise.all([
      getDocumentEvidence(documentId),
      getReverseDocument(documentId).catch(() => ({ citingDocuments: [] })),
    ])
      .then(([evRes, revRes]) => {
        if (isMounted) {
          setEvidenceData(evRes);
          setReverseDocs(revRes.citingDocuments || []);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (isMounted) {
          setError(err?.response?.data?.message || 'Failed to load evidence & traceability data');
          setLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [documentId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-gray-500 font-medium">Loading Evidence &amp; Traceability...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 text-red-700 rounded-md border border-red-200 mb-4">
        {error}
      </div>
    );
  }

  if (!evidenceData) {
    return null;
  }

  const {
    coverageScore = 100,
    label = 'NO_APPLICABLE_EVIDENCE',
    applicableCount = 0,
    verifiedCount = 0,
    staleCount = 0,
    orphanedCount = 0,
    unverifiedCount = 0,
    items = [],
    remediations = [],
  } = evidenceData || {};

  const safeItems = Array.isArray(items) ? items : [];
  const safeRemediations = Array.isArray(remediations) ? remediations : [];
  const safeReverseDocs = Array.isArray(reverseDocs) ? reverseDocs : [];

  const getBadgeColor = (lbl: string) => {
    switch (lbl) {
      case 'EXCELLENT':
        return 'bg-emerald-100 text-emerald-800 border-emerald-300';
      case 'GOOD':
        return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'NEEDS_ATTENTION':
        return 'bg-amber-100 text-amber-800 border-amber-300';
      case 'POOR':
        return 'bg-rose-100 text-rose-800 border-rose-300';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const getStateBadge = (state: DerivedEvidenceItem['state']) => {
    switch (state) {
      case 'VERIFIED':
        return <span className="px-2 py-0.5 text-xs font-semibold rounded bg-emerald-100 text-emerald-800">VERIFIED</span>;
      case 'STALE':
        return <span className="px-2 py-0.5 text-xs font-semibold rounded bg-amber-100 text-amber-800">STALE</span>;
      case 'ORPHANED':
        return <span className="px-2 py-0.5 text-xs font-semibold rounded bg-rose-100 text-rose-800">ORPHANED</span>;
      case 'UNVERIFIED':
        return <span className="px-2 py-0.5 text-xs font-semibold rounded bg-purple-100 text-purple-800">UNVERIFIED</span>;
      default:
        return <span className="px-2 py-0.5 text-xs font-semibold rounded bg-gray-100 text-gray-800">UNKNOWN</span>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Coverage Overview Card */}
      <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h3 className="text-lg font-bold text-gray-900">Documentation Evidence Coverage</h3>
            <p className="text-sm text-gray-500">
              Derived technical evidence and completeness verification for this document.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-3xl font-extrabold text-gray-900">{coverageScore}%</div>
            <span
              className={`px-3 py-1 text-xs font-bold rounded-full border ${getBadgeColor(label || 'NO_APPLICABLE_EVIDENCE')}`}
            >
              {(label || 'NO_APPLICABLE_EVIDENCE').replace(/_/g, ' ')}
            </span>
          </div>
        </div>

        {/* State Summary Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mt-6 pt-4 border-t border-gray-100">
          <div className="bg-gray-50 p-3 rounded text-center">
            <div className="text-xs font-medium text-gray-500">Applicable</div>
            <div className="text-lg font-bold text-gray-900">{applicableCount}</div>
          </div>
          <div className="bg-emerald-50 p-3 rounded text-center">
            <div className="text-xs font-medium text-emerald-700">Verified</div>
            <div className="text-lg font-bold text-emerald-800">{verifiedCount}</div>
          </div>
          <div className="bg-amber-50 p-3 rounded text-center">
            <div className="text-xs font-medium text-amber-700">Stale</div>
            <div className="text-lg font-bold text-amber-800">{staleCount}</div>
          </div>
          <div className="bg-rose-50 p-3 rounded text-center">
            <div className="text-xs font-medium text-rose-700">Orphaned</div>
            <div className="text-lg font-bold text-rose-800">{orphanedCount}</div>
          </div>
          <div className="bg-purple-50 p-3 rounded text-center">
            <div className="text-xs font-medium text-purple-700">Unverified</div>
            <div className="text-lg font-bold text-purple-800">{unverifiedCount}</div>
          </div>
        </div>
      </div>

      {/* Remediations Panel */}
      {safeRemediations.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 p-4 rounded-lg">
          <h4 className="font-semibold text-amber-900 text-sm mb-2">Recommended Actions</h4>
          <ul className="space-y-2">
            {safeRemediations.map((rem) => (
              <li key={rem.code} className="text-xs text-amber-800">
                <span className="font-bold">{rem.label}:</span> {rem.detail}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Derived Evidence Items */}
      <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
        <h4 className="font-bold text-gray-900 mb-4">Technical Evidence Items</h4>

        {safeItems.length === 0 ? (
          <div className="text-sm text-gray-500 italic">No applicable technical evidence items found for this document.</div>
        ) : (
          <div className="divide-y divide-gray-100">
            {safeItems.map((item) => (
              <div key={item.syntheticId} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm text-gray-900">{item.title}</span>
                    <span className="text-[10px] font-mono uppercase bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded">
                      {(item.category || '').replace(/_/g, ' ')}
                    </span>
                    {getStateBadge(item.state)}
                  </div>
                  {item.summary && <div className="text-xs text-gray-500">{item.summary}</div>}
                  <div className="text-xs text-gray-600 font-sans">{item.stateReason}</div>
                  {item.verifiedBy && (
                    <div className="text-[11px] text-gray-400">
                      Verified by: <span className="font-medium text-gray-700">{item.verifiedBy.name}</span>
                    </div>
                  )}
                </div>
                <div className="text-[10px] font-mono text-gray-400 self-start sm:self-center">
                  {item.syntheticId}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Reverse Traceability Navigation */}
      <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
        <h4 className="font-bold text-gray-900 mb-2">Reverse Citing Documents</h4>
        <p className="text-xs text-gray-500 mb-4">
          Documents that depend on or cite this technical document.
        </p>

        {safeReverseDocs.length === 0 ? (
          <div className="text-sm text-gray-500 italic">No citing documents found.</div>
        ) : (
          <ul className="space-y-2">
            {safeReverseDocs.map((doc) => (
              <li
                key={doc.id}
                className="p-3 bg-gray-50 rounded border border-gray-200 flex items-center justify-between hover:bg-gray-100 transition-colors"
              >
                <div>
                  <a
                    href={`/documents/${doc.id}`}
                    className="font-medium text-sm text-blue-600 hover:underline"
                  >
                    {doc.title}
                  </a>
                  <div className="text-xs text-gray-500">
                    {doc.fileName} • v{doc.version} • {doc.status}
                    {doc.relationshipType && ` • (${doc.relationshipType})`}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};
