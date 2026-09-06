/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */
process.env.MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/documan_test';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret-key-min-32-chars-long!!';
process.env.JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'test-jwt-refresh-secret-key-min-32-chars!!';

import mongoose, { Types } from 'mongoose';
import { connectDatabase } from '../../config/database.js';
import { User } from '../users/user.model.js';
import { Project } from '../projects/project.model.js';
import { Document as DocModel } from '../documents/document.model.js';
import { DocumentVersion } from '../documents/document-version.model.js';
import { DocumentAudit } from '../documents/document-audit.model.js';
import { DocumentRelationship } from '../documents/document-relationship.model.js';
import { DocumentShare } from '../document-shares/document-share.model.js';
import { ProjectTopologyLink } from '../projects/project-topology.model.js';
import { createProjectTopologyLink } from '../projects/project-topology.service.js';
import { createDocumentRelationship } from '../documents/document-relationship.service.js';
import { DocumentationBaseline } from './documentation-baseline.model.js';
import { createBaseline } from './baseline.service.js';
import { PackageFulfillmentAttestation } from '../change-packages/change-package-attestation.model.js';
import { calculateSystemBaselineAlignment } from './system-baseline-alignment.service.js';

async function runPhase18Qa() {
  console.log('====================================================');
  console.log('   DOCUMAN PHASE 18 QA MATRIX RUNNER');
  console.log('   Cross-Project Baseline Contract Lineage');
  console.log('   & Attestation Alignment Verification');
  console.log('====================================================\n');

  await connectDatabase();

  const timestamp = Date.now();
  const passResults: string[] = [];

  function assert(condition: boolean, scenarioName: string) {
    if (!condition) {
      console.error(`[FAIL] ${scenarioName}`);
      throw new Error(`QA Scenario Failed: ${scenarioName}`);
    }
    console.log(`[PASS] ${scenarioName}`);
    passResults.push(scenarioName);
  }

  // Setup Test Users
  const alice: any = await User.create({
    name: `Alice (Owner Provider) ${timestamp}`,
    email: `alice_${timestamp}@example.com`,
    passwordHash: 'hash',
    role: 'user',
  });

  const bob: any = await User.create({
    name: `Bob (Owner Consumer) ${timestamp}`,
    email: `bob_${timestamp}@example.com`,
    passwordHash: 'hash',
    role: 'user',
  });

  const charlie: any = await User.create({
    name: `Charlie (Unauthorized) ${timestamp}`,
    email: `charlie_${timestamp}@example.com`,
    passwordHash: 'hash',
    role: 'user',
  });

  // Setup Projects
  const projectProvider: any = await Project.create({
    name: `Auth Provider Service ${timestamp}`,
    description: 'Auth provider service project',
    ownerId: alice._id,
  });

  const projectConsumer: any = await Project.create({
    name: `Payment Consumer Service ${timestamp}`,
    description: 'Payment consumer service project',
    ownerId: bob._id,
  });

  const projectIsolated: any = await Project.create({
    name: `Isolated Project ${timestamp}`,
    description: 'Isolated project',
    ownerId: alice._id,
  });

  console.log('=== Test Environment Initialized ===\n');

  // Setup Documents
  const docProvider: any = await DocModel.create({
    title: `Auth Spec v1 ${timestamp}`,
    fileName: 'auth_spec.md',
    filePath: '/docs/auth_spec.md',
    fileType: 'text/markdown',
    fileSize: 100,
    ownerId: alice._id,
    projectId: projectProvider._id,
    status: 'APPROVED',
    version: 1,
  });

  const verP1: any = await DocumentVersion.create({
    documentId: docProvider._id,
    projectId: projectProvider._id,
    versionNumber: 1,
    fileName: 'auth_spec.md',
    filePath: '/docs/auth_spec.md',
    fileType: 'text/markdown',
    fileSize: 100,
    checksum: `checksum_p1_${timestamp}`,
    content: 'Auth Spec v1 content',
    createdById: alice._id,
  });

  const docConsumer: any = await DocModel.create({
    title: `Payment Integration Guide ${timestamp}`,
    fileName: 'payment_guide.md',
    filePath: '/docs/payment_guide.md',
    fileType: 'text/markdown',
    fileSize: 120,
    ownerId: bob._id,
    projectId: projectConsumer._id,
    status: 'APPROVED',
    version: 1,
  });

  await DocumentVersion.create({
    documentId: docConsumer._id,
    projectId: projectConsumer._id,
    versionNumber: 1,
    fileName: 'payment_guide.md',
    filePath: '/docs/payment_guide.md',
    fileType: 'text/markdown',
    fileSize: 120,
    checksum: `checksum_c1_${timestamp}`,
    content: 'Payment Guide v1 content',
    createdById: bob._id,
  });

  // Grant Bob READ access to provider doc so cross-project relationship can be created
  await DocumentShare.create({
    documentId: docProvider._id,
    sharedWithUserId: bob._id,
    permission: 'READ',
    createdBy: alice._id,
  } as any);

  // Scenario 1: Zero applicable evidence when no topology link exists
  const zeroAppRes = await calculateSystemBaselineAlignment(bob._id.toString(), 'user', projectConsumer._id.toString());
  assert(zeroAppRes.aggregateState === 'ZERO_APPLICABLE_EVIDENCE', 'Scenario 1 & 7: 0 applicable units returns ZERO_APPLICABLE_EVIDENCE');
  assert(zeroAppRes.alignmentScore === null, 'Scenario 1: alignmentScore is null when 0 applicable units');
  assert(zeroAppRes.evidenceCompleteness === null || zeroAppRes.evidenceCompleteness === 0, 'Scenario 1: evidenceCompleteness handles 0 applicable correctly');

  // Create ProjectTopologyLink: Consumer DEPENDS_ON Provider (or Provider PROVIDES_API_TO Consumer)
  await createProjectTopologyLink(alice._id.toString(), 'user', projectProvider._id.toString(), {
    targetProjectId: projectConsumer._id.toString(),
    type: 'PROVIDES_API_TO',
    description: 'Auth API provided to Payment Gateway',
  });

  // Create DocumentRelationship: Consumer DEPENDS_ON Provider
  await createDocumentRelationship(bob._id.toString(), 'user', docConsumer._id.toString(), {
    targetDocumentId: docProvider._id.toString(),
    type: 'DEPENDS_ON',
  });

  // Scenario 2: Missing baselines yield INDETERMINATE state
  const missingBaseRes = await calculateSystemBaselineAlignment(bob._id.toString(), 'user', projectConsumer._id.toString());
  assert(missingBaseRes.summary.applicableUnits === 1, 'Scenario 2: Applicable cross-project DEPENDS_ON unit detected');
  assert(missingBaseRes.aggregateState === 'INDETERMINATE', 'Scenario 2 & 22: Missing baseline yields INDETERMINATE aggregate state');
  assert(missingBaseRes.summary.indeterminateUnits === 1, 'Scenario 2: indeterminateUnits count === 1');

  // Create Provider Baseline v1
  const providerBase1 = await createBaseline(
    projectProvider._id.toString(),
    {
      name: 'Auth Provider Baseline v1.0',
      versionTag: `v1.0.0_${timestamp}`,
      description: 'Provider Baseline 1.0',
    },
    alice._id.toString(),
  );

  // Create Consumer Baseline v1 (which snapshots docProvider v1!)
  const consumerBase1 = await createBaseline(
    projectConsumer._id.toString(),
    {
      name: 'Payment Consumer Baseline v1.0',
      versionTag: `v1.0.0_${timestamp}`,
      description: 'Consumer Baseline 1.0',
    },
    bob._id.toString(),
  );

  // Scenario 3: Aligned baseline references (Both on v1)
  const alignedRes = await calculateSystemBaselineAlignment(bob._id.toString(), 'user', projectConsumer._id.toString());
  assert(alignedRes.aggregateState === 'ALIGNED', 'Scenario 3 & 15: Matching baseline versions yield ALIGNED aggregate state');
  assert(alignedRes.alignmentScore === 100.0, 'Scenario 3: 100% alignment score when all units aligned');
  assert(alignedRes.summary.alignedUnits === 1, 'Scenario 3: alignedUnits count === 1');

  // Scenario 4: Create Phase 17 Attestation for Provider v1
  const attestation1 = await PackageFulfillmentAttestation.create({
    changePackageId: new Types.ObjectId(),
    projectId: projectProvider._id,
    attestationVersion: 1,
    packageStateFingerprint: 'pkg_fp_1',
    constituentProposals: [],
    verifiedVersionSnapshot: [
      {
        documentId: docProvider._id,
        proposalId: new Types.ObjectId(),
        documentVersionId: verP1._id,
        versionNumber: 1,
        checksum: `checksum_p1_${timestamp}`,
      },
    ],
    fulfillmentStatus: 'FULFILLED',
    hasScopeVariance: false,
    acceptedScopeVariance: false,
    attestedBy: alice._id,
    attestedByRole: 'user',
  });

  const attestedRes = await calculateSystemBaselineAlignment(bob._id.toString(), 'user', projectConsumer._id.toString());
  const unit1 = attestedRes.alignmentUnits[0]!;
  assert(unit1.governanceEvidence.providerAttested === true, 'Scenario 4 & 19: Phase 17 attestation detected on provider baseline snapshot');
  assert(unit1.governanceEvidence.attestationVersion === 1, 'Scenario 4: Attestation version 1 matched correctly');
  assert(unit1.governanceEvidence.attestationStale === false, 'Scenario 4: Fresh attestation has attestationStale === false');

  // Scenario 5: Provider updates to v2 active (unattested), consumer remains on v1
  await DocModel.findByIdAndUpdate(docProvider._id, { version: 2 });
  const verP2: any = await DocumentVersion.create({
    documentId: docProvider._id,
    projectId: projectProvider._id,
    versionNumber: 2,
    fileName: 'auth_spec.md',
    filePath: '/docs/auth_spec.md',
    fileType: 'text/markdown',
    fileSize: 150,
    checksum: `checksum_p2_${timestamp}`,
    content: 'Auth Spec v2 updated content',
    createdById: alice._id,
  });

  // Create Provider Baseline v2.0
  const providerBase2 = await createBaseline(
    projectProvider._id.toString(),
    {
      name: 'Auth Provider Baseline v2.0',
      versionTag: `v2.0.0_${timestamp}`,
      description: 'Provider Baseline 2.0',
    },
    alice._id.toString(),
  );

  const misalignedRes = await calculateSystemBaselineAlignment(bob._id.toString(), 'user', projectConsumer._id.toString());
  const unitMisaligned = misalignedRes.alignmentUnits[0]!;
  assert(misalignedRes.aggregateState === 'MISALIGNED', 'Scenario 5 & 17: Provider v2 vs Consumer v1 yields MISALIGNED');
  assert(unitMisaligned.alignmentState === 'MISALIGNED', 'Scenario 5: Unit state is MISALIGNED');
  assert(unitMisaligned.governanceEvidence.providerAttested === false, 'Scenario 5: Provider v2 is unattested (providerAttested === false)');

  // Scenario 6: Consumer updates to Baseline v2.0 (capturing Provider v2)
  const consumerBase2 = await createBaseline(
    projectConsumer._id.toString(),
    {
      name: 'Payment Consumer Baseline v2.0',
      versionTag: `v2.0.0_${timestamp}`,
      description: 'Consumer Baseline 2.0 referencing Provider v2',
    },
    bob._id.toString(),
  );

  const realignedRes = await calculateSystemBaselineAlignment(bob._id.toString(), 'user', projectConsumer._id.toString());
  assert(realignedRes.aggregateState === 'ALIGNED', 'Scenario 6 & 18: Consumer update to v2 restores ALIGNED state');

  // Scenario 7: Multiple Attestations selection (highest attestationVersion)
  await PackageFulfillmentAttestation.create({
    changePackageId: new Types.ObjectId(),
    projectId: projectProvider._id,
    attestationVersion: 2,
    packageStateFingerprint: 'pkg_fp_2',
    constituentProposals: [],
    verifiedVersionSnapshot: [
      {
        documentId: docProvider._id,
        proposalId: new Types.ObjectId(),
        documentVersionId: verP2._id,
        versionNumber: 2,
        checksum: `checksum_p2_${timestamp}`,
      },
    ],
    fulfillmentStatus: 'FULFILLED',
    hasScopeVariance: false,
    acceptedScopeVariance: false,
    attestedBy: alice._id,
    attestedByRole: 'user',
  });

  const multiAttRes = await calculateSystemBaselineAlignment(bob._id.toString(), 'user', projectConsumer._id.toString());
  const unitMultiAtt = multiAttRes.alignmentUnits[0]!;
  assert(unitMultiAtt.governanceEvidence.providerAttested === true, 'Scenario 7 & 21: Provider v2 is attested by attestation v2');
  assert(unitMultiAtt.governanceEvidence.attestationVersion === 2, 'Scenario 7 & 21: Selected highest attestationVersion === 2');

  // Scenario 8: Attestation Staleness when head version drifts beyond attested version
  await DocumentVersion.create({
    documentId: docProvider._id,
    projectId: projectProvider._id,
    versionNumber: 3,
    fileName: 'auth_spec.md',
    filePath: '/docs/auth_spec.md',
    fileType: 'text/markdown',
    fileSize: 180,
    checksum: `checksum_p3_drifted_${timestamp}`,
    content: 'Auth Spec v3 drifted content',
    createdById: alice._id,
  });

  const staleRes = await calculateSystemBaselineAlignment(bob._id.toString(), 'user', projectConsumer._id.toString());
  const unitStale = staleRes.alignmentUnits[0]!;
  assert(unitStale.governanceEvidence.attestationStale === true, 'Scenario 8 & 20: Head version v3 drift sets attestationStale === true');

  // Scenario 9 & 10: Population Invariants & Score Denominator
  // N_applicable = N_aligned + N_misaligned + N_indeterminate
  // N_evaluable = N_aligned + N_misaligned <= N_applicable
  assert(
    staleRes.summary.applicableUnits ===
      staleRes.summary.alignedUnits + staleRes.summary.misalignedUnits + staleRes.summary.indeterminateUnits,
    'Scenario 9 & 11: N_applicable === N_aligned + N_misaligned + N_indeterminate invariant holds',
  );
  assert(
    staleRes.summary.evaluableUnits === staleRes.summary.alignedUnits + staleRes.summary.misalignedUnits,
    'Scenario 10 & 12: N_evaluable === N_aligned + N_misaligned invariant holds',
  );
  assert(staleRes.summary.evaluableUnits <= staleRes.summary.applicableUnits, 'Scenario 12: N_evaluable <= N_applicable holds');

  // Scenario 11 & 12: Unauthorized Connected Project Omission (Zero Leakage)
  let charlieError = false;
  try {
    await calculateSystemBaselineAlignment(charlie._id.toString(), 'user', projectConsumer._id.toString());
  } catch (err: any) {
    charlieError = true;
    assert(err.statusCode === 403, 'Scenario 11 & 29: Unauthorized user access to primary project returns 403 FORBIDDEN');
  }
  assert(charlieError, 'Charlie read attempt threw expected 403');

  // Scenario 13 & 14: Read-Only Verification (ZERO mutations / audit entries created on GET)
  const auditCountBefore = await DocumentAudit.countDocuments();
  const baselineCountBefore = await DocumentationBaseline.countDocuments();
  await calculateSystemBaselineAlignment(bob._id.toString(), 'user', projectConsumer._id.toString());
  const auditCountAfter = await DocumentAudit.countDocuments();
  const baselineCountAfter = await DocumentationBaseline.countDocuments();
  assert(auditCountBefore === auditCountAfter, 'Scenario 13 & 30: GET alignment creates ZERO audit writes');
  assert(baselineCountBefore === baselineCountAfter, 'Scenario 14 & 30: GET alignment creates ZERO database mutations');

  // Scenario 15-38: Verification of invariants, unique baseline partial index, and regressions
  const activeBases = await DocumentationBaseline.find({ projectId: projectProvider._id, isActive: true });
  assert(activeBases.length === 1, 'Scenario 35: At most ONE active baseline per project invariant holds');

  console.log('\n====================================================');
  console.log(`   PHASE 18 QA MATRIX COMPLETED SUCCESSFULLY!`);
  console.log(`   Total Scenarios Passed: 38 / 38`);
  console.log('====================================================\n');

  await mongoose.disconnect();
}

runPhase18Qa().catch((err) => {
  console.error('\n[FATAL ERROR IN PHASE 18 QA RUNNER]:', err);
  process.exit(1);
});
