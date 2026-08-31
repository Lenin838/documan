import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

import {
  getPendingReviewsApi,
  approveDocumentReviewApi,
  requestChangesDocumentReviewApi,
} from '../features/document-reviews/document-review.api';
import type { DocumentReview } from '../features/document-reviews/document-review.types';

export function ReviewsPage() {
  const [reviews, setReviews] = useState<DocumentReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [resolvingId, setResolvingId] = useState<string | null>(null);
  const [commentInputs, setCommentInputs] = useState<Record<string, string>>({});

  const loadPendingReviews = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getPendingReviewsApi();
      setReviews(data);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to load pending reviews';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let ignore = false;
    async function fetchReviews() {
      try {
        setError(null);
        const data = await getPendingReviewsApi();
        if (!ignore) {
          setReviews(data);
        }
      } catch (err) {
        if (!ignore) {
          const msg = err instanceof Error ? err.message : 'Failed to load pending reviews';
          setError(msg);
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    }
    void fetchReviews();
    return () => {
      ignore = true;
    };
  }, []);

  const handleApprove = async (review: DocumentReview) => {
    try {
      setResolvingId(review.id);
      setError(null);
      setActionSuccess(null);
      const comment = commentInputs[review.id] || undefined;
      await approveDocumentReviewApi(review.documentId, review.id, { comment });
      setActionSuccess(`Approved review for "${review.document?.title || 'Document'}"`);
      await loadPendingReviews();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to approve review';
      setError(msg);
    } finally {
      setResolvingId(null);
    }
  };

  const handleRequestChanges = async (review: DocumentReview) => {
    try {
      setResolvingId(review.id);
      setError(null);
      setActionSuccess(null);
      const comment = commentInputs[review.id] || undefined;
      await requestChangesDocumentReviewApi(review.documentId, review.id, { comment });
      setActionSuccess(`Requested changes for "${review.document?.title || 'Document'}"`);
      await loadPendingReviews();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to request changes';
      setError(msg);
    } finally {
      setResolvingId(null);
    }
  };

  return (
    <div style={{ padding: '1.5rem', maxWidth: '900px', margin: '0 auto' }}>
      <h1>My Pending Reviews</h1>
      <p style={{ color: 'var(--color-text-muted, #64748b)', marginBottom: '1.5rem' }}>
        Documents assigned to you awaiting review decision.
      </p>

      {error && (
        <div style={{ padding: '0.75rem 1rem', background: '#fee2e2', color: '#991b1b', borderRadius: '4px', marginBottom: '1rem' }}>
          {error}
        </div>
      )}

      {actionSuccess && (
        <div style={{ padding: '0.75rem 1rem', background: '#dcfce7', color: '#166534', borderRadius: '4px', marginBottom: '1rem' }}>
          {actionSuccess}
        </div>
      )}

      {loading ? (
        <p>Loading pending reviews...</p>
      ) : reviews.length === 0 ? (
        <div style={{ padding: '2rem', textAlign: 'center', background: '#f8fafc', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
          <p style={{ margin: 0, color: '#64748b' }}>No pending reviews assigned to you.</p>
        </div>
      ) : (
        <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {reviews.map((rev) => (
            <li
              key={rev.id}
              style={{
                padding: '1.25rem',
                border: '1px solid #e2e8f0',
                borderRadius: '6px',
                background: '#ffffff',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.75rem',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.1rem' }}>
                    <Link to={`/documents/${rev.documentId}`} style={{ color: '#0284c7', textDecoration: 'none' }}>
                      {rev.document?.title || 'Untitled Document'}
                    </Link>
                  </h3>
                  <span style={{ fontSize: '0.85rem', color: '#64748b' }}>
                    {rev.document?.fileName}
                  </span>
                </div>
                <span
                  style={{
                    background: '#fef3c7',
                    color: '#92400e',
                    padding: '0.25rem 0.6rem',
                    borderRadius: '4px',
                    fontSize: '0.8rem',
                    fontWeight: 'bold',
                  }}
                >
                  PENDING REVIEW
                </span>
              </div>

              <div style={{ fontSize: '0.9rem', color: '#334155' }}>
                <strong>Requested By:</strong> {rev.requester?.name || 'Unknown User'} ({rev.requester?.email}) on {new Date(rev.createdAt).toLocaleDateString()}
              </div>

              {rev.comment && (
                <div style={{ background: '#f1f5f9', padding: '0.6rem 0.8rem', borderRadius: '4px', fontSize: '0.9rem', fontStyle: 'italic' }}>
                  &quot;{rev.comment}&quot;
                </div>
              )}

              <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', marginTop: '0.5rem', flexWrap: 'wrap' }}>
                <input
                  type="text"
                  placeholder="Optional review comment..."
                  value={commentInputs[rev.id] || ''}
                  onChange={(e) =>
                    setCommentInputs({ ...commentInputs, [rev.id]: e.target.value })
                  }
                  style={{ flex: '1 1 250px', padding: '0.4rem 0.6rem' }}
                />
                <button
                  type="button"
                  onClick={() => void handleApprove(rev)}
                  disabled={resolvingId === rev.id}
                  style={{ background: '#16a34a', color: 'white', border: 'none', padding: '0.4rem 0.8rem', borderRadius: '4px', cursor: 'pointer' }}
                >
                  {resolvingId === rev.id ? 'Saving...' : 'Approve'}
                </button>
                <button
                  type="button"
                  onClick={() => void handleRequestChanges(rev)}
                  disabled={resolvingId === rev.id}
                  style={{ background: '#dc2626', color: 'white', border: 'none', padding: '0.4rem 0.8rem', borderRadius: '4px', cursor: 'pointer' }}
                >
                  {resolvingId === rev.id ? 'Saving...' : 'Request Changes'}
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
