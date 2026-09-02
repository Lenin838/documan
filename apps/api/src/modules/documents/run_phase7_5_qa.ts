import mongoose from 'mongoose';
import { connectDatabase } from '../../config/database.js';
import { User } from '../users/user.model.js';
import { Document } from './document.model.js';
import { Project } from '../projects/project.model.js';
import { DocumentShare } from '../document-shares/document-share.model.js';
import { DocumentAudit } from './document-audit.model.js';
import {
  calculateKnowledgeRisk,
  type KnowledgeRiskContext,
} from './knowledge-risk-calculator.js';
import {
  updateDocumentSteward,
  getProjectKnowledgeRisk,
} from './knowledge-risk.service.js';

const EVALUATION_AT = new Date('2026-09-02T12:00:00.000Z');

async function runQA() {
  console.log('==================================================');
  console.log('STARTING PHASE 7.5 — AUTOMATED QA MATRIX (25 SCENARIOS)');
  console.log('==================================================');

  await connectDatabase();

  let passedCount = 0;
  let failedCount = 0;

  async function assertScenario(name: string, testFn: () => Promise<boolean> | boolean) {
    try {
      const ok = await testFn();
      if (ok) {
        console.log(`[PASS] ${name}`);
        passedCount++;
      } else {
        console.error(`[FAIL] ${name} — Assertion returned false`);
        failedCount++;
      }
    } catch (err) {
      console.error(`[FAIL] ${name} — Exception thrown:`, err);
      failedCount++;
    }
  }

  // Pure Calculator Scenarios (1-22)
  await assertScenario('Scenario 1: Pristine Document yields score 0 / LOW', () => {
    const ctx: KnowledgeRiskContext = {
      documentId: 'doc-1',
      title: 'Pristine Doc',
      version: 1,
      lastApprovedVersion: 1,
      status: 'APPROVED',
      lastReviewedAt: new Date('2026-08-01'),
      createdAt: new Date('2026-01-01'),
      stewardUser: { id: 'u1', name: 'Alice', email: 'alice@test', isActive: true, isDeleted: false },
      ownerUser: { id: 'u2', name: 'Bob', email: 'bob@test', isActive: true, isDeleted: false },
      evaluationAt: EVALUATION_AT,
    };
    const res = calculateKnowledgeRisk(ctx);
    return res.riskScore === 0 && res.riskLevel === 'LOW' && res.healthScore === 100;
  });

  await assertScenario('Scenario 2: Single Unresolved Impact yields score 20 / LOW', () => {
    const ctx: KnowledgeRiskContext = {
      documentId: 'doc-2',
      title: 'Doc with Impact',
      version: 1,
      lastApprovedVersion: 1,
      status: 'APPROVED',
      lastReviewedAt: new Date('2026-08-01'),
      needsVerification: true,
      activeImpactSources: [{ upstreamDocumentId: 'u-1', changeType: 'FILE_REPLACED', flaggedAt: new Date('2026-09-01') }],
      stewardUser: { id: 'u1', name: 'Alice', email: 'alice@test', isActive: true, isDeleted: false },
      evaluationAt: EVALUATION_AT,
      createdAt: new Date('2026-01-01'),
    };
    const res = calculateKnowledgeRisk(ctx);
    return res.factors.impact.score === 20 && res.riskScore === 20 && res.riskLevel === 'LOW';
  });

  await assertScenario('Scenario 3: Two Active Impacts yield score 35 / MEDIUM', () => {
    const ctx: KnowledgeRiskContext = {
      documentId: 'doc-3',
      title: 'Doc with 2 Impacts',
      version: 1,
      lastApprovedVersion: 1,
      status: 'APPROVED',
      lastReviewedAt: new Date('2026-08-01'),
      needsVerification: true,
      activeImpactSources: [
        { upstreamDocumentId: 'u-1', changeType: 'FILE_REPLACED', flaggedAt: new Date('2026-09-01') },
        { upstreamDocumentId: 'u-2', changeType: 'DEPRECATED', flaggedAt: new Date('2026-09-01') },
      ],
      stewardUser: { id: 'u1', name: 'Alice', email: 'alice@test', isActive: true, isDeleted: false },
      evaluationAt: EVALUATION_AT,
      createdAt: new Date('2026-01-01'),
    };
    const res = calculateKnowledgeRisk(ctx);
    return res.factors.impact.score === 35 && res.riskScore === 35 && res.riskLevel === 'MEDIUM';
  });

  await assertScenario('Scenario 4: Aged Active Impact adds bonus points capped at 35', () => {
    const ctx: KnowledgeRiskContext = {
      documentId: 'doc-4',
      title: 'Doc with Aged Impact',
      version: 1,
      lastApprovedVersion: 1,
      status: 'APPROVED',
      lastReviewedAt: new Date('2026-08-01'),
      needsVerification: true,
      activeImpactSources: [{ upstreamDocumentId: 'u-1', changeType: 'FILE_REPLACED', flaggedAt: new Date('2026-08-01') }],
      stewardUser: { id: 'u1', name: 'Alice', email: 'alice@test', isActive: true, isDeleted: false },
      evaluationAt: EVALUATION_AT,
      createdAt: new Date('2026-01-01'),
    };
    const res = calculateKnowledgeRisk(ctx);
    return res.factors.impact.score === 25; // 20 + 5
  });

  await assertScenario('Scenario 5: Approved Current Version yields Version Approval Risk score 0', () => {
    const ctx: KnowledgeRiskContext = {
      documentId: 'doc-5',
      title: 'Approved Doc',
      version: 2,
      lastApprovedVersion: 2,
      status: 'APPROVED',
      stewardUser: { id: 'u1', name: 'Alice', email: 'alice@test', isActive: true, isDeleted: false },
      evaluationAt: EVALUATION_AT,
      createdAt: new Date('2026-01-01'),
    };
    const res = calculateKnowledgeRisk(ctx);
    return res.factors.version.score === 0;
  });

  await assertScenario('Scenario 6: Unapproved Version Revision yields Version Approval Risk score 15', () => {
    const ctx: KnowledgeRiskContext = {
      documentId: 'doc-6',
      title: 'Unapproved Revision',
      version: 3,
      lastApprovedVersion: 2,
      status: 'APPROVED',
      stewardUser: { id: 'u1', name: 'Alice', email: 'alice@test', isActive: true, isDeleted: false },
      evaluationAt: EVALUATION_AT,
      createdAt: new Date('2026-01-01'),
    };
    const res = calculateKnowledgeRisk(ctx);
    return res.factors.version.score === 15;
  });

  await assertScenario('Scenario 7: Initial Draft Document (v1 DRAFT) yields Version Approval Risk score 0', () => {
    const ctx: KnowledgeRiskContext = {
      documentId: 'doc-7',
      title: 'Draft Doc',
      version: 1,
      lastApprovedVersion: null,
      status: 'DRAFT',
      stewardUser: { id: 'u1', name: 'Alice', email: 'alice@test', isActive: true, isDeleted: false },
      evaluationAt: EVALUATION_AT,
      createdAt: new Date('2026-01-01'),
    };
    const res = calculateKnowledgeRisk(ctx);
    return res.factors.version.score === 0;
  });

  await assertScenario('Scenario 8: Multi-Revision Never Approved Document yields Version Approval Risk score 25', () => {
    const ctx: KnowledgeRiskContext = {
      documentId: 'doc-8',
      title: 'Unapproved Multi-Rev',
      version: 3,
      lastApprovedVersion: null,
      status: 'DRAFT',
      stewardUser: { id: 'u1', name: 'Alice', email: 'alice@test', isActive: true, isDeleted: false },
      evaluationAt: EVALUATION_AT,
      createdAt: new Date('2026-01-01'),
    };
    const res = calculateKnowledgeRisk(ctx);
    return res.factors.version.score === 25;
  });

  await assertScenario('Scenario 9: Stale Document Status yields Freshness Risk score 20', () => {
    const ctx: KnowledgeRiskContext = {
      documentId: 'doc-9',
      title: 'Stale Doc',
      version: 1,
      lastApprovedVersion: 1,
      status: 'STALE',
      stewardUser: { id: 'u1', name: 'Alice', email: 'alice@test', isActive: true, isDeleted: false },
      evaluationAt: EVALUATION_AT,
      createdAt: new Date('2026-01-01'),
    };
    const res = calculateKnowledgeRisk(ctx);
    return res.factors.freshness.score === 20;
  });

  await assertScenario('Scenario 10: Freshness Review Inside Window yields Freshness Risk score 0', () => {
    const ctx: KnowledgeRiskContext = {
      documentId: 'doc-10',
      title: 'Fresh Doc',
      version: 1,
      lastApprovedVersion: 1,
      status: 'APPROVED',
      lastReviewedAt: new Date('2026-08-15'),
      stewardUser: { id: 'u1', name: 'Alice', email: 'alice@test', isActive: true, isDeleted: false },
      evaluationAt: EVALUATION_AT,
      createdAt: new Date('2026-01-01'),
    };
    const res = calculateKnowledgeRisk(ctx);
    return res.factors.freshness.score === 0;
  });

  await assertScenario('Scenario 11: Freshness Review Window Exceeded yields Freshness Risk score 20', () => {
    const ctx: KnowledgeRiskContext = {
      documentId: 'doc-11',
      title: 'Overdue Doc',
      version: 1,
      lastApprovedVersion: 1,
      status: 'APPROVED',
      lastReviewedAt: new Date('2026-04-01'), // >90d
      stewardUser: { id: 'u1', name: 'Alice', email: 'alice@test', isActive: true, isDeleted: false },
      evaluationAt: EVALUATION_AT,
      createdAt: new Date('2026-01-01'),
    };
    const res = calculateKnowledgeRisk(ctx);
    return res.factors.freshness.score === 20;
  });

  await assertScenario('Scenario 12: Governance Disabled yields Freshness Risk score 0', () => {
    const ctx: KnowledgeRiskContext = {
      documentId: 'doc-12',
      title: 'No Gov Doc',
      version: 1,
      lastApprovedVersion: 1,
      status: 'APPROVED',
      isGovernanceEnabled: false,
      lastReviewedAt: new Date('2020-01-01'),
      stewardUser: { id: 'u1', name: 'Alice', email: 'alice@test', isActive: true, isDeleted: false },
      evaluationAt: EVALUATION_AT,
      createdAt: new Date('2026-01-01'),
    };
    const res = calculateKnowledgeRisk(ctx);
    return res.factors.freshness.score === 0;
  });

  await assertScenario('Scenario 13: Single Orphaned API Endpoint yields API Drift Risk score 5', () => {
    const ctx: KnowledgeRiskContext = {
      documentId: 'doc-13',
      title: 'API Doc 1',
      version: 1,
      lastApprovedVersion: 1,
      status: 'APPROVED',
      linkedApiEndpoints: [{ specId: 's1', endpointPath: '/u', httpMethod: 'GET', isOrphaned: true }],
      stewardUser: { id: 'u1', name: 'Alice', email: 'alice@test', isActive: true, isDeleted: false },
      evaluationAt: EVALUATION_AT,
      createdAt: new Date('2026-01-01'),
    };
    const res = calculateKnowledgeRisk(ctx);
    return res.factors.apiDrift.score === 5;
  });

  await assertScenario('Scenario 14: Multiple Orphaned API Endpoints yield API Drift Risk score 10', () => {
    const ctx: KnowledgeRiskContext = {
      documentId: 'doc-14',
      title: 'API Doc 2',
      version: 1,
      lastApprovedVersion: 1,
      status: 'APPROVED',
      linkedApiEndpoints: [
        { specId: 's1', endpointPath: '/u', httpMethod: 'GET', isOrphaned: true },
        { specId: 's1', endpointPath: '/u', httpMethod: 'POST', isOrphaned: true },
      ],
      stewardUser: { id: 'u1', name: 'Alice', email: 'alice@test', isActive: true, isDeleted: false },
      evaluationAt: EVALUATION_AT,
      createdAt: new Date('2026-01-01'),
    };
    const res = calculateKnowledgeRisk(ctx);
    return res.factors.apiDrift.score === 10;
  });

  await assertScenario('Scenario 15: Deprecated API Drift yields API Drift Risk score 10', () => {
    const ctx: KnowledgeRiskContext = {
      documentId: 'doc-15',
      title: 'API Doc 3',
      version: 1,
      lastApprovedVersion: 1,
      status: 'APPROVED',
      linkedApiEndpoints: [{ specId: 's1', endpointPath: '/auth', httpMethod: 'POST', isDeprecatedDrift: true }],
      stewardUser: { id: 'u1', name: 'Alice', email: 'alice@test', isActive: true, isDeleted: false },
      evaluationAt: EVALUATION_AT,
      createdAt: new Date('2026-01-01'),
    };
    const res = calculateKnowledgeRisk(ctx);
    return res.factors.apiDrift.score === 10;
  });

  await assertScenario('Scenario 16: Active Explicit Steward yields Stewardship Risk score 0', () => {
    const ctx: KnowledgeRiskContext = {
      documentId: 'doc-16',
      title: 'Steward Doc',
      version: 1,
      lastApprovedVersion: 1,
      status: 'APPROVED',
      stewardUser: { id: 'u1', name: 'Alice', email: 'alice@test', isActive: true, isDeleted: false },
      evaluationAt: EVALUATION_AT,
      createdAt: new Date('2026-01-01'),
    };
    const res = calculateKnowledgeRisk(ctx);
    return res.factors.stewardship.score === 0;
  });

  await assertScenario('Scenario 17: Unassigned Steward with Healthy Owner yields score 5', () => {
    const ctx: KnowledgeRiskContext = {
      documentId: 'doc-17',
      title: 'Owner Fallback Doc',
      version: 1,
      lastApprovedVersion: 1,
      status: 'APPROVED',
      stewardUser: null,
      ownerUser: { id: 'u2', name: 'Bob', email: 'bob@test', isActive: true, isDeleted: false },
      evaluationAt: EVALUATION_AT,
      createdAt: new Date('2026-01-01'),
    };
    const res = calculateKnowledgeRisk(ctx);
    return res.factors.stewardship.score === 5 && res.effectiveContact?.isExplicitSteward === false;
  });

  await assertScenario('Scenario 18: Inactive Steward User yields Stewardship Risk score 10', () => {
    const ctx: KnowledgeRiskContext = {
      documentId: 'doc-18',
      title: 'Inactive Steward Doc',
      version: 1,
      lastApprovedVersion: 1,
      status: 'APPROVED',
      stewardUser: { id: 'u1', name: 'Alice Inactive', email: 'alice@test', isActive: false, isDeleted: false },
      evaluationAt: EVALUATION_AT,
      createdAt: new Date('2026-01-01'),
    };
    const res = calculateKnowledgeRisk(ctx);
    return res.factors.stewardship.score === 10;
  });

  await assertScenario('Scenario 19: Deleted Steward User yields Stewardship Risk score 10', () => {
    const ctx: KnowledgeRiskContext = {
      documentId: 'doc-19',
      title: 'Deleted Steward Doc',
      version: 1,
      lastApprovedVersion: 1,
      status: 'APPROVED',
      stewardUser: { id: 'u1', name: 'Alice Deleted', email: 'alice@test', isActive: true, isDeleted: true },
      evaluationAt: EVALUATION_AT,
      createdAt: new Date('2026-01-01'),
    };
    const res = calculateKnowledgeRisk(ctx);
    return res.factors.stewardship.score === 10;
  });

  await assertScenario('Scenario 20: Inactive Owner Fallback yields score 10', () => {
    const ctx: KnowledgeRiskContext = {
      documentId: 'doc-20',
      title: 'Inactive Owner Doc',
      version: 1,
      lastApprovedVersion: 1,
      status: 'APPROVED',
      stewardUser: null,
      ownerUser: { id: 'u2', name: 'Bob Inactive', email: 'bob@test', isActive: false, isDeleted: false },
      evaluationAt: EVALUATION_AT,
      createdAt: new Date('2026-01-01'),
    };
    const res = calculateKnowledgeRisk(ctx);
    return res.factors.stewardship.score === 10;
  });

  await assertScenario('Scenario 21: Maximum Combined Risk Factors clamp at score 100 and CRITICAL level', () => {
    const ctx: KnowledgeRiskContext = {
      documentId: 'doc-21',
      title: 'Max Risk Doc',
      version: 4,
      lastApprovedVersion: null, // 25
      status: 'STALE', // 20
      needsVerification: true,
      activeImpactSources: [
        { upstreamDocumentId: 'd1', changeType: 'FILE_REPLACED', flaggedAt: new Date('2026-01-01') },
        { upstreamDocumentId: 'd2', changeType: 'DEPRECATED', flaggedAt: new Date('2026-01-01') },
      ], // 35
      linkedApiEndpoints: [{ specId: 's1', endpointPath: '/u', httpMethod: 'GET', isDeprecatedDrift: true }], // 10
      stewardUser: null,
      ownerUser: null, // 10
      evaluationAt: EVALUATION_AT,
      createdAt: new Date('2026-01-01'),
    };
    const res = calculateKnowledgeRisk(ctx);
    return res.riskScore === 100 && res.riskLevel === 'CRITICAL';
  });

  await assertScenario('Scenario 22: Deterministic Repeated Calculation with Fixed evaluationAt', () => {
    const ctx: KnowledgeRiskContext = {
      documentId: 'doc-22',
      title: 'Deterministic Doc',
      version: 2,
      lastApprovedVersion: 1,
      status: 'APPROVED',
      evaluationAt: EVALUATION_AT,
      createdAt: new Date('2026-01-01'),
    };
    const r1 = calculateKnowledgeRisk(ctx);
    const r2 = calculateKnowledgeRisk(ctx);
    return JSON.stringify(r1) === JSON.stringify(r2);
  });

  // DB Service Integration Scenarios (23-25)
  await assertScenario('Scenario 23: Steward Assignment, Transfer, and Removal Audit Behavior', async () => {
    const ts = Date.now();
    const owner = await User.create({ name: 'Owner QA', email: `owner_qa_${ts}@test.com`, passwordHash: 'hash' });
    const steward1 = await User.create({ name: 'Steward QA 1', email: `steward_qa1_${ts}@test.com`, passwordHash: 'hash' });
    const steward2 = await User.create({ name: 'Steward QA 2', email: `steward_qa2_${ts}@test.com`, passwordHash: 'hash' });

    const doc = await Document.create({
      title: 'Audit QA Doc',
      fileName: 'audit.pdf',
      filePath: '/tmp/audit.pdf',
      fileType: 'application/pdf',
      fileSize: 1024,
      ownerId: owner._id,
      status: 'APPROVED',
    });

    // Assign
    await updateDocumentSteward(owner._id.toString(), 'user', doc._id.toString(), steward1._id.toString());
    // Transfer
    await updateDocumentSteward(owner._id.toString(), 'user', doc._id.toString(), steward2._id.toString());
    // Remove
    await updateDocumentSteward(owner._id.toString(), 'user', doc._id.toString(), null);

    const audits = await DocumentAudit.find({ documentId: doc._id, action: 'DOCUMENT_STEWARD_CHANGED' });
    return audits.length === 3;
  });

  await assertScenario('Scenario 24: Permission-Isolated Project Risk Radar', async () => {
    const ts = Date.now();
    const owner = await User.create({ name: 'Project Owner QA', email: `powner_qa_${ts}@test.com`, passwordHash: 'hash' });
    const member = await User.create({ name: 'Project Member QA', email: `pmember_qa_${ts}@test.com`, passwordHash: 'hash' });

    const proj = await Project.create({ name: 'Radar QA Project', ownerId: owner._id });

    const _doc1 = await Document.create({
      title: 'Public Project Doc',
      fileName: 'doc1.pdf',
      filePath: '/tmp/doc1.pdf',
      fileType: 'application/pdf',
      fileSize: 1024,
      ownerId: owner._id,
      projectId: proj._id,
      status: 'APPROVED',
    });

    const doc2 = await Document.create({
      title: 'Shared Project Doc',
      fileName: 'doc2.pdf',
      filePath: '/tmp/doc2.pdf',
      fileType: 'application/pdf',
      fileSize: 1024,
      ownerId: owner._id,
      projectId: proj._id,
      status: 'APPROVED',
    });

    // Share doc2 with member
    await DocumentShare.create({
      documentId: doc2._id,
      sharedWithUserId: member._id,
      permission: 'READ',
      createdBy: owner._id,
    });

    const radarOwner = await getProjectKnowledgeRisk(owner._id.toString(), 'user', proj._id.toString());
    const radarMember = await getProjectKnowledgeRisk(member._id.toString(), 'user', proj._id.toString());

    return radarOwner.visibleDocumentCount === 2 && radarMember.visibleDocumentCount === 1;
  });

  await assertScenario('Scenario 25: Soft-Deleted Document Exclusion', async () => {
    const ts = Date.now();
    const owner = await User.create({ name: 'Trash Owner QA', email: `towner_qa_${ts}@test.com`, passwordHash: 'hash' });
    const proj = await Project.create({ name: 'Trash QA Project', ownerId: owner._id });

    const _activeDoc = await Document.create({
      title: 'Active Doc',
      fileName: 'active.pdf',
      filePath: '/tmp/active.pdf',
      fileType: 'application/pdf',
      fileSize: 1024,
      ownerId: owner._id,
      projectId: proj._id,
      status: 'APPROVED',
      isDeleted: false,
    });

    const _deletedDoc = await Document.create({
      title: 'Deleted Doc',
      fileName: 'deleted.pdf',
      filePath: '/tmp/deleted.pdf',
      fileType: 'application/pdf',
      fileSize: 1024,
      ownerId: owner._id,
      projectId: proj._id,
      status: 'APPROVED',
      isDeleted: true,
    });

    const radar = await getProjectKnowledgeRisk(owner._id.toString(), 'user', proj._id.toString());
    return radar.visibleDocumentCount === 1;
  });

  console.log('==================================================');
  console.log(`AUTOMATED QA COMPLETED: ${passedCount}/25 PASSED, ${failedCount} FAILED`);
  console.log('==================================================');

  await mongoose.disconnect();
  process.exit(failedCount > 0 ? 1 : 0);
}

runQA().catch((err) => {
  console.error('QA Runner encountered fatal error:', err);
  process.exit(1);
});
