import { describe, expect, it } from 'vitest';

import {
  createProjectSchema,
  updateProjectSchema,
  projectParamsSchema,
  assignProjectDocumentSchema,
  projectDocumentParamsSchema,
} from './project.schema.js';

describe('Project Validation Schemas', () => {
  describe('createProjectSchema', () => {
    it('validates a correct payload', () => {
      const result = createProjectSchema.safeParse({
        name: 'Payment Modernization',
        description: 'Modernizing payment microservices',
      });
      expect(result.success).toBe(true);
    });

    it('rejects short name', () => {
      const result = createProjectSchema.safeParse({
        name: 'A',
      });
      expect(result.success).toBe(false);
    });

    it('rejects extra unknown properties', () => {
      const result = createProjectSchema.safeParse({
        name: 'Valid Name',
        invalidProp: true,
      });
      expect(result.success).toBe(false);
    });
  });

  describe('updateProjectSchema', () => {
    it('validates a correct update payload', () => {
      const result = updateProjectSchema.safeParse({
        name: 'Updated Project Name',
      });
      expect(result.success).toBe(true);
    });

    it('rejects empty payload', () => {
      const result = updateProjectSchema.safeParse({});
      expect(result.success).toBe(false);
    });
  });

  describe('projectParamsSchema', () => {
    it('validates valid MongoDB ObjectId', () => {
      const result = projectParamsSchema.safeParse({
        id: '507f1f77bcf86cd799439011',
      });
      expect(result.success).toBe(true);
    });

    it('rejects invalid ObjectId string', () => {
      const result = projectParamsSchema.safeParse({
        id: 'invalid-id',
      });
      expect(result.success).toBe(false);
    });
  });

  describe('assignProjectDocumentSchema', () => {
    it('validates correct documentId', () => {
      const result = assignProjectDocumentSchema.safeParse({
        documentId: '507f1f77bcf86cd799439022',
      });
      expect(result.success).toBe(true);
    });
  });

  describe('projectDocumentParamsSchema', () => {
    it('validates valid project ID and document ID params', () => {
      const result = projectDocumentParamsSchema.safeParse({
        id: '507f1f77bcf86cd799439011',
        documentId: '507f1f77bcf86cd799439022',
      });
      expect(result.success).toBe(true);
    });
  });
});
