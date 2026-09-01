import { describe, it, expect } from 'vitest';
import { createWebhookSchema, updateWebhookSchema } from './webhook.schema.js';

describe('Webhook Zod Validation Schemas', () => {
  describe('createWebhookSchema', () => {
    it('should validate valid HTTPS webhook payload', () => {
      const valid = createWebhookSchema.parse({
        url: 'https://example.com/webhook',
        description: 'Test Webhook',
        events: ['REVIEW_REQUESTED', 'REVIEW_APPROVED'],
      });
      expect(valid.url).toBe('https://example.com/webhook');
      expect(valid.events).toEqual(['REVIEW_REQUESTED', 'REVIEW_APPROVED']);
    });

    it('should reject non-HTTPS URLs', () => {
      expect(() =>
        createWebhookSchema.parse({
          url: 'http://example.com/webhook',
        }),
      ).toThrow('Webhook URL must use HTTPS protocol');
    });

    it('should reject invalid URL strings', () => {
      expect(() =>
        createWebhookSchema.parse({
          url: 'not-a-url',
        }),
      ).toThrow();
    });

    it('should default events to ["*"] if omitted', () => {
      const res = createWebhookSchema.parse({
        url: 'https://example.com/hooks',
      });
      expect(res.events).toEqual(['*']);
    });
  });

  describe('updateWebhookSchema', () => {
    it('should allow partial updates', () => {
      const res = updateWebhookSchema.parse({
        isEnabled: false,
      });
      expect(res.isEnabled).toBe(false);
    });

    it('should validate updated HTTPS URL', () => {
      expect(() =>
        updateWebhookSchema.parse({
          url: 'http://insecure.com',
        }),
      ).toThrow('Webhook URL must use HTTPS protocol');
    });
  });
});
