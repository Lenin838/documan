import type { DocumentAudit, DocumentAuditAction } from '../document.types';
import { Button } from '../../../components/ui/Button';
import { Card } from '../../../components/ui/Card';

interface DocumentAuditHistorySectionProps {
  auditHistory: DocumentAudit[];
  auditPage: number;
  auditTotalPages: number;
  selectedAction: DocumentAuditAction | '';
  auditLoading: boolean;
  auditError: string;
  onActionChange: (action: DocumentAuditAction | '') => void;
  onPageChange: (page: number) => void;
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
    case 'DOCUMENT_IMPACT_FLAGGED':
      return { label: 'Upstream Impact Flagged', description: 'Flagged due to upstream dependency change' };
    case 'DOCUMENT_IMPACT_VERIFIED':
      return { label: 'Upstream Impact Verified', description: 'Upstream dependency change impact was verified' };
    default:
      return { label: action, description: '' };
  }
}

function renderAuditMetadata(metadata?: Record<string, unknown>) {
  if (!metadata || Object.keys(metadata).length === 0) {
    return null;
  }

  if (typeof metadata.oldFileName === 'string' && typeof metadata.newFileName === 'string') {
    return (
      <span className="block text-xs text-slate-400 mt-1 font-mono">
        {metadata.oldFileName} &rarr; {metadata.newFileName}
      </span>
    );
  }

  const entries = Object.entries(metadata).filter(
    ([key]) => !key.toLowerCase().includes('path') && !key.toLowerCase().includes('password')
  );

  if (entries.length === 0) {
    return null;
  }

  return (
    <span className="block text-xs text-slate-400 mt-1 font-mono">
      {entries.map(([k, v]) => `${k}: ${String(v)}`).join(' | ')}
    </span>
  );
}

export function DocumentAuditHistorySection({
  auditHistory,
  auditPage,
  auditTotalPages,
  selectedAction,
  auditLoading,
  auditError,
  onActionChange,
  onPageChange,
}: DocumentAuditHistorySectionProps) {
  return (
    <Card className="mb-6 border-slate-800 bg-slate-900/80 shadow-md">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <h2 className="text-xl font-bold text-slate-100">Activity Audit Trail</h2>

        <select
          value={selectedAction}
          onChange={(e) => onActionChange(e.target.value as DocumentAuditAction | '')}
          className="bg-slate-950 border border-slate-800 text-slate-200 text-xs rounded px-3 py-1.5 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
        >
          <option value="">All Activity Types</option>
          <option value="CREATE">Document Created</option>
          <option value="UPDATE">Document Updated</option>
          <option value="FILE_REPLACE">File Replaced</option>
          <option value="VIEW">Document Viewed</option>
          <option value="DOWNLOAD">Document Downloaded</option>
          <option value="DELETE">Document Deleted</option>
          <option value="RESTORE">Document Restored</option>
          <option value="RELATIONSHIP_CREATE">Relationship Created</option>
          <option value="RELATIONSHIP_DELETE">Relationship Deleted</option>
          <option value="REVIEW_REQUEST">Review Requested</option>
          <option value="REVIEW_APPROVED">Review Approved</option>
          <option value="REVIEW_CHANGES_REQUESTED">Changes Requested</option>
          <option value="STATUS_CHANGE">Status Changed</option>
        </select>
      </div>

      {auditLoading ? (
        <p className="text-sm text-slate-400">Loading audit history...</p>
      ) : auditError ? (
        <p className="text-sm text-red-400">{auditError}</p>
      ) : auditHistory.length === 0 ? (
        <p className="text-sm text-slate-500 italic">No audit activity logged for this filter.</p>
      ) : (
        <>
          <div className="space-y-2 mb-4">
            {auditHistory.map((item) => {
              const { label, description } = formatAuditAction(item.action);
              return (
                <div
                  key={item.id}
                  className="p-3 bg-slate-950/40 border border-slate-800/80 rounded-lg text-xs"
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-semibold text-slate-200">{label}</span>
                    <span className="text-slate-400 text-[11px]">
                      {new Date(item.createdAt).toLocaleString()}
                    </span>
                  </div>
                  {description && <p className="text-slate-400">{description}</p>}
                  {renderAuditMetadata(item.metadata)}
                </div>
              );
            })}
          </div>

          {/* Pagination Controls */}
          <div className="flex items-center justify-between pt-3 border-t border-slate-800">
            <Button
              variant="secondary"
              size="sm"
              disabled={auditPage === 1 || auditLoading}
              onClick={() => onPageChange(auditPage - 1)}
            >
              Previous
            </Button>

            <span className="text-xs text-slate-400">
              Page <span className="font-semibold text-slate-200">{auditPage}</span> of{' '}
              <span className="font-semibold text-slate-200">{auditTotalPages}</span>
            </span>

            <Button
              variant="secondary"
              size="sm"
              disabled={auditPage >= auditTotalPages || auditLoading}
              onClick={() => onPageChange(auditPage + 1)}
            >
              Next
            </Button>
          </div>
        </>
      )}
    </Card>
  );
}
