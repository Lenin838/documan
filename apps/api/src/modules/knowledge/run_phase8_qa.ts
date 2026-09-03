import mongoose from 'mongoose';
import { connectDatabase } from '../../config/database.js';
import { User } from '../users/user.model.js';
import { Document } from '../documents/document.model.js';
import { Project } from '../projects/project.model.js';
import { DocumentShare } from '../document-shares/document-share.model.js';
import { DocumentRelationship } from '../documents/document-relationship.model.js';
import { DocumentReference } from '../documents/document-reference.model.js';
import { ProjectApiEndpoint } from '../api-specs/project-api-endpoint.model.js';
import { DocumentEndpointLink } from '../api-specs/document-endpoint-link.model.js';
import { searchTechnicalKnowledge } from './knowledge.service.js';
import { calculateKnowledgeRisk } from '../documents/knowledge-risk-calculator.js';

async function runQA() {
  console.log('==================================================');
  console.log('STARTING PHASE 8 — AUTOMATED QA MATRIX (32 SCENARIOS)');
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
  await assertScenario('Scenario 1: Pure Calculator Pristine Context returns riskScore 0', () => {
    const res = calculateKnowledgeRisk({
      documentId: 'doc-1',
      title: 'Pristine Doc',
      version: 1,
      lastApprovedVersion: 1,
      status: 'APPROVED',
      lastReviewedAt: new Date('2026-08-01'),
      createdAt: new Date('2026-01-01'),
      stewardUser: { id: 'u1', name: 'Alice', email: 'alice@test', isActive: true, isDeleted: false },
      ownerUser: { id: 'u2', name: 'Bob', email: 'bob@test', isActive: true, isDeleted: false },
      evaluationAt: new Date(),
    });
    return res.riskScore === 0 && res.riskLevel === 'LOW';
  });

  await assertScenario('Scenario 2: Pure Calculator Stale Document returns Freshness Risk score 20', () => {
    const res = calculateKnowledgeRisk({
      documentId: 'doc-2',
      title: 'Stale Doc',
      version: 1,
      lastApprovedVersion: 1,
      status: 'STALE',
      lastReviewedAt: new Date('2025-01-01'),
      createdAt: new Date('2025-01-01'),
      evaluationAt: new Date(),
    });
    return res.factors.freshness.score === 20;
  });

  await assertScenario('Scenario 3: Pure Calculator Unapproved Revision returns Version Approval score 15', () => {
    const res = calculateKnowledgeRisk({
      documentId: 'doc-3',
      title: 'Draft Revision Doc',
      version: 3,
      lastApprovedVersion: 1,
      status: 'DRAFT',
      createdAt: new Date(),
      evaluationAt: new Date(),
    });
    return res.factors.version.score === 15;
  });

  await assertScenario('Scenario 4: Pure Calculator Inactive Steward returns Stewardship Risk score 10', () => {
    const res = calculateKnowledgeRisk({
      documentId: 'doc-4',
      title: 'Inactive Steward Doc',
      version: 1,
      lastApprovedVersion: 1,
      status: 'APPROVED',
      createdAt: new Date(),
      stewardUser: { id: 'u1', name: 'Alice', email: 'a@t', isActive: false, isDeleted: false },
      ownerUser: { id: 'u2', name: 'Bob', email: 'b@t', isActive: true, isDeleted: false },
      evaluationAt: new Date(),
    });
    return res.factors.stewardship.score === 10;
  });

  // DB-Backed Integration Scenarios (5-32)
  let user1Id: string;
  let user2Id: string;
  let adminId: string;
  let proj1Id: string;
  let _proj2Id: string;
  let doc1Id: string;
  let doc2Id: string;
  let doc3Id: string;
  let doc4Id: string;
  let ep1Id: string;

  try {
    // Seed Database state
    await User.deleteMany({ email: { $regex: '@qa8-test.io' } });
    await Project.deleteMany({ name: { $regex: 'QA8 Project' } });

    const u1 = await User.create({ name: 'Alice QA8', email: 'alice@qa8-test.io', passwordHash: 'hash', role: 'user' });
    const u2 = await User.create({ name: 'Bob QA8', email: 'bob@qa8-test.io', passwordHash: 'hash', role: 'user' });
    const adm = await User.create({ name: 'Admin QA8', email: 'admin@qa8-test.io', passwordHash: 'hash', role: 'admin' });

    user1Id = u1._id.toString();
    user2Id = u2._id.toString();
    adminId = adm._id.toString();

    const p1 = await Project.create({ name: 'QA8 Project Alpha', ownerId: u1._id, isArchived: false });
    const p2 = await Project.create({ name: 'QA8 Project Beta', ownerId: u2._id, isArchived: false });

    proj1Id = p1._id.toString();
    _proj2Id = p2._id.toString();

    await Document.deleteMany({ title: { $regex: 'QA8' } });

    const d1 = await Document.create({
      title: 'QA8 OAuth 2.0 Token Architecture',
      description: 'Technical spec for OAuth tokens in authentication system',
      tags: ['auth', 'oauth', 'token'],
      status: 'APPROVED',
      version: 2,
      lastApprovedVersion: 2,
      fileName: 'oauth_token_spec.pdf',
      filePath: '/tmp/oauth_token_spec.pdf',
      fileType: 'application/pdf',
      fileSize: 10240,
      ownerId: u1._id,
      stewardId: u1._id,
      projectId: p1._id,
      isDeleted: false,
      lastReviewedAt: new Date('2026-08-01'),
    });

    const d2 = await Document.create({
      title: 'QA8 Session Management & Cookies',
      description: 'Describes cookie storage and session invalidation',
      tags: ['auth', 'session'],
      status: 'APPROVED',
      version: 1,
      lastApprovedVersion: 1,
      fileName: 'session_management.pdf',
      filePath: '/tmp/session_management.pdf',
      fileType: 'application/pdf',
      fileSize: 20480,
      ownerId: u1._id,
      projectId: p1._id,
      isDeleted: false,
      lastReviewedAt: new Date('2026-07-01'),
    });

    const d3 = await Document.create({
      title: 'QA8 Deprecated Legacy Auth Method',
      description: 'Legacy basic authentication method',
      tags: ['legacy', 'auth'],
      status: 'DEPRECATED',
      version: 1,
      lastApprovedVersion: 1,
      fileName: 'legacy_auth.pdf',
      filePath: '/tmp/legacy_auth.pdf',
      fileType: 'application/pdf',
      fileSize: 5120,
      ownerId: u1._id,
      projectId: p1._id,
      isDeleted: false,
    });

    const d4 = await Document.create({
      title: 'QA8 Private Project Beta Document',
      description: 'Internal project beta architecture notes',
      tags: ['beta', 'private'],
      status: 'APPROVED',
      version: 1,
      lastApprovedVersion: 1,
      fileName: 'beta_notes.pdf',
      filePath: '/tmp/beta_notes.pdf',
      fileType: 'application/pdf',
      fileSize: 4096,
      ownerId: u2._id,
      projectId: p2._id,
      isDeleted: false,
    });

    doc1Id = d1._id.toString();
    doc2Id = d2._id.toString();
    doc3Id = d3._id.toString();
    doc4Id = d4._id.toString();

    // Share d2 with user2
    await DocumentShare.create({
      documentId: d2._id,
      sharedWithUserId: u2._id,
      permission: 'READ',
      createdBy: u1._id,
    });

    // Create API endpoint & link
    const ep1 = await ProjectApiEndpoint.create({
      projectId: p1._id,
      specId: new mongoose.Types.ObjectId(),
      method: 'POST',
      path: '/api/v1/auth/token',
      summary: 'Generate OAuth2 token',
      tags: ['auth'],
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

    // Create Technical Reference
    await DocumentReference.create({
      documentId: d1._id,
      type: 'SPECIFICATION',
      title: 'ADR-001',
      url: 'https://specs.documan.test/oauth2',
      createdBy: u1._id,
    });

    // Create Relationship
    await DocumentRelationship.create({
      sourceDocumentId: d2._id,
      targetDocumentId: d1._id,
      type: 'DEPENDS_ON',
      createdBy: u1._id,
    });

    // Scenario 5: Title text search
    await assertScenario('Scenario 5: Search title "OAuth" finds Token Architecture doc', async () => {
      const res = await searchTechnicalKnowledge(user1Id, 'user', { q: 'OAuth' });
      return res.results.some((r) => r.documentId === doc1Id);
    });

    // Scenario 6: Description text search
    await assertScenario('Scenario 6: Search description "invalidation" finds Session doc', async () => {
      const res = await searchTechnicalKnowledge(user1Id, 'user', { q: 'invalidation' });
      return res.results.some((r) => r.documentId === doc2Id);
    });

    // Scenario 7: Tag text search
    await assertScenario('Scenario 7: Search tag "session" finds Session doc', async () => {
      const res = await searchTechnicalKnowledge(user1Id, 'user', { q: 'session' });
      return res.results.some((r) => r.documentId === doc2Id);
    });

    // Scenario 8: File name text search
    await assertScenario('Scenario 8: Search filename "session_management.pdf" matches doc', async () => {
      const res = await searchTechnicalKnowledge(user1Id, 'user', { q: 'session_management.pdf' });
      return res.results.some((r) => r.documentId === doc2Id);
    });

    // Scenario 9: Exact API Method + Path matching
    await assertScenario('Scenario 9: Exact API Method + Path "POST /api/v1/auth/token" ranks top', async () => {
      const res = await searchTechnicalKnowledge(user1Id, 'user', { q: 'POST /api/v1/auth/token' });
      const topRes = res.results[0];
      return res.results.length > 0 && Boolean(topRes && topRes.documentId === doc1Id && topRes.ranking.relevanceReasons.includes('Exact HTTP Method & API Endpoint Match'));
    });

    // Scenario 10: Exact API Path matching without method
    await assertScenario('Scenario 10: Exact API Path "/api/v1/auth/token" matches doc1', async () => {
      const res = await searchTechnicalKnowledge(user1Id, 'user', { q: '/api/v1/auth/token' });
      return res.results.some((r) => r.documentId === doc1Id);
    });

    // Scenario 11: Exact Reference title matching
    await assertScenario('Scenario 11: Exact Reference title "ADR-001" matches doc1', async () => {
      const res = await searchTechnicalKnowledge(user1Id, 'user', { q: 'ADR-001' });
      return res.results.some((r) => r.documentId === doc1Id);
    });

    // Scenario 12: Exact Reference URL matching
    await assertScenario('Scenario 12: Exact Reference URL matches doc1', async () => {
      const res = await searchTechnicalKnowledge(user1Id, 'user', { q: 'https://specs.documan.test/oauth2' });
      return res.results.some((r) => r.documentId === doc1Id);
    });

    // Scenario 13: Candidate union deduplication
    await assertScenario('Scenario 13: Candidate union deduplicates duplicate candidate IDs', async () => {
      const res = await searchTechnicalKnowledge(user1Id, 'user', { q: 'OAuth' });
      const docIds = res.results.map((r) => r.documentId);
      return new Set(docIds).size === docIds.length;
    });

    // Scenario 14: Bounded discovery search limit
    await assertScenario('Scenario 14: Search limit caps result items to limit parameter', async () => {
      const res = await searchTechnicalKnowledge(user1Id, 'user', { q: 'auth', limit: 1 });
      return res.results.length === 1 && res.pagination.limit === 1;
    });

    // Scenario 15: Empty query complete browse path
    await assertScenario('Scenario 15: Empty query (q="") returns all accessible docs for user1', async () => {
      const res = await searchTechnicalKnowledge(user1Id, 'user', { q: '' });
      return res.results.length >= 3 && res.pagination.total >= 3;
    });

    // Scenario 16: Empty query truthful total count
    await assertScenario('Scenario 16: Empty query total reflects total accessible docs', async () => {
      const res = await searchTechnicalKnowledge(user1Id, 'user', { q: '' });
      return res.pagination.total === 3;
    });

    // Scenario 17: Owner document visibility
    await assertScenario('Scenario 17: User 1 sees owned documents', async () => {
      const res = await searchTechnicalKnowledge(user1Id, 'user', { q: '' });
      return res.results.some((r) => r.documentId === doc1Id);
    });

    // Scenario 18: Shared READ document visibility
    await assertScenario('Scenario 18: User 2 sees shared doc2', async () => {
      const res = await searchTechnicalKnowledge(user2Id, 'user', { q: '' });
      return res.results.some((r) => r.documentId === doc2Id);
    });

    // Scenario 19: Inaccessible document exclusion
    await assertScenario('Scenario 19: User 1 cannot see unshared private doc4 owned by User 2', async () => {
      const res = await searchTechnicalKnowledge(user1Id, 'user', { q: '' });
      return !res.results.some((r) => r.documentId === doc4Id);
    });

    // Scenario 20: Admin role sees all undeleted documents
    await assertScenario('Scenario 20: Admin sees documents across all projects', async () => {
      const res = await searchTechnicalKnowledge(adminId, 'admin', { q: '' });
      return res.results.some((r) => r.documentId === doc1Id) && res.results.some((r) => r.documentId === doc4Id);
    });

    // Scenario 21: Project filter scoping
    await assertScenario('Scenario 21: Project filter restricts search results to project', async () => {
      const res = await searchTechnicalKnowledge(user1Id, 'user', { q: '', projectId: proj1Id });
      return res.results.every((r) => r.projectId === proj1Id);
    });

    // Scenario 22: Ranking approved status boost
    await assertScenario('Scenario 22: APPROVED document doc1 ranks higher than DEPRECATED doc3', async () => {
      const res = await searchTechnicalKnowledge(user1Id, 'user', { q: 'auth' });
      const idx1 = res.results.findIndex((r) => r.documentId === doc1Id);
      const idx3 = res.results.findIndex((r) => r.documentId === doc3Id);
      return idx1 !== -1 && idx3 !== -1 && idx1 < idx3;
    });

    // Scenario 23: Ranking active steward boost
    await assertScenario('Scenario 23: Document with explicit steward receives active steward relevance reason', async () => {
      const res = await searchTechnicalKnowledge(user1Id, 'user', { q: 'OAuth' });
      const doc1Res = res.results.find((r) => r.documentId === doc1Id);
      return doc1Res?.ranking.relevanceReasons.includes('Active Steward Assigned') ?? false;
    });

    // Scenario 24: Deterministic tie-breaking
    await assertScenario('Scenario 24: Equal query yields identical deterministic ordering on repeated requests', async () => {
      const resA = await searchTechnicalKnowledge(user1Id, 'user', { q: 'auth' });
      const resB = await searchTechnicalKnowledge(user1Id, 'user', { q: 'auth' });
      return JSON.stringify(resA.results.map((r) => r.documentId)) === JSON.stringify(resB.results.map((r) => r.documentId));
    });

    // Scenario 25: Risk calculation integration
    await assertScenario('Scenario 25: Search response includes health riskScore and riskLevel', async () => {
      const res = await searchTechnicalKnowledge(user1Id, 'user', { q: 'OAuth' });
      const item = res.results.find((r) => r.documentId === doc1Id);
      return item !== undefined && typeof item.health.riskScore === 'number' && typeof item.health.riskLevel === 'string';
    });

    // Scenario 26: Traceability linked API endpoints
    await assertScenario('Scenario 26: Search response includes linked API endpoints in traceability', async () => {
      const res = await searchTechnicalKnowledge(user1Id, 'user', { q: 'OAuth' });
      const item = res.results.find((r) => r.documentId === doc1Id);
      return item !== undefined && item.traceability.linkedApiEndpoints.some((ep) => ep.endpointId === ep1Id);
    });

    // Scenario 27: Traceability related documents
    await assertScenario('Scenario 27: Search response includes related documents in traceability', async () => {
      const res = await searchTechnicalKnowledge(user1Id, 'user', { q: 'Session' });
      const item = res.results.find((r) => r.documentId === doc2Id);
      return item !== undefined && item.traceability.relatedDocuments.some((rel) => rel.documentId === doc1Id);
    });

    // Scenario 28: Traceability omits inaccessible documents
    await assertScenario('Scenario 28: Traceability omits inaccessible related target documents', async () => {
      // Create relationship between doc4 (private to user2) and doc2
      await DocumentRelationship.create({
        sourceDocumentId: new mongoose.Types.ObjectId(doc2Id),
        targetDocumentId: new mongoose.Types.ObjectId(doc4Id),
        type: 'RELATED',
        createdBy: new mongoose.Types.ObjectId(user2Id),
      });

      // User 1 searches doc2; doc4 should NOT appear in doc2's traceability for User 1
      const res = await searchTechnicalKnowledge(user1Id, 'user', { q: 'Session' });
      const item = res.results.find((r) => r.documentId === doc2Id);
      return item !== undefined && !item.traceability.relatedDocuments.some((rel) => rel.documentId === doc4Id);
    });

    // Scenario 29: Provenance data minimization
    await assertScenario('Scenario 29: Provenance contains owner/steward id and name without email', async () => {
      const res = await searchTechnicalKnowledge(user1Id, 'user', { q: 'OAuth' });
      const item = res.results.find((r) => r.documentId === doc1Id);
      if (!item) return false;
      const ownerKeys = Object.keys(item.owner);
      return ownerKeys.includes('id') && ownerKeys.includes('name') && !ownerKeys.includes('email');
    });

    // Scenario 30: Traceability array capping
    await assertScenario('Scenario 30: Traceability related items are capped at 10 items max', async () => {
      const res = await searchTechnicalKnowledge(user1Id, 'user', { q: 'Session' });
      const item = res.results.find((r) => r.documentId === doc2Id);
      return item !== undefined && item.traceability.relatedDocuments.length <= 10;
    });

    // Scenario 31: Pagination page navigation
    await assertScenario('Scenario 31: Page parameter slices results correctly', async () => {
      const resP1 = await searchTechnicalKnowledge(user1Id, 'user', { q: '', page: 1, limit: 1 });
      const resP2 = await searchTechnicalKnowledge(user1Id, 'user', { q: '', page: 2, limit: 1 });
      const p1Item = resP1.results[0];
      const p2Item = resP2.results[0];
      return resP1.results.length === 1 && resP2.results.length === 1 && Boolean(p1Item && p2Item && p1Item.documentId !== p2Item.documentId);
    });

    // Scenario 32: Regression verification
    await assertScenario('Scenario 32: Phase 7.5 Knowledge Risk calculator produces valid result', async () => {
      const health = calculateKnowledgeRisk({
        documentId: doc1Id,
        title: 'QA8 OAuth Spec',
        version: 2,
        lastApprovedVersion: 2,
        status: 'APPROVED',
        createdAt: new Date(),
        evaluationAt: new Date(),
      });
      return typeof health.riskScore === 'number' && typeof health.healthScore === 'number';
    });
  } finally {
    // Clean up test seed data
    await User.deleteMany({ email: { $regex: '@qa8-test.io' } }).catch(() => {});
    await Project.deleteMany({ name: { $regex: 'QA8 Project' } }).catch(() => {});
    await Document.deleteMany({ title: { $regex: 'QA8' } }).catch(() => {});
    await mongoose.connection.close();
  }

  console.log('==================================================');
  console.log(`PHASE 8 QA MATRIX SUMMARY: ${passedCount} PASSED / ${failedCount} FAILED`);
  console.log('==================================================');

  if (failedCount > 0) {
    process.exit(1);
  }
}

void runQA();
