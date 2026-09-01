import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';

import {
  getDocumentById,
  getDocumentAuditHistory,
  downloadDocument,
  viewDocument,
  deleteDocument,
  getDocuments,
  updateDocumentStatus,
} from '../features/documents/document.api';
import { getFolderById } from '../features/folders/folder.api';
import { getProjectById } from '../features/projects/project.api';
import {
  createDocumentShare,
  getDocumentShares,
  revokeDocumentShare,
  updateDocumentShare,
} from '../features/document-shares/document-share.api';
import {
  createDocumentRelationship,
  deleteDocumentRelationship,
  getDocumentRelationships,
  getDocumentDependenciesApi,
} from '../features/document-relationships/document-relationship.api';
import {
  createDocumentReference,
  deleteDocumentReference,
  getDocumentReferences,
  updateDocumentReference,
} from '../features/document-references/document-reference.api';
import {
  createDocumentReviewApi,
  getDocumentReviewsApi,
  approveDocumentReviewApi,
  requestChangesDocumentReviewApi,
} from '../features/document-reviews/document-review.api';
import type {
  DocumentRelationship,
  DocumentRelationshipType,
  DocumentDependencySummary,
  DocumentDependencyItem,
} from '../features/document-relationships/document-relationship.types';
import type {
  DocumentReference,
  TechnicalReferenceType,
} from '../features/document-references/document-reference.types';
import type { DocumentReview } from '../features/document-reviews/document-review.types';
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
    case 'RELATIONSHIP_CREATE':
      return { label: 'Relationship Created', description: 'Document relationship was created' };
    case 'RELATIONSHIP_DELETE':
      return { label: 'Relationship Deleted', description: 'Document relationship was deleted' };
    case 'PROJECT_ASSIGN':
      return { label: 'Assigned to Project', description: 'Document was assigned to project' };
    case 'PROJECT_REMOVE':
      return { label: 'Removed from Project', description: 'Document was removed from project' };
    case 'TECHNICAL_REFERENCE_CREATE':
      return { label: 'Technical Reference Created', description: 'External technical reference was created' };
    case 'TECHNICAL_REFERENCE_UPDATE':
      return { label: 'Technical Reference Updated', description: 'External technical reference was updated' };
    case 'TECHNICAL_REFERENCE_DELETE':
      return { label: 'Technical Reference Removed', description: 'External technical reference was removed' };
    case 'REVIEW_REQUEST':
      return { label: 'Review Requested', description: 'Review was requested for document' };
    case 'REVIEW_APPROVED':
      return { label: 'Review Approved', description: 'Document review was approved' };
    case 'REVIEW_CHANGES_REQUESTED':
      return { label: 'Changes Requested', description: 'Changes were requested for document' };
    case 'STATUS_CHANGE':
      return { label: 'Status Changed', description: 'Document lifecycle status was updated' };
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
  const [projectName, setProjectName] = useState('');
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

  // Relationships state
  const [relationships, setRelationships] = useState<DocumentRelationship[]>([]);
  const [availableDocuments, setAvailableDocuments] = useState<Document[]>([]);
  const [selectedTargetId, setSelectedTargetId] = useState('');
  const [selectedRelType, setSelectedRelType] = useState<DocumentRelationshipType>('REFERENCES');
  const [relationshipsLoading, setRelationshipsLoading] = useState(true);
  const [relationshipsError, setRelationshipsError] = useState('');
  const [relationshipSuccess, setRelationshipSuccess] = useState('');
  const [creatingRelationship, setCreatingRelationship] = useState(false);
  const [deletingRelId, setDeletingRelId] = useState<string | null>(null);

  // Dependency & Impact state
  const [dependenciesSummary, setDependenciesSummary] = useState<DocumentDependencySummary | null>(null);
  const [upstreamDeps, setUpstreamDeps] = useState<DocumentDependencyItem[]>([]);
  const [downstreamDeps, setDownstreamDeps] = useState<DocumentDependencyItem[]>([]);
  const [dependenciesLoading, setDependenciesLoading] = useState(true);
  const [dependenciesError, setDependenciesError] = useState('');

  // Technical references state
  const [references, setReferences] = useState<DocumentReference[]>([]);
  const [referencesLoading, setReferencesLoading] = useState(true);
  const [referencesError, setReferencesError] = useState('');
  const [referenceSuccess, setReferenceSuccess] = useState('');
  const [creatingReference, setCreatingReference] = useState(false);
  const [editingRefId, setEditingRefId] = useState<string | null>(null);
  const [deletingRefId, setDeletingRefId] = useState<string | null>(null);

  const [refType, setRefType] = useState<TechnicalReferenceType>('API');
  const [refTitle, setRefTitle] = useState('');
  const [refUrl, setRefUrl] = useState('');

  // Status Override state
  const [selectedStatus, setSelectedStatus] = useState<'DRAFT' | 'STALE' | 'DEPRECATED'>('DRAFT');
  const [statusReason, setStatusReason] = useState('');
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [statusError, setStatusError] = useState('');
  const [statusSuccess, setStatusSuccess] = useState('');

  const handleUpdateStatusSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!id || !canEdit) return;

    setUpdatingStatus(true);
    setStatusError('');
    setStatusSuccess('');

    try {
      const response = await updateDocumentStatus(id, {
        status: selectedStatus,
        reason: statusReason || undefined,
      });
      setDoc(response.data);
      setStatusSuccess(`Document status updated to ${selectedStatus}`);
      setStatusReason('');
      const updatedReviews = await getDocumentReviewsApi(id);
      setReviews(updatedReviews);
      setAuditPage(1);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to update status';
      setStatusError(msg);
    } finally {
      setUpdatingStatus(false);
    }
  };

  // Document review state
  const [reviews, setReviews] = useState<DocumentReview[]>([]);
  const [reviewsLoading, setReviewsLoading] = useState(true);
  const [reviewsError, setReviewsError] = useState('');
  const [reviewSuccess, setReviewSuccess] = useState('');
  const [selectedReviewerId, setSelectedReviewerId] = useState('');
  const [requestComment, setRequestComment] = useState('');
  const [requestingReview, setRequestingReview] = useState(false);
  const [resolveComment, setResolveComment] = useState('');
  const [resolvingReview, setResolvingReview] = useState(false);

  const isOwner =
    Boolean(currentUser && doc && (doc.ownerId === currentUser.id || currentUser.role === 'admin'));

  const userShare = shares.find((s) => s.sharedWithUser.id === currentUser?.id);
  const canEdit = isOwner || userShare?.permission === 'EDIT';

  useEffect(() => {
    if (!id) {
      return;
    }

    const documentId = id;

    async function loadReferences() {
      setReferencesLoading(true);
      setReferencesError('');

      try {
        const response = await getDocumentReferences(documentId);
        setReferences(response.data.references);
      } catch {
        setReferencesError('Failed to load technical references.');
      } finally {
        setReferencesLoading(false);
      }
    }

    void loadReferences();
  }, [id]);

  useEffect(() => {
    if (!id) {
      return;
    }

    const documentId = id;

    async function loadRelationships() {
      setRelationshipsLoading(true);
      setRelationshipsError('');

      try {
        const response = await getDocumentRelationships(documentId);
        setRelationships(response.data.relationships);
      } catch {
        setRelationshipsError('Failed to load related documents.');
      } finally {
        setRelationshipsLoading(false);
      }
    }

    void loadRelationships();
  }, [id]);

  useEffect(() => {
    if (!id) {
      return;
    }

    const documentId = id;
    let ignore = false;

    async function fetchDependencies() {
      setDependenciesLoading(true);
      setDependenciesError('');

      try {
        const response = await getDocumentDependenciesApi(documentId, 3);
        if (!ignore) {
          setDependenciesSummary(response.data.summary);
          setUpstreamDeps(response.data.upstream);
          setDownstreamDeps(response.data.downstream);
        }
      } catch {
        if (!ignore) {
          setDependenciesError('Failed to load dependency information.');
        }
      } finally {
        if (!ignore) {
          setDependenciesLoading(false);
        }
      }
    }

    void fetchDependencies();
    return () => {
      ignore = true;
    };
  }, [id]);

  useEffect(() => {
    if (!id || !canEdit) {
      return;
    }

    async function loadAvailableDocs() {
      try {
        const response = await getDocuments({ limit: 100 });
        setAvailableDocuments(response.data.documents.filter((d) => d.id !== id));
      } catch {
        // Ignore
      }
    }

    void loadAvailableDocs();
  }, [id, canEdit]);

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

        if (response.data.projectId) {
          try {
            const projectRes = await getProjectById(response.data.projectId);
            setProjectName(projectRes.data.project.name);
          } catch {
            setProjectName('Project Context');
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

  async function handleCreateRelationshipSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!id || !selectedTargetId) {
      setRelationshipsError('Please select a target document.');
      return;
    }

    setCreatingRelationship(true);
    setRelationshipsError('');
    setRelationshipSuccess('');

    try {
      const response = await createDocumentRelationship(id, {
        targetDocumentId: selectedTargetId,
        type: selectedRelType,
      });

      setRelationships((prev) => [response.data, ...prev]);
      setRelationshipSuccess('Relationship created successfully');
      setSelectedTargetId('');
    } catch (err: unknown) {
      const errorObj = err as {
        response?: { data?: { error?: { message?: string } } };
      };
      const msg =
        errorObj.response?.data?.error?.message ||
        'Failed to create relationship';
      setRelationshipsError(msg);
    } finally {
      setCreatingRelationship(false);
    }
  }

  async function handleDeleteRelationship(relId: string) {
    if (!id) return;
    setDeletingRelId(relId);
    setRelationshipsError('');
    setRelationshipSuccess('');

    try {
      await deleteDocumentRelationship(id, relId);
      setRelationships((prev) => prev.filter((r) => r.id !== relId));
      setRelationshipSuccess('Relationship removed successfully');
    } catch {
      setRelationshipsError('Failed to remove relationship');
    } finally {
      setDeletingRelId(null);
    }
  }

  async function handleCreateReferenceSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!id) return;

    if (!refTitle.trim()) {
      setReferencesError('Title is required');
      return;
    }

    if (!refUrl.trim()) {
      setReferencesError('URL is required');
      return;
    }

    setCreatingReference(true);
    setReferencesError('');
    setReferenceSuccess('');

    try {
      const response = await createDocumentReference(id, {
        type: refType,
        title: refTitle.trim(),
        url: refUrl.trim(),
      });

      setReferences((prev) => [response.data, ...prev]);
      setRefTitle('');
      setRefUrl('');
      setReferenceSuccess('Technical reference created successfully.');
    } catch (err: unknown) {
      const errorObj = err as {
        response?: { data?: { error?: { message?: string } | string } };
      };
      const msg =
        (typeof errorObj.response?.data?.error === 'string'
          ? errorObj.response.data.error
          : errorObj.response?.data?.error?.message) ||
        'Failed to create technical reference.';
      setReferencesError(msg);
    } finally {
      setCreatingReference(false);
    }
  }

  function handleStartEditReference(ref: DocumentReference) {
    setEditingRefId(ref.id);
    setRefType(ref.type);
    setRefTitle(ref.title);
    setRefUrl(ref.url);
    setReferencesError('');
    setReferenceSuccess('');
  }

  async function handleUpdateReferenceSubmit(
    event: FormEvent<HTMLFormElement>,
    refId: string,
  ) {
    event.preventDefault();
    if (!id) return;

    setReferencesError('');
    setReferenceSuccess('');

    try {
      const response = await updateDocumentReference(id, refId, {
        type: refType,
        title: refTitle.trim(),
        url: refUrl.trim(),
      });

      setReferences((prev) =>
        prev.map((r) => (r.id === refId ? response.data : r)),
      );
      setEditingRefId(null);
      setRefTitle('');
      setRefUrl('');
      setReferenceSuccess('Technical reference updated successfully.');
    } catch (err: unknown) {
      const errorObj = err as {
        response?: { data?: { error?: { message?: string } | string } };
      };
      const msg =
        (typeof errorObj.response?.data?.error === 'string'
          ? errorObj.response.data.error
          : errorObj.response?.data?.error?.message) ||
        'Failed to update technical reference.';
      setReferencesError(msg);
    }
  }

  async function handleDeleteReference(refId: string) {
    if (!id) return;
    setDeletingRefId(refId);
    setReferencesError('');
    setReferenceSuccess('');

    try {
      await deleteDocumentReference(id, refId);
      setReferences((prev) => prev.filter((r) => r.id !== refId));
      setReferenceSuccess('Technical reference removed successfully.');
    } catch (err: unknown) {
      const errorObj = err as {
        response?: { data?: { error?: { message?: string } | string } };
      };
      const msg =
        (typeof errorObj.response?.data?.error === 'string'
          ? errorObj.response.data.error
          : errorObj.response?.data?.error?.message) ||
        'Failed to remove technical reference.';
      setReferencesError(msg);
    } finally {
      setDeletingRefId(null);
    }
  }

  useEffect(() => {
    if (!id) return;
    async function loadReviews() {
      setReviewsLoading(true);
      setReviewsError('');
      try {
        const data = await getDocumentReviewsApi(id!);
        setReviews(data);
      } catch (err) {
        setReviewsError(
          err instanceof Error ? err.message : 'Failed to load reviews',
        );
      } finally {
        setReviewsLoading(false);
      }
    }
    void loadReviews();
  }, [id]);

  const handleRequestReviewSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!id || !selectedReviewerId) return;
    try {
      setRequestingReview(true);
      setReviewsError('');
      setReviewSuccess('');
      await createDocumentReviewApi(id, {
        reviewerId: selectedReviewerId,
        comment: requestComment || undefined,
      });
      setReviewSuccess('Review requested successfully');
      setSelectedReviewerId('');
      setRequestComment('');
      const updated = await getDocumentReviewsApi(id);
      setReviews(updated);
      setAuditPage(1);
    } catch (err) {
      setReviewsError(
        err instanceof Error ? err.message : 'Failed to request review',
      );
    } finally {
      setRequestingReview(false);
    }
  };

  const handleApproveReview = async (reviewId: string) => {
    if (!id) return;
    try {
      setResolvingReview(true);
      setReviewsError('');
      setReviewSuccess('');
      await approveDocumentReviewApi(id, reviewId, {
        comment: resolveComment || undefined,
      });
      setReviewSuccess('Review approved successfully');
      setResolveComment('');
      const updated = await getDocumentReviewsApi(id);
      setReviews(updated);
      setAuditPage(1);
    } catch (err) {
      setReviewsError(
        err instanceof Error ? err.message : 'Failed to approve review',
      );
    } finally {
      setResolvingReview(false);
    }
  };

  const handleRequestChangesReview = async (reviewId: string) => {
    if (!id) return;
    try {
      setResolvingReview(true);
      setReviewsError('');
      setReviewSuccess('');
      await requestChangesDocumentReviewApi(id, reviewId, {
        comment: resolveComment || undefined,
      });
      setReviewSuccess('Requested changes successfully');
      setResolveComment('');
      const updated = await getDocumentReviewsApi(id);
      setReviews(updated);
      setAuditPage(1);
    } catch (err) {
      setReviewsError(
        err instanceof Error ? err.message : 'Failed to request changes',
      );
    } finally {
      setResolvingReview(false);
    }
  };

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
          <dt style={{ fontWeight: 'bold' }}>Status</dt>
          <dd style={{ margin: 0 }}>
            <span
              style={{
                background:
                  doc.status === 'APPROVED'
                    ? '#dcfce7'
                    : doc.status === 'IN_REVIEW'
                      ? '#fef3c7'
                      : doc.status === 'STALE'
                        ? '#ffedd5'
                        : doc.status === 'DEPRECATED'
                          ? '#fee2e2'
                          : '#e2e8f0',
                color:
                  doc.status === 'APPROVED'
                    ? '#166534'
                    : doc.status === 'IN_REVIEW'
                      ? '#92400e'
                      : doc.status === 'STALE'
                        ? '#c2410c'
                        : doc.status === 'DEPRECATED'
                          ? '#991b1b'
                          : '#334155',
                padding: '0.2rem 0.6rem',
                borderRadius: '4px',
                fontSize: '0.85rem',
                fontWeight: 'bold',
              }}
            >
              {doc.status || 'DRAFT'}
            </span>
          </dd>

          <dt style={{ fontWeight: 'bold' }}>Title</dt>
          <dd style={{ margin: 0 }}>{doc.title}</dd>

          <dt style={{ fontWeight: 'bold' }}>Folder</dt>
          <dd style={{ margin: 0 }}>
            {doc.folderId ? folderName || 'Loading...' : 'Unfiled'}
          </dd>

          <dt style={{ fontWeight: 'bold' }}>Project</dt>
          <dd style={{ margin: 0 }}>
            {doc.projectId ? (
              <Link to={`/projects/${doc.projectId}`} style={{ color: '#0066cc', fontWeight: 'bold', textDecoration: 'none' }}>
                📁 {projectName || 'Loading Project...'}
              </Link>
            ) : (
              <span style={{ color: '#888', fontStyle: 'italic' }}>No Project</span>
            )}
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

          <dt style={{ fontWeight: 'bold' }}>Tags</dt>
          <dd style={{ margin: 0 }}>
            {doc.tags && doc.tags.length > 0 ? (
              <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                {doc.tags.map((t) => (
                  <span
                    key={t}
                    style={{
                      background: '#e2e8f0',
                      color: '#2d3748',
                      padding: '0.2rem 0.5rem',
                      borderRadius: '4px',
                      fontSize: '0.85rem',
                    }}
                  >
                    #{t}
                  </span>
                ))}
              </div>
            ) : (
              'No tags'
            )}
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

        {canEdit && (
          <form
            onSubmit={(e) => void handleUpdateStatusSubmit(e)}
            style={{
              marginTop: '1rem',
              padding: '1rem',
              background: '#f8fafc',
              border: '1px solid #cbd5e1',
              borderRadius: '6px',
            }}
          >
            <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1rem', color: '#1e293b' }}>
              Manual Status Override
            </h3>
            {statusError && <p style={{ color: 'red', margin: '0 0 0.5rem 0' }}>{statusError}</p>}
            {statusSuccess && <p style={{ color: 'green', margin: '0 0 0.5rem 0' }}>{statusSuccess}</p>}
            <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value as 'DRAFT' | 'STALE' | 'DEPRECATED')}
                aria-label="Select document status"
                style={{ padding: '0.4rem 0.6rem', borderRadius: '4px' }}
              >
                <option value="DRAFT">DRAFT</option>
                <option value="STALE">STALE</option>
                <option value="DEPRECATED">DEPRECATED</option>
              </select>
              <input
                type="text"
                placeholder="Reason / Comment (optional)"
                value={statusReason}
                onChange={(e) => setStatusReason(e.target.value)}
                maxLength={500}
                style={{ flex: '1 1 200px', padding: '0.4rem 0.6rem', borderRadius: '4px', border: '1px solid #cbd5e1' }}
              />
              <button type="submit" disabled={updatingStatus}>
                {updatingStatus ? 'Updating...' : 'Update Status'}
              </button>
            </div>
          </form>
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

      {/* Dependency & Impact Mapping Section */}
      <section style={{ marginBottom: '2rem' }}>
        <h2>Dependency & Impact Mapping</h2>

        {dependenciesLoading ? (
          <p style={{ color: '#666' }}>Loading dependency information...</p>
        ) : dependenciesError ? (
          <p style={{ color: 'red' }}>{dependenciesError}</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {/* Deterministic Summary Card */}
            <div
              style={{
                padding: '1rem',
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: '6px',
              }}
            >
              <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1.05rem', color: '#1e293b' }}>
                Dependency Overview
              </h3>
              <p style={{ margin: 0, fontSize: '0.95rem', color: '#334155' }}>
                {dependenciesSummary &&
                dependenciesSummary.upstreamCount === 0 &&
                dependenciesSummary.downstreamCount === 0 ? (
                  'No active dependencies found for this document.'
                ) : (
                  `This document depends on ${dependenciesSummary?.upstreamCount || 0} upstream document(s) and has ${dependenciesSummary?.downstreamCount || 0} downstream dependent(s).`
                )}
              </p>
            </div>

            {/* Cycle Warning Banner */}
            {dependenciesSummary?.cycleDetected && (
              <div
                style={{
                  padding: '0.75rem 1rem',
                  background: '#fffbe6',
                  border: '1px solid #ffe58f',
                  borderRadius: '6px',
                  color: '#d48806',
                  fontSize: '0.9rem',
                  fontWeight: 'bold',
                }}
              >
                ⚠️ Informational: Some dependency relationships form a cycle.
              </div>
            )}

            {/* Upstream Stale Warning Banner */}
            {upstreamDeps.some((dep) => dep.status === 'STALE') && (
              <div
                style={{
                  padding: '0.75rem 1rem',
                  background: '#fff7ed',
                  border: '1px solid #ffedd5',
                  borderRadius: '6px',
                  color: '#c2410c',
                  fontSize: '0.9rem',
                  fontWeight: 'bold',
                }}
              >
                ⚠️ Informational Upstream Warning: One or more upstream dependencies are marked as STALE. Reviewing upstream changes is recommended.
              </div>
            )}

            {/* Upstream Deprecated Warning Banner */}
            {upstreamDeps.some((dep) => dep.status === 'DEPRECATED') && (
              <div
                style={{
                  padding: '0.75rem 1rem',
                  background: '#fef2f2',
                  border: '1px solid #fecaca',
                  borderRadius: '6px',
                  color: '#991b1b',
                  fontSize: '0.9rem',
                  fontWeight: 'bold',
                }}
              >
                ⛔ Upstream Deprecation Warning: One or more upstream dependencies are marked as DEPRECATED. Consider updating or replacing dependency references.
              </div>
            )}

            {/* Upstream Dependencies */}
            <div
              style={{
                padding: '1rem',
                border: '1px solid #e2e8f0',
                borderRadius: '6px',
                background: '#ffffff',
              }}
            >
              <h4 style={{ margin: '0 0 0.5rem 0', color: '#1e40af' }}>
                ⬆️ Upstream Dependencies ({upstreamDeps.length})
              </h4>
              <p style={{ margin: '0 0 0.75rem 0', fontSize: '0.85rem', color: '#64748b' }}>
                Documents that this document depends on.
              </p>
              {upstreamDeps.length === 0 ? (
                <p style={{ margin: 0, fontSize: '0.9rem', color: '#94a3b8', fontStyle: 'italic' }}>
                  No upstream dependencies.
                </p>
              ) : (
                <ul
                  style={{
                    listStyle: 'none',
                    padding: 0,
                    margin: 0,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.5rem',
                  }}
                >
                  {upstreamDeps.map((dep) => (
                    <li
                      key={dep.id}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '0.6rem 0.8rem',
                        background: '#f1f5f9',
                        borderRadius: '4px',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                        <span
                          style={{
                            background: '#dbeafe',
                            color: '#1e40af',
                            padding: '0.15rem 0.5rem',
                            borderRadius: '4px',
                            fontSize: '0.75rem',
                            fontWeight: 'bold',
                          }}
                        >
                          Depth {dep.depth}
                        </span>
                        <Link
                          to={`/documents/${dep.id}`}
                          style={{ fontWeight: 'bold', color: '#0284c7', textDecoration: 'none' }}
                        >
                          {dep.title}
                        </Link>
                        {dep.status && (
                          <span
                            style={{
                              padding: '0.15rem 0.5rem',
                              borderRadius: '12px',
                              fontSize: '0.75rem',
                              fontWeight: 'bold',
                              background:
                                dep.status === 'APPROVED'
                                  ? '#dcfce7'
                                  : dep.status === 'IN_REVIEW'
                                    ? '#dbeafe'
                                    : dep.status === 'STALE'
                                      ? '#ffedd5'
                                      : dep.status === 'DEPRECATED'
                                        ? '#fee2e2'
                                        : '#f1f5f9',
                              color:
                                dep.status === 'APPROVED'
                                  ? '#166534'
                                  : dep.status === 'IN_REVIEW'
                                    ? '#1e40af'
                                    : dep.status === 'STALE'
                                      ? '#c2410c'
                                      : dep.status === 'DEPRECATED'
                                        ? '#991b1b'
                                        : '#475569',
                            }}
                          >
                            {dep.status}
                          </span>
                        )}
                        <span style={{ fontSize: '0.8rem', color: '#64748b' }}>
                          ({dep.fileName})
                        </span>
                      </div>
                      <Link
                        to={`/documents/${dep.id}`}
                        style={{ fontSize: '0.8rem', color: '#334155' }}
                      >
                        View
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Downstream Dependents & Impact Zone */}
            <div
              style={{
                padding: '1rem',
                border: '1px solid #fee2e2',
                borderRadius: '6px',
                background: '#fff5f5',
              }}
            >
              <h4 style={{ margin: '0 0 0.5rem 0', color: '#991b1b' }}>
                ⬇️ Downstream Dependents / Impact Zone ({downstreamDeps.length})
              </h4>
              <p style={{ margin: '0 0 0.75rem 0', fontSize: '0.85rem', color: '#7f1d1d' }}>
                Documents that explicitly depend on this document. Changes to this document may require reviewing these dependent documents.
              </p>
              {downstreamDeps.length === 0 ? (
                <p style={{ margin: 0, fontSize: '0.9rem', color: '#94a3b8', fontStyle: 'italic' }}>
                  No downstream dependents.
                </p>
              ) : (
                <ul
                  style={{
                    listStyle: 'none',
                    padding: 0,
                    margin: 0,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.5rem',
                  }}
                >
                  {downstreamDeps.map((dep) => (
                    <li
                      key={dep.id}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '0.6rem 0.8rem',
                        background: '#ffffff',
                        border: '1px solid #fca5a5',
                        borderRadius: '4px',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span
                          style={{
                            background: '#fee2e2',
                            color: '#991b1b',
                            padding: '0.15rem 0.5rem',
                            borderRadius: '4px',
                            fontSize: '0.75rem',
                            fontWeight: 'bold',
                          }}
                        >
                          Depth {dep.depth}
                        </span>
                        <Link
                          to={`/documents/${dep.id}`}
                          style={{ fontWeight: 'bold', color: '#b91c1c', textDecoration: 'none' }}
                        >
                          {dep.title}
                        </Link>
                        <span style={{ fontSize: '0.8rem', color: '#64748b' }}>
                          ({dep.fileName})
                        </span>
                      </div>
                      <Link
                        to={`/documents/${dep.id}`}
                        style={{ fontSize: '0.8rem', color: '#991b1b' }}
                      >
                        View
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        )}
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
        <h2>Related Documents</h2>

        {canEdit && (
          <form
            onSubmit={(e) => void handleCreateRelationshipSubmit(e)}
            style={{
              display: 'flex',
              gap: '0.75rem',
              alignItems: 'center',
              marginBottom: '1rem',
              flexWrap: 'wrap',
            }}
          >
            <select
              value={selectedTargetId}
              onChange={(e) => setSelectedTargetId(e.target.value)}
              required
              aria-label="Select target document"
              style={{ flex: 1, minWidth: '220px', padding: '0.5rem' }}
            >
              <option value="">Select a document to relate...</option>
              {availableDocuments.map((docItem) => (
                <option key={docItem.id} value={docItem.id}>
                  {docItem.title} ({docItem.fileName})
                </option>
              ))}
            </select>

            <select
              value={selectedRelType}
              onChange={(e) =>
                setSelectedRelType(e.target.value as DocumentRelationshipType)
              }
              aria-label="Select relationship type"
              style={{ padding: '0.5rem' }}
            >
              <option value="REFERENCES">REFERENCES</option>
              <option value="DEPENDS_ON">DEPENDS_ON</option>
              <option value="REPLACES">REPLACES</option>
              <option value="RELATED">RELATED</option>
            </select>

            <button type="submit" disabled={creatingRelationship}>
              {creatingRelationship ? 'Adding...' : 'Add Relationship'}
            </button>
          </form>
        )}

        {relationshipsError && (
          <p style={{ color: 'red', marginBottom: '0.5rem' }}>
            {relationshipsError}
          </p>
        )}

        {relationshipSuccess && (
          <p style={{ color: 'green', marginBottom: '0.5rem' }}>
            {relationshipSuccess}
          </p>
        )}

        {relationshipsLoading ? (
          <p>Loading related documents...</p>
        ) : relationships.length === 0 ? (
          <p style={{ color: '#666' }}>No related documents.</p>
        ) : (
          <ul
            style={{
              listStyle: 'none',
              padding: 0,
              margin: 0,
              display: 'flex',
              flexDirection: 'column',
              gap: '0.75rem',
            }}
          >
            {relationships.map((rel) => (
              <li
                key={rel.id}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '0.75rem 1rem',
                  border: '1px solid #e2e8f0',
                  borderRadius: '4px',
                  background: '#f8fafc',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem',
                    flexWrap: 'wrap',
                  }}
                >
                  <span
                    style={{
                      background:
                        rel.type === 'DEPENDS_ON'
                          ? '#fef3c7'
                          : rel.type === 'REPLACES'
                            ? '#fee2e2'
                            : rel.type === 'REFERENCES'
                              ? '#dbeafe'
                              : '#e2e8f0',
                      color:
                        rel.type === 'DEPENDS_ON'
                          ? '#92400e'
                          : rel.type === 'REPLACES'
                            ? '#991b1b'
                            : rel.type === 'REFERENCES'
                              ? '#1e40af'
                              : '#334155',
                      padding: '0.2rem 0.6rem',
                      borderRadius: '4px',
                      fontSize: '0.8rem',
                      fontWeight: 'bold',
                    }}
                  >
                    {rel.direction === 'OUTGOING'
                      ? `${rel.type} →`
                      : `← ${rel.type}`}
                  </span>
                  <Link
                    to={`/documents/${rel.relatedDocument.id}`}
                    style={{
                      fontWeight: 'bold',
                      textDecoration: 'none',
                      color: '#0056b3',
                    }}
                  >
                    {rel.relatedDocument.title}
                  </Link>
                  <span style={{ fontSize: '0.85rem', color: '#64748b' }}>
                    ({rel.relatedDocument.fileName})
                  </span>
                </div>
                <div
                  style={{
                    display: 'flex',
                    gap: '0.5rem',
                    alignItems: 'center',
                  }}
                >
                  <Link
                    to={`/documents/${rel.relatedDocument.id}`}
                    style={{
                      fontSize: '0.85rem',
                      padding: '0.25rem 0.6rem',
                      border: '1px solid #cbd5e1',
                      borderRadius: '4px',
                      textDecoration: 'none',
                      color: '#334155',
                    }}
                  >
                    View
                  </Link>
                  {canEdit && (
                    <button
                      type="button"
                      onClick={() => void handleDeleteRelationship(rel.id)}
                      disabled={deletingRelId === rel.id}
                      style={{
                        fontSize: '0.85rem',
                        color: '#dc2626',
                        background: 'transparent',
                        border: '1px solid #fca5a5',
                        borderRadius: '4px',
                        padding: '0.25rem 0.6rem',
                        cursor: 'pointer',
                      }}
                    >
                      {deletingRelId === rel.id ? 'Removing...' : 'Remove'}
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <hr
        style={{
          margin: '2rem 0',
          borderColor: '#ccc',
          borderStyle: 'solid',
          borderWidth: '1px 0 0 0',
        }}
      />

      {/* External Technical References Section */}
      <section style={{ marginBottom: '2rem' }}>
        <h2>External Technical References</h2>

        {canEdit && (
          <form
            onSubmit={(e) => void handleCreateReferenceSubmit(e)}
            style={{
              display: 'flex',
              gap: '0.75rem',
              alignItems: 'center',
              marginBottom: '1rem',
              flexWrap: 'wrap',
              background: '#f8fafc',
              padding: '1rem',
              borderRadius: '6px',
              border: '1px solid #e2e8f0',
            }}
          >
            <select
              value={refType}
              onChange={(e) => setRefType(e.target.value as TechnicalReferenceType)}
              aria-label="Select reference type"
              style={{ padding: '0.5rem' }}
            >
              <option value="API">API</option>
              <option value="REPOSITORY">REPOSITORY</option>
              <option value="SPECIFICATION">SPECIFICATION</option>
              <option value="ISSUE">ISSUE</option>
              <option value="OTHER">OTHER</option>
            </select>

            <input
              type="text"
              placeholder="Title / Label (e.g. OpenAPI Spec)"
              value={refTitle}
              onChange={(e) => setRefTitle(e.target.value)}
              required
              minLength={2}
              maxLength={150}
              style={{ flex: '1 1 180px', padding: '0.5rem' }}
            />

            <input
              type="url"
              placeholder="External URL (e.g. https://api.example.com)"
              value={refUrl}
              onChange={(e) => setRefUrl(e.target.value)}
              required
              maxLength={2000}
              style={{ flex: '2 1 250px', padding: '0.5rem' }}
            />

            <button type="submit" disabled={creatingReference}>
              {creatingReference ? 'Adding...' : 'Add Reference'}
            </button>
          </form>
        )}

        {referencesError && (
          <p style={{ color: 'red', marginBottom: '0.5rem' }}>{referencesError}</p>
        )}

        {referenceSuccess && (
          <p style={{ color: 'green', marginBottom: '0.5rem' }}>{referenceSuccess}</p>
        )}

        {referencesLoading ? (
          <p>Loading technical references...</p>
        ) : references.length === 0 ? (
          <p style={{ color: '#666' }}>No external technical references added.</p>
        ) : (
          <ul
            style={{
              listStyle: 'none',
              padding: 0,
              margin: 0,
              display: 'flex',
              flexDirection: 'column',
              gap: '0.75rem',
            }}
          >
            {references.map((ref) => (
              <li
                key={ref.id}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '0.75rem 1rem',
                  border: '1px solid #e2e8f0',
                  borderRadius: '4px',
                  background: '#ffffff',
                }}
              >
                {editingRefId === ref.id ? (
                  <form
                    onSubmit={(e) => void handleUpdateReferenceSubmit(e, ref.id)}
                    style={{
                      display: 'flex',
                      gap: '0.5rem',
                      alignItems: 'center',
                      flexWrap: 'wrap',
                      width: '100%',
                    }}
                  >
                    <select
                      value={refType}
                      onChange={(e) =>
                        setRefType(e.target.value as TechnicalReferenceType)
                      }
                      style={{ padding: '0.4rem' }}
                    >
                      <option value="API">API</option>
                      <option value="REPOSITORY">REPOSITORY</option>
                      <option value="SPECIFICATION">SPECIFICATION</option>
                      <option value="ISSUE">ISSUE</option>
                      <option value="OTHER">OTHER</option>
                    </select>

                    <input
                      type="text"
                      value={refTitle}
                      onChange={(e) => setRefTitle(e.target.value)}
                      required
                      style={{ flex: '1 1 150px', padding: '0.4rem' }}
                    />

                    <input
                      type="url"
                      value={refUrl}
                      onChange={(e) => setRefUrl(e.target.value)}
                      required
                      style={{ flex: '2 1 200px', padding: '0.4rem' }}
                    />

                    <button type="submit">Save</button>
                    <button
                      type="button"
                      onClick={() => {
                        setEditingRefId(null);
                        setRefTitle('');
                        setRefUrl('');
                      }}
                    >
                      Cancel
                    </button>
                  </form>
                ) : (
                  <>
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.75rem',
                        flexWrap: 'wrap',
                      }}
                    >
                      <span
                        style={{
                          background:
                            ref.type === 'API'
                              ? '#dbeafe'
                              : ref.type === 'REPOSITORY'
                                ? '#fef3c7'
                                : ref.type === 'SPECIFICATION'
                                  ? '#dcfce7'
                                  : ref.type === 'ISSUE'
                                    ? '#fee2e2'
                                    : '#f1f5f9',
                          color:
                            ref.type === 'API'
                              ? '#1e40af'
                              : ref.type === 'REPOSITORY'
                                ? '#92400e'
                                : ref.type === 'SPECIFICATION'
                                  ? '#166534'
                                  : ref.type === 'ISSUE'
                                    ? '#991b1b'
                                    : '#475569',
                          padding: '0.2rem 0.6rem',
                          borderRadius: '4px',
                          fontSize: '0.8rem',
                          fontWeight: 'bold',
                        }}
                      >
                        {ref.type}
                      </span>
                      <strong>{ref.title}</strong>
                      <a
                        href={ref.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          color: '#0284c7',
                          textDecoration: 'none',
                          fontSize: '0.9rem',
                          wordBreak: 'break-all',
                        }}
                      >
                        {ref.url} ↗
                      </a>
                    </div>

                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                      <a
                        href={ref.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          fontSize: '0.85rem',
                          padding: '0.25rem 0.6rem',
                          border: '1px solid #0284c7',
                          borderRadius: '4px',
                          textDecoration: 'none',
                          color: '#0284c7',
                          background: '#f0f9ff',
                        }}
                      >
                        Open ↗
                      </a>
                      {canEdit && (
                        <>
                          <button
                            type="button"
                            onClick={() => handleStartEditReference(ref)}
                            style={{
                              fontSize: '0.85rem',
                              padding: '0.25rem 0.6rem',
                              borderRadius: '4px',
                            }}
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => void handleDeleteReference(ref.id)}
                            disabled={deletingRefId === ref.id}
                            style={{
                              fontSize: '0.85rem',
                              color: '#dc2626',
                              background: 'transparent',
                              border: '1px solid #fca5a5',
                              borderRadius: '4px',
                              padding: '0.25rem 0.6rem',
                              cursor: 'pointer',
                            }}
                          >
                            {deletingRefId === ref.id ? 'Removing...' : 'Remove'}
                          </button>
                        </>
                      )}
                    </div>
                  </>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      <hr
        style={{
          margin: '2rem 0',
          borderColor: '#ccc',
          borderStyle: 'solid',
          borderWidth: '1px 0 0 0',
        }}
      />

      {/* Document Review Workflow Section */}
      <section style={{ marginBottom: '2rem' }}>
        <h2>Document Review Workflow</h2>

        {canEdit && !reviews.some((r) => r.status === 'PENDING') && (
          <form
            onSubmit={(e) => void handleRequestReviewSubmit(e)}
            style={{
              display: 'flex',
              gap: '0.75rem',
              alignItems: 'center',
              marginBottom: '1.5rem',
              flexWrap: 'wrap',
              background: '#f8fafc',
              padding: '1rem',
              borderRadius: '6px',
              border: '1px solid #e2e8f0',
            }}
          >
            <label style={{ fontWeight: 'bold' }}>Assign Reviewer:</label>
            <select
              value={selectedReviewerId}
              onChange={(e) => setSelectedReviewerId(e.target.value)}
              required
              aria-label="Select reviewer"
              style={{ padding: '0.5rem', minWidth: '220px' }}
            >
              <option value="">Select a user with READ access...</option>
              {shares.map((share) => (
                <option key={share.id} value={share.sharedWithUser.id}>
                  {share.sharedWithUser.name} ({share.sharedWithUser.email}) - [{share.permission}]
                </option>
              ))}
            </select>

            <input
              type="text"
              placeholder="Optional review notes / context..."
              value={requestComment}
              onChange={(e) => setRequestComment(e.target.value)}
              maxLength={1000}
              style={{ flex: '1 1 200px', padding: '0.5rem' }}
            />

            <button type="submit" disabled={requestingReview}>
              {requestingReview ? 'Requesting...' : 'Request Review'}
            </button>
          </form>
        )}

        {reviewsError && (
          <p style={{ color: 'red', marginBottom: '0.5rem' }}>{reviewsError}</p>
        )}

        {reviewSuccess && (
          <p style={{ color: 'green', marginBottom: '0.5rem' }}>{reviewSuccess}</p>
        )}

        {reviewsLoading ? (
          <p>Loading review history...</p>
        ) : reviews.length === 0 ? (
          <p style={{ color: '#666' }}>No review requested yet for this document.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {reviews.map((rev) => {
              const isAssignedReviewer =
                currentUser &&
                (currentUser.id === rev.reviewerId || currentUser.role === 'admin');
              const isPending = rev.status === 'PENDING';

              return (
                <div
                  key={rev.id}
                  style={{
                    padding: '1rem',
                    border: '1px solid #cbd5e1',
                    borderRadius: '6px',
                    background: isPending ? '#fefce8' : '#ffffff',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginBottom: '0.5rem',
                    }}
                  >
                    <div>
                      <span
                        style={{
                          background:
                            rev.status === 'APPROVED'
                              ? '#dcfce7'
                              : rev.status === 'CHANGES_REQUESTED'
                                ? '#fee2e2'
                                : '#fef3c7',
                          color:
                            rev.status === 'APPROVED'
                              ? '#166534'
                              : rev.status === 'CHANGES_REQUESTED'
                                ? '#991b1b'
                                : '#92400e',
                          padding: '0.2rem 0.6rem',
                          borderRadius: '4px',
                          fontSize: '0.8rem',
                          fontWeight: 'bold',
                        }}
                      >
                        {rev.status}
                      </span>
                    </div>
                    <span style={{ fontSize: '0.85rem', color: '#64748b' }}>
                      Requested {new Date(rev.createdAt).toLocaleString()}
                    </span>
                  </div>

                  <div style={{ fontSize: '0.9rem', marginBottom: '0.4rem' }}>
                    <strong>Requester:</strong> {rev.requester?.name || 'Unknown'} |{' '}
                    <strong>Assigned Reviewer:</strong> {rev.reviewer?.name || 'Unknown'}
                  </div>

                  {rev.comment && (
                    <div
                      style={{
                        background: '#f8fafc',
                        padding: '0.5rem 0.75rem',
                        borderRadius: '4px',
                        fontSize: '0.9rem',
                        fontStyle: 'italic',
                        marginBottom: '0.5rem',
                      }}
                    >
                      &quot;{rev.comment}&quot;
                    </div>
                  )}

                  {isPending && isAssignedReviewer && (
                    <div
                      style={{
                        marginTop: '0.75rem',
                        paddingTop: '0.75rem',
                        borderTop: '1px solid #e2e8f0',
                        display: 'flex',
                        gap: '0.5rem',
                        alignItems: 'center',
                        flexWrap: 'wrap',
                      }}
                    >
                      <input
                        type="text"
                        placeholder="Optional resolution comment..."
                        value={resolveComment}
                        onChange={(e) => setResolveComment(e.target.value)}
                        style={{ flex: '1 1 200px', padding: '0.4rem' }}
                      />
                      <button
                        type="button"
                        onClick={() => void handleApproveReview(rev.id)}
                        disabled={resolvingReview}
                        style={{
                          background: '#16a34a',
                          color: 'white',
                          border: 'none',
                          padding: '0.4rem 0.8rem',
                          borderRadius: '4px',
                          cursor: 'pointer',
                        }}
                      >
                        Approve
                      </button>
                      <button
                        type="button"
                        onClick={() => void handleRequestChangesReview(rev.id)}
                        disabled={resolvingReview}
                        style={{
                          background: '#dc2626',
                          color: 'white',
                          border: 'none',
                          padding: '0.4rem 0.8rem',
                          borderRadius: '4px',
                          cursor: 'pointer',
                        }}
                      >
                        Request Changes
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
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
            <option value="TECHNICAL_REFERENCE_CREATE">Reference Created</option>
            <option value="TECHNICAL_REFERENCE_UPDATE">Reference Updated</option>
            <option value="TECHNICAL_REFERENCE_DELETE">Reference Removed</option>
            <option value="REVIEW_REQUEST">Review Requested</option>
            <option value="REVIEW_APPROVED">Review Approved</option>
            <option value="REVIEW_CHANGES_REQUESTED">Changes Requested</option>
            <option value="STATUS_CHANGE">Status Changed</option>
            <option value="VIEW">Document Viewed</option>
            <option value="DOWNLOAD">Document Downloaded</option>
            <option value="DELETE">Document Deleted</option>
            <option value="RESTORE">Document Restored</option>
            <option value="RELATIONSHIP_CREATE">Relationship Created</option>
            <option value="RELATIONSHIP_DELETE">Relationship Deleted</option>
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
