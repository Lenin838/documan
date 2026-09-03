import { describe, expect, it } from 'vitest';
import { calculateEvidenceCoverage } from './evidence-calculator.js';

describe('Evidence Service & Calculator Suite', () => {
  it('derives evidence states correctly for forward evidence', () => {
    const res = calculateEvidenceCoverage({
      documentId: '507f1f77bcf86cd799439011',
      documentTitle: 'Test Spec',
      currentVersion: 1,
      lastApprovedVersion: 1,
      status: 'APPROVED',
      evaluationAt: new Date(),
      endpoints: [
        {
          linkId: 'link1',
          endpointId: 'ep1',
          method: 'GET',
          path: '/api/v1/users',
          status: 'LINKED',
        },
      ],
      references: [
        {
          referenceId: 'ref1',
          title: 'Architecture ADR',
          type: 'SPECIFICATION',
          url: 'https://docs.test/adr-001',
        },
      ],
      versions: [
        {
          versionNumber: 1,
          createdAt: new Date(),
          createdById: 'u1',
          createdByName: 'Alice',
        },
      ],
      governance: {
        status: 'APPROVED',
        currentVersion: 1,
        lastApprovedVersion: 1,
        createdAt: new Date(),
      },
    });

    expect(res.coverageScore).toBe(100);
    expect(res.applicableCount).toBe(4);
    expect(res.verifiedCount).toBe(4);
    expect(res.staleCount).toBe(0);
  });
});
