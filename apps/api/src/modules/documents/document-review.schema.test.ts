import { describe, it, expect } from 'vitest';
import {
  createDocumentReviewSchema,
  resolveDocumentReviewSchema,
  documentReviewParamsSchema,
} from './document-review.schema.js';

describe('document-review.schema', () => {
  describe('createDocumentReviewSchema', () => {
    it('validates valid review request input', () => {
      const valid = {
        reviewerId: '507f1f77bcf86cd799439022',
        comment: 'Please review before release',
      };
      const result = createDocumentReviewSchema.safeParse(valid);
      expect(result.success).toBe(true);
    });

    it('rejects invalid reviewerId', () => {
      const invalid = {
        reviewerId: 'invalid-id',
        comment: 'Comment',
      };
      const result = createDocumentReviewSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });

    it('rejects overly long comment', () => {
      const invalid = {
        reviewerId: '507f1f77bcf86cd799439022',
        comment: 'a'.repeat(1001),
      };
      const result = createDocumentReviewSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });
  });

  describe('resolveDocumentReviewSchema', () => {
    it('accepts optional comment', () => {
      const valid = { comment: 'Looks good' };
      const result = resolveDocumentReviewSchema.safeParse(valid);
      expect(result.success).toBe(true);
    });

    it('accepts empty object', () => {
      const result = resolveDocumentReviewSchema.safeParse({});
      expect(result.success).toBe(true);
    });
  });

  describe('documentReviewParamsSchema', () => {
    it('validates valid params', () => {
      const valid = {
        id: '507f1f77bcf86cd799439011',
        reviewId: '507f1f77bcf86cd799439022',
      };
      const result = documentReviewParamsSchema.safeParse(valid);
      expect(result.success).toBe(true);
    });

    it('rejects invalid params', () => {
      const invalid = { id: 'bad-id' };
      const result = documentReviewParamsSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });
  });
});
