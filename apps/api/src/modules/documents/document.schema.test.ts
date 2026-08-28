import { describe, expect, it } from 'vitest';

import {
  createDocumentSchema,
  updateDocumentSchema,
  documentIdParamsSchema,
  documentsQuerySchema,
  documentAuditHistoryQuerySchema,
} from './document.schema.js';

describe('documentAuditHistoryQuerySchema', () => {
  it('should use default values for empty input', () => {
    const result = documentAuditHistoryQuerySchema.safeParse({});

    expect(result.success).toBe(true);

    if (result.success) {
      expect(result.data).toEqual({
        page: 1,
        limit: 10,
      });
    }
  });

  it('should parse and coerce valid string query parameters', () => {
    const result = documentAuditHistoryQuerySchema.safeParse({
      page: '2',
      limit: '20',
      action: 'UPDATE',
    });

    expect(result.success).toBe(true);

    if (result.success) {
      expect(result.data).toEqual({
        page: 2,
        limit: 20,
        action: 'UPDATE',
      });
    }
  });

  it('should accept all valid audit actions', () => {
    const validActions = [
      'CREATE',
      'UPDATE',
      'FILE_REPLACE',
      'VIEW',
      'DOWNLOAD',
      'DELETE',
      'RESTORE',
    ] as const;

    for (const action of validActions) {
      const result = documentAuditHistoryQuerySchema.safeParse({
        action,
      });

      expect(result.success).toBe(true);
    }
  });

  it('should reject invalid action', () => {
    const result = documentAuditHistoryQuerySchema.safeParse({
      action: 'INVALID_ACTION',
    });

    expect(result.success).toBe(false);
  });

  it('should reject page less than 1', () => {
    const result = documentAuditHistoryQuerySchema.safeParse({
      page: '0',
    });

    expect(result.success).toBe(false);
  });

  it('should reject limit less than 1', () => {
    const result = documentAuditHistoryQuerySchema.safeParse({
      limit: '0',
    });

    expect(result.success).toBe(false);
  });

  it('should reject limit greater than 100', () => {
    const result = documentAuditHistoryQuerySchema.safeParse({
      limit: '101',
    });

    expect(result.success).toBe(false);
  });
});

describe('createDocumentSchema', () => {
  it('should accept valid title and description', () => {
    const result = createDocumentSchema.safeParse({
      title: 'Valid Title',
      description: 'Valid Description',
    });

    expect(result.success).toBe(true);
  });

  it('should accept valid tags array and comma-separated tags string', () => {
    const result1 = createDocumentSchema.safeParse({
      title: 'Valid Title',
      tags: ['engineering', 'spec'],
    });
    expect(result1.success).toBe(true);
    if (result1.success) {
      expect(result1.data.tags).toEqual(['engineering', 'spec']);
    }

    const result2 = createDocumentSchema.safeParse({
      title: 'Valid Title',
      tags: 'engineering, spec',
    });
    expect(result2.success).toBe(true);
    if (result2.success) {
      expect(result2.data.tags).toEqual(['engineering', 'spec']);
    }
  });

  it('should reject short title', () => {
    const result = createDocumentSchema.safeParse({
      title: 'A',
    });

    expect(result.success).toBe(false);
  });
});

describe('updateDocumentSchema', () => {
  it('should accept valid title update', () => {
    const result = updateDocumentSchema.safeParse({
      title: 'Updated Title',
    });

    expect(result.success).toBe(true);
  });

  it('should accept valid tags update', () => {
    const result = updateDocumentSchema.safeParse({
      tags: ['v2', 'approved'],
    });

    expect(result.success).toBe(true);
  });

  it('should reject empty body', () => {
    const result = updateDocumentSchema.safeParse({});

    expect(result.success).toBe(false);
  });
});

describe('documentsQuerySchema', () => {
  it('should parse valid query parameters', () => {
    const result = documentsQuerySchema.safeParse({
      page: '1',
      limit: '10',
      search: 'report',
      tag: 'engineering',
      fileType: 'pdf',
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.tag).toBe('engineering');
      expect(result.data.fileType).toBe('pdf');
    }
  });
});

describe('documentIdParamsSchema', () => {
  it('should accept valid 24-char hex objectid', () => {
    const result = documentIdParamsSchema.safeParse({
      id: '507f1f77bcf86cd799439011',
    });

    expect(result.success).toBe(true);
  });

  it('should reject invalid objectid format', () => {
    const result = documentIdParamsSchema.safeParse({
      id: 'invalid-id',
    });

    expect(result.success).toBe(false);
  });
});
