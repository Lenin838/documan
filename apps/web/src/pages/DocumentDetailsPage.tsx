import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';

import {
  getDocumentById,
  getDocumentAuditHistory,
  downloadDocument,
  viewDocument,
  deleteDocument,
} from '../features/documents/document.api';
import { getFolderById } from '../features/folders/folder.api';
import {
  createDocumentShare,
  getDocumentShares,
  revokeDocumentShare,
  updateDocumentShare,
} from '../features/document-shares/document-share.api';
import type {
  DocumentShare,
  SharePermission,
} from '../features/document-shares/document-share.types';
import type {
  Document,
  DocumentAudit,
  DocumentAuditAction,
} from '../features/documents/document.types';
import { useAuthStore } from '../features/auth/auth.store';

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
  const currentUser = useAuthStore((state) => state.user);

  const [doc, setDoc] = useState<Document | null>(null);
  const [folderName, setFolderName] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [viewing, setViewing] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [actionError, setActionError] = useState('');

  const [auditHistory, setAuditHistory] = useState<DocumentAudit[]>([]);
  const [auditPage, setAuditPage] = useState(1);
  const [auditTotalPages, setAuditTotalPages] = useState(1);
  const [selectedAction, setSelectedAction] = useState<
    DocumentAuditAction | ''
  >('');
  const [auditLoading, setAuditLoading] = useState(true);
  const [auditError, setAuditError] = useState('');

  // Sharing state
  const [shares, setShares] = useState<DocumentShare[]>([]);
  const [shareEmail, setShareEmail] = useState('');
  const [sharePermission, setSharePermission] = useState<SharePermission>('READ');
  const [sharingError, setSharingError] = useState('');
  const [sharingSuccess, setSharingSuccess] = useState('');
  const [creatingShare, setCreatingShare] = useState(false);

  const isOwner =
    Boolean(currentUser && doc && (doc.ownerId === currentUser.id || currentUser.role === 'admin'));

  const userShare = shares.find((s) => s.sharedWithUser.id === currentUser?.id);
  const canEdit = isOwner || userShare?.permission === 'EDIT';

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

        if (response.data.folderId) {
          try {
            const folderRes = await getFolderById(response.data.folderId);
            setFolderName(folderRes.data.name);
          } catch {
            setFolderName('Unknown Folder');
          }
        }
      } catch {
        setError('Failed to load document');
      } finally {
        setLoading(false);
      }
    }

    void loadDocument();
  }, [id]);

  useEffect(() => {
    if (!id || !isOwner) {
      return;
    }

    const documentId = id;

    async function loadShares() {
      try {
        const response = await getDocumentShares(documentId);
        setShares(response.data.shares);
      } catch {
        // Ignore share load errors for non-owners
      }
    }

    void loadShares();
  }, [id, isOwner]);

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
    if (!id || viewing || downloading || deleting) {
      return;
    }

    setViewing(true);
    setActionError('');

    try {
      const response = await viewDocument(id);
      const url = URL.createObjectURL(response.data);
      window.open(url, '_blank');
    } catch {
      setActionError('Unable to view document.');
    } finally {
      setViewing(false);
    }
  }

  async function handleDownload() {
    if (!id || viewing || downloading || deleting) {
      return;
    }

    setDownloading(true);
    setActionError('');

    try {
      const response = await downloadDocument(id);
      const url = URL.createObjectURL(response.data);
      const link = document.createElement('a');
      link.href = url;
      link.download = doc?.fileName || 'download';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch {
      setActionError('Unable to download this document.');
    } finally {
      setDownloading(false);
    }
  }

  async function handleDeleteConfirm() {
    if (!id || deleting || viewing || downloading) {
      return;
    }

    setDeleting(true);
    setActionError('');

    try {
      await deleteDocument(id);
      navigate('/documents');
    } catch {
      setActionError('Unable to delete this document.');
    } finally {
      setDeleting(false);
      setShowDeleteConfirm(false);
    }
  }

  async function handleCreateShareSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!id) return;

    const trimmedEmail = shareEmail.trim();
    if (!trimmedEmail) {
      setSharingError('Email is required');
      return;
    }

    setCreatingShare(true);
    setSharingError('');
    setSharingSuccess('');

    try {
      const response = await createDocumentShare(id, {
        email: trimmedEmail,
        permission: sharePermission,
      });

      setShares((prev) => {
        const filtered = prev.filter((s) => s.id !== response.data.id);
        return [response.data, ...filtered];
      });

      setShareEmail('');
      setSharingSuccess(`Shared with ${response.data.sharedWithUser.email} (${response.data.permission})`);
    } catch (err: unknown) {
      let msg = 'Failed to share document';
      if (
        err &&
        typeof err === 'object' &&
        'response' in err &&
        err.response &&
        typeof err.response === 'object' &&
        'data' in err.response &&
        err.response.data &&
        typeof err.response.data === 'object' &&
        'error' in err.response.data &&
        typeof err.response.data.error === 'string'
      ) {
        msg = err.response.data.error;
      }
      setSharingError(msg);
    } finally {
      setCreatingShare(false);
    }
  }

  async function handleUpdateShare(shareId: string, permission: SharePermission) {
    if (!id) return;
    setSharingError('');
    setSharingSuccess('');

    try {
      const response = await updateDocumentShare(id, shareId, { permission });
      setShares((prev) =>
        prev.map((s) => (s.id === shareId ? response.data : s)),
      );
      setSharingSuccess(`Updated permission to ${permission}`);
    } catch {
      setSharingError('Failed to update share permission');
    }
  }

  async function handleRevokeShare(shareId: string) {
    if (!id) return;
    setSharingError('');
    setSharingSuccess('');

    try {
      await revokeDocumentShare(id, shareId);
      setShares((prev) => prev.filter((s) => s.id !== shareId));
      setSharingSuccess('Revoked share access');
    } catch {
      setSharingError('Failed to revoke share access');
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

          <dt style={{ fontWeight: 'bold' }}>Folder</dt>
          <dd style={{ margin: 0 }}>
            {doc.folderId ? folderName || 'Loading...' : 'Unfiled'}
          </dd>

          <dt style={{ fontWeight: 'bold' }}>Access Role</dt>
          <dd style={{ margin: 0 }}>
            {isOwner ? (
              <span style={{ color: '#0056b3', fontWeight: 'bold' }}>Owner</span>
            ) : userShare ? (
              <span>Shared — {userShare.permission === 'EDIT' ? 'Edit Access' : 'Read Access'}</span>
            ) : (
              <span>Shared</span>
            )}
          </dd>

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
        {showDeleteConfirm ? (
          <div
            style={{
              padding: '1rem',
              border: '1px solid #e53e3e',
              borderRadius: '4px',
              background: '#fff5f5',
            }}
          >
            <h3 style={{ margin: '0 0 0.5rem 0', color: '#c53030' }}>
              Delete Document?
            </h3>
            <p style={{ margin: '0 0 1rem 0' }}>
              Are you sure you want to delete &quot;{doc.title}&quot;? The
              document will be moved to Trash and can be restored later.
            </p>
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button
                type="button"
                onClick={() => void handleDeleteConfirm()}
                disabled={deleting}
                style={{
                  background: '#e53e3e',
                  color: 'white',
                  border: 'none',
                  padding: '0.5rem 1rem',
                  borderRadius: '4px',
                }}
              >
                {deleting ? 'Deleting...' : 'Confirm Delete'}
              </button>
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(false)}
                disabled={deleting}
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
            <button
              type="button"
              onClick={() => void handleView()}
              disabled={viewing || downloading || deleting}
            >
              {viewing ? 'Opening...' : 'View Document'}
            </button>
            <button
              type="button"
              onClick={() => void handleDownload()}
              disabled={viewing || downloading || deleting}
            >
              {downloading ? 'Downloading...' : 'Download'}
            </button>
            {canEdit && (
              <button
                type="button"
                onClick={() => navigate(`/documents/${doc.id}/edit`)}
                disabled={viewing || downloading || deleting}
              >
                Edit
              </button>
            )}
            {isOwner && (
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(true)}
                disabled={viewing || downloading || deleting}
              >
                Delete
              </button>
            )}
          </div>
        )}
      </section>

      {/* Share Document Section (Only visible to Owner or Admin) */}
      {isOwner && (
        <>
          <hr
            style={{
              margin: '2rem 0',
              borderColor: '#ccc',
              borderStyle: 'solid',
              borderWidth: '1px 0 0 0',
            }}
          />

          <section style={{ marginBottom: '2rem' }}>
            <h2>Share Document</h2>

            <form
              onSubmit={(e) => void handleCreateShareSubmit(e)}
              style={{
                display: 'flex',
                gap: '0.75rem',
                alignItems: 'center',
                marginBottom: '1rem',
                flexWrap: 'wrap',
              }}
            >
              <input
                type="email"
                placeholder="Enter user email address"
                value={shareEmail}
                onChange={(e) => setShareEmail(e.target.value)}
                required
                style={{ flex: 1, minWidth: '220px', padding: '0.5rem' }}
              />

              <select
                value={sharePermission}
                onChange={(e) => setSharePermission(e.target.value as SharePermission)}
                style={{ padding: '0.5rem' }}
              >
                <option value="READ">Read Access</option>
                <option value="EDIT">Edit Access</option>
              </select>

              <button type="submit" disabled={creatingShare}>
                {creatingShare ? 'Sharing...' : 'Share'}
              </button>
            </form>

            {sharingError && (
              <p style={{ color: 'red', margin: '0 0 1rem 0' }}>{sharingError}</p>
            )}

            {sharingSuccess && (
              <p style={{ color: 'green', margin: '0 0 1rem 0' }}>{sharingSuccess}</p>
            )}

            <h3>Shared Access ({shares.length})</h3>

            {shares.length === 0 ? (
              <p style={{ color: '#666' }}>This document has not been shared with any users.</p>
            ) : (
              <table>
                <thead>
                  <tr>
                    <th>User</th>
                    <th>Email</th>
                    <th>Permission</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {shares.map((share) => (
                    <tr key={share.id}>
                      <td>{share.sharedWithUser.name}</td>
                      <td>{share.sharedWithUser.email}</td>
                      <td>
                        <select
                          value={share.permission}
                          onChange={(e) =>
                            void handleUpdateShare(
                              share.id,
                              e.target.value as SharePermission,
                            )
                          }
                          style={{ padding: '0.25rem 0.5rem' }}
                        >
                          <option value="READ">Read</option>
                          <option value="EDIT">Edit</option>
                        </select>
                      </td>
                      <td>
                        <button
                          type="button"
                          onClick={() => void handleRevokeShare(share.id)}
                          style={{ color: 'red' }}
                        >
                          Revoke Access
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>
        </>
      )}

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
