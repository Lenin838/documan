import { Types } from 'mongoose';

import {
  DocumentReview,
  type DocumentReviewDocument,
  type ReviewStatus,
} from './document-review.model.js';
import { Document } from './document.model.js';
import { DocumentShare } from '../document-shares/document-share.model.js';
import { User } from '../users/user.model.js';
import { createDocumentAudit } from './document-audit.service.js';
import type {
  CreateDocumentReviewInput,
  ResolveDocumentReviewInput,
} from './document-review.schema.js';
import { AppError } from '../../errors/app-error.js';
import {
  createNotificationInternal,
  safeNotify,
} from '../notifications/notification.service.js';
import {
  dispatchWebhookEvent,
  safeDispatchWebhook,
} from '../webhooks/webhook-delivery.service.js';
import { transitionDocumentStatusInternal } from './document.service.js';

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

export interface DocumentReviewResponse {
  id: string;
  documentId: string;
  requesterId: string;
  reviewerId: string;
  status: ReviewStatus;
  comment?: string | undefined;
  resolvedAt?: Date | undefined;
  createdAt: Date;
  updatedAt: Date;
  requester?: UserSummary | undefined;
  reviewer?: UserSummary | undefined;
  document?: DocumentSummary | undefined;
}

function validateObjectId(id: string, errorMessage = 'Invalid document ID'): void {
  if (!Types.ObjectId.isValid(id)) {
    throw new AppError(errorMessage, 404, 'DOCUMENT_NOT_FOUND');
  }
}

async function verifyDocumentAccess(
  userId: string,
  role: 'user' | 'admin',
  documentId: string,
  requiredPermission: 'READ' | 'EDIT',
) {
  validateObjectId(documentId, 'Invalid document ID');

  const document = await Document.findOne({
    _id: documentId,
    isDeleted: false,
  });

  if (!document) {
    throw new AppError('Document not found', 404, 'DOCUMENT_NOT_FOUND');
  }

  if (role === 'admin' || document.ownerId.toString() === userId) {
    return { document, isOwner: true, permission: 'EDIT' as const };
  }

  const share = await DocumentShare.findOne({
    documentId: document._id,
    sharedWithUserId: new Types.ObjectId(userId),
  });

  if (!share) {
    throw new AppError('Document not found', 404, 'DOCUMENT_NOT_FOUND');
  }

  if (requiredPermission === 'EDIT' && share.permission !== 'EDIT') {
    throw new AppError('Forbidden', 403, 'FORBIDDEN');
  }

  return { document, isOwner: false, permission: share.permission };
}

type RecordWithId = Record<string, unknown> & { _id?: Types.ObjectId; id?: string };

function toUserSummary(user: RecordWithId & { name: string; email: string }): UserSummary {
  return {
    id: user._id ? user._id.toString() : (user.id || ''),
    name: user.name,
    email: user.email,
  };
}

function toDocumentSummary(
  doc: RecordWithId & { title: string; fileName: string; fileType: string },
): DocumentSummary {
  return {
    id: doc._id ? doc._id.toString() : (doc.id || ''),
    title: doc.title,
    fileName: doc.fileName,
    fileType: doc.fileType,
  };
}

function toDocumentReviewResponse(
  review: RecordWithId & {
    status: ReviewStatus;
    createdAt: Date;
    updatedAt: Date;
    comment?: string;
    resolvedAt?: Date;
    requesterId?: RecordWithId & { name?: string; email?: string };
    reviewerId?: RecordWithId & { name?: string; email?: string };
    documentId?: RecordWithId & { title?: string; fileName?: string; fileType?: string };
  },
): DocumentReviewResponse {
  const requesterIdStr =
    typeof review.requesterId === 'object' && review.requesterId?._id
      ? review.requesterId._id.toString()
      : review.requesterId?.toString() || '';

  const reviewerIdStr =
    typeof review.reviewerId === 'object' && review.reviewerId?._id
      ? review.reviewerId._id.toString()
      : review.reviewerId?.toString() || '';

  const documentIdStr =
    typeof review.documentId === 'object' && review.documentId?._id
      ? review.documentId._id.toString()
      : review.documentId?.toString() || '';

  return {
    id: review._id ? review._id.toString() : (review.id || ''),
    documentId: documentIdStr,
    requesterId: requesterIdStr,
    reviewerId: reviewerIdStr,
    status: review.status,
    comment: review.comment,
    resolvedAt: review.resolvedAt,
    createdAt: review.createdAt,
    updatedAt: review.updatedAt,
    requester:
      typeof review.requesterId === 'object' && review.requesterId?.name
        ? toUserSummary(review.requesterId as unknown as RecordWithId & { name: string; email: string })
        : undefined,
    reviewer:
      typeof review.reviewerId === 'object' && review.reviewerId?.name
        ? toUserSummary(review.reviewerId as unknown as RecordWithId & { name: string; email: string })
        : undefined,
    document:
      typeof review.documentId === 'object' && review.documentId?.title
        ? toDocumentSummary(review.documentId as unknown as RecordWithId & { title: string; fileName: string; fileType: string })
        : undefined,
  };
}

export async function createDocumentReview(
  userId: string,
  role: 'user' | 'admin',
  documentId: string,
  input: CreateDocumentReviewInput,
): Promise<DocumentReviewResponse> {
  const { document } = await verifyDocumentAccess(
    userId,
    role,
    documentId,
    'EDIT',
  );

  if (!Types.ObjectId.isValid(input.reviewerId)) {
    throw new AppError('Assigned reviewer not found', 400, 'REVIEWER_NOT_FOUND');
  }

  const reviewer = await User.findById(input.reviewerId);
  if (!reviewer) {
    throw new AppError('Assigned reviewer not found', 400, 'REVIEWER_NOT_FOUND');
  }

  if (!reviewer.isActive) {
    throw new AppError('Assigned reviewer is inactive', 400, 'REVIEWER_INACTIVE');
  }

  if (reviewer.isDeleted) {
    throw new AppError('Assigned reviewer is deleted', 400, 'REVIEWER_DELETED');
  }

  try {
    await verifyDocumentAccess(
      reviewer._id.toString(),
      reviewer.role,
      documentId,
      'READ',
    );
  } catch {
    throw new AppError(
      'Assigned reviewer does not have access to this document',
      400,
      'REVIEWER_NOT_AUTHORIZED',
    );
  }

  const existingPending = await DocumentReview.findOne({
    documentId: document._id,
    status: 'PENDING',
  });

  if (existingPending) {
    throw new AppError(
      'A review is already pending for this document',
      400,
      'REVIEW_ALREADY_PENDING',
    );
  }

  const createPayload: Record<string, unknown> = {
    documentId: document._id,
    requesterId: new Types.ObjectId(userId),
    reviewerId: reviewer._id,
    status: 'PENDING',
  };
  if (input.comment) {
    createPayload.comment = input.comment;
  }

  const review = (await DocumentReview.create(
    createPayload as unknown as never,
  )) as unknown as DocumentReviewDocument & { _id: Types.ObjectId };

  await createDocumentAudit(
    document._id.toString(),
    userId,
    'REVIEW_REQUEST',
    {
      reviewId: review._id.toString(),
      reviewerId: reviewer._id.toString(),
      reviewerName: reviewer.name,
      comment: input.comment,
    },
  );

  await transitionDocumentStatusInternal(
    document._id.toString(),
    userId,
    'IN_REVIEW',
    'AUTOMATIC',
    'REVIEW_REQUEST',
    review._id.toString(),
    input.comment,
  );

  await safeNotify(() =>
    createNotificationInternal({
      recipientUserId: reviewer._id,
      documentId: document._id,
      type: 'REVIEW_REQUESTED',
      actorUserId: userId,
    }),
  );

  if (document.projectId) {
    const actorUser = await User.findById(userId).select('name email');
    await safeDispatchWebhook(async () => {
      await dispatchWebhookEvent({
        projectId: document.projectId!,
        eventType: 'REVIEW_REQUESTED',
        document: { id: document._id.toString(), title: document.title },
        actor: actorUser ? { id: actorUser._id.toString(), name: actorUser.name, email: actorUser.email } : null,
        data: { reviewId: review._id.toString(), reviewerId: reviewer._id.toString(), comment: input.comment },
      });
    });
  }

  const populatedReview = (await DocumentReview.findById(review._id)
    .populate('requesterId', 'name email')
    .populate('reviewerId', 'name email')) as unknown as RecordWithId;

  return toDocumentReviewResponse((populatedReview || review) as unknown as RecordWithId & { status: ReviewStatus; createdAt: Date; updatedAt: Date });
}

export async function getDocumentReviews(
  userId: string,
  role: 'user' | 'admin',
  documentId: string,
): Promise<DocumentReviewResponse[]> {
  const { document } = await verifyDocumentAccess(
    userId,
    role,
    documentId,
    'READ',
  );

  const reviews = (await DocumentReview.find({
    documentId: document._id,
  })
    .populate('requesterId', 'name email')
    .populate('reviewerId', 'name email')
    .sort({ createdAt: -1 })) as unknown as RecordWithId[];

  return reviews.map((r) => toDocumentReviewResponse(r as unknown as RecordWithId & { status: ReviewStatus; createdAt: Date; updatedAt: Date }));
}

export async function approveDocumentReview(
  userId: string,
  role: 'user' | 'admin',
  documentId: string,
  reviewId: string,
  input?: ResolveDocumentReviewInput,
): Promise<DocumentReviewResponse> {
  const { document } = await verifyDocumentAccess(
    userId,
    role,
    documentId,
    'READ',
  );

  if (!Types.ObjectId.isValid(reviewId)) {
    throw new AppError('Review not found', 404, 'REVIEW_NOT_FOUND');
  }

  const review = await DocumentReview.findOne({
    _id: new Types.ObjectId(reviewId),
    documentId: document._id,
  });

  if (!review) {
    throw new AppError('Review not found', 404, 'REVIEW_NOT_FOUND');
  }

  if (review.status !== 'PENDING') {
    throw new AppError('Review is not pending', 400, 'REVIEW_NOT_PENDING');
  }

  if (role !== 'admin' && review.reviewerId.toString() !== userId) {
    throw new AppError(
      'Only the assigned reviewer can resolve this review',
      403,
      'FORBIDDEN',
    );
  }

  review.status = 'APPROVED';
  review.resolvedAt = new Date();
  document.lastReviewedAt = new Date();
  const docObj = document as unknown as Record<string, unknown>;
  if (typeof docObj.save === 'function') {
    await (docObj.save as () => Promise<unknown>)();
  }
  if (input?.comment) {
    review.comment = input.comment;
  }

  await review.save();

  await createDocumentAudit(
    document._id.toString(),
    userId,
    'REVIEW_APPROVED',
    {
      reviewId: review._id.toString(),
      reviewerId: userId,
      comment: input?.comment,
    },
  );

  await transitionDocumentStatusInternal(
    document._id.toString(),
    userId,
    'APPROVED',
    'AUTOMATIC',
    'REVIEW_APPROVED',
    review._id.toString(),
    input?.comment,
  );

  await safeNotify(() =>
    createNotificationInternal({
      recipientUserId: document.ownerId,
      documentId: document._id,
      type: 'REVIEW_APPROVED',
      actorUserId: userId,
    }),
  );

  if (document.projectId) {
    const actorUser = await User.findById(userId).select('name email');
    await safeDispatchWebhook(async () => {
      await dispatchWebhookEvent({
        projectId: document.projectId!,
        eventType: 'REVIEW_APPROVED',
        document: { id: document._id.toString(), title: document.title },
        actor: actorUser ? { id: actorUser._id.toString(), name: actorUser.name, email: actorUser.email } : null,
        data: { reviewId: review._id.toString(), comment: input?.comment },
      });
    });
  }

  const populatedReview = (await DocumentReview.findById(review._id)
    .populate('requesterId', 'name email')
    .populate('reviewerId', 'name email')) as unknown as RecordWithId;

  return toDocumentReviewResponse((populatedReview || review) as unknown as RecordWithId & { status: ReviewStatus; createdAt: Date; updatedAt: Date });
}

export async function requestChangesDocumentReview(
  userId: string,
  role: 'user' | 'admin',
  documentId: string,
  reviewId: string,
  input?: ResolveDocumentReviewInput,
): Promise<DocumentReviewResponse> {
  const { document } = await verifyDocumentAccess(
    userId,
    role,
    documentId,
    'READ',
  );

  if (!Types.ObjectId.isValid(reviewId)) {
    throw new AppError('Review not found', 404, 'REVIEW_NOT_FOUND');
  }

  const review = await DocumentReview.findOne({
    _id: new Types.ObjectId(reviewId),
    documentId: document._id,
  });

  if (!review) {
    throw new AppError('Review not found', 404, 'REVIEW_NOT_FOUND');
  }

  if (review.status !== 'PENDING') {
    throw new AppError('Review is not pending', 400, 'REVIEW_NOT_PENDING');
  }

  if (role !== 'admin' && review.reviewerId.toString() !== userId) {
    throw new AppError(
      'Only the assigned reviewer can resolve this review',
      403,
      'FORBIDDEN',
    );
  }

  review.status = 'CHANGES_REQUESTED';
  review.resolvedAt = new Date();
  if (input?.comment) {
    review.comment = input.comment;
  }

  await review.save();

  await createDocumentAudit(
    document._id.toString(),
    userId,
    'REVIEW_CHANGES_REQUESTED',
    {
      reviewId: review._id.toString(),
      reviewerId: userId,
      comment: input?.comment,
    },
  );

  await transitionDocumentStatusInternal(
    document._id.toString(),
    userId,
    'DRAFT',
    'AUTOMATIC',
    'REVIEW_CHANGES_REQUESTED',
    review._id.toString(),
    input?.comment,
  );

  await safeNotify(() =>
    createNotificationInternal({
      recipientUserId: document.ownerId,
      documentId: document._id,
      type: 'CHANGES_REQUESTED',
      actorUserId: userId,
    }),
  );

  if (document.projectId) {
    const actorUser = await User.findById(userId).select('name email');
    await safeDispatchWebhook(async () => {
      await dispatchWebhookEvent({
        projectId: document.projectId!,
        eventType: 'CHANGES_REQUESTED',
        document: { id: document._id.toString(), title: document.title },
        actor: actorUser ? { id: actorUser._id.toString(), name: actorUser.name, email: actorUser.email } : null,
        data: { reviewId: review._id.toString(), comment: input?.comment },
      });
    });
  }

  const populatedReview = (await DocumentReview.findById(review._id)
    .populate('requesterId', 'name email')
    .populate('reviewerId', 'name email')) as unknown as RecordWithId;

  return toDocumentReviewResponse((populatedReview || review) as unknown as RecordWithId & { status: ReviewStatus; createdAt: Date; updatedAt: Date });
}

export async function getPendingReviews(
  userId: string,
  role: 'user' | 'admin',
): Promise<DocumentReviewResponse[]> {
  const reviews = (await DocumentReview.find({
    reviewerId: new Types.ObjectId(userId),
    status: 'PENDING',
  })
    .populate('documentId')
    .populate('requesterId', 'name email')
    .populate('reviewerId', 'name email')
    .sort({ createdAt: -1 })) as unknown as RecordWithId[];

  const results: DocumentReviewResponse[] = [];

  for (const review of reviews) {
    const docObj = review.documentId as RecordWithId & { isDeleted?: boolean };
    if (!docObj || docObj.isDeleted) {
      continue;
    }

    try {
      await verifyDocumentAccess(
        userId,
        role,
        docObj._id ? docObj._id.toString() : (docObj.id || ''),
        'READ',
      );
      results.push(toDocumentReviewResponse(review as unknown as RecordWithId & { status: ReviewStatus; createdAt: Date; updatedAt: Date }));
    } catch {
      // Ignore reviews on documents user can no longer access
    }
  }

  return results;
}
