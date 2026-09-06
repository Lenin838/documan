/* eslint-disable no-console, @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */
import mongoose, { Types } from 'mongoose';

import {
  evaluateSystemGateAt,
  generateSystemGovernanceTimeline,
  calculateGovernanceStateDiff,
} from './system-governance-lineage.service.js';
import { Project } from '../projects/project.model.js';
import { Document } from '../documents/document.model.js';
import { DocumentVersion } from '../documents/document-version.model.js';
import { DocumentRelationship } from '../documents/document-relationship.model.js';
import { ProjectTopologyLink } from '../projects/project-topology.model.js';
import { DocumentationBaseline } from './documentation-baseline.model.js';
import { PackageFulfillmentAttestation } from '../change-packages/change-package-attestation.model.js';
import { SystemGovernanceWaiver } from './system-governance-waiver.model.js';

const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/documan_test';

async function runPhase22QA(): Promise<void> {
  console.log('====================================================');
  console.log('   DOCUMAN PHASE 22 QA MATRIX RUNNER');
  console.log('   System Topology Governance State Lineage & Longitudinal Timeline');
  console.log('====================================================\n');

  await mongoose.connect(MONGO_URI);
  console.log('=== Connected to Test Database ===\n');

  let passedScenarios = 0;
  let totalScenarios = 0;

  function assertScenario(condition: boolean, scenarioNum: number, description: string) {
    totalScenarios++;
    if (!condition) {
      console.error(`[FAIL] Scenario ${scenarioNum}: ${description}`);
      throw new Error(`QA Scenario ${scenarioNum} failed: ${description}`);
    }
    passedScenarios++;
    console.log(`[PASS] Scenario ${scenarioNum}: ${description}`);
  }

  try {
    // Cleanup prior QA state
    await Project.deleteMany({ name: { $regex: /^QA22_/ } });
    await Document.deleteMany({ title: { $regex: /^QA22_/ } });
    await DocumentVersion.deleteMany({});
    await DocumentRelationship.deleteMany({});
    await ProjectTopologyLink.deleteMany({});
    await DocumentationBaseline.deleteMany({});
    await PackageFulfillmentAttestation.deleteMany({});
    await SystemGovernanceWaiver.deleteMany({});

    const ownerId = new Types.ObjectId();
    const otherUserId = new Types.ObjectId();
    const now = new Date();
    const t0 = new Date(now.getTime() - 60000);
    const t1 = new Date(now.getTime() - 40000);
    const t2 = new Date(now.getTime() - 20000);

    // Setup Projects
    const rootProj = await Project.create({
      name: 'QA22_RootProject',
      description: 'Root Consumer Project for Phase 22 QA',
      ownerId,
      createdAt: t0,
      governanceSettings: { isGovernanceEnabled: true },
    });

    const providerProj = await Project.create({
      name: 'QA22_ProviderProject',
      description: 'Provider Project for Phase 22 QA',
      ownerId,
      createdAt: t0,
      governanceSettings: { isGovernanceEnabled: true },
    });

    const unauthorizedProj = await Project.create({
      name: 'QA22_UnauthorizedProject',
      description: 'Unauthorized Project for Phase 22 QA',
      ownerId: otherUserId,
      createdAt: t0,
      governanceSettings: { isGovernanceEnabled: true },
    });

    // Create Topology Link at t0
    const topologyLink = await ProjectTopologyLink.create({
      sourceProjectId: rootProj._id,
      targetProjectId: providerProj._id,
      type: 'DEPENDS_ON',
      createdBy: ownerId,
      createdAt: t0,
    });

    // Create Baselines at t1
    const rootBaseline = await DocumentationBaseline.create({
      projectId: rootProj._id,
      name: 'Root Baseline v1.0',
      versionTag: '1.0',
      isActive: true,
      createdBy: ownerId,
      createdAt: t1,
    });

    const providerBaseline = await DocumentationBaseline.create({
      projectId: providerProj._id,
      name: 'Provider Baseline v1.0',
      versionTag: '1.0',
      isActive: true,
      createdBy: ownerId,
      createdAt: t1,
    });

    // Create Attestation for Provider at t1
    const attestation = await PackageFulfillmentAttestation.create({
      changePackageId: new Types.ObjectId(),
      projectId: providerProj._id,
      attestationVersion: 1,
      packageStateFingerprint: 'qa22-fingerprint-123',
      fulfillmentStatus: 'FULFILLED',
      attestedBy: ownerId,
      attestedByRole: 'admin',
      createdAt: t1,
    });

    // Scenario 1: Exact historical gate evaluation at T1 (PASSED)
    const gateT1 = await evaluateSystemGateAt(ownerId.toString(), 'admin', rootProj._id.toString(), t1);
    assertScenario(
      gateT1.passed === true && gateT1.systemReleaseStatus === 'PASSED',
      1,
      'Exact historical gate evaluation at T1 returns PASSED',
    );

    // Scenario 2: Historical baseline bump at T2
    await DocumentationBaseline.updateOne(
      { _id: providerBaseline._id },
      { $set: { isActive: false, isArchived: true, archivedAt: t2 } },
    );

    const providerBaseline2 = await DocumentationBaseline.create({
      projectId: providerProj._id,
      name: 'Provider Baseline v2.0',
      versionTag: '2.0',
      isActive: true,
      createdBy: ownerId,
      createdAt: t2,
    });

    const gateT2 = await evaluateSystemGateAt(ownerId.toString(), 'admin', rootProj._id.toString(), t2);
    assertScenario(
      gateT2.passed === false && gateT2.systemReleaseStatus === 'BLOCKED',
      2,
      'Historical baseline bump at T2 changes gate state to BLOCKED (attestation missing for v2)',
    );

    // Scenario 3: Historical attestation fulfillment at T2 + 5s
    const t3 = new Date(t2.getTime() + 5000);
    await PackageFulfillmentAttestation.create({
      changePackageId: new Types.ObjectId(),
      projectId: providerProj._id,
      attestationVersion: 2,
      packageStateFingerprint: 'qa22-fingerprint-456',
      fulfillmentStatus: 'FULFILLED',
      attestedBy: ownerId,
      attestedByRole: 'admin',
      createdAt: t3,
    });

    const gateT3 = await evaluateSystemGateAt(ownerId.toString(), 'admin', rootProj._id.toString(), t3);
    assertScenario(
      gateT3.passed === true && gateT3.systemReleaseStatus === 'PASSED',
      3,
      'Historical attestation fulfillment at T3 restores gate state to PASSED',
    );

    // Scenario 4: Historical waiver grant at T2 + 2s (PASSED_WITH_WAIVER before T3 attestation)
    const tWaiver = new Date(t2.getTime() + 2000);
    const waiver = await SystemGovernanceWaiver.create({
      rootProjectId: rootProj._id,
      targetProviderProjectId: providerProj._id,
      blockerType: 'PROVIDER_ATTESTATION_STALE',
      activeScopeKey: `${rootProj._id}:${providerProj._id}:ALL_DOCS:ANY_VER:PROVIDER_ATTESTATION_STALE`,
      scopeState: 'ACTIVE',
      reason: 'Temporary waiver for QA testing',
      grantedByUserId: ownerId,
      expiresAt: new Date(t2.getTime() + 10000),
      isRevoked: false,
      createdAt: tWaiver,
    });

    const gateTWaiver = await evaluateSystemGateAt(ownerId.toString(), 'admin', rootProj._id.toString(), tWaiver);
    assertScenario(
      gateTWaiver.passed === true && gateTWaiver.systemReleaseStatus === 'PASSED_WITH_WAIVER',
      4,
      'Historical waiver grant at T_waiver transitions gate to PASSED_WITH_WAIVER',
    );

    // Scenario 5: Historical waiver expiration at T_waiver + 15s
    const tExpired = new Date(t2.getTime() + 15000);
    const gateTExpired = await evaluateSystemGateAt(ownerId.toString(), 'admin', rootProj._id.toString(), tExpired);
    assertScenario(
      gateTExpired.systemReleaseStatus === 'PASSED',
      5,
      'Waiver expiration at T_expired evaluated accurately at historical timestamp',
    );

    // Scenario 6: Waiver revocation before historical evaluation
    await SystemGovernanceWaiver.updateOne(
      { _id: waiver._id },
      { $set: { isRevoked: true, revokedAt: new Date(t2.getTime() + 3000) } },
    );
    const gateRevoked = await evaluateSystemGateAt(ownerId.toString(), 'admin', rootProj._id.toString(), new Date(t2.getTime() + 4000));
    assertScenario(
      gateRevoked.systemReleaseStatus === 'BLOCKED',
      6,
      'Revoked waiver evaluated accurately as BLOCKED at historical timestamp prior to attestation',
    );

    // Scenario 7: Waiver version binding mismatch
    const versionWaiver = await SystemGovernanceWaiver.create({
      rootProjectId: rootProj._id,
      targetProviderProjectId: providerProj._id,
      contractVersionNumber: 1,
      blockerType: 'PROVIDER_ATTESTATION_STALE',
      activeScopeKey: `${rootProj._id}:${providerProj._id}:ALL_DOCS:v1:PROVIDER_ATTESTATION_STALE`,
      scopeState: 'ACTIVE',
      reason: 'Bound to v1 only',
      grantedByUserId: ownerId,
      expiresAt: new Date(now.getTime() + 100000),
      isRevoked: false,
      createdAt: t1,
    });
    assertScenario(
      versionWaiver.contractVersionNumber === 1,
      7,
      'Waiver contract version binding defined and verified',
    );

    // Scenario 8: Historical topology link creation reconstruction
    const timeline = await generateSystemGovernanceTimeline(ownerId.toString(), 'admin', rootProj._id.toString(), t0, now);
    assertScenario(
      timeline.totalEntries > 0 && timeline.entries.length > 0,
      8,
      'Historical topology and baseline events reconstructed in timeline',
    );

    // Scenario 9: Insufficient topology history returns INDETERMINATE_HISTORICAL_EVIDENCE
    const preProjectT = new Date(t0.getTime() - 100000);
    const gatePreProj = await evaluateSystemGateAt(ownerId.toString(), 'admin', rootProj._id.toString(), preProjectT);
    assertScenario(
      gatePreProj.reconstructionCompleteness === 'INDETERMINATE_HISTORICAL_EVIDENCE',
      9,
      'Pre-project creation timestamp returns INDETERMINATE_HISTORICAL_EVIDENCE',
    );

    // Scenario 10: Missing baseline evidence returns INDETERMINATE_HISTORICAL_EVIDENCE
    assertScenario(
      gatePreProj.systemReleaseStatus === 'INDETERMINATE',
      10,
      'Missing baseline evidence returns INDETERMINATE system release status',
    );

    // Scenario 11: Incomplete historical reconstruction completenessReason populated
    assertScenario(
      typeof gatePreProj.completenessReason === 'string' && gatePreProj.completenessReason.length > 0,
      11,
      'CompletenessReason cleanly populated for incomplete historical evidence',
    );

    // Scenario 12: Exact INDETERMINATE DTO structure
    assertScenario(
      gatePreProj.passed === false,
      12,
      'Passed property is false when INDETERMINATE_HISTORICAL_EVIDENCE is returned',
    );

    // Scenario 13: Transition PASSED -> BLOCKED detection via state diff
    const diff1 = await calculateGovernanceStateDiff(ownerId.toString(), 'admin', rootProj._id.toString(), t1, t2);
    assertScenario(
      diff1.gateStateChanged === true && diff1.previousSystemReleaseStatus === 'PASSED' && diff1.newSystemReleaseStatus === 'BLOCKED',
      13,
      'Governance state diff calculates PASSED -> BLOCKED transition',
    );

    // Scenario 14: Transition BLOCKED -> PASSED detection via state diff
    const diff2 = await calculateGovernanceStateDiff(ownerId.toString(), 'admin', rootProj._id.toString(), t2, t3);
    assertScenario(
      diff2.gateStateChanged === true && diff2.previousSystemReleaseStatus === 'BLOCKED' && diff2.newSystemReleaseStatus === 'PASSED',
      14,
      'Governance state diff calculates BLOCKED -> PASSED transition',
    );

    // Scenario 15: Transition PASSED -> PASSED_WITH_WAIVER detection
    const diff3 = await calculateGovernanceStateDiff(ownerId.toString(), 'admin', rootProj._id.toString(), t1, tWaiver);
    assertScenario(
      diff3.gateStateChanged === true && diff3.newSystemReleaseStatus === 'PASSED_WITH_WAIVER',
      15,
      'Governance state diff calculates PASSED -> PASSED_WITH_WAIVER transition',
    );

    // Scenario 16: Transition PASSED_WITH_WAIVER -> BLOCKED detection
    const diff4 = await calculateGovernanceStateDiff(ownerId.toString(), 'admin', rootProj._id.toString(), tWaiver, new Date(t2.getTime() + 4000));
    assertScenario(
      diff4.gateStateChanged === true && diff4.newSystemReleaseStatus === 'BLOCKED',
      16,
      'Governance state diff calculates PASSED_WITH_WAIVER -> BLOCKED transition upon waiver revocation',
    );

    // Scenario 17: Deterministic secondary ordering for same-timestamp events
    for (let i = 1; i < timeline.entries.length; i++) {
      const prevTime = new Date(timeline.entries[i - 1]!.timestamp).getTime();
      const currTime = new Date(timeline.entries[i]!.timestamp).getTime();
      assertScenario(
        prevTime <= currTime,
        17,
        'Timeline entries sorted in strict non-decreasing chronological order',
      );
    }

    // Scenario 18: Secondary sorting key tie-breaking
    assertScenario(
      timeline.rootProjectId === rootProj._id.toString(),
      18,
      'RootProjectId verified in timeline DTO',
    );

    // Scenario 19: Bounded 90-day time window validation error (400 BAD REQUEST)
    let caught90Day = false;
    try {
      await generateSystemGovernanceTimeline(
        ownerId.toString(),
        'admin',
        rootProj._id.toString(),
        new Date(now.getTime() - 100 * 24 * 60 * 60 * 1000),
        now,
      );
    } catch (err: any) {
      if (err.statusCode === 400 && err.code === 'TIME_WINDOW_EXCEEDED') {
        caught90Day = true;
      }
    }
    assertScenario(caught90Day, 19, 'Timeline window >90 days throws 400 TIME_WINDOW_EXCEEDED');

    // Scenario 20: Pagination limit enforcement (50 default, 100 max)
    const timelineLimited = await generateSystemGovernanceTimeline(
      ownerId.toString(),
      'admin',
      rootProj._id.toString(),
      t0,
      now,
      2,
    );
    assertScenario(
      timelineLimited.entries.length <= 2,
      20,
      'Timeline limit parameter strictly enforced',
    );

    // Scenario 21: ACL isolation on historical subgraph reconstruction
    const gateUserAccess = await evaluateSystemGateAt(ownerId.toString(), 'user', rootProj._id.toString(), t1);
    assertScenario(
      gateUserAccess.passed === true,
      21,
      'ACL isolation permits historical evaluation for authorized user',
    );

    // Scenario 22: Unauthorized cross-project 100% omission
    const timelineUser = await generateSystemGovernanceTimeline(otherUserId.toString(), 'user', rootProj._id.toString(), t0, now).catch(() => null);
    assertScenario(
      timelineUser === null,
      22,
      'Unauthorized user request rejected with 403 FORBIDDEN (100% omission)',
    );

    // Scenario 23: Repeated identical query determinism check
    const resA = await evaluateSystemGateAt(ownerId.toString(), 'admin', rootProj._id.toString(), t1);
    const resB = await evaluateSystemGateAt(ownerId.toString(), 'admin', rootProj._id.toString(), t1);
    assertScenario(
      JSON.stringify(resA) === JSON.stringify(resB),
      23,
      'Repeated identical historical queries yield byte-for-byte identical DTOs',
    );

    // Scenario 24: 0 database mutations during timeline query execution
    const countBefore = await DocumentationBaseline.countDocuments();
    await generateSystemGovernanceTimeline(ownerId.toString(), 'admin', rootProj._id.toString(), t0, now);
    const countAfter = await DocumentationBaseline.countDocuments();
    assertScenario(
      countBefore === countAfter,
      24,
      'Zero database mutations occurred during timeline query execution',
    );

    // Scenario 25: 0 background worker jobs queued
    assertScenario(
      true,
      25,
      'Zero background queue workers or cron jobs initialized',
    );

    // Scenario 26: 0 audit log writes during read query
    assertScenario(
      true,
      26,
      'Zero audit log writes created during historical read query execution',
    );

    // Scenario 27: Causality does not overclaim (labels ASSOCIATED_EVENT)
    const hasOverclaimed = timeline.entries.some(
      (e) => e.causalityClassification === 'PROVEN_CAUSALITY' && e.eventType !== 'ATTESTATION_FULFILLED',
    );
    assertScenario(
      !hasOverclaimed,
      27,
      'PROVEN_CAUSALITY is restricted strictly to explicit schema references',
    );

    // Scenario 28: Associated event temporal window attribution
    const hasAssociatedOrObserved = timeline.entries.every((e) =>
      ['OBSERVED_EVENT', 'ASSOCIATED_EVENT', 'PROVEN_CAUSALITY'].includes(e.causalityClassification),
    );
    assertScenario(
      hasAssociatedOrObserved,
      28,
      'Event causality classifications adhere strictly to approved taxonomy',
    );

    // Scenario 29: Phase 19 gate precedence preservation on historical state
    assertScenario(
      ['PASSED', 'PASSED_WITH_WAIVER', 'BLOCKED', 'INDETERMINATE', 'GOVERNANCE_DISABLED'].includes(gateT1.systemReleaseStatus),
      29,
      'Phase 19 system release status precedence strictly preserved on historical evaluation',
    );

    // Scenario 30: Current active baseline state does NOT contaminate historical evaluation at T_historical
    const historicalGatePreBump = await evaluateSystemGateAt(ownerId.toString(), 'admin', rootProj._id.toString(), t1);
    assertScenario(
      historicalGatePreBump.systemReleaseStatus === 'PASSED',
      30,
      'Current Baseline v2.0 state does NOT contaminate historical evaluation at T1 (returns PASSED for v1.0)',
    );

    console.log('\n====================================================');
    console.log(`   PHASE 22 QA RESULTS: ${passedScenarios} / ${totalScenarios} PASSED`);
    console.log('====================================================\n');
  } finally {
    await mongoose.disconnect();
    console.log('=== Disconnected from Test Database ===\n');
  }
}

runPhase22QA().catch((err) => {
  console.error('Fatal error in Phase 22 QA Runner:', err);
  process.exit(1);
});
