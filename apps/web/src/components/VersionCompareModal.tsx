import React from 'react';
import type { VersionCompareResult } from '../features/documents/version.types';

interface VersionCompareModalProps {
  isOpen: boolean;
  onClose: () => void;
  compareResult: VersionCompareResult | null;
  isLoading: boolean;
  error: string | null;
}

export const VersionCompareModal: React.FC<VersionCompareModalProps> = ({
  isOpen,
  onClose,
  compareResult,
  isLoading,
  error,
}) => {
  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
      }}
    >
      <div
        style={{
          backgroundColor: '#fff',
          borderRadius: '8px',
          padding: '1.5rem',
          maxWidth: '800px',
          width: '90%',
          maxHeight: '85vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold', margin: 0 }}>
            Compare Document Versions
          </h2>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '1.25rem',
              cursor: 'pointer',
              color: '#666',
            }}
          >
            ✕
          </button>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', marginBottom: '1rem' }}>
          {isLoading && (
            <div style={{ textAlign: 'center', padding: '2rem', color: '#666' }}>
              Comparing version snapshots...
            </div>
          )}

          {error && (
            <div style={{ padding: '1rem', background: '#fef2f2', border: '1px solid #fecaca', color: '#991b1b', borderRadius: '6px' }}>
              {error}
            </div>
          )}

          {compareResult && !isLoading && (
            <div>
              <div
                style={{
                  display: 'flex',
                  gap: '1rem',
                  padding: '0.75rem',
                  background: '#f8fafc',
                  borderRadius: '6px',
                  marginBottom: '1rem',
                  fontSize: '0.9rem',
                }}
              >
                <div>
                  <strong>Source:</strong> Version {compareResult.sourceVersionNumber}
                </div>
                <div>
                  <strong>Target:</strong> Version {compareResult.targetVersionNumber}
                </div>
                <div>
                  <strong>Size Delta:</strong> {compareResult.sizeDeltaBytes >= 0 ? `+${compareResult.sizeDeltaBytes}` : compareResult.sizeDeltaBytes} bytes
                </div>
                {compareResult.diffSupported && (
                  <div>
                    <span style={{ color: '#16a34a', fontWeight: 'bold' }}>+{compareResult.summary.additions}</span>{' '}
                    <span style={{ color: '#dc2626', fontWeight: 'bold' }}>-{compareResult.summary.deletions}</span>
                  </div>
                )}
              </div>

              {!compareResult.diffSupported ? (
                <div style={{ padding: '1.5rem', background: '#fffbe8', border: '1px solid #fde047', borderRadius: '6px', color: '#854d0e' }}>
                  ⚠️ {compareResult.reason || 'Text comparison not supported for this file format.'}
                </div>
              ) : (
                <pre
                  style={{
                    backgroundColor: '#1e293b',
                    color: '#f8fafc',
                    padding: '1rem',
                    borderRadius: '6px',
                    overflowX: 'auto',
                    fontSize: '0.85rem',
                    fontFamily: 'monospace',
                    lineHeight: '1.4',
                    maxHeight: '450px',
                  }}
                >
                  {compareResult.textDiff ? (
                    compareResult.textDiff.split('\n').map((line, idx) => {
                      let color = '#94a3b8';
                      let bg = 'transparent';
                      if (line.startsWith('+')) {
                        color = '#4ade80';
                        bg = 'rgba(74, 222, 128, 0.1)';
                      } else if (line.startsWith('-')) {
                        color = '#f87171';
                        bg = 'rgba(248, 113, 113, 0.1)';
                      }
                      return (
                        <div key={idx} style={{ color, backgroundColor: bg }}>
                          {line}
                        </div>
                      );
                    })
                  ) : (
                    <div style={{ color: '#94a3b8' }}>Versions are identical.</div>
                  )}
                </pre>
              )}
            </div>
          )}
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button
            type="button"
            onClick={onClose}
            style={{
              padding: '0.5rem 1rem',
              backgroundColor: '#64748b',
              color: '#fff',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
            }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
