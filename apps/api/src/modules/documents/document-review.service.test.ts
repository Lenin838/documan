import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Types } from 'mongoose';

import {
  createDocumentReview,
  getDocumentReviews,
  approveDocumentReview,
  requestChangesDocumentReview,
  getPendingReviews,
} from './document-review.service.js';
import { DocumentReview } from './document-review.model.js';
import { Document } from './document.model.js';
import { DocumentShare } from '../document-shares/document-share.model.js';
import { User } from '../users/user.model.js';
import * as auditService from './document-audit.service.js';

vi.mock('./document-review.model.js', () => ({
  DocumentReview: {
    create: vi.fn(),
    find: vi.fn(),
    findOne: vi.fn(),
    findById: vi.fn(),
  },
}));

vi.mock('./document.model.js', () => ({
  Document: {
    findOne: vi.fn(),
  },
}));

vi.mock('../document-shares/document-share.model.js', () => ({
  DocumentShare: {
    find: vi.fn(),
    findOne: vi.fn(),
  },
}));

vi.mock('../users/user.model.js', () => ({
  User: {
    findById: vi.fn(),
  },
}));

vi.mock('./document-audit.service.js', () => ({
  createDocumentAudit: vi.fn().mockResolvedValue({}),
}));

describe('document-review.service', () => {
  const ownerId = new Types.ObjectId('507f1f77bcf86cd799439011');
  const reviewerId = new Types.ObjectId('507f1f77bcf86cd799439022');
  const readUserId = new Types.ObjectId('507f1f77bcf86cd799439033');
  const editUserId = new Types.ObjectId('507f1f77bcf86cd799439044');
  const unauthorizedUserId = new Types.ObjectId('507f1f77bcf86cd799439055');
  const documentId = new Types.ObjectId('507f1f77bcf86cd799439066');
  const reviewId = new Types.ObjectId('507f1f77bcf86cd799439077');

  const mockDocument = {
    _id: documentId,
    title: 'Review Spec',
    fileName: 'spec.pdf',
    fileType: 'pdf',
    ownerId,
    isDeleted: false,
  };

  const mockReviewerUser = {
    _id: reviewerId,
    name: 'Jane Reviewer',
    email: 'jane@example.com',
    role: 'user',
    isActive: true,
    isDeleted: false,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createDocumentReview', () => {
    it('1. Owner can request a review', async () => {
      vi.mocked(Document.findOne).mockResolvedValue(mockDocument as never);
      vi.mocked(User.findById).mockResolvedValue(mockReviewerUser as never);
      vi.mocked(DocumentShare.findOne).mockResolvedValue({
        documentId,
        sharedWithUserId: reviewerId,
        permission: 'READ',
      } as never);
      vi.mocked(DocumentReview.findOne).mockResolvedValue(null);

      const mockReviewObj = {
        _id: reviewId,
        documentId,
        requesterId: ownerId,
        reviewerId,
        status: 'PENDING',
        comment: 'Please check spec',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(DocumentReview.create).mockResolvedValue(mockReviewObj as never);
      vi.mocked(DocumentReview.findById).mockReturnValue({
        populate: vi.fn().mockReturnValue({
          populate: vi.fn().mockResolvedValue(mockReviewObj),
        }),
      } as never);

      const result = await createDocumentReview(
        ownerId.toString(),
        'user',
        documentId.toString(),
        {
          reviewerId: reviewerId.toString(),
          comment: 'Please check spec',
        },
      );

      expect(result.id).toBe(reviewId.toString());
      expect(result.status).toBe('PENDING');
      expect(auditService.createDocumentAudit).toHaveBeenCalledWith(
        documentId.toString(),
        ownerId.toString(),
        'REVIEW_REQUEST',
        expect.anything(),
      );
    });

    it('2. EDIT user can request a review', async () => {
      vi.mocked(Document.findOne).mockResolvedValue(mockDocument as never);
      vi.mocked(DocumentShare.findOne)
        .mockResolvedValueOnce({
          documentId,
          sharedWithUserId: editUserId,
          permission: 'EDIT',
        } as never)
        .mockResolvedValueOnce({
          documentId,
          sharedWithUserId: reviewerId,
          permission: 'READ',
        } as never);
      vi.mocked(User.findById).mockResolvedValue(mockReviewerUser as never);
      vi.mocked(DocumentReview.findOne).mockResolvedValue(null);

      const mockReviewObj = {
        _id: reviewId,
        documentId,
        requesterId: editUserId,
        reviewerId,
        status: 'PENDING',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(DocumentReview.create).mockResolvedValue(mockReviewObj as never);
      vi.mocked(DocumentReview.findById).mockReturnValue({
        populate: vi.fn().mockReturnValue({
          populate: vi.fn().mockResolvedValue(mockReviewObj),
        }),
      } as never);

      const result = await createDocumentReview(
        editUserId.toString(),
        'user',
        documentId.toString(),
        { reviewerId: reviewerId.toString() },
      );

      expect(result.id).toBe(reviewId.toString());
    });

    it('3. READ-only user CANNOT request a review (403 FORBIDDEN)', async () => {
      vi.mocked(Document.findOne).mockResolvedValue(mockDocument as never);
      vi.mocked(DocumentShare.findOne).mockResolvedValue({
        documentId,
        sharedWithUserId: readUserId,
        permission: 'READ',
      } as never);

      await expect(
        createDocumentReview(
          readUserId.toString(),
          'user',
          documentId.toString(),
          { reviewerId: reviewerId.toString() },
        ),
      ).rejects.toMatchObject({ statusCode: 403, code: 'FORBIDDEN' });
    });

    it('4. Reviewer Selection Security - Non-existent reviewer rejected', async () => {
      vi.mocked(Document.findOne).mockResolvedValue(mockDocument as never);
      vi.mocked(User.findById).mockResolvedValue(null);

      await expect(
        createDocumentReview(
          ownerId.toString(),
          'user',
          documentId.toString(),
          { reviewerId: reviewerId.toString() },
        ),
      ).rejects.toMatchObject({ statusCode: 400, code: 'REVIEWER_NOT_FOUND' });
    });

    it('5. Reviewer Selection Security - Inactive reviewer rejected', async () => {
      vi.mocked(Document.findOne).mockResolvedValue(mockDocument as never);
      vi.mocked(User.findById).mockResolvedValue({
        ...mockReviewerUser,
        isActive: false,
      } as never);

      await expect(
        createDocumentReview(
          ownerId.toString(),
          'user',
          documentId.toString(),
          { reviewerId: reviewerId.toString() },
        ),
      ).rejects.toMatchObject({ statusCode: 400, code: 'REVIEWER_INACTIVE' });
    });

    it('6. Reviewer Selection Security - Deleted reviewer rejected', async () => {
      vi.mocked(Document.findOne).mockResolvedValue(mockDocument as never);
      vi.mocked(User.findById).mockResolvedValue({
        ...mockReviewerUser,
        isDeleted: true,
      } as never);

      await expect(
        createDocumentReview(
          ownerId.toString(),
          'user',
          documentId.toString(),
          { reviewerId: reviewerId.toString() },
        ),
      ).rejects.toMatchObject({ statusCode: 400, code: 'REVIEWER_DELETED' });
    });

    it('7. Reviewer Selection Security - Reviewer without document READ access rejected', async () => {
      vi.mocked(Document.findOne).mockResolvedValue(mockDocument as never);
      vi.mocked(User.findById).mockResolvedValue(mockReviewerUser as never);
      // Reviewer has no document share
      vi.mocked(DocumentShare.findOne).mockResolvedValue(null);

      await expect(
        createDocumentReview(
          ownerId.toString(),
          'user',
          documentId.toString(),
          { reviewerId: reviewerId.toString() },
        ),
      ).rejects.toMatchObject({ statusCode: 400, code: 'REVIEWER_NOT_AUTHORIZED' });
    });

    it('8. Duplicate review request while PENDING rejected with 400 REVIEW_ALREADY_PENDING', async () => {
      vi.mocked(Document.findOne).mockResolvedValue(mockDocument as never);
      vi.mocked(User.findById).mockResolvedValue(mockReviewerUser as never);
      vi.mocked(DocumentShare.findOne).mockResolvedValue({
        documentId,
        sharedWithUserId: reviewerId,
        permission: 'READ',
      } as never);
      vi.mocked(DocumentReview.findOne).mockResolvedValue({
        _id: reviewId,
        status: 'PENDING',
      } as never);

      await expect(
        createDocumentReview(
          ownerId.toString(),
          'user',
          documentId.toString(),
          { reviewerId: reviewerId.toString() },
        ),
      ).rejects.toMatchObject({ statusCode: 400, code: 'REVIEW_ALREADY_PENDING' });
    });
  });

  describe('getDocumentReviews', () => {
    it('allows authorized READ user to view reviews', async () => {
      vi.mocked(Document.findOne).mockResolvedValue(mockDocument as never);
      vi.mocked(DocumentShare.findOne).mockResolvedValue({
        documentId,
        sharedWithUserId: readUserId,
        permission: 'READ',
      } as never);

      vi.mocked(DocumentReview.find).mockReturnValue({
        populate: vi.fn().mockReturnValue({
          populate: vi.fn().mockReturnValue({
            sort: vi.fn().mockResolvedValue([
              {
                _id: reviewId,
                documentId,
                requesterId: ownerId,
                reviewerId,
                status: 'PENDING',
                createdAt: new Date(),
                updatedAt: new Date(),
              },
            ]),
          }),
        }),
      } as never);

      const reviews = await getDocumentReviews(
        readUserId.toString(),
        'user',
        documentId.toString(),
      );

      expect(reviews).toHaveLength(1);
    });

    it('returns 404 DOCUMENT_NOT_FOUND to unauthorized user', async () => {
      vi.mocked(Document.findOne).mockResolvedValue(mockDocument as never);
      vi.mocked(DocumentShare.findOne).mockResolvedValue(null);

      await expect(
        getDocumentReviews(
          unauthorizedUserId.toString(),
          'user',
          documentId.toString(),
        ),
      ).rejects.toMatchObject({ statusCode: 404, code: 'DOCUMENT_NOT_FOUND' });
    });
  });

  describe('approveDocumentReview & requestChangesDocumentReview', () => {
    it('allows assigned reviewer to approve review', async () => {
      vi.mocked(Document.findOne).mockResolvedValue(mockDocument as never);
      vi.mocked(DocumentShare.findOne).mockResolvedValue({
        documentId,
        sharedWithUserId: reviewerId,
        permission: 'READ',
      } as never);

      const mockReviewObj = {
        _id: reviewId,
        documentId,
        requesterId: ownerId,
        reviewerId,
        status: 'PENDING',
        save: vi.fn().mockResolvedValue(true),
      };

      vi.mocked(DocumentReview.findOne).mockResolvedValue(mockReviewObj as never);
      vi.mocked(DocumentReview.findById).mockReturnValue({
        populate: vi.fn().mockReturnValue({
          populate: vi.fn().mockResolvedValue(mockReviewObj),
        }),
      } as never);

      const result = await approveDocumentReview(
        reviewerId.toString(),
        'user',
        documentId.toString(),
        reviewId.toString(),
        { comment: 'Looks great!' },
      );

      expect(result.status).toBe('APPROVED');
      expect(mockReviewObj.status).toBe('APPROVED');
      expect(mockReviewObj.save).toHaveBeenCalled();
      expect(auditService.createDocumentAudit).toHaveBeenCalledWith(
        documentId.toString(),
        reviewerId.toString(),
        'REVIEW_APPROVED',
        expect.anything(),
      );
    });

    it('allows assigned reviewer to request changes', async () => {
      vi.mocked(Document.findOne).mockResolvedValue(mockDocument as never);
      vi.mocked(DocumentShare.findOne).mockResolvedValue({
        documentId,
        sharedWithUserId: reviewerId,
        permission: 'READ',
      } as never);

      const mockReviewObj = {
        _id: reviewId,
        documentId,
        requesterId: ownerId,
        reviewerId,
        status: 'PENDING',
        save: vi.fn().mockResolvedValue(true),
      };

      vi.mocked(DocumentReview.findOne).mockResolvedValue(mockReviewObj as never);
      vi.mocked(DocumentReview.findById).mockReturnValue({
        populate: vi.fn().mockReturnValue({
          populate: vi.fn().mockResolvedValue(mockReviewObj),
        }),
      } as never);

      await requestChangesDocumentReview(
        reviewerId.toString(),
        'user',
        documentId.toString(),
        reviewId.toString(),
        { comment: 'Please fix section 2' },
      );

      expect(mockReviewObj.status).toBe('CHANGES_REQUESTED');
      expect(mockReviewObj.save).toHaveBeenCalled();
      expect(auditService.createDocumentAudit).toHaveBeenCalledWith(
        documentId.toString(),
        reviewerId.toString(),
        'REVIEW_CHANGES_REQUESTED',
        expect.anything(),
      );
    });

    it('rejects resolution attempt from non-assigned user (403 FORBIDDEN)', async () => {
      vi.mocked(Document.findOne).mockResolvedValue(mockDocument as never);
      vi.mocked(DocumentShare.findOne).mockResolvedValue({
        documentId,
        sharedWithUserId: editUserId,
        permission: 'EDIT',
      } as never);

      vi.mocked(DocumentReview.findOne).mockResolvedValue({
        _id: reviewId,
        documentId,
        reviewerId,
        status: 'PENDING',
      } as never);

      await expect(
        approveDocumentReview(
          editUserId.toString(),
          'user',
          documentId.toString(),
          reviewId.toString(),
        ),
      ).rejects.toMatchObject({ statusCode: 403, code: 'FORBIDDEN' });
    });
  });

  describe('getPendingReviews', () => {
    it('returns list of pending reviews for assigned reviewer', async () => {
      const mockReviewDoc = {
        _id: reviewId,
        documentId: mockDocument,
        requesterId: { _id: ownerId, name: 'Owner', email: 'owner@example.com' },
        reviewerId: { _id: reviewerId, name: 'Reviewer', email: 'rev@example.com' },
        status: 'PENDING',
      };

      vi.mocked(DocumentReview.find).mockReturnValue({
        populate: vi.fn().mockReturnValue({
          populate: vi.fn().mockReturnValue({
            populate: vi.fn().mockReturnValue({
              sort: vi.fn().mockResolvedValue([mockReviewDoc]),
            }),
          }),
        }),
      } as never);

      vi.mocked(Document.findOne).mockResolvedValue(mockDocument as never);
      vi.mocked(DocumentShare.findOne).mockResolvedValue({
        documentId,
        sharedWithUserId: reviewerId,
        permission: 'READ',
      } as never);

      const pending = await getPendingReviews(
        reviewerId.toString(),
        'user',
      );

      expect(pending).toHaveLength(1);
    });
  });
});
