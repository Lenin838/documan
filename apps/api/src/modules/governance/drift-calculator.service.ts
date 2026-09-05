import { Types } from 'mongoose';

import { AppError } from '../../errors/app-error.js';
import { DocumentationBaseline, IDocumentationBaseline } from './documentation-baseline.model.js';
import { Document } from '../documents/document.model.js';
import { DocumentVersion } from '../documents/document-version.model.js';
import { DocumentRelationship } from '../documents/document-relationship.model.js';
import { VerificationPlan } from './verification-plan.model.js';
import { VerificationTask } from './verification-task.model.js';

export type DriftDimension =
  | 'VERSION_DRIFT'
  | 'DOCUMENT_DELETION_DRIFT'
  | 'RELATIONSHIP_DRIFT'
  | 'VERIFICATION_DRIFT';

export type DriftSeverity = 'BLOCKING' | 'WARNING' | 'CLEAN';

export interface IDocumentDriftDetail {
  documentId: string;
  documentTitle: string;
  baselineVersionNumber?: number | undefined;
  currentVersionNumber?: number | undefined;
  baselineChecksum?: string | undefined;
  currentChecksum?: string | undefined;
  driftDimensions: DriftDimension[];
  severity: DriftSeverity;
  details: string[];
}

export interface IRelationshipDriftDetail {
  sourceDocumentId: string;
  targetDocumentId: string;
  relationshipType: string;
  changeType: 'ADDED' | 'REMOVED';
  severity: DriftSeverity;
  details: string;
}

export interface IDriftReport {
  projectId: string;
  baselineId?: string | undefined;
  baselineVersionTag?: string | undefined;
  evaluatedAt: Date;
  hasActiveBaseline: boolean;
  hasDrift: boolean;
  driftScore: number;
  severity: DriftSeverity;
  summary: {
    totalBaselineDocuments: number;
    driftedDocumentsCount: number;
    versionDriftCount: number;
    deletionDriftCount: number;
    relationshipDriftCount: number;
    verificationDriftCount: number;
  };
  driftedDocuments: IDocumentDriftDetail[];
  relationshipDrifts: IRelationshipDriftDetail[];
}

export async function calculateProjectBaselineDrift(
  projectId: string | Types.ObjectId,
  baselineId?: string | Types.ObjectId,
): Promise<IDriftReport> {
  const projObjId = new Types.ObjectId(projectId.toString());
  const evaluatedAt = new Date();

  let baseline: IDocumentationBaseline | null;
  if (baselineId) {
    if (!Types.ObjectId.isValid(baselineId.toString())) {
      throw new AppError('Invalid baseline ID', 404, 'BASELINE_NOT_FOUND');
    }
    baseline = await DocumentationBaseline.findOne({
      _id: new Types.ObjectId(baselineId.toString()),
      projectId: projObjId,
    });
  } else {
    baseline = await DocumentationBaseline.findOne({
      projectId: projObjId,
      isActive: true,
    });
  }

  if (!baseline) {
    return {
      projectId: projObjId.toString(),
      evaluatedAt,
      hasActiveBaseline: false,
      hasDrift: false,
      driftScore: 100,
      severity: 'CLEAN',
      summary: {
        totalBaselineDocuments: 0,
        driftedDocumentsCount: 0,
        versionDriftCount: 0,
        deletionDriftCount: 0,
        relationshipDriftCount: 0,
        verificationDriftCount: 0,
      },
      driftedDocuments: [],
      relationshipDrifts: [],
    };
  }

  // 1. Batch Fetch Active Non-Deleted Non-Draft Documents in Project
  const activeDocs = await Document.find({
    projectId: projObjId,
    isDeleted: false,
  });

  const activeDocMap = new Map<string, typeof activeDocs[0]>();
  const activeDocIds: Types.ObjectId[] = [];
  for (const doc of activeDocs) {
    activeDocMap.set(doc._id.toString(), doc);
    activeDocIds.push(doc._id);
  }

  // 2. Batch Fetch Latest DocumentVersion Records
  const docVersions = await DocumentVersion.find({
    documentId: { $in: activeDocIds },
  }).sort({ versionNumber: -1 });

  const latestVersionMap = new Map<string, { versionNumber: number; checksum: string }>();
  for (const ver of docVersions) {
    const docIdStr = ver.documentId.toString();
    if (!latestVersionMap.has(docIdStr)) {
      latestVersionMap.set(docIdStr, {
        versionNumber: ver.versionNumber,
        checksum: `${ver.fileName}:${ver.fileSize}:v${ver.versionNumber}`,
      });
    }
  }

  // Fallback for docs without explicit DocumentVersion record
  for (const doc of activeDocs) {
    const docIdStr = doc._id.toString();
    if (!latestVersionMap.has(docIdStr)) {
      latestVersionMap.set(docIdStr, {
        versionNumber: doc.version,
        checksum: `${doc.fileName}:${doc.fileSize}:v${doc.version}`,
      });
    }
  }

  // 3. Batch Fetch Active Relationships
  const activeRelationships = await DocumentRelationship.find({
    $or: [{ sourceDocumentId: { $in: activeDocIds } }, { targetDocumentId: { $in: activeDocIds } }],
  });

  const activeRelSet = new Set<string>();
  for (const rel of activeRelationships) {
    const key = `${rel.sourceDocumentId.toString()}:${rel.targetDocumentId.toString()}:${rel.type}`;
    activeRelSet.add(key);
  }

  // 4. Batch Fetch Open Verification Plans & Tasks
  const openPlans = await VerificationPlan.find({
    projectId: projObjId,
    status: { $in: ['PENDING', 'IN_PROGRESS'] },
  });

  const openPlanIds = openPlans.map((p) => p._id);
  const openTasks = openPlanIds.length > 0
    ? await VerificationTask.find({ verificationPlanId: { $in: openPlanIds }, status: { $in: ['OPEN', 'IN_REVIEW'] } })
    : [];

  const unverifiedDocSet = new Set<string>();
  for (const plan of openPlans) {
    unverifiedDocSet.add(plan.triggerDocumentId.toString());
  }
  for (const task of openTasks) {
    if (task.targetDocumentId) {
      unverifiedDocSet.add(task.targetDocumentId.toString());
    }
  }

  // 5. Compare Document Snapshots
  const driftedDocuments: IDocumentDriftDetail[] = [];
  const baselineSnapMap = new Map<string, typeof baseline.documentSnapshots[0]>();
  for (const snap of baseline.documentSnapshots) {
    baselineSnapMap.set(snap.documentId.toString(), snap);
  }

  let versionDriftCount = 0;
  let deletionDriftCount = 0;
  let verificationDriftCount = 0;
  let relationshipDriftCount = 0;

  for (const snap of baseline.documentSnapshots) {
    const docIdStr = snap.documentId.toString();
    let activeDoc = activeDocMap.get(docIdStr);
    const driftDims: DriftDimension[] = [];
    const details: string[] = [];

    // Fallback: check if document belongs to an external project
    if (!activeDoc) {
      const extDoc = await Document.findById(snap.documentId);
      if (extDoc && !extDoc.isDeleted) {
        activeDoc = extDoc;
      }
    }

    if (!activeDoc || activeDoc.isDeleted) {
      driftDims.push('DOCUMENT_DELETION_DRIFT');
      details.push(`Baseline document (v${snap.versionNumber}) has been deleted or removed.`);
      deletionDriftCount += 1;
    } else {
      const latestVer = latestVersionMap.get(docIdStr);
      const currentVerNum = latestVer?.versionNumber ?? activeDoc.version;
      const currentChecksum = latestVer?.checksum || `${activeDoc.fileName}:${activeDoc.fileSize}:v${activeDoc.version}`;

      if (currentVerNum > snap.versionNumber || (snap.checksum && currentChecksum !== snap.checksum)) {
        const isExternal = activeDoc.projectId?.toString() !== projObjId.toString();
        if (isExternal) {
          driftDims.push('RELATIONSHIP_DRIFT');
          details.push(`External upstream contract document version divergence: baseline v${snap.versionNumber} vs current v${currentVerNum}.`);
          relationshipDriftCount += 1;
        } else {
          driftDims.push('VERSION_DRIFT');
          details.push(`Version divergence: baseline v${snap.versionNumber} (checksum: ${snap.checksum.substring(0, 8)}) vs current v${currentVerNum} (checksum: ${currentChecksum.substring(0, 8)}).`);
          versionDriftCount += 1;
        }
      }

      const hasImpactFlag = activeDoc.impactVerification?.needsVerification || false;
      const isTargetedByOpenPlan = unverifiedDocSet.has(docIdStr);

      if (hasImpactFlag || isTargetedByOpenPlan) {
        driftDims.push('VERIFICATION_DRIFT');
        details.push('Document has active unverified change impact or unresolved verification tasks.');
        verificationDriftCount += 1;
      }
    }

    if (driftDims.length > 0) {
      const docSeverity: DriftSeverity = driftDims.some(
        (d) => d === 'VERSION_DRIFT' || d === 'DOCUMENT_DELETION_DRIFT' || d === 'VERIFICATION_DRIFT',
      )
        ? 'BLOCKING'
        : 'WARNING';

      driftedDocuments.push({
        documentId: docIdStr,
        documentTitle: activeDoc ? activeDoc.title : `[Deleted Document ${docIdStr.substring(0, 6)}]`,
        baselineVersionNumber: snap.versionNumber,
        currentVersionNumber: activeDoc ? latestVersionMap.get(docIdStr)?.versionNumber : undefined,
        baselineChecksum: snap.checksum,
        currentChecksum: activeDoc ? latestVersionMap.get(docIdStr)?.checksum : undefined,
        driftDimensions: driftDims,
        severity: docSeverity,
        details,
      });
    }
  }

  // 6. Compare Relationship Snapshots
  const relationshipDrifts: IRelationshipDriftDetail[] = [];
  const baselineRelSet = new Set<string>();

  for (const rSnap of baseline.relationshipSnapshots) {
    const key = `${rSnap.sourceDocumentId.toString()}:${rSnap.targetDocumentId.toString()}:${rSnap.type}`;
    baselineRelSet.add(key);

    if (!activeRelSet.has(key)) {
      relationshipDrifts.push({
        sourceDocumentId: rSnap.sourceDocumentId.toString(),
        targetDocumentId: rSnap.targetDocumentId.toString(),
        relationshipType: rSnap.type,
        changeType: 'REMOVED',
        severity: 'WARNING',
        details: `Relationship [${rSnap.type}] between baseline documents was removed.`,
      });
    }
  }

  for (const rel of activeRelationships) {
    const srcStr = rel.sourceDocumentId.toString();
    const tgtStr = rel.targetDocumentId.toString();
    // Only track relationship drift between documents that were part of the baseline snapshot
    if (baselineSnapMap.has(srcStr) && baselineSnapMap.has(tgtStr)) {
      const key = `${srcStr}:${tgtStr}:${rel.type}`;
      if (!baselineRelSet.has(key)) {
        relationshipDrifts.push({
          sourceDocumentId: srcStr,
          targetDocumentId: tgtStr,
          relationshipType: rel.type,
          changeType: 'ADDED',
          severity: 'WARNING',
          details: `New relationship [${rel.type}] was added between baseline documents.`,
        });
      }
    }
  }

  relationshipDriftCount += relationshipDrifts.length;

  // 7. Calculate Overall Severity & Continuous Supplementary Score
  const hasBlockingDocDrift = driftedDocuments.some((d) => d.severity === 'BLOCKING');
  const hasWarningDocDrift = driftedDocuments.some((d) => d.severity === 'WARNING');
  const hasRelDrift = relationshipDrifts.length > 0;

  let overallSeverity: DriftSeverity = 'CLEAN';
  if (hasBlockingDocDrift) {
    overallSeverity = 'BLOCKING';
  } else if (hasWarningDocDrift || hasRelDrift) {
    overallSeverity = 'WARNING';
  }

  let deductions = 0;
  deductions += versionDriftCount * 25;
  deductions += deletionDriftCount * 30;
  deductions += verificationDriftCount * 20;
  deductions += relationshipDriftCount * 10;

  const driftScore = Math.max(0, 100 - deductions);
  const totalBaselineDocs = baseline.documentSnapshots.length;
  const totalDriftedDocs = driftedDocuments.length;
  const hasDrift = totalDriftedDocs > 0 || relationshipDriftCount > 0;

  return {
    projectId: projObjId.toString(),
    baselineId: baseline._id.toString(),
    baselineVersionTag: baseline.versionTag,
    evaluatedAt,
    hasActiveBaseline: true,
    hasDrift,
    driftScore,
    severity: overallSeverity,
    summary: {
      totalBaselineDocuments: totalBaselineDocs,
      driftedDocumentsCount: totalDriftedDocs,
      versionDriftCount,
      deletionDriftCount,
      relationshipDriftCount,
      verificationDriftCount,
    },
    driftedDocuments,
    relationshipDrifts,
  };
}
