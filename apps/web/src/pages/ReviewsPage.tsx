import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import {
  getPendingReviewsApi,
  approveDocumentReviewApi,
  requestChangesDocumentReviewApi,
} from "../features/document-reviews/document-review.api";
import type { DocumentReview } from "../features/document-reviews/document-review.types";

import { Card, CardBody } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { Badge } from "../components/ui/Badge";
import { LoadingSpinner } from "../components/ui/LoadingSpinner";
import { EmptyState } from "../components/ui/EmptyState";
import { Breadcrumb } from "../components/ui/Breadcrumb";

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
      const msg = err instanceof Error ? err.message : "Failed to load pending reviews";
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
          const msg = err instanceof Error ? err.message : "Failed to load pending reviews";
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
      setActionSuccess(`Approved review for "${review.document?.title || "Document"}"`);
      await loadPendingReviews();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to approve review";
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
      setActionSuccess(`Requested changes for "${review.document?.title || "Document"}"`);
      await loadPendingReviews();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to request changes";
      setError(msg);
    } finally {
      setResolvingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <Breadcrumb items={[{ label: "My Reviews" }]} />

      <div>
        <h1 className="text-2xl font-extrabold text-gray-900 dark:text-white">
          My Pending Reviews
        </h1>
        <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
          Documents assigned to you awaiting review decision.
        </p>
      </div>

      {error && (
        <div className="p-3 bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded-md text-sm font-medium">
          {error}
        </div>
      )}

      {actionSuccess && (
        <div className="p-3 bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-md text-sm font-medium">
          {actionSuccess}
        </div>
      )}

      {loading ? (
        <div className="py-12 flex justify-center">
          <LoadingSpinner label="Loading pending reviews..." />
        </div>
      ) : reviews.length === 0 ? (
        <EmptyState
          title="No Pending Reviews"
          description="You have zero documents currently awaiting your review decision."
        />
      ) : (
        <div className="space-y-4">
          {reviews.map((rev) => (
            <Card key={rev.id}>
              <CardBody className="space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                  <div>
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                      <Link
                        to={`/documents/${rev.documentId}`}
                        className="text-indigo-600 dark:text-indigo-400 hover:underline"
                      >
                        {rev.document?.title || "Untitled Document"}
                      </Link>
                    </h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                      {rev.document?.fileName} &bull; Requested on{" "}
                      {new Date(rev.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <Badge variant="warning">PENDING REVIEW</Badge>
                </div>

                <div className="space-y-2">
                  <input
                    type="text"
                    placeholder="Optional review resolution comment..."
                    value={commentInputs[rev.id] || ""}
                    onChange={(e) =>
                      setCommentInputs((prev) => ({
                        ...prev,
                        [rev.id]: e.target.value,
                      }))
                    }
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm"
                  />
                  <div className="flex gap-2">
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => void handleApprove(rev)}
                      isLoading={resolvingId === rev.id}
                    >
                      Approve Review
                    </Button>
                    <Button
                      variant="danger"
                      size="sm"
                      onClick={() => void handleRequestChanges(rev)}
                      isLoading={resolvingId === rev.id}
                    >
                      Request Changes
                    </Button>
                  </div>
                </div>
              </CardBody>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
