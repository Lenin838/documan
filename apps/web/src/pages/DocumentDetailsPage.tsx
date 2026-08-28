import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';

import {
  getDocumentById,
  getDocumentAuditHistory,
  downloadDocument,
  viewDocument,
} from '../features/documents/document.api';
import type {
  Document,
  DocumentAudit,
  DocumentAuditAction,
} from '../features/documents/document.types';

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

function formatAuditAction(action: DocumentAuditAction): {
  label: string;
  description: string;
} {
  switch (action) {
    case 'CREATE':
      return { label: 'Document Created', description: 'Document was created' };
    case 'UPDATE':
      return { label: 'Document Updated', description: 'Document details were updated' };
    case 'FILE_REPLACE':
      return { label: 'File Replaced', description: 'Document file was replaced' };
    case 'VIEW':
      return { label: 'Document Viewed', description: 'Document was viewed' };
    case 'DOWNLOAD':
      return { label: 'Document Downloaded', description: 'Document was downloaded' };
    case 'DELETE':
      return { label: 'Document Deleted', description: 'Document was deleted' };
    case 'RESTORE':
      return { label: 'Document Restored', description: 'Document was restored' };
    default:
      return { label: action, description: '' };
  }
}

function renderAuditMetadata(metadata?: Record<string, unknown>) {
  if (!metadata || Object.keys(metadata).length === 0) {
    return null;
  }

  if (
    typeof metadata.oldFileName === 'string' &&
    typeof metadata.newFileName === 'string'
  ) {
    return (
      <small style={{ display: 'block', color: '#666', marginTop: '0.25rem' }}>
        {metadata.oldFileName} &rarr; {metadata.newFileName}
      </small>
    );
  }

  const entries = Object.entries(metadata).filter(
    ([key]) =>
      !key.toLowerCase().includes('path') &&
      !key.toLowerCase().includes('password'),
  );

  if (entries.length === 0) {
    return null;
  }

  return (
    <small style={{ display: 'block', color: '#666', marginTop: '0.25rem' }}>
      {entries.map(([k, v]) => `${k}: ${String(v)}`).join(' | ')}
    </small>
  );
}

export default function DocumentDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [doc, setDoc] = useState<Document | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [viewing, setViewing] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [actionError, setActionError] = useState('');

  const [auditHistory, setAuditHistory] = useState<DocumentAudit[]>([]);
  const [auditPage, setAuditPage] = useState(1);
  const [auditTotalPages, setAuditTotalPages] = useState(1);
  const [selectedAction, setSelectedAction] = useState<
    DocumentAuditAction | ''
  >('');
  const [auditLoading, setAuditLoading] = useState(true);
  const [auditError, setAuditError] = useState('');

  useEffect(() => {
    if (!id) {
      return;
    }

    const documentId = id;

    async function loadDocument() {
      setLoading(true);
      setError('');

      try {
        const response = await getDocumentById(documentId);
        setDoc(response.data);
      } catch {
        setError('Failed to load document');
      } finally {
        setLoading(false);
      }
    }

    void loadDocument();
  }, [id]);

  useEffect(() => {
    if (!id) {
      return;
    }

    const documentId = id;

    async function loadAuditHistory() {
      setAuditLoading(true);
      setAuditError('');

      try {
        const response = await getDocumentAuditHistory(documentId, {
          page: auditPage,
          limit: 10,
          action: selectedAction || undefined,
        });

        setAuditHistory(response.data.auditHistory);
        setAuditTotalPages(response.data.pagination.totalPages || 1);
      } catch {
        setAuditError('Unable to load activity history.');
      } finally {
        setAuditLoading(false);
      }
    }

    void loadAuditHistory();
  }, [id, auditPage, selectedAction]);

  async function handleView() {
    if (!id || viewing || downloading) {
      return;
    }

    setViewing(true);
    setActionError('');

    try {
      const response = await viewDocument(id);
      const contentType =
        (response.headers['content-type'] as string | undefined) ||
        'application/octet-stream';
      const blob = new Blob([response.data], { type: contentType });
      const url = URL.createObjectURL(blob);

      const opened = window.open(url, '_blank');
      if (!opened) {
        window.location.href = url;
      }

      setTimeout(() => {
        URL.revokeObjectURL(url);
      }, 60000);
    } catch {
      setActionError('Unable to open this document.');
    } finally {
      setViewing(false);
    }
  }

  async function handleDownload() {
    if (!id || viewing || downloading) {
      return;
    }

    setDownloading(true);
    setActionError('');

    try {
      const response = await downloadDocument(id);
      const contentDisposition = response.headers[
        'content-disposition'
      ] as string | undefined;

      let fileName = doc?.fileName || 'document';

      if (contentDisposition) {
        const match = contentDisposition.match(/filename="?([^";]+)"?/i);
        if (match && match[1]) {
          fileName = match[1];
        }
      }

      const contentType =
        (response.headers['content-type'] as string | undefined) ||
        'application/octet-stream';
      const blob = new Blob([response.data], { type: contentType });
      const url = URL.createObjectURL(blob);

      const link = window.document.createElement('a');
      link.href = url;
      link.setAttribute('download', fileName);
      window.document.body.appendChild(link);
      link.click();
      window.document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch {
      setActionError('Unable to download this document.');
    } finally {
      setDownloading(false);
    }
  }

  if (!id) {
    return <main>Invalid document ID</main>;
  }

  if (loading) {
    return <main>Loading document...</main>;
  }

  if (error) {
    return <main>{error}</main>;
  }

  if (!doc) {
    return <main>Document not found</main>;
  }

  return (
    <main
      style={{
        textAlign: 'left',
        maxWidth: '800px',
        margin: '0 auto',
        padding: '1rem',
      }}
    >
      <header
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '1.5rem',
        }}
      >
        <h1>Document Details</h1>
        <Link to="/documents">Back to Documents</Link>
      </header>

      <section style={{ marginBottom: '2rem' }}>
        <h2>Document Information</h2>
        <dl
          style={{
            display: 'grid',
            gridTemplateColumns: '150px 1fr',
            gap: '0.5rem 1rem',
          }}
        >
          <dt style={{ fontWeight: 'bold' }}>Title</dt>
          <dd style={{ margin: 0 }}>{doc.title}</dd>

          <dt style={{ fontWeight: 'bold' }}>Description</dt>
          <dd style={{ margin: 0 }}>
            {doc.description || 'No description provided'}
          </dd>
        </dl>
      </section>

      <section style={{ marginBottom: '2rem' }}>
        <h2>File Information</h2>
        <dl
          style={{
            display: 'grid',
            gridTemplateColumns: '150px 1fr',
            gap: '0.5rem 1rem',
          }}
        >
          <dt style={{ fontWeight: 'bold' }}>File Name</dt>
          <dd style={{ margin: 0 }}>{doc.fileName}</dd>

          <dt style={{ fontWeight: 'bold' }}>File Type</dt>
          <dd style={{ margin: 0 }}>{doc.fileType}</dd>

          <dt style={{ fontWeight: 'bold' }}>File Size</dt>
          <dd style={{ margin: 0 }}>{formatFileSize(doc.fileSize)}</dd>

          <dt style={{ fontWeight: 'bold' }}>Created</dt>
          <dd style={{ margin: 0 }}>
            {new Date(doc.createdAt).toLocaleString()}
          </dd>

          <dt style={{ fontWeight: 'bold' }}>Updated</dt>
          <dd style={{ margin: 0 }}>
            {new Date(doc.updatedAt).toLocaleString()}
          </dd>
        </dl>
      </section>

      <section style={{ marginBottom: '2rem' }}>
        <h2>Actions</h2>
        {actionError && (
          <p style={{ color: 'red', marginBottom: '0.5rem' }}>{actionError}</p>
        )}
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          <button
            type="button"
            onClick={() => void handleView()}
            disabled={viewing || downloading}
          >
            {viewing ? 'Opening...' : 'View Document'}
          </button>
          <button
            type="button"
            onClick={() => void handleDownload()}
            disabled={viewing || downloading}
          >
            {downloading ? 'Downloading...' : 'Download'}
          </button>
          <button
            type="button"
            onClick={() => navigate(`/documents/${doc.id}/edit`)}
            disabled={viewing || downloading}
          >
            Edit
          </button>
        </div>
      </section>

      <hr
        style={{
          margin: '2rem 0',
          borderColor: '#ccc',
          borderStyle: 'solid',
          borderWidth: '1px 0 0 0',
        }}
      />

      <section style={{ marginBottom: '2rem' }}>
        <header
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '1rem',
          }}
        >
          <h2>Activity History</h2>

          <select
            value={selectedAction}
            onChange={(e) => {
              setSelectedAction(e.target.value as DocumentAuditAction | '');
              setAuditPage(1);
            }}
            aria-label="Filter activity by action"
            style={{ padding: '0.4rem 0.6rem' }}
          >
            <option value="">All Actions</option>
            <option value="CREATE">Document Created</option>
            <option value="UPDATE">Document Updated</option>
            <option value="FILE_REPLACE">File Replaced</option>
            <option value="VIEW">Document Viewed</option>
            <option value="DOWNLOAD">Document Downloaded</option>
            <option value="DELETE">Document Deleted</option>
            <option value="RESTORE">Document Restored</option>
          </select>
        </header>

        {auditLoading && <p>Loading activity...</p>}

        {auditError && <p style={{ color: 'red' }}>{auditError}</p>}

        {!auditLoading && !auditError && (
          <>
            {auditHistory.length === 0 ? (
              <p>
                {selectedAction
                  ? 'No activity found for this action.'
                  : 'No activity found.'}
              </p>
            ) : (
              <ul
                style={{
                  listStyle: 'none',
                  padding: 0,
                  margin: '0 0 1.5rem 0',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.75rem',
                }}
              >
                {auditHistory.map((item) => {
                  const { label, description } = formatAuditAction(
                    item.action,
                  );
                  return (
                    <li
                      key={item.id}
                      style={{
                        padding: '0.75rem 1rem',
                        border: '1px solid #eee',
                        borderRadius: '4px',
                        background: '#fafafa',
                      }}
                    >
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'baseline',
                        }}
                      >
                        <strong>{label}</strong>
                        <span style={{ fontSize: '0.85rem', color: '#666' }}>
                          {new Date(item.createdAt).toLocaleString()}
                        </span>
                      </div>
                      <p
                        style={{
                          margin: '0.25rem 0 0 0',
                          fontSize: '0.9rem',
                          color: '#444',
                        }}
                      >
                        {description}
                      </p>
                      {renderAuditMetadata(item.metadata)}
                    </li>
                  );
                })}
              </ul>
            )}

            <div
              style={{
                display: 'flex',
                gap: '0.5rem',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <button
                type="button"
                disabled={auditPage === 1 || auditLoading}
                onClick={() => setAuditPage((current) => current - 1)}
              >
                Previous
              </button>

              <span>
                Page {auditPage} of {auditTotalPages}
              </span>

              <button
                type="button"
                disabled={auditPage >= auditTotalPages || auditLoading}
                onClick={() => setAuditPage((current) => current + 1)}
              >
                Next
              </button>
            </div>
          </>
        )}
      </section>
    </main>
  );
}
