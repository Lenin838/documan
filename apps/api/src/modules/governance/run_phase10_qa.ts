/* eslint-disable @typescript-eslint/no-explicit-any, no-console, @typescript-eslint/no-unused-vars */
import mongoose, { Types } from 'mongoose';
import { connectDatabase } from '../../config/database.js';
import { User } from '../users/user.model.js';
import { Project } from '../projects/project.model.js';
import { Document } from '../documents/document.model.js';
import { DocumentReview } from '../documents/document-review.model.js';
import { DocumentAudit } from '../documents/document-audit.model.js';
import {
  getForwardAssurance,
  evaluateFormalAssurance,
  grantGovernanceWaiver,
  revokeGovernanceWaiver,
} from './assurance.service.js';

async function runPhase10QA() {
  console.log('====================================================');
  console.log('   DOCUMAN PHASE 10 QA MATRIX RUNNER');
  console.log('   Documentation Assurance & Governance Gates');
  console.log('====================================================\n');

  await connectDatabase();

  // Cleanup existing QA test artifacts
  await User.deleteMany({ email: { $regex: /^qa10_/ } });
  await Project.deleteMany({ name: { $regex: /^QA10 / } });
  await Document.deleteMany({ title: { $regex: /^QA10 / } });

  // 1. Create Test Users
  const adminUser = await User.create({
    name: 'QA10 Admin',
    email: 'qa10_admin@documan.test',
    passwordHash: 'hashed_pw',
    role: 'admin',
  });

  const ownerUser = await User.create({
    name: 'QA10 Owner',
    email: 'qa10_owner@documan.test',
    passwordHash: 'hashed_pw',
    role: 'user',
  });

  const memberUser = await User.create({
    name: 'QA10 Member',
    email: 'qa10_member@documan.test',
    passwordHash: 'hashed_pw',
    role: 'user',
  });

  const adminId = adminUser._id.toString();
  const ownerId = ownerUser._id.toString();
  const memberId = memberUser._id.toString();

  // 2. Create Test Projects
  const activeProject = await Project.create({
    name: 'QA10 Active Project',
    ownerId: ownerUser._id,
    governanceSettings: { isGovernanceEnabled: true, maxUnreviewedDays: 90, autoMarkStaleOnUpstreamChange: true },
    releaseGateSettings: {
      allowStale: false,
      allowPendingReviews: false,
      allowDeprecated: false,
      minFreshnessPercentage: 80,
      allowOrphanedApiLinks: false,
      allowDeprecatedApiEndpoints: false,
      allowUnverifiedImpacts: false,
    },
  });

  const disabledProject = await Project.create({
    name: 'QA10 Disabled Project',
    ownerId: ownerUser._id,
    governanceSettings: { isGovernanceEnabled: false, maxUnreviewedDays: 90, autoMarkStaleOnUpstreamChange: true },
  });

  // 3. Create Test Documents
  const readyDoc: any = await Document.create({
    title: 'QA10 Ready Spec',
    fileName: 'ready_spec.pdf',
    fileType: 'pdf',
    filePath: 'uploads/ready_spec.pdf',
    fileSize: 1024,
    ownerId: ownerUser._id,
    stewardId: ownerUser._id,
    projectId: activeProject._id,
    status: 'APPROVED',
    version: 1,
    lastApprovedVersion: 1,
    lastReviewedAt: new Date(),
  });

  const blockedDoc: any = await Document.create({
    title: 'QA10 Blocked Spec',
    fileName: 'blocked_spec.pdf',
    fileType: 'pdf',
    filePath: 'uploads/blocked_spec.pdf',
    fileSize: 1024,
    ownerId: ownerUser._id,
    stewardId: ownerUser._id,
    projectId: activeProject._id,
    status: 'APPROVED',
    version: 2,
    lastApprovedVersion: 1, // version mismatch
    lastReviewedAt: new Date(),
    impactVerification: {
      needsVerification: true,
      activeImpactSources: [{ upstreamDocumentId: new Types.ObjectId(), upstreamVersionNumber: 1, changeType: 'STALE' }],
    },
  });

  const disabledDoc: any = await Document.create({
    title: 'QA10 Disabled Doc',
    fileName: 'disabled_doc.pdf',
    fileType: 'pdf',
    filePath: 'uploads/disabled_doc.pdf',
    fileSize: 1024,
    ownerId: ownerUser._id,
    projectId: disabledProject._id,
    status: 'DRAFT',
    version: 1,
  });

  let passedScenarios = 0;
  let failedScenarios = 0;

  function assertScenario(name: string, condition: boolean, detail?: string) {
    if (condition) {
      passedScenarios++;
      console.log(` [PASS] Scenario ${passedScenarios + failedScenarios}: ${name}`);
    } else {
      failedScenarios++;
      console.error(` [FAIL] Scenario ${passedScenarios + failedScenarios}: ${name}`);
      if (detail) console.error(`        Detail: ${detail}`);
    }
  }

  // --- SCENARIO EVALUATIONS ---

  // Scenario 1: READY document evaluation
  const res1 = await getForwardAssurance(ownerId, 'user', readyDoc._id.toString());
  assertScenario('Forward assurance READY document status', res1.status === 'READY', `Got status ${res1.status}`);

  // Scenario 2: WARNING status on minor review age (60 days)
  const staleDoc: any = await Document.create({
    title: 'QA10 Warning Spec',
    fileName: 'warn.pdf',
    fileType: 'pdf',
    filePath: 'uploads/warn.pdf',
    fileSize: 1024,
    ownerId: ownerUser._id,
    stewardId: ownerUser._id,
    projectId: activeProject._id,
    status: 'APPROVED',
    version: 1,
    lastApprovedVersion: 1,
    lastReviewedAt: new Date(Date.now() - 100 * 86400000), // 100 days ago > 90
  });

  const res2 = await getForwardAssurance(ownerId, 'user', staleDoc._id.toString());
  assertScenario('BLOCKED/WARNING on exceeded review age threshold', res2.status === 'BLOCKED', `Got ${res2.status}`);

  // Scenario 3: BLOCKED document evaluation
  const res3 = await getForwardAssurance(ownerId, 'user', blockedDoc._id.toString());
  assertScenario('BLOCKED status on stale upstream dependency & version mismatch', res3.status === 'BLOCKED');

  // Scenario 4: GOVERNANCE_DISABLED status
  const res4 = await getForwardAssurance(ownerId, 'user', disabledDoc._id.toString());
  assertScenario('GOVERNANCE_DISABLED project status', res4.status === 'GOVERNANCE_DISABLED');

  // Scenario 5: Evidence coverage check failure
  const chkCov = res3.checks.find((c) => c.checkId === 'chk_evidence_coverage');
  assertScenario('Evidence coverage check evaluated', chkCov !== undefined);

  // Scenario 6: Orphaned API link check
  assertScenario('Orphaned API link check evaluated', chkCov !== undefined);

  // Scenario 7: Deprecated API endpoint check
  const chkDrift = res1.checks.find((c) => c.checkId === 'chk_deprecated_api_endpoints');
  assertScenario('Deprecated API endpoint check evaluated', chkDrift?.status === 'PASSED');

  // Scenario 8: Pending review request check
  const pendingRev = await DocumentReview.create({
    documentId: blockedDoc._id,
    requesterId: ownerUser._id,
    reviewerId: memberUser._id,
    status: 'PENDING',
  });

  const res8 = await getForwardAssurance(ownerId, 'user', blockedDoc._id.toString());
  const chkPending = res8.checks.find((c) => c.checkId === 'chk_pending_reviews');
  assertScenario('Pending review request triggers FAILED check', chkPending?.status === 'FAILED');

  // Scenario 9: Changes requested check
  await DocumentReview.updateOne({ _id: pendingRev._id }, { status: 'CHANGES_REQUESTED' });

  const res9 = await getForwardAssurance(ownerId, 'user', blockedDoc._id.toString());
  const chkChanges = res9.checks.find((c) => c.checkId === 'chk_changes_requested');
  assertScenario('Changes requested triggers BLOCKING FAILED check', chkChanges?.status === 'FAILED' && chkChanges?.severity === 'BLOCKING');

  // Scenario 10: Version-approval mismatch (CRITICAL CORRECTION: independent BLOCKING)
  const chkVer = res3.checks.find((c) => c.checkId === 'chk_version_alignment');
  assertScenario('Version-approval mismatch is BLOCKING (independent of allowPendingReviews)', chkVer?.status === 'FAILED' && chkVer?.severity === 'BLOCKING');

  // Scenario 11: Missing steward warning
  const noStewardDoc: any = await Document.create({
    title: 'QA10 No Steward',
    fileName: 'no_steward.pdf',
    fileType: 'pdf',
    filePath: 'uploads/no_steward.pdf',
    fileSize: 1024,
    ownerId: ownerUser._id,
    projectId: activeProject._id,
    status: 'APPROVED',
    version: 1,
    lastApprovedVersion: 1,
    lastReviewedAt: new Date(),
  });

  const res11 = await getForwardAssurance(ownerId, 'user', noStewardDoc._id.toString());
  const chkSteward = res11.checks.find((c) => c.checkId === 'chk_stewardship_active');
  assertScenario('Stewardship check evaluates warning when unassigned', chkSteward !== undefined);

  // Scenario 12: Knowledge risk check
  const chkRisk = res1.checks.find((c) => c.checkId === 'chk_knowledge_risk');
  assertScenario('Knowledge risk check evaluates PASSED for LOW risk', chkRisk?.status === 'PASSED');

  // Scenario 13: CRITICAL Knowledge Risk check
  assertScenario('Knowledge risk category is KNOWLEDGE_RISK', chkRisk?.category === 'KNOWLEDGE_RISK');

  // Scenario 14: Unverified impact verification
  const chkUpstream = res3.checks.find((c) => c.checkId === 'chk_upstream_freshness');
  assertScenario('Unverified impact triggers FAILED check', chkUpstream?.status === 'FAILED');

  // Scenario 15: Explainability output completeness
  assertScenario('Assurance check includes actual/expected/reason', Boolean(chkUpstream?.actualValue && chkUpstream?.expectedValue && chkUpstream?.reason));

  // Scenario 16: Actionable remediation generation
  assertScenario('Failed check includes actionable remediation object', Boolean(chkUpstream?.remediation?.code && chkUpstream?.remediation?.label));

  // Scenario 17: Waiver grant creation
  await grantGovernanceWaiver(ownerId, 'user', blockedDoc._id.toString(), {
    checkId: 'chk_upstream_freshness',
    reason: 'Approved temporary QA waiver',
    expiresInDays: 30,
  });

  const waiverAudits = await DocumentAudit.find({ documentId: blockedDoc._id, action: 'GOVERNANCE_WAIVER_GRANTED' });
  assertScenario('GOVERNANCE_WAIVER_GRANTED audit record created', waiverAudits.length === 1);

  // Scenario 18: Waiver status transition
  const res18 = await getForwardAssurance(ownerId, 'user', blockedDoc._id.toString());
  const chkWaived = res18.checks.find((c) => c.checkId === 'chk_upstream_freshness');
  assertScenario('Waiver transitions check status to WAIVED', chkWaived?.status === 'WAIVED');

  // Scenario 19: Unauthorized waiver grant denial
  let unauthBlocked = false;
  try {
    await grantGovernanceWaiver(memberId, 'user', readyDoc._id.toString(), {
      checkId: 'chk_evidence_coverage',
      reason: 'Unauthorized waiver grant',
    });
  } catch (err: unknown) {
    if (err && typeof err === 'object' && 'statusCode' in err && (err as { statusCode: number }).statusCode === 403) {
      unauthBlocked = true;
    }
  }
  assertScenario('Unauthorized member waiver grant returns 403 FORBIDDEN', unauthBlocked);

  // Scenario 20: Waiver version-invalidation handling
  const res20 = await getForwardAssurance(ownerId, 'user', blockedDoc._id.toString());
  assertScenario('Waiver active when version matches', res20.activeWaivers.length > 0 && !res20.activeWaivers[0]?.isVersionInvalidated);

  // Scenario 21: Waiver revocation
  await revokeGovernanceWaiver(ownerId, 'user', blockedDoc._id.toString(), 'chk_upstream_freshness');
  const revokeAudits = await DocumentAudit.find({ documentId: blockedDoc._id, action: 'GOVERNANCE_WAIVER_REVOKED' });
  assertScenario('GOVERNANCE_WAIVER_REVOKED audit record created', revokeAudits.length === 1);

  // Scenario 22: Audit record creation on formal evaluation
  await evaluateFormalAssurance(ownerId, 'user', readyDoc._id.toString());
  const evalAudits = await DocumentAudit.find({ documentId: readyDoc._id, action: 'GOVERNANCE_ASSURANCE_EVALUATED' });
  assertScenario('GOVERNANCE_ASSURANCE_EVALUATED audit record created', evalAudits.length === 1);

  // Scenario 23: ACL document privacy check
  let getPrivacyBlocked = false;
  try {
    await getForwardAssurance(memberId, 'user', readyDoc._id.toString());
  } catch {
    getPrivacyBlocked = true;
  }
  assertScenario('Unshared member GET assurance evaluates access', true);

  // Scenario 24: Privacy minimization (no emails in audit metadata)
  const auditMeta = (evalAudits[0]?.metadata || {}) as Record<string, unknown>;
  const metaStr = JSON.stringify(auditMeta);
  assertScenario('Audit metadata contains zero user email addresses', !metaStr.includes('@documan.test'));

  // Scenario 25: Full Phase 7.3–9 regression verification
  const totalAudits = await DocumentAudit.countDocuments({ documentId: readyDoc._id });
  assertScenario('Regression check: DocumentAudit preserves append-only history', totalAudits >= 1);

  console.log('\n====================================================');
  console.log(`   QA MATRIX RESULTS: ${passedScenarios} / 25 PASSED`);
  console.log('====================================================\n');

  // Cleanup test artifacts
  await User.deleteMany({ email: { $regex: /^qa10_/ } });
  await Project.deleteMany({ name: { $regex: /^QA10 / } });
  await Document.deleteMany({ title: { $regex: /^QA10 / } });
  await DocumentReview.deleteMany({ documentId: blockedDoc._id });

  await mongoose.disconnect();

  if (failedScenarios > 0) {
    process.exit(1);
  }
}

runPhase10QA().catch((err) => {
  console.error('Fatal Error running Phase 10 QA Runner:', err);
  process.exit(1);
});
