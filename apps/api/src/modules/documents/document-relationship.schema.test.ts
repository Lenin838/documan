import { describe, expect, it } from 'vitest';
import {
  createDocumentRelationshipSchema,
  documentRelationshipIdParamsSchema,
  documentRelationshipParamsSchema,
} from './document-relationship.schema.js';

describe('documentRelationshipSchema', () => {
  describe('createDocumentRelationshipSchema', () => {
    it('validates a valid create relationship payload', () => {
      const input = {
        targetDocumentId: '507f1f77bcf86cd799439011',
        type: 'REFERENCES',
      };

      const result = createDocumentRelationshipSchema.safeParse(input);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.targetDocumentId).toBe('507f1f77bcf86cd799439011');
        expect(result.data.type).toBe('REFERENCES');
      }
    });

    it('supports all valid relationship types', () => {
      const types = ['RELATED', 'REFERENCES', 'REPLACES', 'DEPENDS_ON'];
      for (const type of types) {
        const result = createDocumentRelationshipSchema.safeParse({
          targetDocumentId: '507f1f77bcf86cd799439011',
          type,
        });
        expect(result.success).toBe(true);
      }
    });

    it('fails when targetDocumentId is invalid', () => {
      const result = createDocumentRelationshipSchema.safeParse({
        targetDocumentId: 'invalid-id',
        type: 'DEPENDS_ON',
      });
      expect(result.success).toBe(false);
    });

    it('fails when type is invalid', () => {
      const result = createDocumentRelationshipSchema.safeParse({
        targetDocumentId: '507f1f77bcf86cd799439011',
        type: 'INVALID_TYPE',
      });
      expect(result.success).toBe(false);
    });

    it('fails when required fields are missing', () => {
      const result = createDocumentRelationshipSchema.safeParse({
        targetDocumentId: '507f1f77bcf86cd799439011',
      });
      expect(result.success).toBe(false);
    });

    it('fails when unexpected extra fields are provided (strict mode)', () => {
      const result = createDocumentRelationshipSchema.safeParse({
        targetDocumentId: '507f1f77bcf86cd799439011',
        type: 'RELATED',
        extra: 'field',
      });
      expect(result.success).toBe(false);
    });
  });

  describe('documentRelationshipParamsSchema', () => {
    it('validates a valid document ID param', () => {
      const result = documentRelationshipParamsSchema.safeParse({
        id: '507f1f77bcf86cd799439011',
      });
      expect(result.success).toBe(true);
    });

    it('fails on invalid document ID param', () => {
      const result = documentRelationshipParamsSchema.safeParse({
        id: '123',
      });
      expect(result.success).toBe(false);
    });
  });

  describe('documentRelationshipIdParamsSchema', () => {
    it('validates valid document ID and relationship ID params', () => {
      const result = documentRelationshipIdParamsSchema.safeParse({
        id: '507f1f77bcf86cd799439011',
        relationshipId: '507f1f77bcf86cd799439012',
      });
      expect(result.success).toBe(true);
    });

    it('fails when relationshipId is invalid', () => {
      const result = documentRelationshipIdParamsSchema.safeParse({
        id: '507f1f77bcf86cd799439011',
        relationshipId: 'bad-id',
      });
      expect(result.success).toBe(false);
    });
  });
});
