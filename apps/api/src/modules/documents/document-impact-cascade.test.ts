/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import mongoose, { Types } from 'mongoose';

import { processUpstreamDocumentImpact } from './document-impact-cascade.service.js';
import { Document } from './document.model.js';
import { evaluateReleaseGateInternal } from '../governance/release-gate-evaluator.service.js';
import { Project } from '../projects/project.model.js';
import { DocumentReview } from './document-review.model.js';
import { DocumentEndpointLink } from '../api-specs/document-endpoint-link.model.js';
import { ProjectApiEndpoint } from '../api-specs/project-api-endpoint.model.js';

describe('Phase 7.3 — Cross-Document Change Impact & Cascade Engine', () => {
  const mockProjectId = new Types.ObjectId();

  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(Document, 'countDocuments').mockResolvedValue(1 as any);
    vi.spyOn(DocumentReview, 'exists').mockResolvedValue(null as any);
    vi.spyOn(DocumentReview, 'countDocuments').mockResolvedValue(0 as any);
    vi.spyOn(DocumentEndpointLink, 'exists').mockResolvedValue(null as any);
    vi.spyOn(DocumentEndpointLink, 'find').mockResolvedValue([] as any);
    vi.spyOn(ProjectApiEndpoint, 'exists').mockResolvedValue(null as any);
  });

  describe('1. Traversal & Relationship Boundaries', () => {
    it('returns impactedCount 0 for invalid upstream document ID', async () => {
      const result = await processUpstreamDocumentImpact({
        upstreamDocId: 'invalid-id',
        changeType: 'STALE',
      });
      expect(result.impactedCount).toBe(0);
    });

    it('returns impactedCount 0 when Mongoose connection is not ready', async () => {
      const spyState = vi.spyOn(mongoose.connection, 'readyState', 'get').mockReturnValue(0);
      const result = await processUpstreamDocumentImpact({
        upstreamDocId: new Types.ObjectId().toString(),
        changeType: 'STALE',
      });
      expect(result.impactedCount).toBe(0);
      spyState.mockRestore();
    });
  });

  describe('2. Verification & Concurrency Race Invariants', () => {
    it('preserves newly arrived impact C when verification resolves snapshot B', () => {
      const sourceB = {
        upstreamDocumentId: new Types.ObjectId(),
        changeType: 'STALE' as const,
        flaggedAt: new Date(),
      };
      const sourceC = {
        upstreamDocumentId: new Types.ObjectId(),
        changeType: 'FILE_REPLACED' as const,
        flaggedAt: new Date(),
      };

      // Document initial state with both B and C active
      const activeImpactSources = [sourceB, sourceC];
      
      // Verification targets sourceB snapshot
      const snapshotToResolve = [sourceB];
      const remainingSources = activeImpactSources.filter(
        (s) => !snapshotToResolve.some((r) => r.upstreamDocumentId === s.upstreamDocumentId && r.changeType === s.changeType),
      );

      expect(remainingSources.length).toBe(1);
      expect(remainingSources[0]!.changeType).toBe('FILE_REPLACED');
      expect(remainingSources[0]!.upstreamDocumentId).toBe(sourceC.upstreamDocumentId);
    });
  });

  describe('3. CI/CD Release Gate Policy Integration', () => {
    it('blocks release gate when allowUnverifiedImpacts is false and active unverified impact exists', async () => {
      const docId = new Types.ObjectId();
      const mockDocs = [
        {
          _id: docId,
          title: 'Impacted Service Spec',
          status: 'APPROVED',
          isDeleted: false,
          impactVerification: {
            needsVerification: true,
            activeImpactSources: [
              {
                upstreamDocumentId: new Types.ObjectId(),
                changeType: 'STALE',
                flaggedAt: new Date(),
              },
            ],
          },
        },
      ];

      vi.spyOn(Document, 'find').mockResolvedValue(mockDocs as any);

      vi.spyOn(Project, 'findOne').mockResolvedValue({
        _id: mockProjectId,
        isArchived: false,
        governanceSettings: { isGovernanceEnabled: true, maxUnreviewedDays: 90 },
        releaseGateSettings: {
          allowStale: true,
          allowPendingReviews: true,
          allowDeprecated: true,
          minFreshnessPercentage: 0,
          allowUnverifiedImpacts: false, // Strict Policy: block on unverified impact
        },
      } as any);

      const result = await evaluateReleaseGateInternal(mockProjectId.toString());

      expect(result.status).toBe('BLOCKED');
      expect(result.blockingDocuments.some((r) => r.reason.includes('unverified upstream dependency changes'))).toBe(true);
    });

    it('passes release gate when allowUnverifiedImpacts is true even if unverified impacts exist', async () => {
      const docId = new Types.ObjectId();
      const mockDocs = [
        {
          _id: docId,
          title: 'Impacted Service Spec',
          status: 'APPROVED',
          isDeleted: false,
          lastReviewedAt: new Date(),
          createdAt: new Date(),
          impactVerification: {
            needsVerification: true,
            activeImpactSources: [
              {
                upstreamDocumentId: new Types.ObjectId(),
                changeType: 'STALE',
                flaggedAt: new Date(),
              },
            ],
          },
        },
      ];

      vi.spyOn(Document, 'find').mockResolvedValue(mockDocs as any);

      vi.spyOn(Project, 'findOne').mockResolvedValue({
        _id: mockProjectId,
        isArchived: false,
        governanceSettings: { isGovernanceEnabled: true, maxUnreviewedDays: 90 },
        releaseGateSettings: {
          allowStale: true,
          allowPendingReviews: true,
          allowDeprecated: true,
          minFreshnessPercentage: 0,
          allowUnverifiedImpacts: true, // Default: allowed
        },
      } as any);

      const result = await evaluateReleaseGateInternal(mockProjectId.toString());

      expect(result.status).toBe('PASSED');
    });
  });
});
