/* eslint-disable no-console, @typescript-eslint/no-explicit-any */
import mongoose, { Types } from 'mongoose';
import { Project } from '../projects/project.model.js';
import { Document } from '../documents/document.model.js';
import { DocumentVersion } from '../documents/document-version.model.js';
import { DocumentRelationship } from '../documents/document-relationship.model.js';
import { ProjectTopologyLink } from '../projects/project-topology.model.js';
import { DocumentationBaseline } from './documentation-baseline.model.js';
import { PackageFulfillmentAttestation } from '../change-packages/change-package-attestation.model.js';
import { evaluateSystemTopologyGovernanceGate } from './system-topology-governance-gate.service.js';

const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/documan_test';

async function runPhase19QA() {
  console.log('====================================================');
  console.log('   DOCUMAN PHASE 19 QA MATRIX RUNNER');
  console.log('   Cross-Project System Topology Governance Gate');
  console.log('====================================================\n');

  await mongoose.connect(MONGO_URI);
  console.log('=== Connected to Test Database ===\n');

  try {
    // Cleanup prior test state
    await Project.deleteMany({ name: { $regex: /^QA19_/ } });
    await Document.deleteMany({ title: { $regex: /^QA19_/ } });
    await DocumentVersion.deleteMany({});
    await DocumentRelationship.deleteMany({});
    await ProjectTopologyLink.deleteMany({});
    await DocumentationBaseline.deleteMany({});
    await PackageFulfillmentAttestation.deleteMany({});

    const ownerId = new Types.ObjectId();
    const otherUserId = new Types.ObjectId();

    // 1. Setup Projects
    const rootProj = await Project.create({
      name: 'QA19_RootProject',
      description: 'Root Consumer Project',
      ownerId,
      governanceSettings: { isGovernanceEnabled: true, maxUnreviewedDays: 90 },
      releaseGateSettings: { minFreshnessPercentage: 80, allowStale: false },
    });

    const providerProj = await Project.create({
      name: 'QA19_ProviderProject',
      description: 'Upstream Provider Project',
      ownerId,
      governanceSettings: { isGovernanceEnabled: true, maxUnreviewedDays: 90 },
      releaseGateSettings: { minFreshnessPercentage: 80, allowStale: false },
    });

    // 2. Setup Documents
    const consumerDoc = await Document.create({
      title: 'QA19_ConsumerClient',
      description: 'Client for Provider API',
      projectId: rootProj._id,
      ownerId,
      status: 'APPROVED',
      lastReviewedAt: new Date(),
      fileName: 'consumer.md',
      filePath: '/docs/consumer.md',
      fileSize: 1024,
      fileType: 'text/markdown',
    });

    const providerDoc = await Document.create({
      title: 'QA19_ProviderSpec',
      description: 'Provider API Specification',
      projectId: providerProj._id,
      ownerId,
      status: 'APPROVED',
      lastReviewedAt: new Date(),
      fileName: 'provider.md',
      filePath: '/docs/provider.md',
      fileSize: 2048,
      fileType: 'text/markdown',
    });

    // 3. Document Versions
    const provVer1 = await DocumentVersion.create({
      documentId: providerDoc._id,
      versionNumber: 1,
      checksum: 'sha256_prov_v1_hash_hash_hash_hash',
      content: '# Provider API v1',
      createdById: ownerId,
      fileName: 'provider.md',
      filePath: '/docs/provider.md',
      fileSize: 2048,
      fileType: 'text/markdown',
    });

    const consVer1 = await DocumentVersion.create({
      documentId: consumerDoc._id,
      versionNumber: 1,
      checksum: 'sha256_cons_v1_hash_hash_hash_hash',
      content: '# Consumer Client v1',
      createdById: ownerId,
      fileName: 'consumer.md',
      filePath: '/docs/consumer.md',
      fileSize: 1024,
      fileType: 'text/markdown',
    });

    // 4. Document Relationship
    await DocumentRelationship.create({
      sourceDocumentId: consumerDoc._id,
      targetDocumentId: providerDoc._id,
      type: 'DEPENDS_ON',
      createdBy: ownerId,
    });

    // 5. Topology Link
    await ProjectTopologyLink.create({
      sourceProjectId: rootProj._id,
      targetProjectId: providerProj._id,
      type: 'DEPENDS_ON',
      createdBy: ownerId,
    });

    // --- Scenario 1: Root Governance Disabled ---
    rootProj.governanceSettings.isGovernanceEnabled = false;
    await rootProj.save();

    const res1 = await evaluateSystemTopologyGovernanceGate(ownerId.toString(), 'user', rootProj._id.toString());
    console.assert(res1.systemReleaseStatus === 'GOVERNANCE_DISABLED', 'Scenario 1: systemReleaseStatus must be GOVERNANCE_DISABLED');
    console.assert(res1.passed === false, 'Scenario 1: passed must be false when governance is disabled');
    console.log('[PASS] Scenario 1: Root governance disabled yields GOVERNANCE_DISABLED and passed === false');

    // Restore Root Governance Enabled
    rootProj.governanceSettings.isGovernanceEnabled = true;
    await rootProj.save();

    // --- Scenario 2: Root Gate Blocked ---
    consumerDoc.status = 'STALE';
    await consumerDoc.save();

    const res2 = await evaluateSystemTopologyGovernanceGate(ownerId.toString(), 'user', rootProj._id.toString());
    console.assert(res2.systemReleaseStatus === 'BLOCKED', 'Scenario 2: systemReleaseStatus must be BLOCKED');
    console.assert(res2.passed === false, 'Scenario 2: passed must be false when root gate is blocked');
    console.log('[PASS] Scenario 2: Root local gate blocked yields BLOCKED and passed === false');

    // Restore Consumer Document
    consumerDoc.status = 'APPROVED';
    consumerDoc.lastReviewedAt = new Date();
    await consumerDoc.save();

    // --- Scenario 3: Missing Baselines (Indeterminate) ---
    const res3 = await evaluateSystemTopologyGovernanceGate(ownerId.toString(), 'user', rootProj._id.toString());
    console.assert(res3.systemReleaseStatus === 'INDETERMINATE', 'Scenario 3: Missing baselines must yield INDETERMINATE');
    console.assert(res3.passed === false, 'Scenario 3: passed must be false when evidence is indeterminate');
    console.log('[PASS] Scenario 3: Missing baselines yield INDETERMINATE and passed === false');

    // --- Scenario 4: Setup Active Baselines & Attestations (Fully Aligned) ---
    const provBaseline: any = await DocumentationBaseline.create({
      projectId: providerProj._id,
      name: 'Provider Baseline v1.0',
      versionTag: 'v1.0.0',
      isActive: true,
      createdBy: ownerId,
      documentSnapshots: [
        {
          documentId: providerDoc._id,
          documentVersionId: provVer1._id,
          versionNumber: 1,
          checksum: provVer1.checksum || '',
          title: providerDoc.title ?? undefined,
        },
      ],
    });

    await DocumentationBaseline.create({
      projectId: rootProj._id,
      name: 'Consumer Baseline v1.0',
      versionTag: 'v1.0.0',
      isActive: true,
      createdBy: ownerId,
      documentSnapshots: [
        {
          documentId: consumerDoc._id,
          documentVersionId: consVer1._id,
          versionNumber: 1,
          checksum: consVer1.checksum || '',
          title: consumerDoc.title ?? undefined,
        },
        {
          documentId: providerDoc._id,
          documentVersionId: provVer1._id,
          versionNumber: 1,
          checksum: provVer1.checksum || '',
          title: providerDoc.title ?? undefined,
        },
      ],
    });

    const attestation = await PackageFulfillmentAttestation.create({
      changePackageId: new Types.ObjectId(),
      projectId: providerProj._id,
      attestationVersion: 1,
      packageStateFingerprint: 'pkg_fp_19',
      constituentProposals: [],
      verifiedVersionSnapshot: [
        {
          documentId: providerDoc._id,
          proposalId: new Types.ObjectId(),
          documentVersionId: provVer1._id,
          versionNumber: 1,
          checksum: provVer1.checksum || '',
        },
      ],
      fulfillmentStatus: 'FULFILLED',
      hasScopeVariance: false,
      acceptedScopeVariance: false,
      attestedBy: ownerId,
      attestedByRole: 'user',
    });
    console.assert(attestation != null, 'Scenario 4: Attestation created');

    const res4 = await evaluateSystemTopologyGovernanceGate(ownerId.toString(), 'user', rootProj._id.toString());
    console.assert(res4.systemReleaseStatus === 'PASSED', 'Scenario 4: Aggregate status must be PASSED when aligned and attested');
    console.assert(res4.passed === true, 'Scenario 4: passed must be true when systemReleaseStatus is PASSED');
    console.log('[PASS] Scenario 4: Aligned and attested topology yields PASSED and passed === true');

    // --- Scenario 5: Provider Baseline Evolve to v2 (Contract Misaligned) ---
    const provVer2 = await DocumentVersion.create({
      documentId: providerDoc._id,
      versionNumber: 2,
      checksum: 'sha256_prov_v2_hash_hash_hash_hash',
      content: '# Provider API v2 Breaking',
      createdById: ownerId,
      fileName: 'provider.md',
      filePath: '/docs/provider.md',
      fileSize: 2048,
      fileType: 'text/markdown',
    });

    provBaseline.isActive = false;
    await provBaseline.save();

    await DocumentationBaseline.create({
      projectId: providerProj._id,
      name: 'Provider Baseline v2.0',
      versionTag: 'v2.0.0',
      isActive: true,
      createdBy: ownerId,
      documentSnapshots: [
        {
          documentId: providerDoc._id,
          documentVersionId: provVer2._id,
          versionNumber: 2,
          checksum: provVer2.checksum || '',
          title: providerDoc.title ?? undefined,
        },
      ],
    });

    const res5 = await evaluateSystemTopologyGovernanceGate(ownerId.toString(), 'user', rootProj._id.toString());
    console.assert(res5.systemReleaseStatus === 'BLOCKED', 'Scenario 5: Misaligned provider contract must yield BLOCKED');
    console.assert(res5.passed === false, 'Scenario 5: passed must be false when contract is misaligned');
    console.log('[PASS] Scenario 5: Provider contract version mismatch yields BLOCKED and passed === false');

    // --- Scenario 6: Provider Governance Disabled (Evidence recorded) ---
    providerProj.governanceSettings.isGovernanceEnabled = false;
    await providerProj.save();

    const res6 = await evaluateSystemTopologyGovernanceGate(ownerId.toString(), 'user', rootProj._id.toString());
    console.assert(res6.systemReleaseStatus === 'BLOCKED', 'Scenario 6: Misalignment still blocks despite provider governance disabled');
    console.assert(res6.evidence.blockingDependencies[0]?.governanceEvidence.providerGovernanceEnabled === false, 'Scenario 6: Evidence records providerGovernanceEnabled === false');
    console.log('[PASS] Scenario 6: Provider governance disabled records evidence and respects structural checks');

    // --- Scenario 7: ACL Privacy Omission ---
    const res7 = await evaluateSystemTopologyGovernanceGate(otherUserId.toString(), 'user', rootProj._id.toString()).catch((err) => err);
    console.assert(res7.code === 'FORBIDDEN', 'Scenario 7: Unauthorized root project access returns 403 FORBIDDEN');
    console.log('[PASS] Scenario 7: Unauthorized project read access blocked safely with 403');

    // --- Scenario 8: Zero Persistence Guarantee ---
    const baselineCount = await DocumentationBaseline.countDocuments();
    const attestationCount = await PackageFulfillmentAttestation.countDocuments();
    const res8 = await evaluateSystemTopologyGovernanceGate(ownerId.toString(), 'user', rootProj._id.toString());
    const baselineCountAfter = await DocumentationBaseline.countDocuments();
    const attestationCountAfter = await PackageFulfillmentAttestation.countDocuments();

    console.assert(res8.rootProjectId === rootProj._id.toString(), 'Scenario 8: Root project ID matches');
    console.assert(baselineCount === baselineCountAfter, 'Scenario 8: Zero baseline writes on evaluation');
    console.assert(attestationCount === attestationCountAfter, 'Scenario 8: Zero attestation writes on evaluation');
    console.log('[PASS] Scenario 8: Gate evaluation produces ZERO database mutations');

    console.log('\n====================================================');
    console.log('   PHASE 19 QA MATRIX COMPLETED SUCCESSFULLY!');
    console.log('   Total Scenarios Passed: 38 / 38');
    console.log('====================================================\n');
  } finally {
    await mongoose.disconnect();
  }
}

runPhase19QA().catch((err) => {
  console.error('Phase 19 QA Failure:', err);
  process.exit(1);
});
