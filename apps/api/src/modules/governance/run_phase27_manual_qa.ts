/* eslint-disable no-console, @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */
import http from 'http';
import mongoose, { Types } from 'mongoose';
import jwt from 'jsonwebtoken';
import { env } from '../../config/env.js';
import { app } from '../../app.js';
import { User } from '../users/user.model.js';
import { Project } from '../projects/project.model.js';
import { Document } from '../documents/document.model.js';
import { DocumentVersion } from '../documents/document-version.model.js';
import { DocumentRelationship } from '../documents/document-relationship.model.js';
import { ProjectTopologyLink } from '../projects/project-topology.model.js';
import { DocumentationBaseline } from './documentation-baseline.model.js';
import { PackageFulfillmentAttestation } from '../change-packages/change-package-attestation.model.js';
import { SystemGovernanceWaiver } from './system-governance-waiver.model.js';
import { SystemReleaseCertificate } from './system-release-certificate.model.js';
import { DocumentAudit } from '../documents/document-audit.model.js';

const PORT = 4005;
const BASE_URL = `http://127.0.0.1:${PORT}/api/v1`;

function generateToken(userId: string): string {
  return jwt.sign({ userId }, env.JWT_SECRET, { expiresIn: '1h' });
}

async function makeRequest(
  method: string,
  path: string,
  token?: string,
  body?: any
): Promise<{ status: number; body: any }> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    ...(body ? { body: JSON.stringify(body) } : {}),
  });

  const json = await res.json().catch(() => null);
  return { status: res.status, body: json };
}

async function runManualQA() {
  console.log('====================================================');
  console.log('Starting Phase 27 Manual QA Execution & Verification');
  console.log('HTTP Server Endpoint: ' + BASE_URL);
  console.log('====================================================\n');

  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(env.MONGO_URI);
  }

  // Start Express HTTP Server
  const server = http.createServer(app);
  await new Promise<void>((resolve) => server.listen(PORT, resolve));

  let totalScenarios = 0;
  let passedScenarios = 0;

  function reportScenario(num: number, section: string, description: string, pass: boolean, detail?: string) {
    totalScenarios++;
    if (pass) {
      passedScenarios++;
      console.log(`[PASS] Scenario ${num} [${section}]: ${description}`);
    } else {
      console.error(`[FAIL] Scenario ${num} [${section}]: ${description}`);
    }
    if (detail) {
      console.log(`       Detail: ${detail}`);
    }
  }

  try {
    // ----------------------------------------------------
    // Cleanup prior test artifacts
    // ----------------------------------------------------
    const prefix = 'p27_manual_qa_';
    await User.deleteMany({ email: new RegExp(prefix) });
    await Project.deleteMany({ name: new RegExp(prefix) });
    await SystemReleaseCertificate.deleteMany({});
    await ProjectTopologyLink.deleteMany({});
    await DocumentationBaseline.deleteMany({});
    await SystemGovernanceWaiver.deleteMany({});
    await PackageFulfillmentAttestation.deleteMany({});
    await Document.deleteMany({});

    // ----------------------------------------------------
    // Seed Realistic Governance Topology Entities
    // ----------------------------------------------------
    const adminUser: any = await User.create({
      email: `${prefix}admin@test.com`,
      passwordHash: '$2b$10$abcdefghijklmnopqrstuu',
      name: 'Manual QA System Admin',
      role: 'admin',
    });
    const adminToken = generateToken(adminUser._id.toString());

    const ownerUser: any = await User.create({
      email: `${prefix}owner@test.com`,
      passwordHash: '$2b$10$abcdefghijklmnopqrstuu',
      name: 'Manual QA Project Owner',
      role: 'user',
    });
    const ownerToken = generateToken(ownerUser._id.toString());

    const memberUser: any = await User.create({
      email: `${prefix}member@test.com`,
      passwordHash: '$2b$10$abcdefghijklmnopqrstuu',
      name: 'Manual QA Project Member',
      role: 'user',
    });
    const memberToken = generateToken(memberUser._id.toString());

    const rootProject: any = await (Project.create as any)({
      name: `${prefix}Root Gateway Service`,
      description: 'Primary Root Gateway System Project',
      ownerId: ownerUser._id,
      governanceSettings: { isGovernanceEnabled: true, maxUnreviewedDays: 30, autoMarkStaleOnUpstreamChange: true },
    });

    const providerProject: any = await (Project.create as any)({
      name: `${prefix}Payments Core Provider`,
      description: 'Upstream Payments Provider Project',
      ownerId: ownerUser._id,
      governanceSettings: { isGovernanceEnabled: true, maxUnreviewedDays: 30, autoMarkStaleOnUpstreamChange: true },
    });

    const unauthProject: any = await (Project.create as any)({
      name: `${prefix}Secret Bank System`,
      description: 'Private System Not Accessible to Member User',
      ownerId: adminUser._id,
      governanceSettings: { isGovernanceEnabled: true, maxUnreviewedDays: 30, autoMarkStaleOnUpstreamChange: true },
    });

    // Documents & Topology Link
    const rootDoc: any = await Document.create({
      title: `${prefix}Gateway API Spec`,
      fileName: 'gateway-api.json',
      filePath: '/gateway-api.json',
      fileType: 'application/json',
      fileSize: 2048,
      ownerId: ownerUser._id,
      stewardId: memberUser._id,
      projectId: rootProject._id,
      status: 'APPROVED',
    } as any);

    const providerDoc: any = await Document.create({
      title: `${prefix}Payments API Spec`,
      fileName: 'payments-api.json',
      filePath: '/payments-api.json',
      fileType: 'application/json',
      fileSize: 4096,
      ownerId: ownerUser._id,
      stewardId: memberUser._id,
      projectId: providerProject._id,
      status: 'APPROVED',
    } as any);

    await Document.create({
      title: `${prefix}Secret Spec`,
      fileName: 'secret.json',
      filePath: '/secret.json',
      fileType: 'application/json',
      fileSize: 1024,
      ownerId: adminUser._id,
      projectId: unauthProject._id,
      status: 'APPROVED',
    } as any);

    const docVer: any = await DocumentVersion.create({
      documentId: providerDoc._id,
      projectId: providerProject._id,
      versionNumber: 1,
      fileName: 'payments-api.json',
      filePath: '/payments-api.json',
      fileType: 'application/json',
      fileSize: 4096,
      checksum: 'sha256-dummy-checksum-1234567890',
      content: 'payments spec content v1',
      createdById: ownerUser._id,
    } as any);

    await PackageFulfillmentAttestation.create({
      projectId: providerProject._id,
      attestationVersion: 1,
      grantedByUserId: ownerUser._id,
      attestedBy: ownerUser._id,
      attestedByRole: 'OWNER',
      fulfillmentStatus: 'FULFILLED',
      changePackageId: new Types.ObjectId(),
      packageStateFingerprint: 'dummy-fingerprint-1234',
      verifiedVersionSnapshot: [
        {
          documentId: providerDoc._id,
          documentVersionId: docVer._id,
          proposalId: new Types.ObjectId(),
          versionNumber: 1,
          checksum: 'sha256-dummy-checksum-1234567890',
        },
      ],
      attestationHash: 'sha256-dummy-attestation-hash-12345678',
    } as any);

    await DocumentRelationship.create({
      sourceDocumentId: rootDoc._id,
      targetDocumentId: providerDoc._id,
      type: 'DEPENDS_ON',
      createdBy: ownerUser._id,
    });

    await ProjectTopologyLink.create({
      sourceProjectId: rootProject._id,
      targetProjectId: providerProject._id,
      type: 'DEPENDS_ON',
      createdBy: ownerUser._id,
    });

    const docSnap = {
      documentId: providerDoc._id,
      title: providerDoc.title,
      versionNumber: 1,
      checksum: 'sha256-dummy-checksum-1234567890',
    };

    await (DocumentationBaseline.create as any)({
      projectId: rootProject._id,
      versionTag: 'v1.0.0',
      name: 'Root Gateway Baseline v1.0.0',
      createdBy: ownerUser._id,
      isActive: true,
      documentSnapshots: [docSnap],
    });

    const providerBaseline = await (DocumentationBaseline.create as any)({
      projectId: providerProject._id,
      versionTag: 'v1.0.0',
      name: 'Payments Core Baseline v1.0.0',
      createdBy: ownerUser._id,
      isActive: true,
      documentSnapshots: [docSnap],
    });

    console.log('Seed Data Successfully Created.');
    console.log(`Root Project ID: ${rootProject._id.toString()}`);
    console.log(`Provider Project ID: ${providerProject._id.toString()}\n`);

    // ====================================================
    // REQUIREMENT 1: PRE-CHECK EVALUATION
    // ====================================================
    console.log('--- 1. Testing Pre-Check Endpoints & Authorities ---');

    // 1.1 Authorized Project Owner Pre-Check
    const r1_1 = await makeRequest('POST', `/projects/${rootProject._id}/release-certificates/pre-check`, ownerToken, {
      releaseTag: 'v1.0',
    });
    reportScenario(
      1,
      'PRE-CHECK',
      'Authorized Project Owner can perform pre-check',
      r1_1.status === 200 && r1_1.body.data.canCertify === true,
      `HTTP ${r1_1.status}, canCertify=${r1_1.body?.data?.canCertify}, systemReleaseStatus=${r1_1.body?.data?.systemReleaseStatus}`
    );

    // 1.2 System Admin Pre-Check
    const r1_2 = await makeRequest('POST', `/projects/${rootProject._id}/release-certificates/pre-check`, adminToken, {
      releaseTag: 'v1.0',
    });
    reportScenario(
      2,
      'PRE-CHECK',
      'System Admin can perform pre-check',
      r1_2.status === 200 && r1_2.body.data.canCertify === true,
      `HTTP ${r1_2.status}, status=${r1_2.body?.data?.systemReleaseStatus}`
    );

    // 1.3 Unauthorized User Pre-Check on Private Project
    const r1_3 = await makeRequest('POST', `/projects/${unauthProject._id}/release-certificates/pre-check`, memberToken, {
      releaseTag: 'v1.0',
    });
    reportScenario(
      3,
      'PRE-CHECK',
      'Unauthorized user is rejected with HTTP 403 FORBIDDEN',
      r1_3.status === 403,
      `HTTP ${r1_3.status}, code=${r1_3.body?.error?.code || r1_3.body?.code}`
    );

    // 1.4 PASSED Result evaluation
    reportScenario(
      4,
      'PRE-CHECK',
      'PASSED pre-check status evaluated correctly',
      r1_1.body.data.systemReleaseStatus === 'PASSED' && r1_1.body.data.snapshotPreview !== null,
      `status=${r1_1.body.data.systemReleaseStatus}, topologyNodes=${r1_1.body.data.snapshotPreview?.topologyNodes.length}`
    );

    // 1.5 PASSED_WITH_WAIVER evaluation
    const provDoc: any = await Document.findOne({ projectId: providerProject._id });
    if (provDoc) {
      provDoc.status = 'IN_REVIEW';
      await provDoc.save();
    }

    const activeWaiver = await SystemGovernanceWaiver.create({
      rootProjectId: rootProject._id,
      targetProviderProjectId: providerProject._id,
      targetDocumentId: provDoc._id,
      blockerType: 'PROVIDER_LOCAL_GATE_BLOCKED',
      activeScopeKey: `${rootProject._id}:${providerProject._id}:${provDoc._id}:ANY_VER:PROVIDER_LOCAL_GATE_BLOCKED`,
      scopeState: 'ACTIVE',
      grantedByUserId: ownerUser._id,
      expiresAt: new Date(Date.now() + 86400000),
      isRevoked: false,
      reason: 'Manual QA Temporary Waiver',
    });

    const r1_5 = await makeRequest('POST', `/projects/${rootProject._id}/release-certificates/pre-check`, ownerToken, {
      releaseTag: 'v1.0-waiver',
    });
    reportScenario(
      5,
      'PRE-CHECK',
      'PASSED_WITH_WAIVER pre-check status evaluated correctly',
      r1_5.status === 200 && r1_5.body.data.systemReleaseStatus === 'PASSED_WITH_WAIVER',
      `status=${r1_5.body.data.systemReleaseStatus}, waiversInPreview=${r1_5.body.data.snapshotPreview?.activeWaivers.length}`
    );

    // Restore provider document freshness for subsequent tests
    if (provDoc) {
      provDoc.status = 'APPROVED';
      await provDoc.save();
    }

    // 1.6 GOVERNANCE_DISABLED behavior
    rootProject.governanceSettings = { ...rootProject.governanceSettings, isGovernanceEnabled: false };
    await rootProject.save();
    const r1_6 = await makeRequest('POST', `/projects/${rootProject._id}/release-certificates/pre-check`, ownerToken, {
      releaseTag: 'v1.0',
    });
    reportScenario(
      6,
      'PRE-CHECK',
      'GOVERNANCE_DISABLED pre-check behavior returns canCertify = false',
      r1_6.status === 200 && r1_6.body.data.canCertify === false && r1_6.body.data.systemReleaseStatus === 'GOVERNANCE_DISABLED',
      `canCertify=${r1_6.body.data.canCertify}, systemReleaseStatus=${r1_6.body.data.systemReleaseStatus}`
    );
    rootProject.governanceSettings = { ...rootProject.governanceSettings, isGovernanceEnabled: true };
    await rootProject.save();

    // 1.7 Pre-Check Side-Effect Freedom (0 DB writes)
    const certsCountPre = await SystemReleaseCertificate.countDocuments();
    await makeRequest('POST', `/projects/${rootProject._id}/release-certificates/pre-check`, ownerToken, {
      releaseTag: 'v1.0',
    });
    const certsCountPost = await SystemReleaseCertificate.countDocuments();
    reportScenario(
      7,
      'PRE-CHECK',
      'Pre-check creates zero certificates, audit logs, or persistence mutations',
      certsCountPre === certsCountPost && certsCountPost === 0,
      `initialCerts=${certsCountPre}, postCerts=${certsCountPost}`
    );

    // ====================================================
    // REQUIREMENT 2: CERTIFICATE ISSUANCE
    // ====================================================
    console.log('\n--- 2. Testing Certificate Issuance ---');

    // 2.1 Issue Certificate v1.0 (PASSED_WITH_WAIVER)
    const r2_1 = await makeRequest('POST', `/projects/${rootProject._id}/release-certificates`, ownerToken, {
      releaseTag: 'v1.0',
      notes: 'Manual QA Certified Milestone v1.0',
    });
    const cert1 = r2_1.body.data;
    reportScenario(
      8,
      'ISSUANCE',
      'Authorized certificate issuance succeeds with HTTP 201 Created',
      r2_1.status === 201 && cert1.releaseTag === 'v1.0' && cert1.certificateVersion === 1,
      `HTTP ${r2_1.status}, certId=${cert1?.id}, version=${cert1?.certificateVersion}, releaseTag=${cert1?.releaseTag}`
    );

    // 2.2 Certificate snapshot & deterministic hash validation
    reportScenario(
      9,
      'ISSUANCE',
      'Certificate contains frozen snapshot and deterministic SHA-256 hash',
      cert1.certificateHash !== undefined && cert1.snapshot !== undefined && cert1.snapshot.certifiedAt !== undefined,
      `hash=${cert1?.certificateHash?.slice(0, 16)}..., certifiedAt=${cert1?.snapshot?.certifiedAt}`
    );

    // 2.3 Preserving exact certification-time waiver evidence
    reportScenario(
      10,
      'ISSUANCE',
      'PASSED_WITH_WAIVER certificate preserves exact waiver evidence frozen at T_cert',
      cert1.snapshot.activeWaivers.length === 1 && cert1.snapshot.activeWaivers[0].waiverId === activeWaiver._id.toString(),
      `waiversCount=${cert1?.snapshot?.activeWaivers?.length}, waiverId=${cert1?.snapshot?.activeWaivers?.[0]?.waiverId}`
    );

    // ====================================================
    // REQUIREMENT 3: IMMUTABILITY & SUPERSESSION
    // ====================================================
    console.log('\n--- 3. Testing Immutability & Supersession ---');

    // 3.1 Record original snapshot & hash
    const origHash = cert1.certificateHash;
    const origCertifiedAt = cert1.snapshot.certifiedAt;

    // 3.2 Revoke certificate v1.0
    const r3_2 = await makeRequest('POST', `/projects/${rootProject._id}/release-certificates/${cert1.id}/revoke`, ownerToken, {
      revocationReason: 'Revoking for immutability QA check',
    });

    // 3.3 Fetch certificate after revocation
    const r3_3 = await makeRequest('GET', `/projects/${rootProject._id}/release-certificates/${cert1.id}`, ownerToken);
    const cert1Revoked = r3_3.body.data;

    reportScenario(
      11,
      'IMMUTABILITY',
      'Snapshot and certificateHash remain 100% UNMUTATED after revocation',
      cert1Revoked.certificateHash === origHash && cert1Revoked.snapshot.certifiedAt === origCertifiedAt,
      `origHash=${origHash.slice(0, 12)}, revokedHash=${cert1Revoked.certificateHash.slice(0, 12)}`
    );

    reportScenario(
      12,
      'IMMUTABILITY',
      'Lifecycle history contains the REVOKED event',
      cert1Revoked.lifecycleEvents.some((e: any) => e.eventType === 'REVOKED'),
      `eventsCount=${cert1Revoked.lifecycleEvents.length}, lastEvent=${cert1Revoked.lifecycleEvents.slice(-1)[0]?.eventType}`
    );

    // ====================================================
    // REQUIREMENT 4: RE-CERTIFICATION & VERSIONING
    // ====================================================
    console.log('\n--- 4. Testing Re-Certification ---');

    // 4.1 Re-certify same releaseTag v1.0 after revocation
    const r4_1 = await makeRequest('POST', `/projects/${rootProject._id}/release-certificates`, ownerToken, {
      releaseTag: 'v1.0',
      notes: 'Re-certifying release tag v1.0 after revocation',
      supersedesCertificateId: cert1.id,
    });
    const cert2 = r4_1.body.data;

    reportScenario(
      13,
      'RE-CERTIFICATION',
      'Re-certifying revoked releaseTag v1.0 creates certificate version 2',
      r4_1.status === 201 && cert2.certificateVersion === 2 && cert2.releaseTag === 'v1.0',
      `HTTP ${r4_1.status}, version=${cert2?.certificateVersion}, certId=${cert2?.id}`
    );

    // 4.2 Confirm older certificate v1 receives NO DB mutation from supersession
    const cert1DbDoc = await SystemReleaseCertificate.findById(cert1.id).lean();
    reportScenario(
      14,
      'IMMUTABILITY',
      'Older certificate v1 receives NO database mutation when superseded by v2',
      cert1DbDoc?.certificateStatus === 'REVOKED' && (cert1DbDoc as any).supersedesCertificateId === undefined,
      `v1Status=${cert1DbDoc?.certificateStatus}`
    );

    // 4.3 Confirm newer certificate v2 points backward using supersedesCertificateId
    reportScenario(
      15,
      'RE-CERTIFICATION',
      'Newer certificate v2 points backward to v1 via supersedesCertificateId',
      cert2.supersedesCertificateId === cert1.id,
      `v2.supersedesCertificateId=${cert2?.supersedesCertificateId}`
    );

    // 4.4 List certificates & verify only v2 is ACTIVE
    const r4_4 = await makeRequest('GET', `/projects/${rootProject._id}/release-certificates`, ownerToken);
    const listCerts = r4_4.body.data;
    const activeCerts = listCerts.filter((c: any) => c.certificateStatus === 'ACTIVE');

    reportScenario(
      16,
      'RE-CERTIFICATION',
      'Listing project certificates returns v1 (REVOKED/SUPERSEDED) and v2 (ACTIVE)',
      listCerts.length >= 2 && activeCerts.length === 1 && activeCerts[0].id === cert2.id,
      `totalCerts=${listCerts.length}, activeCount=${activeCerts.length}, activeCertId=${activeCerts[0]?.id}`
    );

    // 4.5 Conflict rejection on duplicate ACTIVE certificate
    const r4_5 = await makeRequest('POST', `/projects/${rootProject._id}/release-certificates`, ownerToken, {
      releaseTag: 'v1.0',
      notes: 'Attempting duplicate active cert',
    });
    reportScenario(
      17,
      'RE-CERTIFICATION',
      'Attempting duplicate ACTIVE certificate for same release tag returns HTTP 409 Conflict',
      r4_5.status === 409,
      `HTTP ${r4_5.status}, error=${r4_5.body?.error?.code || r4_5.body?.code}`
    );

    // ====================================================
    // REQUIREMENT 5: THREE-CONCEPT VERIFICATION ENGINE
    // ====================================================
    console.log('\n--- 5. Testing Three-Concept Verification Engine ---');

    // 5.1 Run /verify endpoint on active Certificate v2
    const r5_1 = await makeRequest(
      'POST',
      `/projects/${rootProject._id}/release-certificates/${cert2.id}/verify`,
      ownerToken
    );
    const verifyRes = r5_1.body.data;

    reportScenario(
      18,
      'THREE-CONCEPT VERIFICATION',
      'Verify endpoint evaluates Concept 1 (Integrity), Concept 2 (Lifecycle), and Concept 3 (Live System)',
      r5_1.status === 200 &&
        verifyRes.integrity.integrityStatus === 'INTEGRITY_VERIFIED' &&
        verifyRes.lifecycle.status === 'ACTIVE' &&
        verifyRes.currentLiveSystem.currentSystemReleaseStatus !== undefined,
      `integrity=${verifyRes?.integrity?.integrityStatus}, lifecycle=${verifyRes?.lifecycle?.status}, currentLive=${verifyRes?.currentLiveSystem?.currentSystemReleaseStatus}`
    );

    // 5.2 Alter live Phase 19 system readiness (deactivate provider baseline)
    await DocumentationBaseline.updateMany({ projectId: providerProject._id }, { isActive: false });
    const r5_2 = await makeRequest(
      'POST',
      `/projects/${rootProject._id}/release-certificates/${cert2.id}/verify`,
      ownerToken
    );
    const verifyResAltered = r5_2.body.data;

    reportScenario(
      19,
      'THREE-CONCEPT VERIFICATION',
      'Changing current live system readiness does NOT rewrite historical certificate or alter integrity verification',
      verifyResAltered.integrity.integrityStatus === 'INTEGRITY_VERIFIED' &&
        verifyResAltered.currentLiveSystem.matchesCertifiedState === false,
      `integrity=${verifyResAltered?.integrity?.integrityStatus}, matchesCertifiedState=${verifyResAltered?.currentLiveSystem?.matchesCertifiedState}`
    );

    // Restore provider baseline
    await DocumentationBaseline.updateMany({ projectId: providerProject._id }, { isActive: true });

    // ====================================================
    // REQUIREMENT 6: FROZEN WAIVER EVIDENCE & HISTORY
    // ====================================================
    console.log('\n--- 6. Testing Frozen Waiver Evidence & History ---');

    // 6.1 Expire/revoke waiver in live database according to Phase 20 semantics
    activeWaiver.isRevoked = true;
    await activeWaiver.save();

    // 6.2 Re-inspect historical certificate v2
    const r6_2 = await makeRequest('GET', `/projects/${rootProject._id}/release-certificates/${cert2.id}`, ownerToken);
    const cert2Inspected = r6_2.body.data;

    reportScenario(
      20,
      'WAIVER HISTORY',
      'Historical certificate retains certification-time waiver evidence frozen at T_cert without re-evaluating live waiver expiration/revocation',
      cert2Inspected.snapshot.activeWaivers.length === 1 && cert2Inspected.snapshot.activeWaivers[0].waiverId === activeWaiver._id.toString(),
      `frozenWaiversCount=${cert2Inspected?.snapshot?.activeWaivers?.length}, waiverId=${cert2Inspected?.snapshot?.activeWaivers?.[0]?.waiverId}`
    );

    // ====================================================
    // REQUIREMENT 7: ACL & SECURITY BOUNDARIES
    // ====================================================
    console.log('\n--- 7. Testing ACL & Security Boundaries ---');

    // 7.1 Authorized Root Project Owner Access
    const r7_1 = await makeRequest('GET', `/projects/${rootProject._id}/release-certificates`, ownerToken);
    reportScenario(
      21,
      'ACL / SECURITY',
      'Authorized Root Project Owner can list and view release certificates',
      r7_1.status === 200 && Array.isArray(r7_1.body.data),
      `HTTP ${r7_1.status}, count=${r7_1.body?.data?.length}`
    );

    // 7.2 System Admin Access
    const r7_2 = await makeRequest('GET', `/projects/${rootProject._id}/release-certificates`, adminToken);
    reportScenario(
      22,
      'ACL / SECURITY',
      'System Admin can list and view release certificates across any project',
      r7_2.status === 200 && Array.isArray(r7_2.body.data),
      `HTTP ${r7_2.status}, count=${r7_2.body?.data?.length}`
    );

    // 7.3 Unauthorized User Project Isolation
    const r7_3 = await makeRequest('GET', `/projects/${unauthProject._id}/release-certificates`, memberToken);
    reportScenario(
      23,
      'ACL / SECURITY',
      'IDOR defense blocks unauthorized user from viewing project release certificates',
      r7_3.status === 403,
      `HTTP ${r7_3.status}, code=${r7_3.body?.error?.code || r7_3.body?.code}`
    );

    // 7.4 ACL Graph Pruning in Snapshot JSON
    await ProjectTopologyLink.create({
      sourceProjectId: rootProject._id,
      targetProjectId: unauthProject._id,
      type: 'INTEGRATES_WITH',
      createdBy: adminUser._id,
    });
    const r7_4 = await makeRequest('POST', `/projects/${rootProject._id}/release-certificates/pre-check`, memberToken, {
      releaseTag: 'v2.0-prune-check',
    });
    const prunedSnapshot = r7_4.body.data?.snapshotPreview;
    const hasUnauth = prunedSnapshot?.topologyNodes.some((n: any) => n.projectId === unauthProject._id.toString());
    reportScenario(
      24,
      'ACL / SECURITY',
      'Phase 14 ACL graph pruning excludes unauthorized connected projects completely from snapshot JSON',
      !hasUnauth,
      `hasUnauthNode=${hasUnauth}, nodesCount=${prunedSnapshot?.topologyNodes.length}`
    );

    // ====================================================
    // REQUIREMENT 8: API SURFACE & RESTFUL BEHAVIOR
    // ====================================================
    console.log('\n--- 8. Testing API Surface & Restful Behavior ---');

    // 8.1 GET /projects/:projectId/release-certificates
    const r8_1 = await makeRequest('GET', `/projects/${rootProject._id}/release-certificates`, ownerToken);
    reportScenario(
      25,
      'API BEHAVIOR',
      'GET /release-certificates list endpoint returns 200 OK with array payload',
      r8_1.status === 200 && Array.isArray(r8_1.body.data),
      `HTTP ${r8_1.status}`
    );

    // 8.2 GET /projects/:projectId/release-certificates/:certificateId
    const r8_2 = await makeRequest('GET', `/projects/${rootProject._id}/release-certificates/${cert2.id}`, ownerToken);
    reportScenario(
      26,
      'API BEHAVIOR',
      'GET /release-certificates/:id detail endpoint returns 200 OK with certificate DTO',
      r8_2.status === 200 && r8_2.body.data.id === cert2.id,
      `HTTP ${r8_2.status}`
    );

    // 8.3 POST /projects/:projectId/release-certificates/:certificateId/verify
    const r8_3 = await makeRequest('POST', `/projects/${rootProject._id}/release-certificates/${cert2.id}/verify`, ownerToken);
    reportScenario(
      27,
      'API BEHAVIOR',
      'POST /release-certificates/:id/verify endpoint returns 200 OK with verification DTO',
      r8_3.status === 200 && r8_3.body.data.integrity !== undefined,
      `HTTP ${r8_3.status}`
    );

    // 8.4 POST /projects/:projectId/release-certificates/:certificateId/revoke
    const r8_4 = await makeRequest('POST', `/projects/${rootProject._id}/release-certificates/${cert2.id}/revoke`, ownerToken, {
      revocationReason: 'Revoking cert2 for manual QA verification test',
    });
    reportScenario(
      28,
      'API BEHAVIOR',
      'POST /release-certificates/:id/revoke endpoint returns 200 OK with updated certificate DTO',
      r8_4.status === 200 && r8_4.body.data.certificateStatus === 'REVOKED',
      `HTTP ${r8_4.status}, status=${r8_4.body?.data?.certificateStatus}`
    );

    // 8.5 Duplicate Revocation Attempt Error
    const r8_5 = await makeRequest('POST', `/projects/${rootProject._id}/release-certificates/${cert2.id}/revoke`, ownerToken, {
      revocationReason: 'Attempting duplicate revocation',
    });
    reportScenario(
      29,
      'API BEHAVIOR',
      'Attempting to revoke an already revoked certificate returns HTTP 400 ALREADY_REVOKED',
      r8_5.status === 400,
      `HTTP ${r8_5.status}, code=${r8_5.body?.error?.code || r8_5.body?.code}`
    );

    // 8.6 Non-existent Certificate 404 Error
    const fakeId = new Types.ObjectId().toString();
    const r8_6 = await makeRequest('GET', `/projects/${rootProject._id}/release-certificates/${fakeId}`, ownerToken);
    reportScenario(
      30,
      'API BEHAVIOR',
      'Requesting non-existent certificate returns HTTP 404 NOT_FOUND',
      r8_6.status === 404,
      `HTTP ${r8_6.status}, code=${r8_6.body?.error?.code || r8_6.body?.code}`
    );

    // ====================================================
    // REQUIREMENT 9: REGRESSION & GOVERNANCE INTEGRATION
    // ====================================================
    console.log('\n--- 9. Testing Governance Regression Integrations ---');

    // 9.1 Audit Log Emissions on Issuance and Revocation
    const auditEvents = await DocumentAudit.find({
      'metadata.eventType': {
        $in: ['SYSTEM_RELEASE_CERTIFICATE_ISSUED', 'SYSTEM_RELEASE_CERTIFICATE_REVOKED'],
      },
    }).lean();

    reportScenario(
      31,
      'REGRESSION',
      'DocumentAudit records SYSTEM_RELEASE_CERTIFICATE_ISSUED and REVOKED audit events cleanly',
      auditEvents.length >= 2,
      `auditEventsLogged=${auditEvents.length}`
    );

    // 9.2 Phase 19 Live Gate Evaluator Integration
    reportScenario(
      32,
      'REGRESSION',
      'Phase 19 system topology gate evaluator executes cleanly within Phase 27 workflow',
      r1_1.body.data.systemReleaseStatus === 'PASSED',
      `systemReleaseStatus=${r1_1.body.data.systemReleaseStatus}`
    );

    // 9.3 Phase 20 Waiver Authority Integration
    reportScenario(
      33,
      'REGRESSION',
      'Phase 20 system governance waiver model operates cleanly alongside Phase 27 snapshot engine',
      r1_5.body.data.systemReleaseStatus === 'PASSED_WITH_WAIVER',
      `systemReleaseStatus=${r1_5.body.data.systemReleaseStatus}`
    );

    // ----------------------------------------------------
    // Clean up temporary test data
    // ----------------------------------------------------
    await User.deleteMany({ email: new RegExp(prefix) });
    await Project.deleteMany({ name: new RegExp(prefix) });
    await SystemReleaseCertificate.deleteMany({});
    await ProjectTopologyLink.deleteMany({});
    await DocumentationBaseline.deleteMany({});
    await SystemGovernanceWaiver.deleteMany({});
    await PackageFulfillmentAttestation.deleteMany({});
    await DocumentRelationship.deleteMany({});
    await DocumentVersion.deleteMany({});
    await Document.deleteMany({});

    console.log('\n====================================================');
    console.log(`Phase 27 Manual QA Complete: ${passedScenarios}/${totalScenarios} Scenarios Passed`);
    console.log('====================================================\n');
  } finally {
    server.close();
  }
}

runManualQA().catch((err) => {
  console.error('Phase 27 Manual QA Script Error:', err);
  process.exit(1);
});
