import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Types } from 'mongoose';
import { AppError } from '../../errors/app-error.js';

vi.mock('../documents/document.model.js', () => ({
  Document: {
    findOne: vi.fn(),
  },
}));

vi.mock('../projects/project.model.js', () => ({
  Project: {
    findOne: vi.fn(),
  },
}));

vi.mock('../documents/document-review.model.js', () => ({
  DocumentReview: {
    find: vi.fn().mockReturnValue({ lean: vi.fn().mockResolvedValue([]) }),
  },
}));

vi.mock('../documents/document-audit.model.js', () => ({
  DocumentAudit: {
    find: vi.fn().mockReturnValue({
      populate: vi.fn().mockReturnValue({
        sort: vi.fn().mockReturnValue({
          lean: vi.fn().mockResolvedValue([]),
        }),
      }),
    }),
  },
}));

vi.mock('../documents/document-audit.service.js', () => ({
  createDocumentAudit: vi.fn().mockResolvedValue({}),
}));

vi.mock('../knowledge/evidence.service.js', () => ({
  getForwardEvidence: vi.fn().mockResolvedValue({
    coverageScore: 100,
    orphanedCount: 0,
    staleCount: 0,
  }),
}));

vi.mock('../documents/knowledge-risk.service.js', () => ({
  getDocumentKnowledgeHealth: vi.fn().mockResolvedValue({
    riskLevel: 'LOW',
    riskScore: 10,
  }),
}));

import { Document } from '../documents/document.model.js';
import { Project } from '../projects/project.model.js';
import { createDocumentAudit } from '../documents/document-audit.service.js';
import {
  getForwardAssurance,
  evaluateFormalAssurance,
  grantGovernanceWaiver,
  revokeGovernanceWaiver,
} from './assurance.service.js';

describe('assurance.service', () => {
  const docId = new Types.ObjectId().toString();
  const userId = new Types.ObjectId().toString();
  const projId = new Types.ObjectId().toString();

  const mockDoc = {
    _id: new Types.ObjectId(docId),
    title: 'Test Spec',
    status: 'APPROVED',
    version: 1,
    lastApprovedVersion: 1,
    createdAt: new Date(),
    ownerId: new Types.ObjectId(userId),
    projectId: new Types.ObjectId(projId),
    stewardId: new Types.ObjectId(userId),
  };

  const mockProj = {
    _id: new Types.ObjectId(projId),
    name: 'Documan Test Project',
    ownerId: new Types.ObjectId(userId),
    governanceSettings: { isGovernanceEnabled: true, maxUnreviewedDays: 90 },
    releaseGateSettings: { minFreshnessPercentage: 80 },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(Document.findOne).mockResolvedValue(mockDoc as never);
    vi.mocked(Project.findOne).mockResolvedValue(mockProj as never);
  });

  it('getForwardAssurance calculates assurance without writing audit log', async () => {
    const result = await getForwardAssurance(userId, 'user', docId);

    expect(result.status).toBe('READY');
    expect(createDocumentAudit).not.toHaveBeenCalled();
  });

  it('evaluateFormalAssurance creates GOVERNANCE_ASSURANCE_EVALUATED audit record', async () => {
    const result = await evaluateFormalAssurance(userId, 'user', docId);

    expect(result.status).toBe('READY');
    expect(createDocumentAudit).toHaveBeenCalledWith(
      docId,
      userId,
      'GOVERNANCE_ASSURANCE_EVALUATED',
      expect.objectContaining({ status: 'READY' }),
    );
  });

  it('grantGovernanceWaiver rejects non-owner non-admin with 403 FORBIDDEN', async () => {
    const strangerId = new Types.ObjectId().toString();

    await expect(
      grantGovernanceWaiver(strangerId, 'user', docId, {
        checkId: 'chk_evidence_coverage',
        reason: 'Unauthorized attempt',
      }),
    ).rejects.toThrow(AppError);
  });

  it('grantGovernanceWaiver rejects non-waivable check chk_stewardship_active', async () => {
    await expect(
      grantGovernanceWaiver(userId, 'user', docId, {
        checkId: 'chk_stewardship_active',
        reason: 'Illegal waiver',
      }),
    ).rejects.toThrow('Active stewardship requirement cannot be waived');
  });

  it('grantGovernanceWaiver creates GOVERNANCE_WAIVER_GRANTED audit record', async () => {
    await grantGovernanceWaiver(userId, 'user', docId, {
      checkId: 'chk_evidence_coverage',
      reason: 'Temporary exception for migration',
      expiresInDays: 30,
    });

    expect(createDocumentAudit).toHaveBeenCalledWith(
      docId,
      userId,
      'GOVERNANCE_WAIVER_GRANTED',
      expect.objectContaining({
        checkId: 'chk_evidence_coverage',
        reason: 'Temporary exception for migration',
      }),
    );
  });

  it('revokeGovernanceWaiver creates GOVERNANCE_WAIVER_REVOKED audit record', async () => {
    await revokeGovernanceWaiver(userId, 'user', docId, 'chk_evidence_coverage');

    expect(createDocumentAudit).toHaveBeenCalledWith(
      docId,
      userId,
      'GOVERNANCE_WAIVER_REVOKED',
      expect.objectContaining({
        checkId: 'chk_evidence_coverage',
      }),
    );
  });
});
