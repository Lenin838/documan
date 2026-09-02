import { describe, expect, it } from 'vitest';
import {
  calculateKnowledgeRisk,
  type KnowledgeRiskContext,
} from './knowledge-risk-calculator.js';

const EVALUATION_AT = new Date('2026-09-02T12:00:00.000Z');

function createBaseContext(
  overrides?: Partial<KnowledgeRiskContext>,
): KnowledgeRiskContext {
  return {
    documentId: '507f1f77bcf86cd799439011',
    title: 'Test Architecture Overview',
    version: 1,
    lastApprovedVersion: 1,
    status: 'APPROVED',
    lastReviewedAt: new Date('2026-08-01T12:00:00.000Z'),
    createdAt: new Date('2026-01-01T12:00:00.000Z'),
    needsVerification: false,
    activeImpactSources: [],
    isGovernanceEnabled: true,
    maxUnreviewedDays: 90,
    linkedApiEndpoints: [],
    stewardUser: {
      id: '507f1f77bcf86cd799439012',
      name: 'Alice Steward',
      email: 'alice@documan.test',
      isActive: true,
      isDeleted: false,
    },
    ownerUser: {
      id: '507f1f77bcf86cd799439013',
      name: 'Bob Owner',
      email: 'bob@documan.test',
      isActive: true,
      isDeleted: false,
    },
    evaluationAt: EVALUATION_AT,
    ...overrides,
  };
}

describe('KnowledgeRiskCalculator (Pure Calculator)', () => {
  it('Scenario 1: pristine document returns score 0 and LOW risk level', () => {
    const context = createBaseContext();
    const result = calculateKnowledgeRisk(context);

    expect(result.riskScore).toBe(0);
    expect(result.riskLevel).toBe('LOW');
    expect(result.healthScore).toBe(100);
    expect(result.remediations).toHaveLength(0);
    expect(result.effectiveContact).toMatchObject({
      id: '507f1f77bcf86cd799439012',
      isExplicitSteward: true,
    });
  });

  it('Scenario 2: one active impact yields Impact Risk score 20', () => {
    const context = createBaseContext({
      needsVerification: true,
      activeImpactSources: [
        {
          upstreamDocumentId: '507f1f77bcf86cd799439099',
          changeType: 'FILE_REPLACED',
          flaggedAt: new Date('2026-09-01T12:00:00.000Z'),
        },
      ],
    });
    const result = calculateKnowledgeRisk(context);

    expect(result.factors.impact.score).toBe(20);
    expect(result.riskScore).toBe(20);
    expect(result.riskLevel).toBe('LOW');
    expect(result.factors.impact.reasons[0]?.code).toBe('UNVERIFIED_IMPACT');
  });

  it('Scenario 3: two active impacts yield Impact Risk score 35', () => {
    const context = createBaseContext({
      needsVerification: true,
      activeImpactSources: [
        {
          upstreamDocumentId: '507f1f77bcf86cd799439099',
          changeType: 'FILE_REPLACED',
          flaggedAt: new Date('2026-09-01T12:00:00.000Z'),
        },
        {
          upstreamDocumentId: '507f1f77bcf86cd799439098',
          changeType: 'DEPRECATED',
          flaggedAt: new Date('2026-09-01T12:00:00.000Z'),
        },
      ],
    });
    const result = calculateKnowledgeRisk(context);

    expect(result.factors.impact.score).toBe(35);
    expect(result.riskScore).toBe(35);
    expect(result.riskLevel).toBe('MEDIUM');
  });

  it('Scenario 4: aged active impact adds bonus points capped at max 35', () => {
    const context = createBaseContext({
      needsVerification: true,
      activeImpactSources: [
        {
          upstreamDocumentId: '507f1f77bcf86cd799439099',
          changeType: 'FILE_REPLACED',
          flaggedAt: new Date('2026-08-01T12:00:00.000Z'), // >14 days ago
        },
      ],
    });
    const result = calculateKnowledgeRisk(context);

    expect(result.factors.impact.score).toBe(25); // 20 + 5
    expect(result.factors.impact.reasons).toHaveLength(2);
    expect(result.factors.impact.reasons[1]?.code).toBe('AGED_UNVERIFIED_IMPACT');
  });

  it('Scenario 5: approved current version yields Version Approval Risk score 0', () => {
    const context = createBaseContext({
      version: 3,
      lastApprovedVersion: 3,
    });
    const result = calculateKnowledgeRisk(context);

    expect(result.factors.version.score).toBe(0);
    expect(result.factors.version.triggered).toBe(false);
  });

  it('Scenario 6: unapproved newer version yields Version Approval Risk score 15', () => {
    const context = createBaseContext({
      version: 4,
      lastApprovedVersion: 3,
    });
    const result = calculateKnowledgeRisk(context);

    expect(result.factors.version.score).toBe(15);
    expect(result.factors.version.triggered).toBe(true);
    expect(result.factors.version.reasons[0]?.code).toBe('UNAPPROVED_VERSION_DRIFT');
  });

  it('Scenario 7: initial draft document (v1 DRAFT) yields Version Approval Risk score 0', () => {
    const context = createBaseContext({
      version: 1,
      lastApprovedVersion: null,
      status: 'DRAFT',
    });
    const result = calculateKnowledgeRisk(context);

    expect(result.factors.version.score).toBe(0);
    expect(result.factors.version.triggered).toBe(false);
  });

  it('Scenario 8: multi-revision never approved document yields Version Approval Risk score 25', () => {
    const context = createBaseContext({
      version: 3,
      lastApprovedVersion: null,
      status: 'DRAFT',
    });
    const result = calculateKnowledgeRisk(context);

    expect(result.factors.version.score).toBe(25);
    expect(result.factors.version.reasons[0]?.code).toBe('NEVER_APPROVED');
  });

  it('Scenario 9: stale document status yields Freshness Risk score 20', () => {
    const context = createBaseContext({
      status: 'STALE',
    });
    const result = calculateKnowledgeRisk(context);

    expect(result.factors.freshness.score).toBe(20);
    expect(result.factors.freshness.reasons[0]?.code).toBe('STALE_DOCUMENT');
  });

  it('Scenario 10: freshness review inside window yields score 0', () => {
    const context = createBaseContext({
      lastReviewedAt: new Date('2026-08-15T12:00:00.000Z'), // ~18 days ago vs max 90
    });
    const result = calculateKnowledgeRisk(context);

    expect(result.factors.freshness.score).toBe(0);
  });

  it('Scenario 11: freshness review window exceeded yields score 20', () => {
    const context = createBaseContext({
      lastReviewedAt: new Date('2026-04-01T12:00:00.000Z'), // >90 days ago
    });
    const result = calculateKnowledgeRisk(context);

    expect(result.factors.freshness.score).toBe(20);
    expect(result.factors.freshness.reasons[0]?.code).toBe('REVIEW_OVERDUE');
  });

  it('Scenario 12: governance disabled yields Freshness Risk score 0', () => {
    const context = createBaseContext({
      isGovernanceEnabled: false,
      lastReviewedAt: new Date('2020-01-01T12:00:00.000Z'),
    });
    const result = calculateKnowledgeRisk(context);

    expect(result.factors.freshness.score).toBe(0);
  });

  it('Scenario 13: one orphaned API endpoint yields API Drift Risk score 5', () => {
    const context = createBaseContext({
      linkedApiEndpoints: [
        { specId: 'spec-1', endpointPath: '/api/v1/users', httpMethod: 'GET', isOrphaned: true },
      ],
    });
    const result = calculateKnowledgeRisk(context);

    expect(result.factors.apiDrift.score).toBe(5);
    expect(result.factors.apiDrift.reasons[0]?.code).toBe('ORPHANED_API_ENDPOINT');
  });

  it('Scenario 14: multiple orphaned endpoints yield API Drift Risk score 10', () => {
    const context = createBaseContext({
      linkedApiEndpoints: [
        { specId: 'spec-1', endpointPath: '/api/v1/users', httpMethod: 'GET', isOrphaned: true },
        { specId: 'spec-1', endpointPath: '/api/v1/users', httpMethod: 'POST', isOrphaned: true },
      ],
    });
    const result = calculateKnowledgeRisk(context);

    expect(result.factors.apiDrift.score).toBe(10);
  });

  it('Scenario 15: deprecated API endpoint drift yields API Drift Risk score 10', () => {
    const context = createBaseContext({
      linkedApiEndpoints: [
        { specId: 'spec-1', endpointPath: '/api/v1/auth', httpMethod: 'POST', isDeprecatedDrift: true },
      ],
    });
    const result = calculateKnowledgeRisk(context);

    expect(result.factors.apiDrift.score).toBe(10);
    expect(result.factors.apiDrift.reasons[0]?.code).toBe('DEPRECATED_API_DRIFT');
  });

  it('Scenario 16: active explicit steward yields Stewardship Risk score 0', () => {
    const context = createBaseContext();
    const result = calculateKnowledgeRisk(context);

    expect(result.factors.stewardship.score).toBe(0);
    expect(result.effectiveContact).toMatchObject({
      id: '507f1f77bcf86cd799439012',
      isExplicitSteward: true,
      isActive: true,
    });
  });

  it('Scenario 17: unassigned steward with healthy owner yields score 5 and fallback contact', () => {
    const context = createBaseContext({
      stewardUser: null,
    });
    const result = calculateKnowledgeRisk(context);

    expect(result.factors.stewardship.score).toBe(5);
    expect(result.factors.stewardship.reasons[0]?.code).toBe('STEWARD_UNASSIGNED');
    expect(result.effectiveContact).toMatchObject({
      id: '507f1f77bcf86cd799439013',
      isExplicitSteward: false,
      isActive: true,
    });
  });

  it('Scenario 18: inactive steward user yields Stewardship Risk score 10', () => {
    const context = createBaseContext({
      stewardUser: {
        id: '507f1f77bcf86cd799439012',
        name: 'Alice Inactive',
        email: 'alice@documan.test',
        isActive: false,
        isDeleted: false,
      },
    });
    const result = calculateKnowledgeRisk(context);

    expect(result.factors.stewardship.score).toBe(10);
    expect(result.factors.stewardship.reasons[0]?.code).toBe('STEWARD_INACTIVE');
  });

  it('Scenario 19: deleted steward user yields Stewardship Risk score 10', () => {
    const context = createBaseContext({
      stewardUser: {
        id: '507f1f77bcf86cd799439012',
        name: 'Alice Deleted',
        email: 'alice@documan.test',
        isActive: true,
        isDeleted: true,
      },
    });
    const result = calculateKnowledgeRisk(context);

    expect(result.factors.stewardship.score).toBe(10);
    expect(result.factors.stewardship.reasons[0]?.code).toBe('STEWARD_DELETED');
  });

  it('Scenario 20: unassigned steward with inactive owner yields score 10', () => {
    const context = createBaseContext({
      stewardUser: null,
      ownerUser: {
        id: '507f1f77bcf86cd799439013',
        name: 'Bob Inactive',
        email: 'bob@documan.test',
        isActive: false,
        isDeleted: false,
      },
    });
    const result = calculateKnowledgeRisk(context);

    expect(result.factors.stewardship.score).toBe(10);
    expect(result.factors.stewardship.reasons[0]?.code).toBe('OWNER_INACTIVE');
  });

  it('Scenario 21: maximum combined risk factors clamp at score 100 and CRITICAL level', () => {
    const context = createBaseContext({
      needsVerification: true,
      activeImpactSources: [
        { upstreamDocumentId: 'doc-1', changeType: 'FILE_REPLACED', flaggedAt: new Date('2026-01-01') },
        { upstreamDocumentId: 'doc-2', changeType: 'DEPRECATED', flaggedAt: new Date('2026-01-01') },
      ], // 35
      version: 4,
      lastApprovedVersion: null, // 25
      status: 'STALE', // 20
      linkedApiEndpoints: [{ specId: 's1', endpointPath: '/u', httpMethod: 'GET', isDeprecatedDrift: true }], // 10
      stewardUser: null,
      ownerUser: null, // 10
    });
    const result = calculateKnowledgeRisk(context);

    expect(result.riskScore).toBe(100);
    expect(result.riskLevel).toBe('CRITICAL');
    expect(result.remediations).toHaveLength(5);
  });

  it('Scenario 22: deterministic repeated calculation with identical evaluationAt', () => {
    const context = createBaseContext({
      version: 3,
      lastApprovedVersion: 2,
    });
    const res1 = calculateKnowledgeRisk(context);
    const res2 = calculateKnowledgeRisk(context);

    expect(res1).toEqual(res2);
  });
});
