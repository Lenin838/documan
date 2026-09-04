import { describe, it, expect } from 'vitest';
import { calculateDocumentAssurance } from './assurance-calculator.js';
import type { AssuranceCalculatorContext } from './assurance.types.js';

describe('assurance-calculator', () => {
  const baseContext: AssuranceCalculatorContext = {
    document: {
      id: 'doc123',
      title: 'System Tech Spec',
      status: 'APPROVED',
      version: 2,
      lastApprovedVersion: 2,
      createdAt: new Date('2026-01-01'),
      lastReviewedAt: new Date('2026-02-01'),
      ownerId: 'user1',
      stewardId: 'user1',
      impactVerification: {
        needsVerification: false,
        activeImpactSources: [],
      },
    },
    project: {
      id: 'proj1',
      name: 'Documan Core',
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
        allowDeprecatedApiEndpoints: false,
        allowUnverifiedImpacts: false,
      },
    },
    reviews: [],
    waiverEvents: [],
    evidenceCoverage: {
      coverageScore: 100,
      orphanedCount: 0,
      staleCount: 0,
    },
    knowledgeRisk: {
      riskScore: 10,
      riskLevel: 'LOW',
      effectiveContact: { id: 'user1', name: 'Alice Owner', isActive: true },
    },
    now: new Date('2026-02-15'),
  };

  it('evaluates READY status when all 12 checks pass', () => {
    const result = calculateDocumentAssurance(baseContext);

    expect(result.status).toBe('READY');
    expect(result.summary.totalChecks).toBe(12);
    expect(result.summary.passedCount).toBe(12);
    expect(result.summary.failedCount).toBe(0);
    expect(result.blockingReasons).toHaveLength(0);
  });

  it('evaluates GOVERNANCE_DISABLED status when project governance is disabled', () => {
    const ctx: AssuranceCalculatorContext = {
      ...baseContext,
      project: {
        ...baseContext.project!,
        governanceSettings: { isGovernanceEnabled: false, maxUnreviewedDays: 90 },
      },
    };

    const result = calculateDocumentAssurance(ctx);

    expect(result.status).toBe('GOVERNANCE_DISABLED');
    expect(result.checks[0]?.status).toBe('NOT_APPLICABLE');
  });

  it('evaluates BLOCKED when version mismatch exists (CRITICAL CORRECTION)', () => {
    const ctx: AssuranceCalculatorContext = {
      ...baseContext,
      document: {
        ...baseContext.document,
        version: 3,
        lastApprovedVersion: 2, // version mismatch
      },
    };

    const result = calculateDocumentAssurance(ctx);

    expect(result.status).toBe('BLOCKED');
    const chk = result.checks.find((c) => c.checkId === 'chk_version_alignment');
    expect(chk?.status).toBe('FAILED');
    expect(chk?.severity).toBe('BLOCKING');
  });

  it('applies an active waiver to transition check status to WAIVED', () => {
    const ctx: AssuranceCalculatorContext = {
      ...baseContext,
      evidenceCoverage: {
        coverageScore: 50, // fails min 80%
        orphanedCount: 0,
        staleCount: 0,
      },
      waiverEvents: [
        {
          action: 'GOVERNANCE_WAIVER_GRANTED',
          metadata: {
            checkId: 'chk_evidence_coverage',
            reason: 'Approved temporary migration waiver',
            documentVersion: 2,
            expiresAt: new Date('2026-03-01'),
          },
          user: { id: 'admin1', name: 'Bob Admin' },
          createdAt: new Date('2026-02-10'),
        },
      ],
    };

    const result = calculateDocumentAssurance(ctx);

    const chk = result.checks.find((c) => c.checkId === 'chk_evidence_coverage');
    expect(chk?.status).toBe('WAIVED');
    expect(chk?.waiver?.reason).toBe('Approved temporary migration waiver');
    expect(result.status).toBe('READY');
  });

  it('invalidates a waiver when document version changes', () => {
    const ctx: AssuranceCalculatorContext = {
      ...baseContext,
      document: {
        ...baseContext.document,
        version: 3, // version bumped from 2 to 3
      },
      evidenceCoverage: {
        coverageScore: 50,
        orphanedCount: 0,
        staleCount: 0,
      },
      waiverEvents: [
        {
          action: 'GOVERNANCE_WAIVER_GRANTED',
          metadata: {
            checkId: 'chk_evidence_coverage',
            reason: 'Waiver for v2',
            documentVersion: 2,
            expiresAt: new Date('2026-03-01'),
          },
          user: { id: 'admin1', name: 'Bob Admin' },
          createdAt: new Date('2026-02-10'),
        },
      ],
    };

    const result = calculateDocumentAssurance(ctx);

    const chk = result.checks.find((c) => c.checkId === 'chk_evidence_coverage');
    expect(chk?.status).toBe('FAILED');
    expect(chk?.waiver?.isVersionInvalidated).toBe(true);
  });

  it('does NOT allow waiving non-waivable check chk_stewardship_active', () => {
    const ctx: AssuranceCalculatorContext = {
      ...baseContext,
      knowledgeRisk: {
        riskScore: 80,
        riskLevel: 'HIGH',
        effectiveContact: { id: 'user1', name: 'Inactive Steward', isActive: false },
      },
      waiverEvents: [
        {
          action: 'GOVERNANCE_WAIVER_GRANTED',
          metadata: {
            checkId: 'chk_stewardship_active',
            reason: 'Attempt to waive stewardship',
            documentVersion: 2,
            expiresAt: new Date('2026-03-01'),
          },
          user: { id: 'admin1', name: 'Bob Admin' },
          createdAt: new Date('2026-02-10'),
        },
      ],
    };

    const result = calculateDocumentAssurance(ctx);

    const chk = result.checks.find((c) => c.checkId === 'chk_stewardship_active');
    expect(chk?.isWaivable).toBe(false);
    expect(chk?.status).toBe('FAILED');
  });
});
