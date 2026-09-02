import React, { useState, useEffect } from 'react';
import type { DocumentVersion, VersionCompareResult } from '../features/documents/version.types';
import { listDocumentVersionsApi, compareDocumentVersionsApi } from '../features/documents/version.api';
import { VersionCompareModal } from './VersionCompareModal';

interface VersionHistorySectionProps {
  documentId: string;
  currentVersion: number;
  lastApprovedVersion?: number | null;
  canEdit: boolean;
}

export const VersionHistorySection: React.FC<VersionHistorySectionProps> = ({
  documentId,
  currentVersion,
  lastApprovedVersion,
}) => {
  const [versions, setVersions] = useState<DocumentVersion[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [selectedSourceId, setSelectedSourceId] = useState<string | null>(null);
  const [selectedTargetId, setSelectedTargetId] = useState<string | null>(null);
  const [compareResult, setCompareResult] = useState<VersionCompareResult | null>(null);
  const [isComparing, setIsComparing] = useState(false);
  const [compareError, setCompareError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    let isMounted = true;
    const fetchVersions = async () => {
      try {
        setError(null);
        const res = await listDocumentVersionsApi(documentId);
        if (isMounted) {
          setVersions(res.versions || []);
        }
      } catch (err) {
        if (isMounted) {
          setError(err instanceof Error ? err.message : 'Failed to load document version history');
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    fetchVersions();

    return () => {
      isMounted = false;
    };
  }, [documentId]);

  const handleCompare = async (sourceId: string, targetId: string) => {
    try {
      setIsComparing(true);
      setCompareError(null);
      setIsModalOpen(true);
      const result = await compareDocumentVersionsApi(documentId, sourceId, targetId);
      setCompareResult(result);
    } catch (err) {
      setCompareError(err instanceof Error ? err.message : 'Failed to compare versions');
    } finally {
      setIsComparing(false);
    }
  };

  const getUserName = (version: DocumentVersion) => {
    if (typeof version.createdById === 'object' && version.createdById !== null) {
      return version.createdById.name || version.createdById.email;
    }
    return 'Author';
  };

  return (
    <div style={{ padding: '1.5rem', backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #e2e8f0', marginTop: '1.5rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <h3 style={{ fontSize: '1.1rem', fontWeight: 'bold', margin: 0, color: '#1e293b' }}>
          📜 Version History & Snapshot Provenance
        </h3>
        {versions.length >= 2 && selectedSourceId && selectedTargetId && (
          <button
            type="button"
            onClick={() => handleCompare(selectedSourceId, selectedTargetId)}
            style={{
              padding: '0.4rem 0.8rem',
              backgroundColor: '#2563eb',
              color: '#fff',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '0.85rem',
              fontWeight: '500',
            }}
          >
            Compare Selected Versions
          </button>
        )}
      </div>

      {isLoading && <div style={{ padding: '1rem', color: '#64748b' }}>Loading version snapshots...</div>}
      {error && <div style={{ padding: '1rem', background: '#fef2f2', color: '#991b1b', borderRadius: '6px' }}>{error}</div>}

      {!isLoading && !error && versions.length === 0 && (
        <div style={{ padding: '1rem', color: '#64748b' }}>No version history recorded yet.</div>
      )}

      {!isLoading && !error && versions.length > 0 && (
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid #e2e8f0', textAlign: 'left', color: '#64748b' }}>
              <th style={{ padding: '0.5rem' }}>Compare</th>
              <th style={{ padding: '0.5rem' }}>Version</th>
              <th style={{ padding: '0.5rem' }}>File Payload</th>
              <th style={{ padding: '0.5rem' }}>Size</th>
              <th style={{ padding: '0.5rem' }}>Author</th>
              <th style={{ padding: '0.5rem' }}>Date</th>
              <th style={{ padding: '0.5rem' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {versions.map((ver) => {
              const isCurrent = ver.versionNumber === currentVersion;
              const isApproved = lastApprovedVersion !== null && ver.versionNumber === lastApprovedVersion;

              return (
                <tr key={ver._id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '0.5rem' }}>
                    <input
                      type="radio"
                      name="compareSource"
                      checked={selectedSourceId === ver._id}
                      onChange={() => setSelectedSourceId(ver._id)}
                      title="Select as Source version"
                    />
                    <input
                      type="radio"
                      name="compareTarget"
                      checked={selectedTargetId === ver._id}
                      onChange={() => setSelectedTargetId(ver._id)}
                      style={{ marginLeft: '0.25rem' }}
                      title="Select as Target version"
                    />
                  </td>
                  <td style={{ padding: '0.5rem' }}>
                    <span style={{ fontWeight: 'bold', color: '#0f172a' }}>v{ver.versionNumber}</span>
                    {isCurrent && (
                      <span style={{ marginLeft: '0.5rem', padding: '0.15rem 0.4rem', background: '#e0f2fe', color: '#0369a1', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 'bold' }}>
                        Active Current
                      </span>
                    )}
                    {isApproved && (
                      <span style={{ marginLeft: '0.3rem', padding: '0.15rem 0.4rem', background: '#dcfce7', color: '#15803d', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 'bold' }}>
                        Approved v{lastApprovedVersion}
                      </span>
                    )}
                  </td>
                  <td style={{ padding: '0.5rem' }}>{ver.fileName}</td>
                  <td style={{ padding: '0.5rem' }}>{(ver.fileSize / 1024).toFixed(1)} KB</td>
                  <td style={{ padding: '0.5rem' }}>{getUserName(ver)}</td>
                  <td style={{ padding: '0.5rem' }}>{new Date(ver.createdAt).toLocaleString()}</td>
                  <td style={{ padding: '0.5rem' }}>
                    <a
                      href={`/api/v1/documents/${documentId}/versions/${ver._id}?download=true`}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ color: '#2563eb', textDecoration: 'none', marginRight: '0.75rem', fontWeight: '500' }}
                    >
                      Download
                    </a>
                    {versions.length >= 2 && !isCurrent && (
                      <button
                        type="button"
                        onClick={() => {
                          const currentVerObj = versions.find((v) => v.versionNumber === currentVersion);
                          if (currentVerObj) {
                            handleCompare(ver._id, currentVerObj._id);
                          }
                        }}
                        style={{ background: 'none', border: 'none', color: '#475569', cursor: 'pointer', textDecoration: 'underline', fontSize: '0.85rem' }}
                      >
                        Compare with Current
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}

      <VersionCompareModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        compareResult={compareResult}
        isLoading={isComparing}
        error={compareError}
      />
    </div>
  );
};
