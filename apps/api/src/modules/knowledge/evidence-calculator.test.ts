import { describe, expect, it } from 'vitest';
import { calculateEvidenceCoverage } from './evidence-calculator.js';
import type { EvidenceCoverageContext } from './evidence.types.js';

const EVALUATION_AT = new Date('2026-09-03T12:00:00.000Z');

function createBaseContext(overrides?: Partial<EvidenceCoverageContext>): EvidenceCoverageContext {
  return {
    documentId: '507f1f77bcf86cd799439011',
    documentTitle: 'OAuth 2.0 Spec',
    currentVersion: 1,
    lastApprovedVersion: 1,
    status: 'APPROVED',
    needsVerification: false,
    activeImpactSources: [],
    endpoints: [],
    dependencies: [],
    references: [],
    versions: [
      {
        versionNumber: 1,
        createdAt: new Date('2026-08-01'),
        createdById: '507f1f77bcf86cd799439099',
        createdByName: 'Alice Author',
      },
    ],
    governance: {
      status: 'APPROVED',
      currentVersion: 1,
      lastApprovedVersion: 1,
      lastReviewedAt: new Date('2026-08-01'),
      createdAt: new Date('2026-01-01'),
      isGovernanceEnabled: true,
      maxUnreviewedDays: 90,
      stewardUser: { id: '507f1f77bcf86cd799439099', name: 'Alice Author' },
      ownerUser: { id: '507f1f77bcf86cd799439099', name: 'Alice Author' },
    },
    evaluationAt: EVALUATION_AT,
    ...overrides,
  };
}

describe('Evidence Calculator (Pure Calculator)', () => {
  it('Scenario 1: Pristine context with version & governance returns 100% EXCELLENT coverage', () => {
    const ctx = createBaseContext();
    const res = calculateEvidenceCoverage(ctx);

    expect(res.coverageScore).toBe(100);
    expect(res.label).toBe('EXCELLENT');
    expect(res.applicableCount).toBe(2); // 1 version snapshot + 1 governance review
    expect(res.verifiedCount).toBe(2);
    expect(res.staleCount).toBe(0);
    expect(res.remediations).toHaveLength(0);
  });

  it('Scenario 2: Zero applicable items returns 100% with NO_APPLICABLE_EVIDENCE label', () => {
    const ctx = createBaseContext({ versions: [], governance: null });
    const res = calculateEvidenceCoverage(ctx);

    expect(res.coverageScore).toBe(100);
    expect(res.label).toBe('NO_APPLICABLE_EVIDENCE');
    expect(res.applicableCount).toBe(0);
  });

  it('Scenario 3: Orphaned API endpoint link marks state ORPHANED', () => {
    const ctx = createBaseContext({
      endpoints: [
        {
          linkId: 'ep1',
          endpointId: 'epId1',
          method: 'POST',
          path: '/api/v1/auth/token',
          status: 'ORPHANED',
        },
      ],
    });
    const res = calculateEvidenceCoverage(ctx);
    const epItem = res.items.find((i) => i.category === 'API_ENDPOINT');

    expect(epItem).toBeDefined();
    expect(epItem?.state).toBe('ORPHANED');
    expect(epItem?.syntheticId).toBe('ep_link_ep1');
    expect(res.orphanedCount).toBe(1);
    expect(res.remediations.some((r) => r.code === 'CLEANUP_ORPHANED_EVIDENCE')).toBe(true);
  });

  it('Scenario 4: Active impact source matching marks target dependency STALE', () => {
    const ctx = createBaseContext({
      needsVerification: true,
      activeImpactSources: [
        {
          upstreamDocumentId: '507f1f77bcf86cd799439044',
          upstreamVersionNumber: 4,
          changeType: 'FILE_REPLACED',
          flaggedAt: new Date(),
        },
      ],
      dependencies: [
        {
          relationshipId: 'rel1',
          targetDocumentId: '507f1f77bcf86cd799439044',
          targetTitle: 'Session Management Spec',
          type: 'DEPENDS_ON',
          targetStatus: 'APPROVED',
          targetVersion: 4,
          isDeleted: false,
        },
      ],
    });
    const res = calculateEvidenceCoverage(ctx);
    const depItem = res.items.find((i) => i.category === 'DOCUMENT_DEPENDENCY');

    expect(depItem).toBeDefined();
    expect(depItem?.state).toBe('STALE');
    expect(depItem?.syntheticId).toBe('dep_rel_rel1');
    expect(depItem?.stateReason).toContain('Upstream target document was modified (v4)');
    expect(res.staleCount).toBe(1);
  });

  it('Scenario 5: New unapproved document version (v2 > lastApproved v1) marks version snapshot STALE', () => {
    const ctx = createBaseContext({
      currentVersion: 2,
      lastApprovedVersion: 1,
      status: 'IN_REVIEW',
      versions: [
        {
          versionNumber: 2,
          createdAt: new Date(),
          createdById: 'u1',
          createdByName: 'Alice',
        },
      ],
    });
    const res = calculateEvidenceCoverage(ctx);
    const verItem = res.items.find((i) => i.category === 'VERSION_SNAPSHOT');

    expect(verItem).toBeDefined();
    expect(verItem?.state).toBe('STALE');
    expect(verItem?.stateReason).toContain('Content updated to v2 since last approved version v1');
  });

  it('Scenario 6: User provenance in evidence items contains id and name only (no email)', () => {
    const ctx = createBaseContext();
    const res = calculateEvidenceCoverage(ctx);
    const govItem = res.items.find((i) => i.category === 'GOVERNANCE_REVIEW');

    expect(govItem?.verifiedBy).toBeDefined();
    expect(govItem?.verifiedBy).toHaveProperty('id');
    expect(govItem?.verifiedBy).toHaveProperty('name');
    expect(govItem?.verifiedBy).not.toHaveProperty('email');
  });
});
