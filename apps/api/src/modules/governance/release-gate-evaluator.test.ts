/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Types } from 'mongoose';

import { Project } from '../projects/project.model.js';
import { Document } from '../documents/document.model.js';
import { DocumentReview } from '../documents/document-review.model.js';
import { evaluateReleaseGateInternal } from './release-gate-evaluator.service.js';

describe('Release Gate Evaluator Engine', () => {
  const projectId = new Types.ObjectId().toString();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return PASSED for empty project (0 documents)', async () => {
    vi.spyOn(Project, 'findOne').mockResolvedValue({
      _id: new Types.ObjectId(projectId),
      isArchived: false,
      governanceSettings: { isGovernanceEnabled: true },
      releaseGateSettings: { allowStale: false, minFreshnessPercentage: 80 },
    } as any);

    vi.spyOn(Document, 'find').mockResolvedValue([] as any);

    const res = await evaluateReleaseGateInternal(projectId);

    expect(res.passed).toBe(true);
    expect(res.status).toBe('PASSED');
    expect(res.freshnessPercentage).toBe(100);
  });

  it('should return GOVERNANCE_DISABLED if isGovernanceEnabled === false', async () => {
    vi.spyOn(Project, 'findOne').mockResolvedValue({
      _id: new Types.ObjectId(projectId),
      isArchived: false,
      governanceSettings: { isGovernanceEnabled: false },
    } as any);

    vi.spyOn(Document, 'countDocuments').mockResolvedValue(5 as any);

    const res = await evaluateReleaseGateInternal(projectId);

    expect(res.passed).toBe(true);
    expect(res.status).toBe('GOVERNANCE_DISABLED');
  });

  it('should BLOCK release if document is STALE and allowStale === false', async () => {
    vi.spyOn(Project, 'findOne').mockResolvedValue({
      _id: new Types.ObjectId(projectId),
      isArchived: false,
      governanceSettings: { isGovernanceEnabled: true, maxUnreviewedDays: 30 },
      releaseGateSettings: { allowStale: false, allowPendingReviews: false, minFreshnessPercentage: 80 },
    } as any);

    const staleDoc = {
      _id: new Types.ObjectId(),
      title: 'Stale Spec',
      status: 'STALE',
      lastReviewedAt: new Date(Date.now() - 40 * 24 * 60 * 60 * 1000),
    };

    vi.spyOn(Document, 'find').mockResolvedValue([staleDoc] as any);
    vi.spyOn(DocumentReview, 'exists').mockResolvedValue(false as any);

    const res = await evaluateReleaseGateInternal(projectId);

    expect(res.passed).toBe(false);
    expect(res.status).toBe('BLOCKED');
    expect(res.blockingDocuments.length).toBe(1);
    expect(res.blockingDocuments[0]!.status).toBe('STALE');
  });

  it('should BLOCK release if document is IN_REVIEW and allowPendingReviews === false', async () => {
    vi.spyOn(Project, 'findOne').mockResolvedValue({
      _id: new Types.ObjectId(projectId),
      isArchived: false,
      governanceSettings: { isGovernanceEnabled: true },
      releaseGateSettings: { allowPendingReviews: false, minFreshnessPercentage: 80 },
    } as any);

    const reviewDoc = {
      _id: new Types.ObjectId(),
      title: 'Pending Review Doc',
      status: 'IN_REVIEW',
    };

    vi.spyOn(Document, 'find').mockResolvedValue([reviewDoc] as any);

    const res = await evaluateReleaseGateInternal(projectId);

    expect(res.passed).toBe(false);
    expect(res.status).toBe('BLOCKED');
    expect(res.blockingDocuments[0]!.status).toBe('IN_REVIEW');
  });

  it('should ignore DRAFT documents by default', async () => {
    vi.spyOn(Project, 'findOne').mockResolvedValue({
      _id: new Types.ObjectId(projectId),
      isArchived: false,
      governanceSettings: { isGovernanceEnabled: true },
      releaseGateSettings: { allowStale: false, minFreshnessPercentage: 80 },
    } as any);

    const draftDoc = {
      _id: new Types.ObjectId(),
      title: 'Draft Work In Progress',
      status: 'DRAFT',
    };

    vi.spyOn(Document, 'find').mockResolvedValue([draftDoc] as any);

    const res = await evaluateReleaseGateInternal(projectId);

    expect(res.passed).toBe(true);
    expect(res.status).toBe('PASSED');
    expect(res.blockingDocuments.length).toBe(0);
  });
});
