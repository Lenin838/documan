import { useState } from 'react';
import type { FormEvent } from 'react';
import { Link } from 'react-router-dom';
import type { Document } from '../document.types';
import type { KnowledgeHealthData } from '../health.types';
import { Button } from '../../../components/ui/Button';
import { Badge } from '../../../components/ui/Badge';
import { Card } from '../../../components/ui/Card';
import { Modal } from '../../../components/ui/Modal';
import { updateDocumentStatus, verifyDocumentImpactApi } from '../document.api';

interface DocumentHeaderSectionProps {
  doc: Document;
  folderName: string;
  projectName: string;
  healthData: KnowledgeHealthData | null;
  canEdit: boolean;
  viewing: boolean;
  downloading: boolean;
  deleting: boolean;
  actionError: string;
  onView: () => void;
  onDownload: () => void;
  onDeleteConfirm: () => void;
  onOpenHealthDrawer: () => void;
  onOpenProposeDrawer: () => void;
  onDocumentUpdated: (updatedDoc: Document) => void;
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

export function DocumentHeaderSection({
  doc,
  folderName,
  projectName,
  healthData,
  canEdit,
  viewing,
  downloading,
  deleting,
  actionError,
  onView,
  onDownload,
  onDeleteConfirm,
  onOpenHealthDrawer,
  onOpenProposeDrawer,
  onDocumentUpdated,
}: DocumentHeaderSectionProps) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showVerifyModal, setShowVerifyModal] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState<'DRAFT' | 'STALE' | 'DEPRECATED'>(
    (doc.status as 'DRAFT' | 'STALE' | 'DEPRECATED') || 'DRAFT'
  );
  const [statusReason, setStatusReason] = useState('');
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [statusError, setStatusError] = useState('');
  const [statusSuccess, setStatusSuccess] = useState('');

  const [verifyNote, setVerifyNote] = useState('');
  const [verifyingImpact, setVerifyingImpact] = useState(false);
  const [verifyError, setVerifyError] = useState('');
  const [verifySuccess, setVerifySuccess] = useState('');

  const handleUpdateStatusSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!canEdit) return;

    setUpdatingStatus(true);
    setStatusError('');
    setStatusSuccess('');

    try {
      const response = await updateDocumentStatus(doc.id, {
        status: selectedStatus,
        reason: statusReason || undefined,
      });
      onDocumentUpdated(response.data);
      setStatusSuccess(`Document status updated to ${selectedStatus}`);
      setStatusReason('');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to update status';
      setStatusError(msg);
    } finally {
      setUpdatingStatus(false);
    }
  };

  const handleVerifyImpactSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!canEdit) return;

    setVerifyingImpact(true);
    setVerifyError('');
    setVerifySuccess('');

    try {
      const response = await verifyDocumentImpactApi(doc.id, verifyNote || undefined);
      onDocumentUpdated(response.data);
      setVerifySuccess('Upstream impact verified successfully!');
      setVerifyNote('');
      setShowVerifyModal(false);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to verify impact';
      setVerifyError(msg);
    } finally {
      setVerifyingImpact(false);
    }
  };

  const getStatusVariant = (status?: string) => {
    switch (status) {
      case 'CURRENT':
        return 'success';
      case 'DRAFT':
        return 'warning';
      case 'STALE':
        return 'info';
      case 'DEPRECATED':
        return 'danger';
      default:
        return 'neutral';
    }
  };

  return (
    <Card className="mb-6 border-slate-800 bg-slate-900/80 shadow-md">
      {/* Header top bar */}
      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <h1 className="text-2xl font-bold text-slate-100 tracking-tight">{doc.title}</h1>
            <Badge variant="neutral">v{doc.version}</Badge>
            <Badge variant={getStatusVariant(doc.status)}>{doc.status || 'CURRENT'}</Badge>
          </div>

          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-slate-400">
            {doc.projectId && (
              <span>
                Project:{' '}
                <Link
                  to={`/projects/${doc.projectId}`}
                  className="font-medium text-indigo-400 hover:text-indigo-300 transition-colors"
                >
                  {projectName || 'Project Context'}
                </Link>
              </span>
            )}
            {doc.folderId && (
              <span>
                Folder: <span className="font-medium text-slate-300">{folderName}</span>
              </span>
            )}
            <span>
              Size: <span className="font-medium text-slate-300">{formatFileSize(doc.fileSize)}</span>
            </span>
            <span>
              Type: <span className="font-medium text-slate-300">{doc.fileType}</span>
            </span>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="secondary" size="sm" onClick={onView} isLoading={viewing}>
            View
          </Button>

          <Button variant="secondary" size="sm" onClick={onDownload} isLoading={downloading}>
            Download
          </Button>

          {canEdit && (
            <Link to={`/documents/${doc.id}/edit`}>
              <Button variant="secondary" size="sm">
                Edit
              </Button>
            </Link>
          )}

          <Button variant="secondary" size="sm" onClick={onOpenProposeDrawer}>
            Propose Change
          </Button>

          {healthData && (
            <Button
              variant={healthData.healthScore >= 80 ? 'success' : 'warning'}
              size="sm"
              onClick={onOpenHealthDrawer}
            >
              Health: {healthData.healthScore}%
            </Button>
          )}

          {canEdit && (
            <Button
              variant="danger"
              size="sm"
              onClick={() => setShowDeleteConfirm(true)}
              isLoading={deleting}
            >
              Delete
            </Button>
          )}
        </div>
      </div>

      {actionError && (
        <div className="mt-4 p-3 bg-red-950/40 border border-red-800 rounded text-sm text-red-300">
          {actionError}
        </div>
      )}

      {/* Upstream Impact Warning */}
      {doc.impactVerification?.needsVerification && (
        <div className="mt-4 p-4 bg-amber-950/40 border border-amber-800/80 rounded-lg flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="font-semibold text-amber-300 flex items-center gap-2">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
              Upstream Dependency Impact Flagged
            </div>
            <p className="text-xs text-amber-200/80 mt-1">
              One or more referenced documents have been updated. Verify this document to confirm domain alignment.
            </p>
          </div>
          {canEdit && (
            <Button variant="warning" size="sm" onClick={() => setShowVerifyModal(true)}>
              Verify Impact
            </Button>
          )}
        </div>
      )}

      {/* Status Override Control (for editors) */}
      {canEdit && (
        <div className="mt-4 pt-4 border-t border-slate-800">
          <form onSubmit={handleUpdateStatusSubmit} className="flex flex-col sm:flex-row items-end gap-3">
            <div className="flex-1 w-full">
              <label className="block text-xs font-semibold text-slate-400 mb-1">
                Lifecycle Status Override
              </label>
              <div className="flex gap-2">
                <select
                  value={selectedStatus}
                  onChange={(e) =>
                    setSelectedStatus(e.target.value as 'DRAFT' | 'STALE' | 'DEPRECATED')
                  }
                  className="bg-slate-950 border border-slate-800 text-slate-200 text-sm rounded px-3 py-1.5 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                >
                  <option value="DRAFT">DRAFT</option>
                  <option value="STALE">STALE</option>
                  <option value="DEPRECATED">DEPRECATED</option>
                </select>

                <input
                  type="text"
                  placeholder="Reason for change (optional)"
                  value={statusReason}
                  onChange={(e) => setStatusReason(e.target.value)}
                  className="flex-1 bg-slate-950 border border-slate-800 text-slate-200 text-sm rounded px-3 py-1.5 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>
            </div>
            <Button type="submit" variant="secondary" size="sm" isLoading={updatingStatus}>
              Update Status
            </Button>
          </form>
          {statusError && <p className="text-xs text-red-400 mt-2">{statusError}</p>}
          {statusSuccess && <p className="text-xs text-emerald-400 mt-2">{statusSuccess}</p>}
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        title="Confirm Document Deletion"
      >
        <p className="text-sm text-slate-300 mb-6">
          Are you sure you want to delete <strong className="text-slate-100">{doc.title}</strong>? This will remove the document and its version history.
        </p>
        <div className="flex justify-end gap-3">
          <Button variant="secondary" onClick={() => setShowDeleteConfirm(false)}>
            Cancel
          </Button>
          <Button variant="danger" onClick={onDeleteConfirm} isLoading={deleting}>
            Delete Document
          </Button>
        </div>
      </Modal>

      {/* Verify Impact Modal */}
      <Modal
        isOpen={showVerifyModal}
        onClose={() => setShowVerifyModal(false)}
        title="Verify Upstream Impact"
      >
        <p className="text-sm text-slate-300 mb-4">
          Confirm that you have reviewed the upstream document changes and verified that this document remains technically accurate.
        </p>
        {verifyError && <p className="text-xs text-red-400 mb-3">{verifyError}</p>}
        {verifySuccess && <p className="text-xs text-emerald-400 mb-3">{verifySuccess}</p>}

        <form onSubmit={handleVerifyImpactSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">
              Resolution Note (Optional)
            </label>
            <textarea
              value={verifyNote}
              onChange={(e) => setVerifyNote(e.target.value)}
              placeholder="Describe verification analysis or required compatibility checks..."
              rows={3}
              className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-sm text-slate-200 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            />
          </div>
          <div className="flex justify-end gap-3">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setShowVerifyModal(false)}
              disabled={verifyingImpact}
            >
              Cancel
            </Button>
            <Button type="submit" variant="primary" isLoading={verifyingImpact}>
              Confirm Verification
            </Button>
          </div>
        </form>
      </Modal>
    </Card>
  );
}
