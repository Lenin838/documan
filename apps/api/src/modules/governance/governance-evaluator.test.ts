/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Types } from 'mongoose';

import { Project } from '../projects/project.model.js';
import { Document } from '../documents/document.model.js';
import { DocumentRelationship } from '../documents/document-relationship.model.js';
import { evaluateProjectGovernanceInternal } from './governance-evaluator.service.js';
import * as auditService from '../documents/document-audit.service.js';
import * as notificationService from '../notifications/notification.service.js';
import * as webhookService from '../webhooks/webhook-delivery.service.js';

vi.mock('../documents/document-audit.service.js', () => ({
  createDocumentAudit: vi.fn().mockResolvedValue(true),
}));

vi.mock('../notifications/notification.service.js', () => ({
  createNotificationInternal: vi.fn().mockResolvedValue(true),
  safeNotify: vi.fn((fn: any) => fn()),
}));

vi.mock('../webhooks/webhook-delivery.service.js', () => ({
  dispatchWebhookEvent: vi.fn().mockResolvedValue(true),
  safeDispatchWebhook: vi.fn((fn: any) => fn()),
}));

describe('Governance Evaluator Engine', () => {
  const projectId = new Types.ObjectId().toString();
  const ownerId = new Types.ObjectId().toString();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should transition APPROVED document to STALE if unreviewed > maxUnreviewedDays', async () => {
    vi.spyOn(Project, 'findOne').mockResolvedValue({
      _id: new Types.ObjectId(projectId),
      isArchived: false,
      governanceSettings: {
        isGovernanceEnabled: true,
        maxUnreviewedDays: 30,
        autoMarkStaleOnUpstreamChange: true,
      },
    } as any);

    const oldDate = new Date(Date.now() - 40 * 24 * 60 * 60 * 1000); // 40 days ago
    const mockSave = vi.fn().mockResolvedValue(true);
    const mockDoc = {
      _id: new Types.ObjectId(),
      title: 'Old Spec',
      projectId: new Types.ObjectId(projectId),
      ownerId: new Types.ObjectId(ownerId),
      status: 'APPROVED',
      lastReviewedAt: oldDate,
      createdAt: oldDate,
      isDeleted: false,
      save: mockSave,
    };

    vi.spyOn(Document, 'find').mockResolvedValue([mockDoc] as any);

    const res = await evaluateProjectGovernanceInternal(projectId);

    expect(res.staleTransitionsCount).toBe(1);
    expect(mockDoc.status).toBe('STALE');
    expect(mockSave).toHaveBeenCalled();
    expect(auditService.createDocumentAudit).toHaveBeenCalled();
    expect(notificationService.safeNotify).toHaveBeenCalled();
    expect(webhookService.safeDispatchWebhook).toHaveBeenCalled();
  });

  it('should transition APPROVED document to STALE if upstream dependency is STALE', async () => {
    vi.spyOn(Project, 'findOne').mockResolvedValue({
      _id: new Types.ObjectId(projectId),
      isArchived: false,
      governanceSettings: {
        isGovernanceEnabled: true,
        maxUnreviewedDays: 90,
        autoMarkStaleOnUpstreamChange: true,
      },
    } as any);

    const recentDate = new Date(); // Fresh
    const mockSave = vi.fn().mockResolvedValue(true);
    const mockDoc = {
      _id: new Types.ObjectId(),
      title: 'Downstream Implementation',
      projectId: new Types.ObjectId(projectId),
      ownerId: new Types.ObjectId(ownerId),
      status: 'APPROVED',
      lastReviewedAt: recentDate,
      createdAt: recentDate,
      isDeleted: false,
      save: mockSave,
    };

    vi.spyOn(Document, 'find').mockResolvedValue([mockDoc] as any);
    vi.spyOn(DocumentRelationship, 'find').mockResolvedValue([
      {
        sourceDocumentId: mockDoc._id,
        targetDocumentId: new Types.ObjectId(),
        type: 'DEPENDS_ON',
      },
    ] as any);

    vi.spyOn(Document, 'findOne').mockResolvedValue({
      _id: new Types.ObjectId(),
      title: 'Upstream Core Standard',
      status: 'STALE',
      isDeleted: false,
    } as any);

    const res = await evaluateProjectGovernanceInternal(projectId);

    expect(res.staleTransitionsCount).toBe(1);
    expect(mockDoc.status).toBe('STALE');
    expect(mockSave).toHaveBeenCalled();
  });

  it('should ignore DRAFT, IN_REVIEW, STALE, and DEPRECATED documents', async () => {
    vi.spyOn(Project, 'findOne').mockResolvedValue({
      _id: new Types.ObjectId(projectId),
      isArchived: false,
      governanceSettings: {
        isGovernanceEnabled: true,
        maxUnreviewedDays: 30,
      },
    } as any);

    vi.spyOn(Document, 'find').mockResolvedValue([]); // APPROVED query returns 0 docs

    const res = await evaluateProjectGovernanceInternal(projectId);

    expect(res.staleTransitionsCount).toBe(0);
    expect(auditService.createDocumentAudit).not.toHaveBeenCalled();
  });
});
