import { describe, expect, it } from 'vitest';
import {
  createFolderSchema,
  folderIdParamsSchema,
  updateFolderSchema,
} from './folder.schema.js';

describe('folder.schema', () => {
  describe('createFolderSchema', () => {
    it('validates valid folder name', () => {
      const result = createFolderSchema.safeParse({ name: 'Project Alpha' });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.name).toBe('Project Alpha');
      }
    });

    it('trims folder name', () => {
      const result = createFolderSchema.safeParse({ name: '  Project Alpha  ' });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.name).toBe('Project Alpha');
      }
    });

    it('rejects empty folder name', () => {
      const result = createFolderSchema.safeParse({ name: '   ' });
      expect(result.success).toBe(false);
    });

    it('rejects overly long folder name', () => {
      const result = createFolderSchema.safeParse({ name: 'a'.repeat(101) });
      expect(result.success).toBe(false);
    });

    it('rejects extra unknown properties due to strict mode', () => {
      const result = createFolderSchema.safeParse({
        name: 'Project',
        unknownProp: 'invalid',
      });
      expect(result.success).toBe(false);
    });
  });

  describe('updateFolderSchema', () => {
    it('validates valid folder name update', () => {
      const result = updateFolderSchema.safeParse({ name: 'Updated Name' });
      expect(result.success).toBe(true);
    });

    it('rejects empty name update', () => {
      const result = updateFolderSchema.safeParse({ name: '' });
      expect(result.success).toBe(false);
    });
  });

  describe('folderIdParamsSchema', () => {
    it('validates valid 24-char hex ObjectId', () => {
      const result = folderIdParamsSchema.safeParse({
        id: '507f1f77bcf86cd799439011',
      });
      expect(result.success).toBe(true);
    });

    it('rejects invalid ObjectId', () => {
      const result = folderIdParamsSchema.safeParse({ id: 'invalid-id' });
      expect(result.success).toBe(false);
    });
  });
});
