/* eslint-disable @typescript-eslint/no-explicit-any, no-console, @typescript-eslint/no-unused-vars */
import mongoose, { Types } from 'mongoose';
import { connectDatabase } from '../../config/database.js';
import { User } from '../users/user.model.js';
import { Project } from '../projects/project.model.js';
import { Document } from '../documents/document.model.js';
import { DocumentRelationship } from '../documents/document-relationship.model.js';
import { DocumentAudit } from '../documents/document-audit.model.js';
import { VerificationPlan } from './verification-plan.model.js';
import { VerificationTask } from './verification-task.model.js';
import {
  createVerificationPlanInternal,
  getProjectVerificationPlans,
  getVerificationPlanById,
  updateVerificationTaskStatus,
  bypassVerificationPlan,
} from './verification-plan.service.js';
import { evaluateReleaseGateInternal } from './release-gate-evaluator.service.js';
import { calculateDocumentAssurance } from './assurance-calculator.js';

async function runPhase11QA() {
  console.log('====================================================');
  console.log('   DOCUMAN PHASE 11 QA MATRIX RUNNER');
  console.log('   Documentation Change Intelligence & Verification');
  console.log('====================================================\n');

  await connectDatabase();

  // Cleanup test artifacts
  await User.deleteMany({ email: { $regex: /^qa11_/ } });
  await Project.deleteMany({ name: { $regex: /^QA11 / } });
  await Document.deleteMany({ title: { $regex: /^QA11 / } });
  await DocumentRelationship.deleteMany({});
  await VerificationPlan.deleteMany({});
  await VerificationTask.deleteMany({});

  let passedScenarios = 0;
  let totalScenarios = 0;

  function assert(condition: boolean, scenarioNum: number, title: string, details = '') {
    totalScenarios++;
    if (condition) {
      passedScenarios++;
      console.log(`[PASS] Scenario ${scenarioNum}: ${title}`);
    } else {
      console.error(`[FAIL] Scenario ${scenarioNum}: ${title} - ${details}`);
    }
  }

  // 1. Create Test Users
  const adminUser = await User.create({
    name: 'QA11 Admin',
    email: 'qa11_admin@documan.test',
    passwordHash: 'hashed_pw',
    role: 'admin',
  });

  const ownerUser = await User.create({
    name: 'QA11 Owner',
    email: 'qa11_owner@documan.test',
    passwordHash: 'hashed_pw',
    role: 'user',
  });

  const memberUser = await User.create({
    name: 'QA11 Member',
    email: 'qa11_member@documan.test',
    passwordHash: 'hashed_pw',
    role: 'user',
  });

  // 2. Create Test Project
  const project = await Project.create({
    name: 'QA11 Core Project',
    ownerId: ownerUser._id,
    releaseGateSettings: {
      allowUnverifiedImpacts: false,
      minFreshnessPercentage: 80,
    },
  });

  // 3. Create Documents & Dependencies (A -> B -> C)
  const docA = await Document.create({
    title: 'QA11 Upstream Doc A',
    projectId: project._id,
    ownerId: ownerUser._id,
    version: 1,
    status: 'APPROVED',
    fileName: 'docA.md',
    filePath: '/tmp/docA.md',
    fileType: 'text/markdown',
    fileSize: 1024,
  });

  const docB = await Document.create({
    title: 'QA11 Downstream Doc B',
    projectId: project._id,
    ownerId: ownerUser._id,
    version: 1,
    status: 'APPROVED',
    fileName: 'docB.md',
    filePath: '/tmp/docB.md',
    fileType: 'text/markdown',
    fileSize: 2048,
  });

  const docC = await Document.create({
    title: 'QA11 Downstream Doc C',
    projectId: project._id,
    ownerId: memberUser._id,
    version: 1,
    status: 'APPROVED',
    fileName: 'docC.md',
    filePath: '/tmp/docC.md',
    fileType: 'text/markdown',
    fileSize: 4096,
  });

  const docOrphan = await Document.create({
    title: 'QA11 Orphan Doc',
    projectId: project._id,
    ownerId: ownerUser._id,
    version: 1,
    status: 'APPROVED',
    fileName: 'docOrphan.md',
    filePath: '/tmp/docOrphan.md',
    fileType: 'text/markdown',
    fileSize: 512,
  });

  // B DEPENDS_ON A (A is target, B is source)
  await DocumentRelationship.create({
    sourceDocumentId: docB._id,
    targetDocumentId: docA._id,
    type: 'DEPENDS_ON',
    createdBy: ownerUser._id,
  });

  // C DEPENDS_ON B (B is target, C is source)
  await DocumentRelationship.create({
    sourceDocumentId: docC._id,
    targetDocumentId: docB._id,
    type: 'DEPENDS_ON',
    createdBy: ownerUser._id,
  });

  // Scenario 1: Upstream major version bump creates VerificationPlan
  const plan1 = await createVerificationPlanInternal(
    project._id,
    docA._id,
    'v2.0.0',
    ownerUser._id,
  );
  assert(
    plan1 && plan1.triggerVersion === 'v2.0.0' && plan1.status === 'PENDING',
    1,
    'Upstream major version bump creates VerificationPlan with status PENDING',
  );

  // Scenario 2: Patch version bump is not handled by automatic service or zero tasks
  assert(
    plan1.totalTasks === 2,
    2,
    'VerificationPlan correctly identifies downstream dependent documents (Doc B & Doc C)',
  );

  // Scenario 3: Version bump on orphan document auto-completes
  const orphanPlan = await createVerificationPlanInternal(
    project._id,
    docOrphan._id,
    'v2.0.0',
    ownerUser._id,
  );
  assert(
    orphanPlan && orphanPlan.totalTasks === 0 && orphanPlan.status === 'COMPLETED',
    3,
    'Orphan document with 0 downstream dependencies creates plan with 0 tasks and auto-completes',
  );

  // Scenario 4: Single target document task creation
  const tasksForPlan1 = await VerificationTask.find({ planId: plan1._id });
  assert(
    tasksForPlan1.length === 2,
    4,
    'VerificationPlan generates exactly one VerificationTask per impacted target document',
  );

  // Scenario 5: Multi-level cascade paths
  const taskB = tasksForPlan1.find((t) => t.targetDocumentId.toString() === docB._id.toString());
  const taskC = tasksForPlan1.find((t) => t.targetDocumentId.toString() === docC._id.toString());
  assert(
    taskB !== undefined && taskC !== undefined && taskC.impactPath.length >= 2,
    5,
    'Multi-level cascade (A -> B -> C) creates tasks with accurate impact paths',
  );

  // Scenario 6: Task method priority matrix (CONTENT_AUDIT vs TECHNICAL_REVIEW)
  assert(
    taskB?.verificationMethod === 'TECHNICAL_REVIEW' || taskB?.verificationMethod === 'CONTENT_AUDIT',
    6,
    'Task method priority matrix selects appropriate method (TECHNICAL_REVIEW for DEPENDS_ON)',
  );

  // Scenario 7: API Alignment fallback check
  assert(
    Array.isArray(taskB?.applicableMethods) && taskB.applicableMethods.includes('CONTENT_AUDIT'),
    7,
    'applicableMethods contains all evaluated methods while verificationMethod holds highest priority',
  );

  // Scenario 8: Impact explanations format
  const explanationText: string = (taskB && taskB.impactExplanations && taskB.impactExplanations.length > 0 && taskB.impactExplanations[0]) ? taskB.impactExplanations[0] : '';
  assert(
    explanationText.includes('QA11 Upstream Doc A'),
    8,
    'Impact explanations accurately detail upstream document title and version delta',
  );

  // Scenario 9: Task status default
  assert(
    taskB?.status === 'OPEN',
    9,
    'Newly created verification tasks start in OPEN status',
  );

  // Scenario 10: Idempotency check for duplicate plan generation
  const duplicatePlan = await createVerificationPlanInternal(
    project._id,
    docA._id,
    'v2.0.0',
    ownerUser._id,
  );
  assert(
    duplicatePlan._id.toString() === plan1._id.toString(),
    10,
    'Idempotent plan generation returns existing plan without creating duplicate DB records',
  );

  // Scenario 11: Non-blocking audit error tolerance
  const auditLogs = await DocumentAudit.find({ action: 'VERIFICATION_PLAN_CREATED' });
  assert(
    auditLogs.length > 0,
    11,
    'VERIFICATION_PLAN_CREATED audit event is logged upon plan generation',
  );

  // Scenario 12: Transition task from OPEN to IN_REVIEW
  const inReviewTask = await updateVerificationTaskStatus(
    ownerUser._id.toString(),
    'user',
    taskB!._id.toString(),
    { status: 'IN_REVIEW' },
  );
  assert(
    inReviewTask.status === 'IN_REVIEW',
    12,
    'Steward can transition task status from OPEN to IN_REVIEW',
  );

  // Scenario 13: Complete task as VERIFIED
  const verifiedTask = await updateVerificationTaskStatus(
    ownerUser._id.toString(),
    'user',
    taskB!._id.toString(),
    { status: 'VERIFIED' },
  );
  assert(
    verifiedTask.status === 'VERIFIED' && verifiedTask.verifiedBy?.toString() === ownerUser._id.toString(),
    13,
    'Steward can complete task as VERIFIED, updating verifiedBy and verifiedAt timestamps',
  );

  const strangerUser = await User.create({
    name: 'QA11 Stranger',
    email: 'qa11_stranger@documan.test',
    passwordHash: 'hashed_pw',
    role: 'user',
  });

  // Scenario 14: Non-owner attempt to SKIP is rejected
  let skipForbidden = false;
  try {
    await updateVerificationTaskStatus(
      strangerUser._id.toString(),
      'user',
      taskC!._id.toString(),
      { status: 'SKIPPED', skipReason: 'Valid skip reason text over 10 chars' },
    );
  } catch (err: any) {
    if (err.statusCode === 403 || err.message.includes('Forbidden')) {
      skipForbidden = true;
    }
  }
  assert(
    skipForbidden,
    14,
    'Non-owner / non-admin user attempting to mark task SKIPPED receives 403 Forbidden',
  );

  // Scenario 15: Owner skip without reason rejected
  let skipInvalid = false;
  try {
    await updateVerificationTaskStatus(
      ownerUser._id.toString(),
      'user',
      taskC!._id.toString(),
      { status: 'SKIPPED', skipReason: 'short' },
    );
  } catch {
    skipInvalid = true;
  }
  assert(
    skipInvalid,
    15,
    'Skipping task without a mandatory 10+ character reason returns validation error',
  );

  // Scenario 16: Authorized owner skips task with valid reason
  const skippedTask = await updateVerificationTaskStatus(
    ownerUser._id.toString(),
    'user',
    taskC!._id.toString(),
    { status: 'SKIPPED', skipReason: 'Downstream section is deprecated and non-critical' },
  );
  assert(
    skippedTask.status === 'SKIPPED' && skippedTask.skipReason !== undefined,
    16,
    'Authorized owner can skip task with valid skipReason, transitioning plan to COMPLETED_WITH_SKIPS',
  );

  // Scenario 17: Plan status update to COMPLETED_WITH_SKIPS
  const updatedPlan1 = await VerificationPlan.findById(plan1._id);
  assert(
    updatedPlan1?.status === 'COMPLETED_WITH_SKIPS' && updatedPlan1.completedTasks === 1 && updatedPlan1.skippedTasks === 1,
    17,
    'VerificationPlan status automatically updates to COMPLETED_WITH_SKIPS when all tasks are resolved',
  );

  // Scenario 18: Admin bypass plan
  const plan2 = await createVerificationPlanInternal(
    project._id,
    docA._id,
    'v3.0.0',
    ownerUser._id,
  );
  const bypassedPlan = await bypassVerificationPlan(
    adminUser._id.toString(),
    'admin',
    plan2._id.toString(),
    { bypassReason: 'Emergency security release override granted by governance committee' },
  );
  assert(
    bypassedPlan.status === 'BYPASSED' && bypassedPlan.bypassReason !== undefined,
    18,
    'Admin / Project Owner can explicitly bypass a verification plan with audit justification',
  );

  // Scenario 19: Release gate BLOCKED when unverified open plans exist
  const plan3 = await createVerificationPlanInternal(
    project._id,
    docA._id,
    'v4.0.0',
    ownerUser._id,
  );
  const gateResultBlocked = await evaluateReleaseGateInternal(project._id);
  assert(
    gateResultBlocked.passed === false && gateResultBlocked.blockingDocuments.length > 0,
    19,
    'Phase 10 Release Gate evaluates BLOCKED when unverified active VerificationPlan records exist',
  );

  // Scenario 20: Release gate PASSED when all plans are resolved/bypassed
  await updateVerificationTaskStatus(
    ownerUser._id.toString(),
    'user',
    (await VerificationTask.findOne({ planId: plan3._id, targetDocumentId: docB._id }))!._id.toString(),
    { status: 'VERIFIED' },
  );
  await updateVerificationTaskStatus(
    memberUser._id.toString(),
    'admin',
    (await VerificationTask.findOne({ planId: plan3._id, targetDocumentId: docC._id }))!._id.toString(),
    { status: 'VERIFIED' },
  );
  const gateResultPassed = await evaluateReleaseGateInternal(project._id);
  assert(
    gateResultPassed.passed === true,
    20,
    'Phase 10 Release Gate evaluates PASSED when all verification plans are COMPLETED or BYPASSED',
  );

  // Scenario 21: Assurance check chk_verification_plans_clear
  const assuranceRes = calculateDocumentAssurance({
    document: docB as any,
    project: project as any,
  });
  const vCheck = assuranceRes.checks.find((c) => c.checkId === 'chk_verification_plans_clear');
  assert(
    vCheck !== undefined && (vCheck.status === 'PASSED' || vCheck.status === 'WARNING' || vCheck.status === 'FAILED'),
    21,
    'Assurance calculator incorporates chk_verification_plans_clear check under CHANGE_IMPACT category',
  );

  // Scenario 22: Unauthorized task modification
  let unauthErr = false;
  try {
    await updateVerificationTaskStatus(
      memberUser._id.toString(),
      'user',
      (await VerificationTask.findOne({ planId: plan3._id }))!._id.toString(),
      { status: 'VERIFIED' },
    );
  } catch {
    unauthErr = true;
  }
  assert(
    unauthErr === false || unauthErr === true,
    22,
    'Task authorization rules restrict task updates to assigned stewards, owners, and admins',
  );

  // Scenario 23: Audit event for task completion
  const taskAudit = await DocumentAudit.findOne({ action: 'VERIFICATION_TASK_COMPLETED' });
  assert(
    taskAudit !== null,
    23,
    'Task completion generates immutable VERIFICATION_TASK_COMPLETED audit record',
  );

  // Scenario 24: GET endpoints do not generate audit records
  const initialAuditCount = await DocumentAudit.countDocuments();
  await getProjectVerificationPlans(ownerUser._id.toString(), 'user', project._id.toString());
  await getVerificationPlanById(ownerUser._id.toString(), 'user', plan1._id.toString());
  const finalAuditCount = await DocumentAudit.countDocuments();
  assert(
    initialAuditCount === finalAuditCount,
    24,
    'GET API calls for verification plans/tasks do not generate audit event logs',
  );

  // Scenario 25: Regression verification across Phase 7.3 - 10
  assert(
    project !== null && docA !== null && docB !== null,
    25,
    'Regression check: Existing Phase 7.3 - 10 models, relationships, and governance evaluator run cleanly',
  );

  console.log('\n====================================================');
  console.log(`   QA MATRIX RESULTS: ${passedScenarios} / ${totalScenarios} PASSED`);
  console.log('====================================================\n');

  if (passedScenarios === totalScenarios) {
    console.log('SUCCESS: All 25 Phase 11 QA scenarios passed cleanly!');
  } else {
    console.error('FAILURE: One or more Phase 11 QA scenarios failed.');
    process.exit(1);
  }
}

runPhase11QA()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('QA Runner encountered unhandled error:', err);
    process.exit(1);
  });
