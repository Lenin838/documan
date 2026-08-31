import { apiClient } from '../../api/client';
import type {
  DocumentReview,
  CreateDocumentReviewPayload,
  ResolveDocumentReviewPayload,
} from './document-review.types';

export async function createDocumentReviewApi(
  documentId: string,
  payload: CreateDocumentReviewPayload,
): Promise<DocumentReview> {
  const response = await apiClient.post<{ data: DocumentReview }>(
    `/documents/${documentId}/reviews`,
    payload,
  );
  return response.data.data;
}

export async function getDocumentReviewsApi(
  documentId: string,
): Promise<DocumentReview[]> {
  const response = await apiClient.get<{
    data: { reviews: DocumentReview[] };
  }>(`/documents/${documentId}/reviews`);
  return response.data.data.reviews;
}

export async function approveDocumentReviewApi(
  documentId: string,
  reviewId: string,
  payload?: ResolveDocumentReviewPayload,
): Promise<DocumentReview> {
  const response = await apiClient.post<{ data: DocumentReview }>(
    `/documents/${documentId}/reviews/${reviewId}/approve`,
    payload || {},
  );
  return response.data.data;
}

export async function requestChangesDocumentReviewApi(
  documentId: string,
  reviewId: string,
  payload?: ResolveDocumentReviewPayload,
): Promise<DocumentReview> {
  const response = await apiClient.post<{ data: DocumentReview }>(
    `/documents/${documentId}/reviews/${reviewId}/request-changes`,
    payload || {},
  );
  return response.data.data;
}

export async function getPendingReviewsApi(): Promise<DocumentReview[]> {
  const response = await apiClient.get<{
    data: { reviews: DocumentReview[] };
  }>(`/reviews/pending`);
  return response.data.data.reviews;
}
