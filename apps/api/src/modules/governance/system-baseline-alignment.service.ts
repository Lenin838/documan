import { Types } from 'mongoose';

import { AppError } from '../../errors/app-error.js';
import { Project } from '../projects/project.model.js';
import { ProjectTopologyLink } from '../projects/project-topology.model.js';
import { checkUserProjectReadAccess } from '../projects/project-topology.service.js';
import { Document } from '../documents/document.model.js';
import { DocumentRelationship } from '../documents/document-relationship.model.js';
import { DocumentVersion } from '../documents/document-version.model.js';
import { DocumentationBaseline } from './documentation-baseline.model.js';
import { PackageFulfillmentAttestation } from '../change-packages/change-package-attestation.model.js';
import type {
  SystemBaselineAlignmentResponse,
  AlignmentUnitDTO,
  AlignmentUnitState,
  IndeterminacyReason,
  AggregateAlignmentState,
  GovernanceEvidenceDTO,
} from './system-baseline-alignment.types.js';

function validateObjectId(id: string, errorMessage = 'Invalid project ID', code = 'PROJECT_NOT_FOUND'): void {
  if (!Types.ObjectId.isValid(id)) {
    throw new AppError(errorMessage, 404, code);
  }
}

export async function calculateSystemBaselineAlignment(
  userId: string,
  role: 'user' | 'admin',
  projectId: string,
): Promise<SystemBaselineAlignmentResponse> {
  validateObjectId(projectId);

  const projObjId = new Types.ObjectId(projectId);
  const rootProject = await Project.findOne({ _id: projObjId, isArchived: false });
  if (!rootProject) {
    throw new AppError('Project not found', 404, 'PROJECT_NOT_FOUND');
  }

  const hasAccess = await checkUserProjectReadAccess(userId, role, projectId);
  if (!hasAccess) {
    throw new AppError('Access denied to project', 403, 'FORBIDDEN');
  }

  const evaluatedAt = new Date();
  const MAX_DEPTH = 3;
  const MAX_NODES = 50;
  const MAX_ALIGNMENT_UNITS = 100;

  // STAGE 1 & 2: Traversal of authorized topology subgraph
  const visitedProjectIds = new Set<string>([projObjId.toString()]);
  const queue: Array<{ id: string; depth: number }> = [{ id: projObjId.toString(), depth: 1 }];
  const authorizedProjectIds = new Set<string>([projObjId.toString()]);
  const projectNameMap = new Map<string, string>();
  projectNameMap.set(projObjId.toString(), rootProject.name);

  while (queue.length > 0 && authorizedProjectIds.size < MAX_NODES) {
    const current = queue.shift()!;
    if (current.depth > MAX_DEPTH) continue;

    const currentObjId = new Types.ObjectId(current.id);

    const topologyLinks = await ProjectTopologyLink.find({
      $or: [{ sourceProjectId: currentObjId }, { targetProjectId: currentObjId }],
    }).populate<{ sourceProjectId: InstanceType<typeof Project>; targetProjectId: InstanceType<typeof Project> }>([
      { path: 'sourceProjectId', select: '_id name isArchived ownerId' },
      { path: 'targetProjectId', select: '_id name isArchived ownerId' },
    ]);

    for (const link of topologyLinks) {
      if (!link.sourceProjectId || !link.targetProjectId) continue;
      if (link.sourceProjectId.isArchived || link.targetProjectId.isArchived) continue;

      const srcId = link.sourceProjectId._id.toString();
      const tgtId = link.targetProjectId._id.toString();

      const canReadSrc = await checkUserProjectReadAccess(userId, role, srcId);
      const canReadTgt = await checkUserProjectReadAccess(userId, role, tgtId);

      // STRICT PRIVACY RULE: Completely omit nodes/edges if caller lacks access to either side
      if (!canReadSrc || !canReadTgt) {
        continue;
      }

      if (!authorizedProjectIds.has(srcId) && authorizedProjectIds.size < MAX_NODES) {
        authorizedProjectIds.add(srcId);
        projectNameMap.set(srcId, link.sourceProjectId.name);
      }

      if (!authorizedProjectIds.has(tgtId) && authorizedProjectIds.size < MAX_NODES) {
        authorizedProjectIds.add(tgtId);
        projectNameMap.set(tgtId, link.targetProjectId.name);
      }

      const neighborId = srcId === current.id ? tgtId : srcId;
      if (!visitedProjectIds.has(neighborId) && current.depth < MAX_DEPTH) {
        visitedProjectIds.add(neighborId);
        queue.push({ id: neighborId, depth: current.depth + 1 });
      }
    }
  }

  const authProjObjIds = Array.from(authorizedProjectIds).map((id) => new Types.ObjectId(id));

  // STAGE 3: Active Topology Link Pairs Set for applicability verification
  const activeTopologyLinks = await ProjectTopologyLink.find({
    sourceProjectId: { $in: authProjObjIds },
    targetProjectId: { $in: authProjObjIds },
  });

  const topologyPairSet = new Set<string>();
  for (const link of activeTopologyLinks) {
    const srcStr = link.sourceProjectId.toString();
    const tgtStr = link.targetProjectId.toString();
    topologyPairSet.add(`${srcStr}:${tgtStr}`);
    topologyPairSet.add(`${tgtStr}:${srcStr}`);
  }

  // STAGE 4: Authorized Documents & Cross-Project DEPENDS_ON Relationships
  const authorizedDocs = await Document.find({
    projectId: { $in: authProjObjIds },
    isDeleted: false,
  }).select('_id title projectId version');

  const docMap = new Map<string, { id: string; title: string; projectId: string }>();
  for (const doc of authorizedDocs) {
    if (doc.projectId) {
      docMap.set(doc._id.toString(), {
        id: doc._id.toString(),
        title: doc.title,
        projectId: doc.projectId.toString(),
      });
    }
  }

  const authDocObjIds = Array.from(docMap.keys()).map((id) => new Types.ObjectId(id));

  const crossProjectRelationships = await DocumentRelationship.find({
    sourceDocumentId: { $in: authDocObjIds },
    targetDocumentId: { $in: authDocObjIds },
    type: 'DEPENDS_ON',
  });

  const validCrossProjectRels = crossProjectRelationships.filter((rel) => {
    const srcDoc = docMap.get(rel.sourceDocumentId.toString());
    const tgtDoc = docMap.get(rel.targetDocumentId.toString());
    return srcDoc && tgtDoc && srcDoc.projectId !== tgtDoc.projectId;
  });

  const N_total = validCrossProjectRels.length;

  const applicableRels = validCrossProjectRels.filter((rel) => {
    const srcDoc = docMap.get(rel.sourceDocumentId.toString())!;
    const tgtDoc = docMap.get(rel.targetDocumentId.toString())!;
    const pairKey = `${srcDoc.projectId}:${tgtDoc.projectId}`;
    return topologyPairSet.has(pairKey);
  });

  const boundedApplicableRels = applicableRels.slice(0, MAX_ALIGNMENT_UNITS);

  // STAGE 5: Bulk fetch active baselines for authorized projects
  const activeBaselines = await DocumentationBaseline.find({
    projectId: { $in: authProjObjIds },
    isActive: true,
    isArchived: false,
  });

  const baselineByProjectMap = new Map<string, InstanceType<typeof DocumentationBaseline>>();
  for (const base of activeBaselines) {
    baselineByProjectMap.set(base.projectId.toString(), base);
  }

  // STAGE 6: Bulk fetch head document versions for provider documents
  const providerDocObjIds = Array.from(
    new Set(boundedApplicableRels.map((rel) => rel.targetDocumentId)),
  );

  const headDocVersions = await DocumentVersion.find({
    documentId: { $in: providerDocObjIds },
  }).sort({ versionNumber: -1 });

  const headVersionMap = new Map<string, { versionNumber: number; checksum: string }>();
  for (const ver of headDocVersions) {
    const dStr = ver.documentId.toString();
    if (!headVersionMap.has(dStr)) {
      headVersionMap.set(dStr, {
        versionNumber: ver.versionNumber,
        checksum: ver.checksum || '',
      });
    }
  }

  // STAGE 7: Bulk fetch matching PackageFulfillmentAttestations
  const attestations = await PackageFulfillmentAttestation.find({
    'verifiedVersionSnapshot.documentId': { $in: providerDocObjIds },
  }).sort({ attestationVersion: -1 });

  // STAGE 8: Calculate Unit Alignment & Governance Evidence
  let N_aligned = 0;
  let N_misaligned = 0;
  let N_indeterminate = 0;

  const alignmentUnits: AlignmentUnitDTO[] = [];

  for (const rel of boundedApplicableRels) {
    const srcDoc = docMap.get(rel.sourceDocumentId.toString())!;
    const tgtDoc = docMap.get(rel.targetDocumentId.toString())!;

    const consumerProjId = srcDoc.projectId;
    const providerProjId = tgtDoc.projectId;

    const consumerProjName = projectNameMap.get(consumerProjId) || 'Unknown Project';
    const providerProjName = projectNameMap.get(providerProjId) || 'Unknown Project';

    const providerBaseline = baselineByProjectMap.get(providerProjId);
    const consumerBaseline = baselineByProjectMap.get(consumerProjId);

    const providerBaselinePresent = Boolean(providerBaseline);
    const consumerBaselinePresent = Boolean(consumerBaseline);

    let consumerSnapshotPresent = false;
    let alignmentState: AlignmentUnitState;
    let indeterminacyReason: IndeterminacyReason | null = null;

    let consumerVersionRef: { versionNumber: number; checksum: string } | null = null;
    let providerActiveVersion: { versionNumber: number; checksum: string } | null = null;

    let providerSnap: { documentVersionId?: Types.ObjectId | undefined; versionNumber: number; checksum: string } | null = null;

    if (providerBaseline) {
      const snap = providerBaseline.documentSnapshots.find(
        (s) => s.documentId.toString() === tgtDoc.id,
      );
      if (snap) {
        providerSnap = snap;
        providerActiveVersion = {
          versionNumber: snap.versionNumber,
          checksum: snap.checksum,
        };
      }
    }

    if (consumerBaseline) {
      const snap = consumerBaseline.documentSnapshots.find(
        (s) => s.documentId.toString() === tgtDoc.id,
      );
      if (snap) {
        consumerSnapshotPresent = true;
        consumerVersionRef = {
          versionNumber: snap.versionNumber,
          checksum: snap.checksum,
        };
      }
    }

    // Evaluate Structural Alignment State
    if (!providerBaselinePresent) {
      alignmentState = 'INDETERMINATE';
      indeterminacyReason = 'MISSING_PROVIDER_BASELINE';
    } else if (!consumerBaselinePresent) {
      alignmentState = 'INDETERMINATE';
      indeterminacyReason = 'MISSING_CONSUMER_BASELINE';
    } else if (!consumerSnapshotPresent) {
      alignmentState = 'INDETERMINATE';
      indeterminacyReason = 'MISSING_CONSUMER_SNAPSHOT';
    } else if (!providerSnap) {
      alignmentState = 'INDETERMINATE';
      indeterminacyReason = 'MISSING_PROVIDER_BASELINE';
    } else if (
      consumerVersionRef &&
      providerActiveVersion &&
      consumerVersionRef.versionNumber === providerActiveVersion.versionNumber &&
      consumerVersionRef.checksum === providerActiveVersion.checksum
    ) {
      alignmentState = 'ALIGNED';
    } else {
      alignmentState = 'MISALIGNED';
    }

    // Resolve Attestation & Staleness for Provider Active Snapshot
    let providerAttested = false;
    let attestationStale = false;
    let attestationVersion: number | null = null;
    let changePackageId: string | null = null;
    let attestedAt: Date | null = null;

    if (providerSnap) {
      const pSnap = providerSnap;
      const matchingAttestations = attestations.filter((att) =>
        att.verifiedVersionSnapshot.some((s) => {
          if (s.documentId.toString() !== tgtDoc.id) return false;
          if (pSnap.documentVersionId && s.documentVersionId.toString() === pSnap.documentVersionId.toString()) {
            return true;
          }
          return s.versionNumber === pSnap.versionNumber && s.checksum === pSnap.checksum;
        }),
      );

      if (matchingAttestations.length > 0) {
        const selectedAtt = matchingAttestations.reduce((prev, curr) =>
          curr.attestationVersion > prev.attestationVersion ? curr : prev,
        );

        providerAttested = true;
        attestationVersion = selectedAtt.attestationVersion ?? null;
        changePackageId = selectedAtt.changePackageId ? selectedAtt.changePackageId.toString() : null;
        attestedAt = selectedAtt.createdAt ? selectedAtt.createdAt : null;

        const headVer = headVersionMap.get(tgtDoc.id);
        const verifiedSnap = selectedAtt.verifiedVersionSnapshot.find((s) => s.documentId.toString() === tgtDoc.id);

        if (headVer && verifiedSnap) {
          if (headVer.versionNumber !== verifiedSnap.versionNumber || headVer.checksum !== verifiedSnap.checksum) {
            attestationStale = true;
          }
        }
      }
    }

    const governanceEvidence: GovernanceEvidenceDTO = {
      providerBaselinePresent,
      consumerBaselinePresent,
      consumerSnapshotPresent,
      providerAttested,
      attestationStale,
      attestationVersion,
      changePackageId,
      attestedAt,
    };

    if (alignmentState === 'ALIGNED') {
      N_aligned++;
    } else if (alignmentState === 'MISALIGNED') {
      N_misaligned++;
    } else {
      N_indeterminate++;
    }

    alignmentUnits.push({
      unitId: rel._id.toString(),
      consumerProject: { id: consumerProjId, name: consumerProjName },
      providerProject: { id: providerProjId, name: providerProjName },
      consumerDocument: { id: srcDoc.id, title: srcDoc.title },
      providerDocument: { id: tgtDoc.id, title: tgtDoc.title },
      consumerVersionRef,
      providerActiveVersion,
      alignmentState,
      indeterminacyReason,
      governanceEvidence,
    });
  }

  const N_applicable = boundedApplicableRels.length;
  const N_evaluable = N_aligned + N_misaligned;

  let aggregateState: AggregateAlignmentState;

  if (N_applicable === 0) {
    aggregateState = 'ZERO_APPLICABLE_EVIDENCE';
  } else if (N_indeterminate > 0) {
    aggregateState = 'INDETERMINATE';
  } else if (N_aligned === N_applicable) {
    aggregateState = 'ALIGNED';
  } else if (N_misaligned === N_applicable) {
    aggregateState = 'MISALIGNED';
  } else {
    aggregateState = 'PARTIALLY_ALIGNED';
  }

  const alignmentScore =
    N_applicable === 0 ? null : Math.round((N_aligned / N_applicable) * 1000) / 10;

  const evidenceCompleteness =
    N_total === 0 ? null : Math.round((N_applicable / N_total) * 1000) / 10;

  return {
    projectId: projObjId.toString(),
    evaluatedAt,
    aggregateState,
    alignmentScore,
    evidenceCompleteness,
    summary: {
      totalUnits: N_total,
      applicableUnits: N_applicable,
      evaluableUnits: N_evaluable,
      alignedUnits: N_aligned,
      misalignedUnits: N_misaligned,
      indeterminateUnits: N_indeterminate,
    },
    alignmentUnits,
  };
}
