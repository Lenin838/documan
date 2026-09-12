import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';

import {
  getDocumentById,
  getDocumentAuditHistory,
  downloadDocument,
  viewDocument,
  deleteDocument,
  getDocuments,
} from '../features/documents/document.api';
import { getFolderById } from '../features/folders/folder.api';
import { getProjectById } from '../features/projects/project.api';
import { getDocumentShares } from '../features/document-shares/document-share.api';
import {
  getDocumentRelationships,
  getDocumentDependenciesApi,
} from '../features/document-relationships/document-relationship.api';
import { getDocumentReferences } from '../features/document-references/document-reference.api';
import { getDocumentReviewsApi } from '../features/document-reviews/document-review.api';

import { VersionHistorySection } from '../components/VersionHistorySection';
import { KnowledgeHealthDrawer } from '../components/KnowledgeHealthDrawer';
import { DocumentCrossProjectImpactSection } from '../features/documents/DocumentCrossProjectImpactSection';
import { ProposeChangeDrawer } from '../features/change-proposals/components/ProposeChangeDrawer';
import { fetchDocumentHealth } from '../features/documents/health.api';
import type { KnowledgeHealthData } from '../features/documents/health.types';
import type {
  DocumentRelationship,
  DocumentDependencySummary,
  DocumentDependencyItem,
} from '../features/document-relationships/document-relationship.types';
import type { DocumentReference } from '../features/document-references/document-reference.types';
import type { DocumentReview } from '../features/document-reviews/document-review.types';
import type { DocumentShare } from '../features/document-shares/document-share.types';
import type {
  Document,
  DocumentAudit,
  DocumentAuditAction,
} from '../features/documents/document.types';
import { useAuthStore } from '../features/auth/auth.store';
import { DocumentApiEndpointsSection } from '../components/DocumentApiEndpointsSection';
import { EvidencePanel } from '../components/EvidencePanel';
import { AssuranceGateCard } from '../components/AssuranceGateCard';
import { VerificationPlanSection } from '../components/VerificationPlanSection';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { Button } from '../components/ui/Button';

// Extracted Subcomponents
import { DocumentHeaderSection } from '../features/documents/components/DocumentHeaderSection';
import { DocumentSharesSection } from '../features/documents/components/DocumentSharesSection';
import { DocumentRelationshipsSection } from '../features/documents/components/DocumentRelationshipsSection';
import { DocumentReferencesSection } from '../features/documents/components/DocumentReferencesSection';
import { DocumentReviewsSection } from '../features/documents/components/DocumentReviewsSection';
import { DocumentAuditHistorySection } from '../features/documents/components/DocumentAuditHistorySection';

export default function DocumentDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const currentUser = useAuthStore((state) => state.user);

  const [doc, setDoc] = useState<Document | null>(null);
  const [healthData, setHealthData] = useState<KnowledgeHealthData | null>(null);
  const [isHealthDrawerOpen, setIsHealthDrawerOpen] = useState(false);
  const [folderName, setFolderName] = useState('');
  const [projectName, setProjectName] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [viewing, setViewing] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [actionError, setActionError] = useState('');

  const [auditHistory, setAuditHistory] = useState<DocumentAudit[]>([]);
  const [auditPage, setAuditPage] = useState(1);
  const [auditTotalPages, setAuditTotalPages] = useState(1);
  const [selectedAction, setSelectedAction] = useState<DocumentAuditAction | ''>('');
  const [auditLoading, setAuditLoading] = useState(true);
  const [auditError, setAuditError] = useState('');

  // Sharing state
  const [shares, setShares] = useState<DocumentShare[]>([]);

  // Propose change drawer state
  const [isProposeDrawerOpen, setIsProposeDrawerOpen] = useState(false);

  // Relationships state
  const [relationships, setRelationships] = useState<DocumentRelationship[]>([]);
  const [availableDocuments, setAvailableDocuments] = useState<Document[]>([]);
  const [relationshipsLoading, setRelationshipsLoading] = useState(true);

  // Dependency & Impact state
  const [dependenciesSummary, setDependenciesSummary] = useState<DocumentDependencySummary | null>(null);
  const [upstreamDeps, setUpstreamDeps] = useState<DocumentDependencyItem[]>([]);
  const [downstreamDeps, setDownstreamDeps] = useState<DocumentDependencyItem[]>([]);

  // Technical references state
  const [references, setReferences] = useState<DocumentReference[]>([]);
  const [referencesLoading, setReferencesLoading] = useState(true);

  // Document review state
  const [reviews, setReviews] = useState<DocumentReview[]>([]);
  const [reviewsLoading, setReviewsLoading] = useState(true);

  const isOwner = Boolean(currentUser && doc && (doc.ownerId === currentUser.id || currentUser.role === 'admin'));
  const userShare = shares.find((s) => s.sharedWithUser.id === currentUser?.id);
  const canEdit = isOwner || userShare?.permission === 'EDIT';

  // Load Technical References
  useEffect(() => {
    if (!id) return;
    async function loadReferences() {
      setReferencesLoading(true);
      try {
        const response = await getDocumentReferences(id!);
        setReferences(response.data.references);
      } catch {
        // Handled silently
      } finally {
        setReferencesLoading(false);
      }
    }
    void loadReferences();
  }, [id]);

  // Load Relationships
  useEffect(() => {
    if (!id) return;
    async function loadRelationships() {
      setRelationshipsLoading(true);
      try {
        const response = await getDocumentRelationships(id!);
        setRelationships(response.data.relationships);
      } catch {
        // Handled silently
      } finally {
        setRelationshipsLoading(false);
      }
    }
    void loadRelationships();
  }, [id]);

  // Load Dependencies
  useEffect(() => {
    if (!id) return;
    let ignore = false;
    async function fetchDependencies() {
      try {
        const response = await getDocumentDependenciesApi(id!, 3);
        if (!ignore) {
          setDependenciesSummary(response.data.summary);
          setUpstreamDeps(response.data.upstream);
          setDownstreamDeps(response.data.downstream);
        }
      } catch {
        // Handled silently
      }
    }
    void fetchDependencies();
    return () => {
      ignore = true;
    };
  }, [id]);

  // Load Available Documents for Linking
  useEffect(() => {
    if (!id || !canEdit) return;
    async function loadAvailableDocs() {
      try {
        const response = await getDocuments({ limit: 100 });
        setAvailableDocuments(response.data.documents.filter((d) => d.id !== id));
      } catch {
        // Handled silently
      }
    }
    void loadAvailableDocs();
  }, [id, canEdit]);

  // Load Document Details & Health
  useEffect(() => {
    if (!id) return;
    async function loadDocument() {
      setLoading(true);
      setError('');
      try {
        const response = await getDocumentById(id!);
        setDoc(response.data);

        try {
          const healthRes = await fetchDocumentHealth(id!);
          setHealthData(healthRes);
        } catch {
          // Handled silently
        }

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

  // Load Shares
  useEffect(() => {
    if (!id || !isOwner) return;
    async function loadShares() {
      try {
        const response = await getDocumentShares(id!);
        setShares(response.data.shares);
      } catch {
        // Handled silently
      }
    }
    void loadShares();
  }, [id, isOwner]);

  // Load Audit History
  useEffect(() => {
    if (!id) return;
    async function loadAuditHistory() {
      setAuditLoading(true);
      setAuditError('');
      try {
        const response = await getDocumentAuditHistory(id!, {
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

  // Load Reviews
  useEffect(() => {
    if (!id) return;
    async function loadReviews() {
      setReviewsLoading(true);
      try {
        const reviewsData = await getDocumentReviewsApi(id!);
        setReviews(reviewsData);
      } catch {
        // Handled silently
      } finally {
        setReviewsLoading(false);
      }
    }
    void loadReviews();
  }, [id]);

  // View Document Action
  async function handleView() {
    if (!id || viewing || downloading || deleting) return;
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

  // Download Document Action
  async function handleDownload() {
    if (!id || viewing || downloading || deleting) return;
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

  // Delete Document Action
  async function handleDeleteConfirm() {
    if (!id || deleting || viewing || downloading) return;
    setDeleting(true);
    setActionError('');
    try {
      await deleteDocument(id);
      navigate('/documents');
    } catch {
      setActionError('Unable to delete this document.');
    } finally {
      setDeleting(false);
    }
  }

  if (!id) {
    return (
      <main className="p-8 text-center text-slate-400">
        Invalid document ID
      </main>
    );
  }

  if (loading) {
    return (
      <main className="p-12 flex flex-col items-center justify-center min-h-[50vh]">
        <LoadingSpinner size="lg" />
        <p className="text-sm text-slate-400 mt-4">Loading document details...</p>
      </main>
    );
  }

  if (error || !doc) {
    return (
      <main className="p-8 text-center">
        <p className="text-red-400 mb-4">{error || 'Document not found'}</p>
        <Link to="/documents">
          <Button variant="secondary">Back to Documents</Button>
        </Link>
      </main>
    );
  }

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Document Header & Primary Actions */}
      <DocumentHeaderSection
        doc={doc}
        folderName={folderName}
        projectName={projectName}
        healthData={healthData}
        canEdit={canEdit}
        viewing={viewing}
        downloading={downloading}
        deleting={deleting}
        actionError={actionError}
        onView={() => void handleView()}
        onDownload={() => void handleDownload()}
        onDeleteConfirm={() => void handleDeleteConfirm()}
        onOpenHealthDrawer={() => setIsHealthDrawerOpen(true)}
        onOpenProposeDrawer={() => setIsProposeDrawerOpen(true)}
        onDocumentUpdated={(updated) => setDoc(updated)}
      />

      {/* Propose & Simulate Change Drawer */}
      <ProposeChangeDrawer
        isOpen={isProposeDrawerOpen}
        onClose={() => setIsProposeDrawerOpen(false)}
        documentId={doc.id}
        projectId={doc.projectId || ''}
        documentTitle={doc.title}
      />

      {/* Sharing Controls (Owner/Admin) */}
      <DocumentSharesSection
        documentId={doc.id}
        isOwner={isOwner}
        shares={shares}
        onSharesUpdated={(updated) => setShares(updated)}
      />

      {/* Reviews Section */}
      <DocumentReviewsSection
        documentId={doc.id}
        canEdit={canEdit}
        currentUser={currentUser}
        shares={shares}
        reviews={reviews}
        reviewsLoading={reviewsLoading}
        onReviewsUpdated={(updated) => setReviews(updated)}
      />

      {/* Relationships & Dependencies */}
      <DocumentRelationshipsSection
        documentId={doc.id}
        canEdit={canEdit}
        relationships={relationships}
        availableDocuments={availableDocuments}
        dependenciesSummary={dependenciesSummary}
        upstreamDeps={upstreamDeps}
        downstreamDeps={downstreamDeps}
        relationshipsLoading={relationshipsLoading}
        onRelationshipsUpdated={(updated) => setRelationships(updated)}
      />

      {/* External Technical References */}
      <DocumentReferencesSection
        documentId={doc.id}
        canEdit={canEdit}
        references={references}
        referencesLoading={referencesLoading}
        onReferencesUpdated={(updated) => setReferences(updated)}
      />

      {/* Version History */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-lg p-6 shadow-md">
        <VersionHistorySection documentId={doc.id} currentVersion={doc.version || 1} canEdit={canEdit} />
      </div>

      {/* API Endpoints Mapping */}
      {doc.projectId && (
        <div className="bg-slate-900/80 border border-slate-800 rounded-lg p-6 shadow-md">
          <DocumentApiEndpointsSection documentId={doc.id} projectId={doc.projectId} canEdit={canEdit} />
        </div>
      )}

      {/* Assurance Gate Card */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-lg p-6 shadow-md">
        <AssuranceGateCard documentId={doc.id} />
      </div>

      {/* Verification Plan Section */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-lg p-6 shadow-md">
        <VerificationPlanSection
          documentId={doc.id}
          projectId={doc.projectId || undefined}
          isOwnerOrAdmin={canEdit}
        />
      </div>

      {/* Cross Project Impact Section */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-lg p-6 shadow-md">
        <DocumentCrossProjectImpactSection
          needsVerification={doc.impactVerification?.needsVerification}
          activeImpactSources={
            doc.impactVerification?.activeImpactSources as unknown as Array<{
              upstreamDocumentId: string;
              upstreamVersionNumber?: number;
              changeType: 'STALE' | 'DEPRECATED' | 'FILE_REPLACED';
              flaggedAt: string;
            }>
          }
        />
      </div>

      {/* Evidence & Traceability */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-lg p-6 shadow-md">
        <h2 className="text-xl font-bold text-slate-100 mb-4">Documentation Evidence &amp; Traceability</h2>
        <EvidencePanel documentId={doc.id} />
      </div>

      {/* Audit Trail */}
      <DocumentAuditHistorySection
        auditHistory={auditHistory}
        auditPage={auditPage}
        auditTotalPages={auditTotalPages}
        selectedAction={selectedAction}
        auditLoading={auditLoading}
        auditError={auditError}
        onActionChange={(action) => {
          setSelectedAction(action);
          setAuditPage(1);
        }}
        onPageChange={(page) => setAuditPage(page)}
      />

      {/* Knowledge Health Drawer */}
      <KnowledgeHealthDrawer
        isOpen={isHealthDrawerOpen}
        onClose={() => setIsHealthDrawerOpen(false)}
        health={healthData}
        canEdit={canEdit}
        onHealthUpdated={(updated) => setHealthData(updated)}
      />
    </main>
  );
}
