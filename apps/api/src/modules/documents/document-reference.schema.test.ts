import { describe, it, expect } from 'vitest';
import {
  createDocumentReferenceSchema,
  updateDocumentReferenceSchema,
  documentReferenceParamsSchema,
} from './document-reference.schema.js';

describe('document-reference.schema', () => {
  describe('createDocumentReferenceSchema', () => {
    it('validates valid reference creation input', () => {
      const valid = {
        type: 'API',
        title: 'OpenAPI Specification',
        url: 'https://api.example.com/docs',
      };
      const result = createDocumentReferenceSchema.safeParse(valid);
      expect(result.success).toBe(true);
    });

    it('rejects invalid reference type', () => {
      const invalid = {
        type: 'INVALID_TYPE',
        title: 'API Spec',
        url: 'https://example.com',
      };
      const result = createDocumentReferenceSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });

    it('rejects missing or too short title', () => {
      const invalid = {
        type: 'REPOSITORY',
        title: 'a',
        url: 'https://github.com/repo',
      };
      const result = createDocumentReferenceSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });

    it('rejects malformed or non-http/https URLs', () => {
      const invalidUrls = [
        'ftp://example.com',
        'javascript:alert(1)',
        'file:///etc/passwd',
        'not a url',
      ];

      for (const url of invalidUrls) {
        const result = createDocumentReferenceSchema.safeParse({
          type: 'SPECIFICATION',
          title: 'Spec Document',
          url,
        });
        expect(result.success).toBe(false);
      }
    });

    it('accepts valid http and https URLs', () => {
      const validUrls = [
        'http://localhost:3000/docs',
        'https://developer.mozilla.org/en-US/',
        'https://github.com/org/repo/issues/42',
      ];

      for (const url of validUrls) {
        const result = createDocumentReferenceSchema.safeParse({
          type: 'ISSUE',
          title: 'Issue Track',
          url,
        });
        expect(result.success).toBe(true);
      }
    });
  });

  describe('updateDocumentReferenceSchema', () => {
    it('accepts valid partial update input', () => {
      const valid = { title: 'Updated Title' };
      const result = updateDocumentReferenceSchema.safeParse(valid);
      expect(result.success).toBe(true);
    });

    it('rejects empty update object', () => {
      const result = updateDocumentReferenceSchema.safeParse({});
      expect(result.success).toBe(false);
    });
  });

  describe('documentReferenceParamsSchema', () => {
    it('validates valid MongoDB object IDs', () => {
      const valid = {
        id: '507f1f77bcf86cd799439011',
        referenceId: '507f1f77bcf86cd799439012',
      };
      const result = documentReferenceParamsSchema.safeParse(valid);
      expect(result.success).toBe(true);
    });

    it('rejects invalid MongoDB object IDs', () => {
      const invalid = {
        id: 'invalid-id',
        referenceId: '123',
      };
      const result = documentReferenceParamsSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });
  });
});
