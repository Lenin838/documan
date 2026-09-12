import { useState } from 'react';
import type { FormEvent } from 'react';
import type { DocumentReview } from '../../document-reviews/document-review.types';
import type { DocumentShare } from '../../document-shares/document-share.types';
import type { AuthUser as User } from '../../auth/auth.types';
import { Button } from '../../../components/ui/Button';
import { Card } from '../../../components/ui/Card';
import { Badge } from '../../../components/ui/Badge';
import {
  createDocumentReviewApi,
  getDocumentReviewsApi,
  approveDocumentReviewApi,
  requestChangesDocumentReviewApi,
} from '../../document-reviews/document-review.api';

interface DocumentReviewsSectionProps {
  documentId: string;
  canEdit: boolean;
  currentUser: User | null;
  shares: DocumentShare[];
  reviews: DocumentReview[];
  reviewsLoading: boolean;
  onReviewsUpdated: (updated: DocumentReview[]) => void;
}

export function DocumentReviewsSection({
  documentId,
  canEdit,
  currentUser,
  shares,
  reviews,
  reviewsLoading,
  onReviewsUpdated,
}: DocumentReviewsSectionProps) {
  const [selectedReviewerId, setSelectedReviewerId] = useState('');
  const [requestComment, setRequestComment] = useState('');
  const [requestingReview, setRequestingReview] = useState(false);
  const [resolveComment, setResolveComment] = useState('');
  const [resolvingReview, setResolvingReview] = useState(false);

  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleRequestReviewSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedReviewerId) {
      setError('Please select a reviewer.');
      return;
    }

    setRequestingReview(true);
    setError('');
    setSuccess('');

    try {
      await createDocumentReviewApi(documentId, {
        reviewerId: selectedReviewerId,
        comment: requestComment.trim() || undefined,
      });

      const updated = await getDocumentReviewsApi(documentId);
      onReviewsUpdated(updated);
      setSelectedReviewerId('');
      setRequestComment('');
      setSuccess('Review request submitted successfully.');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to request review';
      setError(msg);
    } finally {
      setRequestingReview(false);
    }
  };

  const handleApproveReview = async (reviewId: string) => {
    setResolvingReview(true);
    setError('');
    setSuccess('');

    try {
      await approveDocumentReviewApi(documentId, reviewId, {
        comment: resolveComment.trim() || undefined,
      });
      const updated = await getDocumentReviewsApi(documentId);
      onReviewsUpdated(updated);
      setResolveComment('');
      setSuccess('Review approved!');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to approve review');
    } finally {
      setResolvingReview(false);
    }
  };

  const handleRequestChangesReview = async (reviewId: string) => {
    setResolvingReview(true);
    setError('');
    setSuccess('');

    try {
      await requestChangesDocumentReviewApi(documentId, reviewId, {
        comment: resolveComment.trim() || undefined,
      });
      const updated = await getDocumentReviewsApi(documentId);
      onReviewsUpdated(updated);
      setResolveComment('');
      setSuccess('Changes requested for document.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to request changes');
    } finally {
      setResolvingReview(false);
    }
  };

  const getReviewBadgeVariant = (status: string) => {
    switch (status) {
      case 'APPROVED':
        return 'success';
      case 'CHANGES_REQUESTED':
        return 'danger';
      case 'PENDING':
        return 'warning';
      default:
        return 'neutral';
    }
  };

  return (
    <Card className="mb-6 border-slate-800 bg-slate-900/80 shadow-md">
      <h2 className="text-xl font-bold text-slate-100 mb-4">Document Review Workflow</h2>

      {canEdit && !reviews.some((r) => r.status === 'PENDING') && (
        <form onSubmit={handleRequestReviewSubmit} className="p-4 bg-slate-950/80 border border-slate-800 rounded-lg mb-6 space-y-3">
          <h3 className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
            Initiate Formal Review
          </h3>
          <div className="flex flex-col sm:flex-row gap-3">
            <select
              value={selectedReviewerId}
              onChange={(e) => setSelectedReviewerId(e.target.value)}
              required
              className="bg-slate-900 border border-slate-800 text-slate-200 text-sm rounded px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            >
              <option value="">Select reviewer...</option>
              {shares.map((share) => (
                <option key={share.id} value={share.sharedWithUser.id}>
                  {share.sharedWithUser.name} ({share.sharedWithUser.email}) - [{share.permission}]
                </option>
              ))}
            </select>

            <input
              type="text"
              placeholder="Context / notes for reviewer..."
              value={requestComment}
              onChange={(e) => setRequestComment(e.target.value)}
              maxLength={1000}
              className="flex-1 bg-slate-900 border border-slate-800 text-slate-200 text-sm rounded px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            />

            <Button type="submit" variant="primary" isLoading={requestingReview}>
              Request Review
            </Button>
          </div>
        </form>
      )}

      {error && <p className="text-xs text-red-400 mb-4">{error}</p>}
      {success && <p className="text-xs text-emerald-400 mb-4">{success}</p>}

      {reviewsLoading ? (
        <p className="text-sm text-slate-400">Loading reviews...</p>
      ) : reviews.length === 0 ? (
        <p className="text-sm text-slate-500 italic">No reviews requested for this document.</p>
      ) : (
        <div className="space-y-4">
          {reviews.map((rev) => {
            const isAssignedReviewer =
              currentUser && (currentUser.id === rev.reviewerId || currentUser.role === 'admin');
            const isPending = rev.status === 'PENDING';

            return (
              <div
                key={rev.id}
                className="p-4 bg-slate-950/40 border border-slate-800 rounded-lg space-y-3"
              >
                <div className="flex items-center justify-between">
                  <Badge variant={getReviewBadgeVariant(rev.status)}>{rev.status}</Badge>
                  <span className="text-xs text-slate-400">
                    Requested {new Date(rev.createdAt).toLocaleString()}
                  </span>
                </div>

                <div className="text-xs text-slate-300">
                  <span className="font-semibold text-slate-200">Requester:</span>{' '}
                  {rev.requester?.name || 'Unknown'} &bull;{' '}
                  <span className="font-semibold text-slate-200">Reviewer:</span>{' '}
                  {rev.reviewer?.name || 'Unknown'}
                </div>

                {rev.comment && (
                  <blockquote className="p-2 bg-slate-900 border-l-2 border-indigo-500 text-xs text-slate-300 italic">
                    "{rev.comment}"
                  </blockquote>
                )}

                {isPending && isAssignedReviewer && (
                  <div className="pt-3 border-t border-slate-800 flex flex-col sm:flex-row gap-2">
                    <input
                      type="text"
                      placeholder="Resolution comment..."
                      value={resolveComment}
                      onChange={(e) => setResolveComment(e.target.value)}
                      className="flex-1 bg-slate-900 border border-slate-800 text-slate-200 text-xs rounded px-3 py-1.5 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    />
                    <div className="flex gap-2">
                      <Button
                        variant="success"
                        size="sm"
                        onClick={() => void handleApproveReview(rev.id)}
                        isLoading={resolvingReview}
                      >
                        Approve
                      </Button>
                      <Button
                        variant="danger"
                        size="sm"
                        onClick={() => void handleRequestChangesReview(rev.id)}
                        isLoading={resolvingReview}
                      >
                        Request Changes
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}
