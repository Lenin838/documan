import { describe, expect, it } from 'vitest';
import { knowledgeSearchQuerySchema } from './knowledge.schema.js';

describe('Knowledge Search Schema Validation', () => {
  it('validates default empty query input', () => {
    const parsed = knowledgeSearchQuerySchema.parse({});
    expect(parsed.q).toBe('');
    expect(parsed.page).toBe(1);
    expect(parsed.limit).toBe(20);
    expect(parsed.projectId).toBeUndefined();
  });

  it('validates custom query parameters', () => {
    const parsed = knowledgeSearchQuerySchema.parse({
      q: '  /api/v1/auth/token  ',
      projectId: '507f1f77bcf86cd799439011',
      page: '2',
      limit: '50',
    });
    expect(parsed.q).toBe('/api/v1/auth/token');
    expect(parsed.projectId).toBe('507f1f77bcf86cd799439011');
    expect(parsed.page).toBe(2);
    expect(parsed.limit).toBe(50);
  });

  it('rejects limit exceeding 100', () => {
    const res = knowledgeSearchQuerySchema.safeParse({ limit: 500 });
    expect(res.success).toBe(false);
  });
});
