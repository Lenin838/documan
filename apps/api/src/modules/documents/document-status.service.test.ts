import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Types } from 'mongoose';

import {
  transitionDocumentStatusInternal,
  updateDocumentStatus,
  updateDocument,
} from './document.service.js';
import {
  createDocumentReview,
  approveDocumentReview,
  requestChangesDocumentReview,
} from './document-review.service.js';

import { Document } from './document.model.js';
import { DocumentReview } from './document-review.model.js';
import { DocumentShare } from '../document-shares/document-share.model.js';
import { User } from '../users/user.model.js';

vi.mock('./document.model.js');
vi.mock('./document-review.model.js');
vi.mock('../document-shares/document-share.model.js');
vi.mock('../users/user.model.js');
vi.mock('../folders/folder.model.js');
vi.mock('./document-audit.service.js', () => ({
  createDocumentAudit: vi.fn().mockResolvedValue({}),
}));

const mockDocument = vi.mocked(Document);
const mockDocumentReview = vi.mocked(DocumentReview);
const mockDocumentShare = vi.mocked(DocumentShare);
const mockUser = vi.mocked(User);

const USER_ID = new Types.ObjectId().toString();
const REVIEWER_ID = new Types.ObjectId().toString();
const OTHER_USER_ID = new Types.ObjectId().toString();
const DOC_ID = new Types.ObjectId().toString();
const REVIEW_ID = new Types.ObjectId().toString();

function createMockDocument(status?: string, ownerIdStr: string = USER_ID) {
  return {
    _id: new Types.ObjectId(DOC_ID),
    title: 'Architecture Specification',
    description: 'Technical spec for auth service',
    tags: ['auth', 'security'],
    status,
    fileName: 'auth-spec.md',
    filePath: '/uploads/auth-spec.md',
    fileType: 'text/markdown',
    fileSize: 1024,
    ownerId: new Types.ObjectId(ownerIdStr),
    isDeleted: false,
    save: vi.fn().mockResolvedValue({}),
  };
}

describe('Document Lifecycle Status & Review Event Triggers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('Correction 3: Existing legacy document with no status field safely falls back to DRAFT', async () => {
    const legacyDoc = createMockDocument(undefined);
    delete (legacyDoc as unknown as Record<string, unknown>).status;

    mockDocument.findOne.mockResolvedValue(legacyDoc as never);

    const res = await transitionDocumentStatusInternal(
      DOC_ID,
      USER_ID,
      'IN_REVIEW',
      'AUTOMATIC',
      'REVIEW_REQUEST',
    );

    expect(res.previousStatus).toBe('DRAFT');
    expect(legacyDoc.status).toBe('IN_REVIEW');
    expect(legacyDoc.save).toHaveBeenCalled();
  });

  it('Review request trigger: automatically transitions document from DRAFT to IN_REVIEW', async () => {
    const doc = createMockDocument('DRAFT');
    mockDocument.findOne.mockResolvedValue(doc as never);
    mockDocumentShare.findOne.mockResolvedValue({
      documentId: doc._id,
      sharedWithUserId: new Types.ObjectId(REVIEWER_ID),
      permission: 'READ',
    } as never);
    mockUser.findById.mockResolvedValue({
      _id: new Types.ObjectId(REVIEWER_ID),
      name: 'Reviewer Alice',
      email: 'alice@example.com',
      role: 'user',
      isActive: true,
      isDeleted: false,
    } as never);

    mockDocumentReview.findOne.mockResolvedValue(null);
    mockDocumentReview.create.mockResolvedValue({
      _id: new Types.ObjectId(REVIEW_ID),
      documentId: new Types.ObjectId(DOC_ID),
      requesterId: new Types.ObjectId(USER_ID),
      reviewerId: new Types.ObjectId(REVIEWER_ID),
      status: 'PENDING',
      createdAt: new Date(),
      updatedAt: new Date(),
    } as never);

    mockDocumentReview.findById.mockReturnValue({
      populate: vi.fn().mockReturnValue({
        populate: vi.fn().mockResolvedValue({
          _id: new Types.ObjectId(REVIEW_ID),
          documentId: new Types.ObjectId(DOC_ID),
          requesterId: { _id: new Types.ObjectId(USER_ID), name: 'Author', email: 'author@example.com' },
          reviewerId: { _id: new Types.ObjectId(REVIEWER_ID), name: 'Reviewer Alice', email: 'alice@example.com' },
          status: 'PENDING',
          createdAt: new Date(),
          updatedAt: new Date(),
        }),
      }),
    } as never);

    await createDocumentReview(USER_ID, 'user', DOC_ID, {
      reviewerId: REVIEWER_ID,
      comment: 'Please review',
    });

    expect(doc.status).toBe('IN_REVIEW');
  });

  it('Review approval trigger: automatically transitions document from IN_REVIEW to APPROVED', async () => {
    const doc = createMockDocument('IN_REVIEW');
    mockDocument.findOne.mockResolvedValue(doc as never);
    mockDocumentShare.findOne.mockResolvedValue({
      documentId: doc._id,
      sharedWithUserId: new Types.ObjectId(REVIEWER_ID),
      permission: 'READ',
    } as never);

    const review = {
      _id: new Types.ObjectId(REVIEW_ID),
      documentId: new Types.ObjectId(DOC_ID),
      requesterId: new Types.ObjectId(USER_ID),
      reviewerId: new Types.ObjectId(REVIEWER_ID),
      status: 'PENDING',
      save: vi.fn().mockResolvedValue({}),
    };

    mockDocumentReview.findOne.mockResolvedValue(review as never);
    mockDocumentReview.findById.mockReturnValue({
      populate: vi.fn().mockReturnValue({
        populate: vi.fn().mockResolvedValue({
          ...review,
          status: 'APPROVED',
          requesterId: { _id: new Types.ObjectId(USER_ID), name: 'Author', email: 'author@example.com' },
          reviewerId: { _id: new Types.ObjectId(REVIEWER_ID), name: 'Reviewer Alice', email: 'alice@example.com' },
        }),
      }),
    } as never);

    await approveDocumentReview(REVIEWER_ID, 'user', DOC_ID, REVIEW_ID, {
      comment: 'Looks great!',
    });

    expect(review.status).toBe('APPROVED');
    expect(doc.status).toBe('APPROVED');
  });

  it('Changes requested trigger: automatically transitions document from IN_REVIEW to DRAFT', async () => {
    const doc = createMockDocument('IN_REVIEW');
    mockDocument.findOne.mockResolvedValue(doc as never);
    mockDocumentShare.findOne.mockResolvedValue({
      documentId: doc._id,
      sharedWithUserId: new Types.ObjectId(REVIEWER_ID),
      permission: 'READ',
    } as never);

    const review = {
      _id: new Types.ObjectId(REVIEW_ID),
      documentId: new Types.ObjectId(DOC_ID),
      requesterId: new Types.ObjectId(USER_ID),
      reviewerId: new Types.ObjectId(REVIEWER_ID),
      status: 'PENDING',
      save: vi.fn().mockResolvedValue({}),
    };

    mockDocumentReview.findOne.mockResolvedValue(review as never);
    mockDocumentReview.findById.mockReturnValue({
      populate: vi.fn().mockReturnValue({
        populate: vi.fn().mockResolvedValue({
          ...review,
          status: 'CHANGES_REQUESTED',
          requesterId: { _id: new Types.ObjectId(USER_ID), name: 'Author', email: 'author@example.com' },
          reviewerId: { _id: new Types.ObjectId(REVIEWER_ID), name: 'Reviewer Alice', email: 'alice@example.com' },
        }),
      }),
    } as never);

    await requestChangesDocumentReview(REVIEWER_ID, 'user', DOC_ID, REVIEW_ID, {
      comment: 'Please update error handling',
    });

    expect(review.status).toBe('CHANGES_REQUESTED');
    expect(doc.status).toBe('DRAFT');
  });

  it('Correction 1: Editing metadata or file on an IN_REVIEW document preserves IN_REVIEW status and keeps review active', async () => {
    const doc = createMockDocument('IN_REVIEW');
    mockDocument.findOne.mockResolvedValue(doc as never);

    await updateDocument(USER_ID, DOC_ID, { title: 'Updated Title' });

    expect(doc.status).toBe('IN_REVIEW');
    expect(doc.title).toBe('Updated Title');
    expect(mockDocumentReview.updateMany).not.toHaveBeenCalled();
  });

  it('Approved edit trigger: editing an APPROVED document automatically resets status to DRAFT', async () => {
    const doc = createMockDocument('APPROVED');
    mockDocument.findOne.mockResolvedValue(doc as never);

    await updateDocument(USER_ID, DOC_ID, { title: 'Modified Approved Spec' });

    expect(doc.status).toBe('DRAFT');
    expect(doc.title).toBe('Modified Approved Spec');
  });

  it('Manual status override: authorized owner sets STALE or DEPRECATED', async () => {
    const doc = createMockDocument('DRAFT');
    mockDocument.findOne.mockResolvedValue(doc as never);
    mockDocument.findById.mockResolvedValue(doc as never);

    const res = await updateDocumentStatus(USER_ID, 'user', DOC_ID, {
      status: 'STALE',
      reason: 'Architecture updated',
    });

    expect(doc.status).toBe('STALE');
    expect(res.status).toBe('STALE');
  });

  it('Manual override on IN_REVIEW cancels active PENDING review', async () => {
    const doc = createMockDocument('IN_REVIEW');
    mockDocument.findOne.mockResolvedValue(doc as never);
    mockDocument.findById.mockResolvedValue(doc as never);
    mockDocumentReview.updateMany.mockResolvedValue({ acknowledged: true, modifiedCount: 1 } as never);

    await updateDocumentStatus(USER_ID, 'user', DOC_ID, {
      status: 'DEPRECATED',
      reason: 'Project cancelled',
    });

    expect(doc.status).toBe('DEPRECATED');
    expect(mockDocumentReview.updateMany).toHaveBeenCalledWith(
      { documentId: doc._id, status: 'PENDING' },
      expect.objectContaining({
        $set: expect.objectContaining({ status: 'CANCELLED' }),
      }),
    );
  });

  it('READ-only user attempting manual status update is rejected with 403 Forbidden', async () => {
    const doc = createMockDocument('DRAFT', OTHER_USER_ID);
    mockDocument.findOne.mockResolvedValue(doc as never);
    mockDocumentShare.findOne.mockResolvedValue({
      documentId: doc._id,
      sharedWithUserId: new Types.ObjectId(USER_ID),
      permission: 'READ',
    } as never);

    await expect(
      updateDocumentStatus(USER_ID, 'user', DOC_ID, { status: 'DEPRECATED' }),
    ).rejects.toThrow('Forbidden');
  });
});
