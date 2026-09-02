/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import mongoose, { Types } from 'mongoose';

import { Project } from '../projects/project.model.js';
import { Document } from '../documents/document.model.js';
import { DocumentReview } from '../documents/document-review.model.js';
import { DocumentEndpointLink } from './document-endpoint-link.model.js';
import { processApiEndpointDrift } from './api-spec-drift.service.js';
import * as auditService from '../documents/document-audit.service.js';
import * as notificationService from '../notifications/notification.service.js';
import * as webhookService from '../webhooks/webhook-delivery.service.js';
import { evaluateReleaseGateInternal } from '../governance/release-gate-evaluator.service.js';

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

describe('Phase 7.2 - OpenAPI Endpoint Drift & Governance Integration', () => {
  const projectId = new Types.ObjectId().toString();
  const projObjId = new Types.ObjectId(projectId);
  const ownerId = new Types.ObjectId().toString();
  const ownerObjId = new Types.ObjectId(ownerId);
  const docId = new Types.ObjectId().toString();
  const docObjId = new Types.ObjectId(docId);
  const endpointId = new Types.ObjectId().toString();
  const endpointObjId = new Types.ObjectId(endpointId);

  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(mongoose.connection, 'readyState', 'get').mockReturnValue(1);
  });

  it('transitions APPROVED document to STALE when newly orphaned link is processed', async () => {
    vi.spyOn(Project, 'findOne').mockResolvedValue({
      _id: projObjId,
      isArchived: false,
      governanceSettings: {
        isGovernanceEnabled: true,
        autoMarkStaleOnUpstreamChange: true,
      },
    } as any);

    const mockSave = vi.fn().mockResolvedValue(true);
    const mockDoc = {
      _id: docObjId,
      title: 'User API Reference',
      projectId: projObjId,
      ownerId: ownerObjId,
      status: 'APPROVED',
      isDeleted: false,
      save: mockSave,
    };

    vi.spyOn(Document, 'findOne').mockResolvedValue(mockDoc as any);

    await processApiEndpointDrift({
      projectId,
      newlyOrphanedLinks: [
        {
          linkId: new Types.ObjectId(),
          documentId: docId,
          endpointId,
        },
      ],
      newlyDeprecatedEndpoints: [],
    });

    expect(mockDoc.status).toBe('STALE');
    expect(mockSave).toHaveBeenCalled();
    expect(auditService.createDocumentAudit).toHaveBeenCalledWith(
      docId,
      ownerId,
      'STATUS_CHANGE',
      expect.objectContaining({
        previousStatus: 'APPROVED',
        newStatus: 'STALE',
        triggerSource: 'AUTOMATED_GOVERNANCE',
        reason: 'Linked API endpoint removed in specification re-import',
      }),
    );
    expect(notificationService.createNotificationInternal).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'UPSTREAM_STALE',
      }),
    );
    expect(webhookService.dispatchWebhookEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: 'UPSTREAM_STALE',
      }),
    );
  });

  it('does NOT transition APPROVED document to STALE when autoMarkStaleOnUpstreamChange is false', async () => {
    vi.spyOn(Project, 'findOne').mockResolvedValue({
      _id: projObjId,
      isArchived: false,
      governanceSettings: {
        isGovernanceEnabled: true,
        autoMarkStaleOnUpstreamChange: false,
      },
    } as any);

    const mockSave = vi.fn().mockResolvedValue(true);
    const mockDoc = {
      _id: docObjId,
      title: 'User API Reference',
      projectId: projObjId,
      ownerId: ownerObjId,
      status: 'APPROVED',
      isDeleted: false,
      save: mockSave,
    };

    vi.spyOn(Document, 'findOne').mockResolvedValue(mockDoc as any);

    await processApiEndpointDrift({
      projectId,
      newlyOrphanedLinks: [
        {
          linkId: new Types.ObjectId(),
          documentId: docId,
          endpointId,
        },
      ],
      newlyDeprecatedEndpoints: [],
    });

    expect(mockDoc.status).toBe('APPROVED');
    expect(mockSave).not.toHaveBeenCalled();
    expect(auditService.createDocumentAudit).not.toHaveBeenCalled();
  });

  it('keeps document status UNCHANGED when newly deprecated endpoint is processed', async () => {
    vi.spyOn(Project, 'findOne').mockResolvedValue({
      _id: projObjId,
      isArchived: false,
      governanceSettings: {
        isGovernanceEnabled: true,
        autoMarkStaleOnUpstreamChange: true,
      },
    } as any);

    vi.spyOn(DocumentEndpointLink, 'find').mockResolvedValue([
      {
        _id: new Types.ObjectId(),
        projectId: projObjId,
        documentId: docObjId,
        endpointId: endpointObjId,
        status: 'LINKED',
      },
    ] as any);

    const mockSave = vi.fn().mockResolvedValue(true);
    const mockDoc = {
      _id: docObjId,
      title: 'User API Reference',
      projectId: projObjId,
      ownerId: ownerObjId,
      status: 'APPROVED',
      isDeleted: false,
      save: mockSave,
    };

    vi.spyOn(Document, 'findOne').mockResolvedValue(mockDoc as any);

    await processApiEndpointDrift({
      projectId,
      newlyOrphanedLinks: [],
      newlyDeprecatedEndpoints: [
        {
          endpointId,
          method: 'GET',
          path: '/users',
        },
      ],
    });

    // Document status remains APPROVED
    expect(mockDoc.status).toBe('APPROVED');
    expect(mockSave).not.toHaveBeenCalled();
    expect(notificationService.createNotificationInternal).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'UPSTREAM_DEPRECATED',
      }),
    );
    expect(webhookService.dispatchWebhookEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: 'UPSTREAM_DEPRECATED',
      }),
    );
  });

  it('evaluates CI release gate blocking for orphaned API links', async () => {
    vi.spyOn(Project, 'findOne').mockResolvedValue({
      _id: projObjId,
      isArchived: false,
      governanceSettings: {
        isGovernanceEnabled: true,
        maxUnreviewedDays: 90,
      },
      releaseGateSettings: {
        allowStale: false,
        allowPendingReviews: false,
        allowDeprecated: false,
        minFreshnessPercentage: 80,
        allowOrphanedApiLinks: false,
        allowDeprecatedApiEndpoints: true,
      },
    } as any);

    const mockDoc = {
      _id: docObjId,
      title: 'User API Reference',
      projectId: projObjId,
      ownerId: ownerObjId,
      status: 'APPROVED',
      isDeleted: false,
      createdAt: new Date(),
      lastReviewedAt: new Date(),
    };

    vi.spyOn(Document, 'find').mockResolvedValue([mockDoc] as any);
    vi.spyOn(DocumentReview, 'exists').mockResolvedValue(false as any);
    vi.spyOn(DocumentEndpointLink, 'exists').mockResolvedValue(true as any);

    const gateRes = await evaluateReleaseGateInternal(projectId);

    expect(gateRes.passed).toBe(false);
    expect(gateRes.status).toBe('BLOCKED');
    expect(gateRes.blockingDocuments.some((b) => b.reason.includes('orphaned API endpoints'))).toBe(true);
  });
});
