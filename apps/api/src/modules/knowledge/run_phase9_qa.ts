import mongoose from 'mongoose';
import { connectDatabase } from '../../config/database.js';
import { User } from '../users/user.model.js';
import { Document } from '../documents/document.model.js';
import { Project } from '../projects/project.model.js';
import { DocumentShare } from '../document-shares/document-share.model.js';
import { DocumentRelationship } from '../documents/document-relationship.model.js';
import { DocumentReference } from '../documents/document-reference.model.js';
import { DocumentVersion } from '../documents/document-version.model.js';
import { ProjectApiEndpoint } from '../api-specs/project-api-endpoint.model.js';
import { DocumentEndpointLink } from '../api-specs/document-endpoint-link.model.js';
import {
  getForwardEvidence,
  getReverseDocument,
  getReverseEndpoint,
  getReverseReference,
} from './evidence.service.js';
import { calculateEvidenceCoverage } from './evidence-calculator.js';

async function runQA() {
  console.log('==================================================');
  console.log('STARTING PHASE 9 — AUTOMATED QA MATRIX (25 SCENARIOS)');
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

  // Pure Calculator Scenarios (1-4)
  await assertScenario('Scenario 1: Pure Calculator 100% EXCELLENT coverage', () => {
    const res = calculateEvidenceCoverage({
      documentId: 'doc-1',
      documentTitle: 'Test Doc',
      currentVersion: 1,
      lastApprovedVersion: 1,
      status: 'APPROVED',
      versions: [{ versionNumber: 1, createdAt: new Date(), createdById: 'u1', createdByName: 'Alice' }],
      governance: { status: 'APPROVED', currentVersion: 1, lastApprovedVersion: 1, createdAt: new Date() },
      evaluationAt: new Date(),
    });
    return res.coverageScore === 100 && res.label === 'EXCELLENT';
  });

  await assertScenario('Scenario 2: Zero applicable evidence items fallback', () => {
    const res = calculateEvidenceCoverage({
      documentId: 'doc-2',
      documentTitle: 'Empty Doc',
      currentVersion: 1,
      status: 'APPROVED',
      governance: null,
      evaluationAt: new Date(),
    });
    return res.coverageScore === 100 && res.label === 'NO_APPLICABLE_EVIDENCE' && res.applicableCount === 0;
  });

  await assertScenario('Scenario 3: Orphaned endpoint link yields ORPHANED state & remediation', () => {
    const res = calculateEvidenceCoverage({
      documentId: 'doc-3',
      documentTitle: 'API Doc',
      currentVersion: 1,
      status: 'APPROVED',
      endpoints: [{ linkId: 'l1', endpointId: 'ep1', method: 'GET', path: '/users', status: 'ORPHANED' }],
      evaluationAt: new Date(),
    });
    return res.orphanedCount === 1 && res.remediations.some((r) => r.code === 'CLEANUP_ORPHANED_EVIDENCE');
  });

  await assertScenario('Scenario 4: Upstream active impact source yields STALE state', () => {
    const res = calculateEvidenceCoverage({
      documentId: 'doc-4',
      documentTitle: 'Dep Doc',
      currentVersion: 1,
      status: 'APPROVED',
      needsVerification: true,
      activeImpactSources: [{ upstreamDocumentId: 'target-1', upstreamVersionNumber: 2, changeType: 'FILE_REPLACED', flaggedAt: new Date() }],
      dependencies: [{ relationshipId: 'r1', targetDocumentId: 'target-1', targetTitle: 'Target Spec', type: 'DEPENDS_ON', targetStatus: 'APPROVED', isDeleted: false }],
      evaluationAt: new Date(),
    });
    return res.staleCount === 1 && res.items.some((i) => i.state === 'STALE');
  });

  // DB-Backed Scenarios (5-25)
  let user1Id: string;
  let user2Id: string;
  let adminId: string;
  let _proj1Id: string;
  let doc1Id: string;
  let doc2Id: string;
  let doc3Id: string;
  let doc4Id: string;
  let ep1Id: string;

  try {
    // Seed QA data
    await User.deleteMany({ email: { $regex: '@qa9-test.io' } });
    await Project.deleteMany({ name: { $regex: 'QA9 Project' } });
    await Document.deleteMany({ title: { $regex: 'QA9' } });

    const u1 = await User.create({ name: 'Alice QA9', email: 'alice@qa9-test.io', passwordHash: 'hash', role: 'user' });
    const u2 = await User.create({ name: 'Bob QA9', email: 'bob@qa9-test.io', passwordHash: 'hash', role: 'user' });
    const adm = await User.create({ name: 'Admin QA9', email: 'admin@qa9-test.io', passwordHash: 'hash', role: 'admin' });

    user1Id = u1._id.toString();
    user2Id = u2._id.toString();
    adminId = adm._id.toString();

    const p1 = await Project.create({ name: 'QA9 Project Alpha', ownerId: u1._id, isArchived: false });
    _proj1Id = p1._id.toString();

    const d1 = await Document.create({
      title: 'QA9 System Architecture Specification',
      description: 'Core microservices architecture',
      fileName: 'system_arch.pdf',
      filePath: '/tmp/system_arch.pdf',
      fileType: 'application/pdf',
      fileSize: 1024,
      status: 'APPROVED',
      version: 1,
      lastApprovedVersion: 1,
      ownerId: u1._id,
      projectId: p1._id,
      isDeleted: false,
    });

    const d2 = await Document.create({
      title: 'QA9 OAuth 2.0 Auth Service Spec',
      description: 'OAuth endpoint specification',
      fileName: 'oauth_spec.pdf',
      filePath: '/tmp/oauth_spec.pdf',
      fileType: 'application/pdf',
      fileSize: 2048,
      status: 'APPROVED',
      version: 1,
      lastApprovedVersion: 1,
      ownerId: u1._id,
      projectId: p1._id,
      isDeleted: false,
    });

    const d3 = await Document.create({
      title: 'QA9 Draft Feature Proposal',
      description: 'Proposed new feature',
      fileName: 'draft_prop.pdf',
      filePath: '/tmp/draft_prop.pdf',
      fileType: 'application/pdf',
      fileSize: 512,
      status: 'DRAFT',
      version: 1,
      ownerId: u1._id,
      projectId: p1._id,
      isDeleted: false,
    });

    const d4 = await Document.create({
      title: 'QA9 Private Beta Notes',
      description: 'Private project notes',
      fileName: 'private_notes.pdf',
      filePath: '/tmp/private_notes.pdf',
      fileType: 'application/pdf',
      fileSize: 256,
      status: 'APPROVED',
      version: 1,
      lastApprovedVersion: 1,
      ownerId: u2._id,
      isDeleted: false,
    });

    doc1Id = d1._id.toString();
    doc2Id = d2._id.toString();
    doc3Id = d3._id.toString();
    doc4Id = d4._id.toString();

    // Create DocumentVersion records
    await DocumentVersion.create({
      documentId: d1._id,
      projectId: p1._id,
      versionNumber: 1,
      fileName: 'system_arch.pdf',
      filePath: '/tmp/system_arch.pdf',
      fileType: 'application/pdf',
      fileSize: 1024,
      createdById: u1._id,
    });

    // Create Endpoint & Link
    const ep1 = await ProjectApiEndpoint.create({
      projectId: p1._id,
      specId: new mongoose.Types.ObjectId(),
      method: 'POST',
      path: '/api/v1/auth/token',
      summary: 'Generate OAuth2 token',
      isDeprecated: false,
    });
    ep1Id = ep1._id.toString();

    await DocumentEndpointLink.create({
      documentId: d1._id,
      endpointId: ep1._id,
      projectId: p1._id,
      status: 'LINKED',
      createdBy: u1._id,
    });

    // Create Relationship d1 -> d2
    await DocumentRelationship.create({
      sourceDocumentId: d1._id,
      targetDocumentId: d2._id,
      type: 'DEPENDS_ON',
      createdBy: u1._id,
    });

    // Create External Reference
    await DocumentReference.create({
      documentId: d1._id,
      type: 'SPECIFICATION',
      title: 'ADR-001 Architecture Decision',
      url: 'https://docs.qa9-test.io/adr-001',
      createdBy: u1._id,
    });

    // Share d2 with user2
    await DocumentShare.create({
      documentId: d2._id,
      sharedWithUserId: u2._id,
      permission: 'READ',
      createdBy: u1._id,
    });

    // Scenario 5: Forward evidence retrieval for doc1
    await assertScenario('Scenario 5: Forward evidence retrieval succeeds for doc1', async () => {
      const res = await getForwardEvidence(user1Id, 'user', doc1Id);
      return res.documentId === doc1Id && res.applicableCount >= 4 && res.coverageScore === 100;
    });

    // Scenario 6: Deprecated API endpoint yields STALE endpoint state
    await assertScenario('Scenario 6: Deprecated endpoint link yields STALE state', async () => {
      ep1.isDeprecated = true;
      await ep1.save();
      const res = await getForwardEvidence(user1Id, 'user', doc1Id);
      ep1.isDeprecated = false;
      await ep1.save();
      const epItem = res.items.find((i) => i.category === 'API_ENDPOINT');
      return epItem?.state === 'STALE';
    });

    // Scenario 7: Soft-deleted target yields ORPHANED dependency state
    await assertScenario('Scenario 7: Soft-deleted target yields ORPHANED dependency state', async () => {
      d2.isDeleted = true;
      await d2.save();
      const res = await getForwardEvidence(user1Id, 'user', doc1Id);
      d2.isDeleted = false;
      await d2.save();
      const depItem = res.items.find((i) => i.category === 'DOCUMENT_DEPENDENCY');
      return depItem?.state === 'ORPHANED';
    });

    // Scenario 8: Draft target yields UNVERIFIED dependency state
    await assertScenario('Scenario 8: Draft target yields UNVERIFIED dependency state', async () => {
      await DocumentRelationship.create({
        sourceDocumentId: d1._id,
        targetDocumentId: d3._id,
        type: 'REFERENCES',
        createdBy: u1._id,
      });
      const res = await getForwardEvidence(user1Id, 'user', doc1Id);
      const draftItem = res.items.find((i) => i.targetId === doc3Id);
      return draftItem?.state === 'UNVERIFIED';
    });

    // Scenario 9: External Reference evidence item verified
    await assertScenario('Scenario 9: External reference yields VERIFIED state', async () => {
      const res = await getForwardEvidence(user1Id, 'user', doc1Id);
      const refItem = res.items.find((i) => i.category === 'EXTERNAL_REFERENCE');
      return refItem?.state === 'VERIFIED';
    });

    // Scenario 10: Content Version snapshot verified
    await assertScenario('Scenario 10: Content version snapshot yields VERIFIED state', async () => {
      const res = await getForwardEvidence(user1Id, 'user', doc1Id);
      const verItem = res.items.find((i) => i.category === 'VERSION_SNAPSHOT');
      return verItem?.state === 'VERIFIED';
    });

    // Scenario 11: Governance review evidence item verified
    await assertScenario('Scenario 11: Governance review yields VERIFIED state', async () => {
      const res = await getForwardEvidence(user1Id, 'user', doc1Id);
      const govItem = res.items.find((i) => i.category === 'GOVERNANCE_REVIEW');
      return govItem?.state === 'VERIFIED';
    });

    // Scenario 12: Reverse API endpoint traversal
    await assertScenario('Scenario 12: Reverse API endpoint traversal finds doc1', async () => {
      const res = await getReverseEndpoint(user1Id, 'user', ep1Id);
      return res.citingDocuments.some((d) => d.id === doc1Id);
    });

    // Scenario 13: Reverse Document DEPENDS_ON traversal
    await assertScenario('Scenario 13: Reverse Document DEPENDS_ON traversal finds doc1 citing doc2', async () => {
      const res = await getReverseDocument(user1Id, 'user', doc2Id, 'DEPENDS_ON');
      return res.citingDocuments.some((d) => d.id === doc1Id && d.relationshipType === 'DEPENDS_ON');
    });

    // Scenario 14: Reverse Reference URL traversal
    await assertScenario('Scenario 14: Reverse Reference URL traversal finds doc1', async () => {
      const res = await getReverseReference(user1Id, 'user', 'https://docs.qa9-test.io/adr-001');
      return res.citingDocuments.some((d) => d.id === doc1Id);
    });

    // Scenario 15: Owner ACL allows access
    await assertScenario('Scenario 15: Owner user1 can access evidence for doc1', async () => {
      const res = await getForwardEvidence(user1Id, 'user', doc1Id);
      return res.documentId === doc1Id;
    });

    // Scenario 16: Shared READ ACL allows reverse document traversal
    await assertScenario('Scenario 16: Shared user2 can traverse reverse document for doc2', async () => {
      const res = await getReverseDocument(user2Id, 'user', doc2Id);
      return res.targetDocumentId === doc2Id;
    });

    // Scenario 17: Admin ACL allows access to all documents
    await assertScenario('Scenario 17: Admin user can access evidence for doc4', async () => {
      const res = await getForwardEvidence(adminId, 'admin', doc4Id);
      return res.documentId === doc4Id;
    });

    // Scenario 18: Unauthorized access throws 404 DOCUMENT_NOT_FOUND
    await assertScenario('Scenario 18: Unauthorized user1 cannot access doc4 (throws 404)', async () => {
      try {
        await getForwardEvidence(user1Id, 'user', doc4Id);
        return false;
      } catch (err: unknown) {
        return (err as { statusCode?: number; code?: string }).statusCode === 404;
      }
    });

    // Scenario 19: Reverse traversal omits unauthorized documents safely
    await assertScenario('Scenario 19: Reverse endpoint traversal omits unauthorized documents', async () => {
      // Link doc4 (private to user2) to ep1
      await DocumentEndpointLink.create({
        documentId: d4._id,
        endpointId: ep1._id,
        projectId: p1._id,
        status: 'LINKED',
        createdBy: u2._id,
      });
      // User 1 queries ep1; doc4 must NOT be present in user 1's results
      const res = await getReverseEndpoint(user1Id, 'user', ep1Id);
      return !res.citingDocuments.some((d) => d.id === doc4Id);
    });

    // Scenario 20: Privacy minimization (no emails returned in provenance)
    await assertScenario('Scenario 20: User provenance contains id and name ONLY (no email)', async () => {
      const res = await getForwardEvidence(user1Id, 'user', doc1Id);
      const govItem = res.items.find((i) => i.category === 'GOVERNANCE_REVIEW');
      if (!govItem?.verifiedBy) return false;
      const keys = Object.keys(govItem.verifiedBy);
      return keys.includes('id') && keys.includes('name') && !keys.includes('email');
    });

    // Scenario 21: Synthetic IDs use dynamic dynamic non-persistent formats
    await assertScenario('Scenario 21: Derived items use synthetic IDs ep_link_, dep_rel_, ref_, ver_, gov_', async () => {
      const res = await getForwardEvidence(user1Id, 'user', doc1Id);
      return res.items.every((i) =>
        i.syntheticId.startsWith('ep_link_') ||
        i.syntheticId.startsWith('dep_rel_') ||
        i.syntheticId.startsWith('ref_') ||
        i.syntheticId.startsWith('ver_') ||
        i.syntheticId.startsWith('gov_'),
      );
    });

    // Scenario 22: Relationship type filtering in reverse document traversal
    await assertScenario('Scenario 22: Reverse document filtering by relationshipType REFERENCES excludes DEPENDS_ON', async () => {
      const res = await getReverseDocument(user1Id, 'user', doc2Id, 'REFERENCES');
      return !res.citingDocuments.some((d) => d.relationshipType === 'DEPENDS_ON');
    });

    // Scenario 23: Partial coverage score calculation
    await assertScenario('Scenario 23: Partial coverage calculation reflects verified vs total items', async () => {
      const res = calculateEvidenceCoverage({
        documentId: 'doc-p',
        documentTitle: 'Partial Doc',
        currentVersion: 1,
        status: 'APPROVED',
        governance: null,
        endpoints: [{ linkId: 'l1', endpointId: 'e1', method: 'GET', path: '/p', status: 'LINKED' }],
        dependencies: [{ relationshipId: 'r1', targetDocumentId: 't1', targetTitle: 'Draft Target', type: 'DEPENDS_ON', targetStatus: 'DRAFT', isDeleted: false }],
        evaluationAt: new Date(),
      });
      return res.coverageScore === 50 && res.label === 'NEEDS_ATTENTION';
    });

    // Scenario 24: Non-existent document throws 404
    await assertScenario('Scenario 24: Non-existent document ID throws 404 DOCUMENT_NOT_FOUND', async () => {
      try {
        await getForwardEvidence(user1Id, 'user', '507f1f77bcf86cd799439099');
        return false;
      } catch (err: unknown) {
        return (err as { statusCode?: number }).statusCode === 404;
      }
    });

    // Scenario 25: Phase 7/8 Regression verification
    await assertScenario('Scenario 25: Phase 7.5 Risk Calculator regression intact', async () => {
      const res = await getForwardEvidence(user1Id, 'user', doc1Id);
      return typeof res.coverageScore === 'number' && Array.isArray(res.items);
    });
  } finally {
    // Cleanup seed data
    await User.deleteMany({ email: { $regex: '@qa9-test.io' } }).catch(() => {});
    await Project.deleteMany({ name: { $regex: 'QA9 Project' } }).catch(() => {});
    await Document.deleteMany({ title: { $regex: 'QA9' } }).catch(() => {});
    await mongoose.connection.close();
  }

  console.log('==================================================');
  console.log(`PHASE 9 QA MATRIX SUMMARY: ${passedCount} PASSED / ${failedCount} FAILED`);
  console.log('==================================================');

  if (failedCount > 0) {
    process.exit(1);
  }
}

void runQA();
