/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */
import crypto from 'crypto';
import { Types } from 'mongoose';

import { AppError } from '../../errors/app-error.js';
import { Document, type DocumentDocument } from '../documents/document.model.js';
import { DocumentVersion } from '../documents/document-version.model.js';
import { DocumentRelationship } from '../documents/document-relationship.model.js';
import { Project } from '../projects/project.model.js';
import { DocumentationBaseline } from '../governance/documentation-baseline.model.js';
import { DocumentationWorkRequest } from '../governance/documentation-work-request.model.js';
import { ProjectTopologyLink } from '../projects/project-topology.model.js';
import { checkUserProjectReadAccess } from '../projects/project-topology.service.js';
import { calculateEvidenceCoverage } from '../knowledge/evidence-calculator.js';
import { calculateDocumentAssurance } from '../governance/assurance-calculator.js';
import type { ProposedChangePayload, ProposalType } from './change-proposal.model.js';

export interface SimulationResultDTO {
  simulationStatus: 'COMPLETE' | 'TRUNCATED_PARTIAL' | 'INDETERMINATE' | 'UNSUPPORTED';
  simulatedAt: Date;
  targetDocumentId: string;
  projectId: string;
  authoritativeState: {
    title: string;
    version: number;
    status: string;
    checksum: string;
    hasActiveBaseline: boolean;
    gateStatus: string;
  };
  predictedState: {
    predictedVersion: string;
    predictedChecksum?: string;
    predictedGateStatus: 'PASSED' | 'WARNING' | 'FAILED' | 'GOVERNANCE_DISABLED';
    predictedDriftStatus: 'IN_SYNC' | 'DRIFTED' | 'NO_BASELINE';
    predictedDriftDimensions: string[];
    predictedEvidenceScore: number;
    predictedEvidenceStatus: string;
    impactCascade: {
      totalImpactedCount: number;
      maxDepthReached: number;
      isTruncated: boolean;
      impactedDocuments: Array<{
        documentId: string;
        title: string;
        projectId: string;
        depth: number;
      }>;
    };
    predictedCrossProjectBlastRadius: {
      impactedProjectsCount: number;
      crossProjectNodes: Array<{
        projectId: string;
        projectName: string;
      }>;
    };
    predictedVerificationTasks: Array<{
      taskType: string;
      priority: string;
      targetDocumentId: string;
      description: string;
    }>;
    affectedExistingWorkRequests: Array<{
      requestId: string;
      title: string;
      status: string;
    }>;
    predictedWorkTasks: Array<{
      title: string;
      category: string;
      description: string;
    }>;
  };
  warnings: string[];
}

export async function runChangeProposalSimulation(
  userId: string,
  role: 'user' | 'admin',
  targetDocumentId: string | Types.ObjectId,
  proposalType: ProposalType,
  proposedChange: ProposedChangePayload,
): Promise<SimulationResultDTO> {
  const docObjId = new Types.ObjectId(targetDocumentId.toString());

  const doc = await Document.findOne({ _id: docObjId, isDeleted: false });
  if (!doc) {
    throw new AppError('Target document not found', 404, 'DOCUMENT_NOT_FOUND');
  }

  const projObjId = doc.projectId as Types.ObjectId;
  const project = await Project.findById(projObjId);
  if (!project || project.isArchived) {
    throw new AppError('Project not found or archived', 404, 'PROJECT_NOT_FOUND');
  }

  // Verify actor read access on target project
  const hasAccess = await checkUserProjectReadAccess(userId, role, projObjId);
  if (!hasAccess) {
    throw new AppError('Access denied to target project', 403, 'FORBIDDEN');
  }

  const simulatedAt = new Date();
  const warnings: string[] = [];
  let isTruncated = false;

  // 1. Authoritative Document State
  const latestVersion = (await DocumentVersion.findOne({ documentId: docObjId }).sort({ versionNumber: -1 })) as any;
  const currentChecksum = latestVersion?.checksum || doc.filePath || 'NO_CHECKSUM';

  // 2. Proposed Version & Checksum Calculation
  let predictedChecksum = currentChecksum;
  if (proposedChange.content) {
    predictedChecksum = crypto.createHash('sha256').update(proposedChange.content, 'utf8').digest('hex');
  }
  const versionType = proposedChange.targetVersionType || 'MINOR';
  const currentVerNumber = doc.version || 1;
  const predictedVersion = versionType === 'MAJOR' ? `${currentVerNumber + 1}.0.0` : `${currentVerNumber}.${versionType === 'PATCH' ? '0.1' : '1.0'}`;

  // 3. In-Memory Simulated Relationship Graph
  const activeRelationships = await DocumentRelationship.find({
    $or: [{ sourceDocumentId: docObjId }, { targetDocumentId: docObjId }],
  });

  const simRelMap = new Map<string, Array<{ targetId: string; type: string }>>();
  for (const rel of activeRelationships) {
    const src = rel.sourceDocumentId.toString();
    const tgt = rel.targetDocumentId.toString();
    if (!simRelMap.has(src)) simRelMap.set(src, []);
    simRelMap.get(src)!.push({ targetId: tgt, type: rel.type });
  }

  if (proposedChange.relationshipOperations) {
    for (const op of proposedChange.relationshipOperations) {
      const src = docObjId.toString();
      const tgt = op.targetDocumentId.toString();
      if (op.operation === 'ADD_RELATIONSHIP') {
        if (!simRelMap.has(src)) simRelMap.set(src, []);
        simRelMap.get(src)!.push({ targetId: tgt, type: op.type });
      } else if (op.operation === 'REMOVE_RELATIONSHIP') {
        const existing = simRelMap.get(src) || [];
        simRelMap.set(
          src,
          existing.filter((r) => r.targetId !== tgt || r.type !== op.type),
        );
      }
    }
  }

  // 4. In-Memory Phase 7.3 Impact Cascade Traversal
  const MAX_DEPTH = 3;
  const MAX_NODES = 50;

  const visitedSet = new Set<string>([docObjId.toString()]);
  const queue: Array<{ id: string; depth: number }> = [{ id: docObjId.toString(), depth: 1 }];
  const rawImpactedList: Array<{ documentId: string; title: string; projectId: string; depth: number }> = [];

  while (queue.length > 0 && rawImpactedList.length < MAX_NODES) {
    const current = queue.shift()!;
    if (current.depth > MAX_DEPTH) {
      isTruncated = true;
      continue;
    }

    const connectedRels = simRelMap.get(current.id) || [];
    for (const r of connectedRels) {
      if (!visitedSet.has(r.targetId)) {
        visitedSet.add(r.targetId);
        const depDoc = await Document.findOne({ _id: new Types.ObjectId(r.targetId), isDeleted: false }).select('_id title projectId');
        if (depDoc && depDoc.projectId) {
          rawImpactedList.push({
            documentId: depDoc._id.toString(),
            title: depDoc.title,
            projectId: depDoc.projectId.toString(),
            depth: current.depth,
          });
          if (current.depth < MAX_DEPTH) {
            queue.push({ id: r.targetId, depth: current.depth + 1 });
          }
        }
      }
    }
  }

  if (rawImpactedList.length >= MAX_NODES) {
    isTruncated = true;
    warnings.push('Impact traversal limit reached (50 nodes max). Blast radius results are bounded.');
  }

  // Strict Disclosure ACL Filtering: Filter impacted nodes by user read access
  const authorizedImpactedList: Array<{ documentId: string; title: string; projectId: string; depth: number }> = [];
  const authorizedProjectIds = new Set<string>();

  for (const node of rawImpactedList) {
    const canRead = await checkUserProjectReadAccess(userId, role, node.projectId);
    if (canRead) {
      authorizedImpactedList.push(node);
      authorizedProjectIds.add(node.projectId);
    }
  }

  // Fetch project names for authorized cross-project nodes only
  const crossProjectNodes: Array<{ projectId: string; projectName: string }> = [];
  for (const pId of authorizedProjectIds) {
    if (pId !== projObjId.toString()) {
      const p = await Project.findById(pId).select('name');
      if (p) {
        crossProjectNodes.push({ projectId: pId, projectName: p.name });
      }
    }
  }

  // 5. Baseline Drift Simulation (Phase 12)
  const activeBaseline = await DocumentationBaseline.findOne({
    projectId: projObjId,
    isActive: true,
  });

  let predictedDriftStatus: 'IN_SYNC' | 'DRIFTED' | 'NO_BASELINE' = 'NO_BASELINE';
  const predictedDriftDimensions: string[] = [];

  if (!activeBaseline) {
    predictedDriftStatus = 'NO_BASELINE';
    warnings.push('No active documentation baseline exists for this project.');
  } else {
    const bSnap = (activeBaseline as any).snapshot?.documents?.[docObjId.toString()];
    if (bSnap) {
      if (bSnap.contentChecksum && bSnap.contentChecksum !== predictedChecksum) {
        predictedDriftStatus = 'DRIFTED';
        predictedDriftDimensions.push('CONTENT_CHECKSUM_DRIFT');
      }
      if (bSnap.versionNumber && bSnap.versionNumber !== currentVerNumber) {
        predictedDriftStatus = 'DRIFTED';
        predictedDriftDimensions.push('VERSION_NUMBER_DRIFT');
      }
      if (predictedDriftDimensions.length === 0) {
        predictedDriftStatus = 'IN_SYNC';
      }
    } else {
      predictedDriftStatus = 'DRIFTED';
      predictedDriftDimensions.push('NEW_UNBASELINED_DOCUMENT');
    }
  }

  // 6. Evidence Coverage Simulation (Phase 9)
  const simEvidenceContext = {
    documentId: docObjId.toString(),
    documentTitle: doc.title,
    currentVersion: currentVerNumber,
    lastApprovedVersion: doc.lastApprovedVersion || currentVerNumber,
    status: proposalType === 'DEPRECATION_PROPOSAL' ? 'DEPRECATED' : doc.status,
    needsVerification: authorizedImpactedList.length > 0,
    activeImpactSources: [],
    endpoints: [],
    dependencies: Array.from(simRelMap.entries()).flatMap(([src, rels]) =>
      rels.map((r) => ({
        dependencyId: r.targetId,
        sourceDocumentId: src,
        targetDocumentId: r.targetId,
        type: r.type,
      })),
    ),
    references: [],
    versions: [],
    governance: { isGovernanceEnabled: project.governanceSettings?.isGovernanceEnabled ?? true },
    evaluationAt: simulatedAt,
  };

  const evidenceResult = calculateEvidenceCoverage(simEvidenceContext as any);

  // 7. Assurance Gate Evaluation (Phase 10)
  const simAssuranceContext = {
    document: {
      id: docObjId.toString(),
      title: doc.title,
      version: currentVerNumber,
      status: proposalType === 'DEPRECATION_PROPOSAL' ? 'DEPRECATED' : doc.status,
      updatedAt: doc.updatedAt,
      impactVerification: {
        needsVerification: authorizedImpactedList.length > 0,
        activeImpactSources: [],
      },
    },
    project: {
      id: projObjId.toString(),
      governanceSettings: project.governanceSettings,
      releaseGateSettings: project.releaseGateSettings,
    },
    evidenceCoverage: {
      coverageScore: evidenceResult.coverageScore,
      orphanedCount: evidenceResult.orphanedCount,
      staleCount: evidenceResult.staleCount,
    },
    baselineContext: {
      hasActiveBaseline: Boolean(activeBaseline),
      isPostBaselineDocument: false,
      documentDrift: {
        hasDrift: predictedDriftStatus === 'DRIFTED',
        driftDimensions: predictedDriftDimensions,
        details: predictedDriftDimensions,
      },
    },
    now: simulatedAt,
  };

  const assuranceResult = calculateDocumentAssurance(simAssuranceContext as any);

  // Map assurance status
  let predictedGateStatus: 'PASSED' | 'WARNING' | 'FAILED' | 'GOVERNANCE_DISABLED' = 'PASSED';
  if (assuranceResult.status === 'GOVERNANCE_DISABLED') {
    predictedGateStatus = 'GOVERNANCE_DISABLED';
  } else if (assuranceResult.summary.failedCount > 0) {
    predictedGateStatus = 'FAILED';
  } else if (assuranceResult.summary.warningCount > 0) {
    predictedGateStatus = 'WARNING';
  }

  // 8. Predicted Verification Tasks (Phase 11)
  const predictedVerificationTasks: Array<{ taskType: string; priority: string; targetDocumentId: string; description: string }> = [];
  for (const node of authorizedImpactedList) {
    predictedVerificationTasks.push({
      taskType: proposalType === 'TECHNICAL_CONTRACT_UPDATE' ? 'CONTRACT_VERIFICATION' : 'IMPACT_VERIFICATION',
      priority: node.depth === 1 ? 'HIGH' : 'MEDIUM',
      targetDocumentId: node.documentId,
      description: `Verify downstream impact of ${proposalType} on document "${node.title}" (depth ${node.depth})`,
    });
  }

  // 9. Work Request Effects (Phase 13)
  const activeWorkRequests = await DocumentationWorkRequest.find({
    projectId: projObjId,
    status: { $in: ['OPEN', 'IN_PROGRESS'] },
    documentId: docObjId,
  }).select('_id title status');

  const affectedExistingWorkRequests = activeWorkRequests.map((wr) => ({
    requestId: wr._id.toString(),
    title: wr.title,
    status: wr.status,
  }));

  const predictedWorkTasks: Array<{ title: string; category: string; description: string }> = [];
  if (authorizedImpactedList.length > 0) {
    predictedWorkTasks.push({
      title: `Update technical documentation following ${proposalType}`,
      category: 'DOCUMENTATION_UPDATE',
      description: `${authorizedImpactedList.length} downstream document(s) impacted by change to ${doc.title}.`,
    });
  }

  const overallStatus = isTruncated ? 'TRUNCATED_PARTIAL' : 'COMPLETE';

  return {
    simulationStatus: overallStatus,
    simulatedAt,
    targetDocumentId: docObjId.toString(),
    projectId: projObjId.toString(),
    authoritativeState: {
      title: doc.title,
      version: currentVerNumber,
      status: doc.status,
      checksum: currentChecksum,
      hasActiveBaseline: Boolean(activeBaseline),
      gateStatus: 'PASSED',
    },
    predictedState: {
      predictedVersion,
      predictedChecksum,
      predictedGateStatus,
      predictedDriftStatus,
      predictedDriftDimensions,
      predictedEvidenceScore: evidenceResult.coverageScore,
      predictedEvidenceStatus: evidenceResult.label,
      impactCascade: {
        totalImpactedCount: authorizedImpactedList.length,
        maxDepthReached: authorizedImpactedList.reduce((max, d) => Math.max(max, d.depth), 0),
        isTruncated,
        impactedDocuments: authorizedImpactedList,
      },
      predictedCrossProjectBlastRadius: {
        impactedProjectsCount: crossProjectNodes.length,
        crossProjectNodes,
      },
      predictedVerificationTasks,
      affectedExistingWorkRequests,
      predictedWorkTasks,
    },
    warnings,
  };
}
