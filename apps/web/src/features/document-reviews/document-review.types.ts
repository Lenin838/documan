export type ReviewStatus = 'PENDING' | 'APPROVED' | 'CHANGES_REQUESTED';

export interface UserSummary {
  id: string;
  name: string;
  email: string;
}

export interface DocumentSummary {
  id: string;
  title: string;
  fileName: string;
  fileType: string;
}

export interface DocumentReview {
  id: string;
  documentId: string;
  requesterId: string;
  reviewerId: string;
  status: ReviewStatus;
  comment?: string;
  resolvedAt?: string;
  createdAt: string;
  updatedAt: string;
  requester?: UserSummary;
  reviewer?: UserSummary;
  document?: DocumentSummary;
}

export interface CreateDocumentReviewPayload {
  reviewerId: string;
  comment?: string;
}

export interface ResolveDocumentReviewPayload {
  comment?: string;
}
