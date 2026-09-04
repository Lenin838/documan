import mongoose, { Types } from 'mongoose';

import { AppError } from '../../errors/app-error.js';
import { Project } from '../projects/project.model.js';
import { Document } from '../documents/document.model.js';
import { DocumentVersion } from '../documents/document-version.model.js';
import { DocumentRelationship } from '../documents/document-relationship.model.js';
import { VerificationPlan } from './verification-plan.model.js';
import { evaluateReleaseGateInternal } from './release-gate-evaluator.service.js';
import { DocumentationBaseline, IDocumentationBaseline, IDocumentSnapshot, IRelationshipSnapshot } from './documentation-baseline.model.js';
import { createDocumentAudit } from '../documents/document-audit.service.js';
import { DocumentAuditAction } from '../documents/document-audit.model.js';

export interface CreateBaselineInput {
  name: string;
  versionTag: string;
  description?: string | undefined;
}

export async function createBaseline(
  projectId: string | Types.ObjectId,
  input: CreateBaselineInput,
  createdByUserId: string | Types.ObjectId,
): Promise<IDocumentationBaseline> {
  const projObjId = new Types.ObjectId(projectId.toString());
  const userObjId = new Types.ObjectId(createdByUserId.toString());

  const project = await Project.findById(projObjId);
  if (!project || project.isArchived) {
    throw new AppError('Project not found', 404, 'PROJECT_NOT_FOUND');
  }

  if (project.governanceSettings?.isGovernanceEnabled === false) {
    throw new AppError('Cannot create baseline when project governance is disabled', 400, 'GOVERNANCE_DISABLED');
  }

  // Check duplicate version tag upfront
  const existingTag = await DocumentationBaseline.findOne({
    projectId: projObjId,
    versionTag: input.versionTag.trim(),
  });
  if (existingTag) {
    throw new AppError(`Baseline with version tag '${input.versionTag}' already exists`, 409, 'DUPLICATE_VERSION_TAG');
  }

  // 1. Check Unresolved Verification Plans
  const openPlans = await VerificationPlan.find({
    projectId: projObjId,
    status: { $in: ['PENDING', 'IN_PROGRESS'] },
  });

  for (const plan of openPlans) {
    const remainingTasks = plan.totalTasks - plan.completedTasks - plan.skippedTasks;
    if (remainingTasks > 0) {
      throw new AppError(
        `Cannot create baseline while unresolved verification plan (v${plan.triggerVersion}) has ${remainingTasks} open task(s)`,
        400,
        'UNRESOLVED_VERIFICATION_PLANS_EXIST',
      );
    }
  }

  // 2. Evaluate Release Gate (Excluding self-referential chk_baseline_drift_clear)
  const gateResult = await evaluateReleaseGateInternal(projObjId, {
    excludeChecks: ['chk_baseline_drift_clear'],
  });

  if (!gateResult.passed) {
    const blockingReasons = gateResult.blockingDocuments.map((b) => `${b.title}: ${b.reason}`).join('; ');
    throw new AppError(
      `Project Release Gate must pass before creating a baseline. Blocking reasons: ${blockingReasons}`,
      400,
      'RELEASE_GATE_NOT_PASSED',
    );
  }

  // 3. Build Document Snapshots (Active, Non-Deleted, Non-Draft Docs)
  const activeDocs = await Document.find({
    projectId: projObjId,
    isDeleted: false,
    status: { $ne: 'DRAFT' },
  });

  const activeDocIds = activeDocs.map((d) => d._id);
  const activeDocIdSet = new Set(activeDocIds.map((id) => id.toString()));

  const docVersions = await DocumentVersion.find({
    documentId: { $in: activeDocIds },
  }).sort({ versionNumber: -1 });

  const latestVersionMap = new Map<string, { versionId: Types.ObjectId; versionNumber: number; checksum: string }>();
  for (const ver of docVersions) {
    const docIdStr = ver.documentId.toString();
    if (!latestVersionMap.has(docIdStr)) {
      latestVersionMap.set(docIdStr, {
        versionId: ver._id,
        versionNumber: ver.versionNumber,
        checksum: `${ver.fileName}:${ver.fileSize}:v${ver.versionNumber}`,
      });
    }
  }

  const documentSnapshots: IDocumentSnapshot[] = [];
  for (const doc of activeDocs) {
    const docIdStr = doc._id.toString();
    const verInfo = latestVersionMap.get(docIdStr);
    documentSnapshots.push({
      documentId: doc._id,
      documentVersionId: verInfo?.versionId,
      versionNumber: verInfo?.versionNumber ?? doc.version,
      checksum: verInfo?.checksum ?? `${doc.fileName}:${doc.fileSize}:v${doc.version}`,
    });
  }

  // 4. Build Relationship Snapshots
  const relationships = await DocumentRelationship.find({
    $or: [{ sourceDocumentId: { $in: activeDocIds } }, { targetDocumentId: { $in: activeDocIds } }],
  });

  const relationshipSnapshots: IRelationshipSnapshot[] = [];
  for (const rel of relationships) {
    const srcStr = rel.sourceDocumentId.toString();
    const tgtStr = rel.targetDocumentId.toString();
    if (activeDocIdSet.has(srcStr) && activeDocIdSet.has(tgtStr)) {
      relationshipSnapshots.push({
        sourceDocumentId: rel.sourceDocumentId,
        targetDocumentId: rel.targetDocumentId,
        type: rel.type,
      });
    }
  }

  // 5. Transactional Re-Baselining Execution
  const executeRebaseline = async (sessionParam?: mongoose.ClientSession) => {
    const opts = sessionParam ? { session: sessionParam } : {};

    await DocumentationBaseline.updateMany(
      { projectId: projObjId, isActive: true },
      {
        $set: {
          isActive: false,
          isArchived: true,
          archivedAt: new Date(),
          archivedBy: userObjId,
        },
      },
      opts,
    );

    const payload: Record<string, unknown> = {
      projectId: projObjId,
      name: input.name.trim(),
      versionTag: input.versionTag.trim(),
      isActive: true,
      isArchived: false,
      createdBy: userObjId,
      documentSnapshots,
      relationshipSnapshots,
    };

    if (input.description) {
      payload.description = input.description.trim();
    }

    const created = await DocumentationBaseline.create([payload], opts);
    const newBaseline = created[0] as IDocumentationBaseline;

    if (documentSnapshots.length > 0 && newBaseline) {
      await createDocumentAudit(
        documentSnapshots[0]!.documentId.toString(),
        userObjId.toString(),
        'DOCUMENTATION_BASELINE_CREATED' as DocumentAuditAction,
        {
          baselineId: newBaseline._id.toString(),
          versionTag: newBaseline.versionTag,
          name: newBaseline.name,
          totalDocumentsSnapshots: documentSnapshots.length,
        },
      );
    }

    return newBaseline;
  };

  try {
    const session = await mongoose.startSession();
    try {
      let result: IDocumentationBaseline | null = null;
      await session.withTransaction(async () => {
        result = await executeRebaseline(session);
      });
      return result!;
    } catch (txErr: unknown) {
      const errMessage = (txErr as { message?: string })?.message || '';
      if (errMessage.includes('replica set') || errMessage.includes('Transaction numbers') || errMessage.includes('retryable writes')) {
        return await executeRebaseline();
      }
      throw txErr;
    } finally {
      await session.endSession();
    }
  } catch (err: unknown) {
    const errorObj = err as { code?: number; message?: string };
    if (errorObj && (errorObj.code === 11000 || errorObj.message?.includes('E11000') || errorObj.message?.includes('duplicate key'))) {
      throw new AppError(
        'Concurrent baseline creation conflict or duplicate version tag detected',
        409,
        'BASELINE_CONCURRENCY_CONFLICT',
      );
    }
    throw err;
  }
}

export async function getProjectBaselines(
  projectId: string | Types.ObjectId,
): Promise<IDocumentationBaseline[]> {
  const projObjId = new Types.ObjectId(projectId.toString());
  return await DocumentationBaseline.find({ projectId: projObjId }).sort({ createdAt: -1 });
}

export async function getBaselineById(
  projectId: string | Types.ObjectId,
  baselineId: string | Types.ObjectId,
): Promise<IDocumentationBaseline> {
  const projObjId = new Types.ObjectId(projectId.toString());
  if (!Types.ObjectId.isValid(baselineId.toString())) {
    throw new AppError('Baseline not found', 404, 'BASELINE_NOT_FOUND');
  }
  const baselineObjId = new Types.ObjectId(baselineId.toString());

  const baseline = await DocumentationBaseline.findOne({
    _id: baselineObjId,
    projectId: projObjId,
  });

  if (!baseline) {
    throw new AppError('Baseline not found', 404, 'BASELINE_NOT_FOUND');
  }

  return baseline;
}

export async function archiveBaseline(
  projectId: string | Types.ObjectId,
  baselineId: string | Types.ObjectId,
  userId: string | Types.ObjectId,
): Promise<IDocumentationBaseline> {
  const projObjId = new Types.ObjectId(projectId.toString());
  const userObjId = new Types.ObjectId(userId.toString());
  const baseline = await getBaselineById(projObjId, baselineId);

  if (baseline.isActive) {
    throw new AppError(
      'Cannot archive the active baseline; active baseline archival occurs transactionally during re-baselining',
      400,
      'ACTIVE_BASELINE_ARCHIVE_PROHIBITED',
    );
  }

  if (baseline.isArchived) {
    return baseline;
  }

  baseline.isArchived = true;
  baseline.archivedAt = new Date();
  baseline.archivedBy = userObjId;
  await baseline.save();

  if (baseline.documentSnapshots.length > 0) {
    await createDocumentAudit(
      baseline.documentSnapshots[0]!.documentId.toString(),
      userObjId.toString(),
      'DOCUMENTATION_BASELINE_ARCHIVED' as DocumentAuditAction,
      {
        baselineId: baseline._id.toString(),
        versionTag: baseline.versionTag,
      },
    );
  }

  return baseline;
}
