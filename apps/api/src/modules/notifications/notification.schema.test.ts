import { describe, expect, it } from 'vitest';

import {
  getNotificationsQuerySchema,
  notificationIdParamsSchema,
} from './notification.schema.js';

describe('notification.schema', () => {
  describe('getNotificationsQuerySchema', () => {
    it('should parse valid query defaults', () => {
      const result = getNotificationsQuerySchema.safeParse({});
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.page).toBe(1);
        expect(result.data.limit).toBe(20);
        expect(result.data.isRead).toBeUndefined();
      }
    });

    it('should transform isRead string boolean correctly', () => {
      const resTrue = getNotificationsQuerySchema.safeParse({ isRead: 'true' });
      expect(resTrue.success).toBe(true);
      if (resTrue.success) {
        expect(resTrue.data.isRead).toBe(true);
      }

      const resFalse = getNotificationsQuerySchema.safeParse({ isRead: 'false' });
      expect(resFalse.success).toBe(true);
      if (resFalse.success) {
        expect(resFalse.data.isRead).toBe(false);
      }
    });

    it('should reject invalid page or limit', () => {
      const result = getNotificationsQuerySchema.safeParse({ page: 0, limit: 100 });
      expect(result.success).toBe(false);
    });
  });

  describe('notificationIdParamsSchema', () => {
    it('should validate valid ObjectId', () => {
      const result = notificationIdParamsSchema.safeParse({
        id: '6a96540c455c29cfb3c2e95f',
      });
      expect(result.success).toBe(true);
    });

    it('should reject invalid ObjectId', () => {
      const result = notificationIdParamsSchema.safeParse({ id: 'invalid-id' });
      expect(result.success).toBe(false);
    });
  });
});
