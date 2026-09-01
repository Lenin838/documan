/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Types } from 'mongoose';

import { Webhook } from './webhook.model.js';
import { Project } from '../projects/project.model.js';
import {
  createWebhook,
  rotateWebhookSecret,
} from './webhook.service.js';

describe('Webhook Service & Authorization', () => {
  const ownerId = new Types.ObjectId().toString();
  const nonOwnerId = new Types.ObjectId().toString();
  const projectId = new Types.ObjectId().toString();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Authorization & Limits', () => {
    it('should throw 403 Forbidden for non-owner and non-admin users', async () => {
      vi.spyOn(Project, 'findOne').mockResolvedValue({
        _id: new Types.ObjectId(projectId),
        ownerId: new Types.ObjectId(ownerId),
        isArchived: false,
      } as any);

      await expect(
        createWebhook(nonOwnerId, 'user', projectId, {
          url: 'https://example.com/wh',
          events: ['*'],
        }),
      ).rejects.toThrow('Forbidden');
    });

    it('should allow Project Owner to create webhooks', async () => {
      vi.spyOn(Project, 'findOne').mockResolvedValue({
        _id: new Types.ObjectId(projectId),
        ownerId: new Types.ObjectId(ownerId),
        isArchived: false,
      } as any);

      vi.spyOn(Webhook, 'countDocuments').mockResolvedValue(0);
      vi.spyOn(Webhook, 'create').mockResolvedValue({
        _id: new Types.ObjectId(),
        projectId: new Types.ObjectId(projectId),
        url: 'https://example.com/wh',
        events: ['*'],
        isEnabled: true,
        consecutiveFailures: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any);

      const res = await createWebhook(ownerId, 'user', projectId, {
        url: 'https://example.com/wh',
        events: ['*'],
      });

      expect(res.url).toBe('https://example.com/wh');
      expect(res.secretPlaintextOnce).toBeDefined();
      expect(res.secretPlaintextOnce?.startsWith('doc_whsec_')).toBe(true);
    });

    it('should enforce maximum 5 active webhooks per project limit', async () => {
      vi.spyOn(Project, 'findOne').mockResolvedValue({
        _id: new Types.ObjectId(projectId),
        ownerId: new Types.ObjectId(ownerId),
        isArchived: false,
      } as any);

      vi.spyOn(Webhook, 'countDocuments').mockResolvedValue(5);

      await expect(
        createWebhook(ownerId, 'user', projectId, {
          url: 'https://example.com/wh6',
          events: ['*'],
        }),
      ).rejects.toThrow('Maximum active webhook limit (5) reached');
    });
  });

  describe('Secret Rotation', () => {
    it('should rotate secret and set previousSecretExpiresAt for 24 hours', async () => {
      const webhookId = new Types.ObjectId().toString();

      vi.spyOn(Project, 'findOne').mockResolvedValue({
        _id: new Types.ObjectId(projectId),
        ownerId: new Types.ObjectId(ownerId),
        isArchived: false,
      } as any);

      const mockSave = vi.fn().mockResolvedValue(true);
      const mockWebhook: Record<string, unknown> = {
        _id: new Types.ObjectId(webhookId),
        projectId: new Types.ObjectId(projectId),
        url: 'https://example.com/wh',
        secretEncrypted: 'old_encrypted',
        events: ['*'],
        isEnabled: true,
        consecutiveFailures: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
        save: mockSave,
      };

      vi.spyOn(Webhook, 'findOne').mockResolvedValue(mockWebhook as any);

      const res = await rotateWebhookSecret(ownerId, 'user', projectId, webhookId);

      expect(mockWebhook.previousSecretEncrypted).toBe('old_encrypted');
      expect(mockWebhook.previousSecretExpiresAt).toBeDefined();
      expect(res.secretPlaintextOnce).toBeDefined();
      expect(mockSave).toHaveBeenCalled();
    });
  });
});
