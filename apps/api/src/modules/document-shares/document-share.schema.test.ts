import { describe, expect, it } from 'vitest';
import {
  createDocumentShareSchema,
  documentShareIdParamsSchema,
  documentShareParamsSchema,
  updateDocumentShareSchema,
} from './document-share.schema.js';

describe('documentShareSchema', () => {
  describe('createDocumentShareSchema', () => {
    it('validates a valid create share payload', () => {
      const input = {
        email: 'target@example.com',
        permission: 'READ',
      };

      const result = createDocumentShareSchema.safeParse(input);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.email).toBe('target@example.com');
        expect(result.data.permission).toBe('READ');
      }
    });

    it('lowercases email automatically', () => {
      const input = {
        email: 'TARGET@EXAMPLE.COM',
        permission: 'EDIT',
      };

      const result = createDocumentShareSchema.safeParse(input);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.email).toBe('target@example.com');
      }
    });

    it('fails when email is invalid', () => {
      const input = {
        email: 'not-an-email',
        permission: 'READ',
      };

      const result = createDocumentShareSchema.safeParse(input);
      expect(result.success).toBe(false);
    });

    it('fails when permission is invalid', () => {
      const input = {
        email: 'target@example.com',
        permission: 'INVALID',
      };

      const result = createDocumentShareSchema.safeParse(input);
      expect(result.success).toBe(false);
    });
  });

  describe('updateDocumentShareSchema', () => {
    it('validates a valid update payload', () => {
      const result = updateDocumentShareSchema.safeParse({
        permission: 'EDIT',
      });
      expect(result.success).toBe(true);
    });

    it('fails on invalid permission', () => {
      const result = updateDocumentShareSchema.safeParse({
        permission: 'OWNER',
      });
      expect(result.success).toBe(false);
    });
  });

  describe('documentShareParamsSchema', () => {
    it('validates valid ObjectId document id', () => {
      const result = documentShareParamsSchema.safeParse({
        id: '507f1f77bcf86cd799439011',
      });
      expect(result.success).toBe(true);
    });

    it('fails on invalid document id', () => {
      const result = documentShareParamsSchema.safeParse({
        id: '123',
      });
      expect(result.success).toBe(false);
    });
  });

  describe('documentShareIdParamsSchema', () => {
    it('validates valid document id and share id', () => {
      const result = documentShareIdParamsSchema.safeParse({
        id: '507f1f77bcf86cd799439011',
        shareId: '507f1f77bcf86cd799439012',
      });
      expect(result.success).toBe(true);
    });
  });
});
