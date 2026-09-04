import { Types } from 'mongoose';

import { AppError } from '../../errors/app-error.js';
import { Project } from '../projects/project.model.js';
import { Document } from '../documents/document.model.js';
import { DocumentReview } from '../documents/document-review.model.js';
import { createDocumentAudit } from '../documents/document-audit.service.js';
import { VerificationPlan, IVerificationPlan } from './verification-plan.model.js';
import { VerificationTask, IVerificationTask } from './verification-task.model.js';
import { getChangeIntelligenceForVersion } from './change-intelligence.service.js';
import {
  UpdateTaskStatusSchema,
  type UpdateTaskStatusInput,
  type BypassPlanInput,
} from './verification-plan.schema.js';

function validateObjectId(id: string, errorMessage = 'Resource not found', code = 'NOT_FOUND'): void {
  if (!Types.ObjectId.isValid(id)) {
    throw new AppError(errorMessage, 404, code);
  }
}

export async function createVerificationPlanInternal(
  projectId: string | Types.ObjectId,
  triggerDocumentId: string | Types.ObjectId,
  triggerVersion: string,
  createdByUserId: string | Types.ObjectId,
): Promise<IVerificationPlan> {
  const projObjId = new Types.ObjectId(projectId.toString());
  const triggerDocObjId = new Types.ObjectId(triggerDocumentId.toString());
  const creatorObjId = new Types.ObjectId(createdByUserId.toString());

  const existingPlan = await VerificationPlan.findOne({
    projectId: projObjId,
    triggerDocumentId: triggerDocObjId,
    triggerVersion,
  });

  if (existingPlan) {
    return existingPlan;
  }

  const project = await Project.findById(projObjId);
  if (!project || project.isArchived) {
    throw new AppError('Project not found', 404, 'PROJECT_NOT_FOUND');
  }

  const triggerDoc = await Document.findOne({
    _id: triggerDocObjId,
    projectId: projObjId,
    isDeleted: false,
  });

  if (!triggerDoc) {
    throw new AppError('Trigger document not found', 404, 'DOCUMENT_NOT_FOUND');
  }

  const intelligence = await getChangeIntelligenceForVersion(
    projObjId,
    triggerDocObjId,
    triggerVersion,
  );

  const totalTasks = intelligence.impactedDocuments.length;
  const initialStatus = totalTasks === 0 ? 'COMPLETED' : 'PENDING';

  const planPayload: Record<string, unknown> = {
    projectId: projObjId,
    triggerDocumentId: triggerDocObjId,
    triggerVersion,
    triggerChecksum: '',
    status: initialStatus,
    totalTasks,
    completedTasks: 0,
    skippedTasks: 0,
    createdBy: creatorObjId,
  };

  if (totalTasks === 0) {
    planPayload.completedAt = new Date();
  }

  const newPlan = (await VerificationPlan.create(planPayload)) as IVerificationPlan;

  for (const item of intelligence.impactedDocuments) {
    let assignedStewardId = item.targetOwnerId;

    if (!assignedStewardId) {
      const activeReview = await DocumentReview.findOne({
        documentId: item.targetDocumentId,
        status: 'PENDING',
      }).select('reviewerId');
      if (activeReview?.reviewerId) {
        assignedStewardId = activeReview.reviewerId as Types.ObjectId;
      } else if (project.ownerId) {
        assignedStewardId = project.ownerId as Types.ObjectId;
      } else {
        assignedStewardId = creatorObjId;
      }
    }

    const taskPayload: Record<string, unknown> = {
      planId: newPlan._id,
      projectId: projObjId,
      targetDocumentId: item.targetDocumentId,
      triggerDocumentId: triggerDocObjId,
      triggerVersion,
      relationshipType: item.relationshipType,
      impactPath: item.impactPath,
      impactExplanations: item.impactExplanations,
      verificationMethod: item.verificationMethod,
      applicableMethods: item.applicableMethods,
      status: 'OPEN',
      assignedStewardId,
    };

    if (item.evidenceReferenceId) {
      taskPayload.evidenceReferenceId = item.evidenceReferenceId;
    }

    await VerificationTask.create(taskPayload);
  }

  await createDocumentAudit(
    triggerDocObjId.toString(),
    creatorObjId.toString(),
    'VERIFICATION_PLAN_CREATED',
    {
      planId: (newPlan._id as Types.ObjectId).toString(),
      triggerVersion,
      totalTasks,
      status: newPlan.status,
    },
  );

  return newPlan;
}

export async function getProjectVerificationPlans(
  userId: string,
  role: 'user' | 'admin',
  projectId: string,
) {
  validateObjectId(projectId, 'Project not found', 'PROJECT_NOT_FOUND');
  const project = await Project.findOne({ _id: projectId, isArchived: false });
  if (!project) {
    throw new AppError('Project not found', 404, 'PROJECT_NOT_FOUND');
  }

  const plans = await VerificationPlan.find({ projectId: project._id })
    .populate('triggerDocumentId', 'title version status')
    .populate('createdBy', 'name email')
    .sort({ createdAt: -1 });

  return plans;
}

export async function getVerificationPlanById(
  userId: string,
  role: 'user' | 'admin',
  planId: string,
) {
  validateObjectId(planId, 'Verification plan not found', 'PLAN_NOT_FOUND');
  const plan = await VerificationPlan.findById(planId)
    .populate('triggerDocumentId', 'title version status ownerId')
    .populate('createdBy', 'name email')
    .populate('bypassedBy', 'name email');

  if (!plan) {
    throw new AppError('Verification plan not found', 404, 'PLAN_NOT_FOUND');
  }

  const tasks = await VerificationTask.find({ planId: plan._id })
    .populate('targetDocumentId', 'title version status ownerId')
    .populate('assignedStewardId', 'name email')
    .populate('verifiedBy', 'name email')
    .sort({ createdAt: 1 });

  return {
    plan,
    tasks,
  };
}

export async function updateVerificationTaskStatus(
  userId: string,
  role: 'user' | 'admin',
  taskId: string,
  rawInput: UpdateTaskStatusInput,
): Promise<IVerificationTask> {
  validateObjectId(taskId, 'Verification task not found', 'TASK_NOT_FOUND');
  const input = UpdateTaskStatusSchema.parse(rawInput);

  const task = await VerificationTask.findById(taskId);
  if (!task) {
    throw new AppError('Verification task not found', 404, 'TASK_NOT_FOUND');
  }

  const plan = await VerificationPlan.findById(task.planId);
  if (!plan) {
    throw new AppError('Verification plan not found', 404, 'PLAN_NOT_FOUND');
  }

  const project = await Project.findById(task.projectId);
  if (!project) {
    throw new AppError('Project not found', 404, 'PROJECT_NOT_FOUND');
  }

  const targetDoc = await Document.findById(task.targetDocumentId);
  const isTargetOwner = targetDoc?.ownerId?.toString() === userId;
  const isProjectOwner = project.ownerId?.toString() === userId;
  const isAssignedSteward = task.assignedStewardId?.toString() === userId;
  const isAdmin = role === 'admin';

  if (input.status === 'SKIPPED') {
    if (!isTargetOwner && !isProjectOwner && !isAdmin) {
      throw new AppError(
        'Forbidden: Skipping a verification task requires Document Owner, Project Owner, or Admin authority',
        403,
        'FORBIDDEN',
      );
    }
  } else {
    if (!isAssignedSteward && !isTargetOwner && !isProjectOwner && !isAdmin) {
      throw new AppError(
        'Forbidden: You are not authorized to update this verification task',
        403,
        'FORBIDDEN',
      );
    }
  }

  const oldStatus = task.status;
  task.status = input.status;

  if (input.status === 'VERIFIED') {
    task.verifiedBy = new Types.ObjectId(userId);
    task.verifiedAt = new Date();
    if (input.evidenceReferenceId && Types.ObjectId.isValid(input.evidenceReferenceId)) {
      task.evidenceReferenceId = new Types.ObjectId(input.evidenceReferenceId);
    }
  } else if (input.status === 'SKIPPED') {
    if (input.skipReason) {
      task.skipReason = input.skipReason;
    }
    task.verifiedBy = new Types.ObjectId(userId);
    task.verifiedAt = new Date();
  }

  await task.save();

  if (oldStatus !== input.status) {
    const verifiedCount = await VerificationTask.countDocuments({
      planId: plan._id,
      status: 'VERIFIED',
    });
    const skippedCount = await VerificationTask.countDocuments({
      planId: plan._id,
      status: 'SKIPPED',
    });

    plan.completedTasks = verifiedCount;
    plan.skippedTasks = skippedCount;

    if (plan.completedTasks + plan.skippedTasks === plan.totalTasks && plan.totalTasks > 0) {
      plan.status = plan.skippedTasks > 0 ? 'COMPLETED_WITH_SKIPS' : 'COMPLETED';
      plan.completedAt = new Date();

      await createDocumentAudit(
        plan.triggerDocumentId.toString(),
        userId,
        'VERIFICATION_PLAN_COMPLETED',
        {
          planId: (plan._id as Types.ObjectId).toString(),
          status: plan.status,
          totalTasks: plan.totalTasks,
          completedTasks: plan.completedTasks,
          skippedTasks: plan.skippedTasks,
        },
      );
    } else if (plan.status === 'PENDING' && (verifiedCount > 0 || skippedCount > 0 || input.status === 'IN_REVIEW')) {
      plan.status = 'IN_PROGRESS';
    }

    await plan.save();
  }

  const auditAction = input.status === 'SKIPPED' ? 'VERIFICATION_TASK_SKIPPED' : 'VERIFICATION_TASK_COMPLETED';
  await createDocumentAudit(
    task.targetDocumentId.toString(),
    userId,
    auditAction,
    {
      taskId: (task._id as Types.ObjectId).toString(),
      planId: (plan._id as Types.ObjectId).toString(),
      status: task.status,
      verificationMethod: task.verificationMethod,
      skipReason: task.skipReason || null,
    },
  );

  return task;
}

export async function bypassVerificationPlan(
  userId: string,
  role: 'user' | 'admin',
  planId: string,
  input: BypassPlanInput,
): Promise<IVerificationPlan> {
  validateObjectId(planId, 'Verification plan not found', 'PLAN_NOT_FOUND');

  const plan = await VerificationPlan.findById(planId);
  if (!plan) {
    throw new AppError('Verification plan not found', 404, 'PLAN_NOT_FOUND');
  }

  const project = await Project.findById(plan.projectId);
  if (!project) {
    throw new AppError('Project not found', 404, 'PROJECT_NOT_FOUND');
  }

  const isProjectOwner = project.ownerId.toString() === userId;
  const isAdmin = role === 'admin';

  if (!isProjectOwner && !isAdmin) {
    throw new AppError(
      'Forbidden: Bypassing a verification plan requires Project Owner or Admin authority',
      403,
      'FORBIDDEN',
    );
  }

  plan.status = 'BYPASSED';
  plan.bypassedAt = new Date();
  plan.bypassReason = input.bypassReason;
  plan.bypassedBy = new Types.ObjectId(userId);

  await plan.save();

  await createDocumentAudit(
    plan.triggerDocumentId.toString(),
    userId,
    'VERIFICATION_PLAN_BYPASSED',
    {
      planId: (plan._id as Types.ObjectId).toString(),
      triggerVersion: plan.triggerVersion,
      bypassReason: input.bypassReason,
    },
  );

  return plan;
}
