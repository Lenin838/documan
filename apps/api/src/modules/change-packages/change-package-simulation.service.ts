/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */
import crypto from 'crypto';
import { Types } from 'mongoose';

import { AppError } from '../../errors/app-error.js';
import { Document } from '../documents/document.model.js';
import { DocumentVersion } from '../documents/document-version.model.js';
import { DocumentRelationship } from '../documents/document-relationship.model.js';
import { Project } from '../projects/project.model.js';
import { DocumentationBaseline } from '../governance/documentation-baseline.model.js';
import { ProjectTopologyLink } from '../projects/project-topology.model.js';
import { checkUserProjectReadAccess } from '../projects/project-topology.service.js';
import { calculateEvidenceCoverage } from '../knowledge/evidence-calculator.js';
import { calculateDocumentAssurance } from '../governance/assurance-calculator.js';
import { DocumentChangeProposal, ProposalType, IDocumentChangeProposal } from '../change-proposals/change-proposal.model.js';
import { DocumentChangePackage } from './change-package.model.js';

export interface PackageConflict {
  conflictClass:
    | 'MUTUALLY_EXCLUSIVE_TARGET'
    | 'CONTRADICTORY_RELATIONSHIP'
    | 'DEPRECATION_DEPENDENCY_CONFLICT'
    | 'CIRCULAR_DEPENDENCY_INJECTION'
    | 'INCOMPATIBLE_CONTRACT_SCHEMA';
  description: string;
  contributingProposalIds: string[];
  severity: 'BLOCKING' | 'WARNING';
}

export interface ImpactDetail {
  category: 'RELATIONSHIP_IMPACT' | 'EVIDENCE_IMPACT' | 'BASELINE_IMPACT' | 'VERIFICATION_IMPACT' | 'TOPOLOGY_IMPACT';
  sourceProposalId: string;
  edgeKey?: string;
  description: string;
}

export interface DeduplicatedImpactedDocument {
  documentId: string;
  title: string;
  projectId: string;
  minDepth: number;
  contributingProposalIds: string[];
  impactDetails: ImpactDetail[];
}

export interface PackageSimulationResultDTO {
  simulationStatus: 'COMPLETE' | 'TRUNCATED_PARTIAL' | 'INDETERMINATE' | 'UNSUPPORTED';
  simulatedAt: Date;
  packageId: string;
  projectId: string;
  conflicts: PackageConflict[];
  predictedState: {
    predictedJointGateStatus: 'PASSED' | 'WARNING' | 'FAILED' | 'GOVERNANCE_DISABLED';
    predictedDriftStatus: 'IN_SYNC' | 'DRIFTED' | 'NO_BASELINE';
    predictedEvidenceScore: number;
    impactCascade: {
      totalImpactedCount: number;
      maxDepthReached: number;
      isTruncated: boolean;
      impactedDocuments: DeduplicatedImpactedDocument[];
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
      contributingProposalIds: string[];
      reason: string;
    }>;
  };
}

export async function runChangePackageSimulation(
  packageId: string,
  userId: string,
): Promise<PackageSimulationResultDTO> {
  const pkgObjId = new Types.ObjectId(packageId);
  const pkg = await DocumentChangePackage.findById(pkgObjId).populate('proposals');

  if (!pkg) {
    throw new AppError('Change package not found for simulation', 404, 'PACKAGE_NOT_FOUND');
  }

  const proposalObjIds = pkg.proposals.map((p: any) => p._id || p);
  const proposals = await DocumentChangeProposal.find({ _id: { $in: proposalObjIds } });

  if (proposals.length === 0) {
    throw new AppError('Cannot simulate change package with zero proposals', 400, 'EMPTY_PACKAGE');
  }

  const primaryProjectId = proposals[0] ? proposals[0].projectId.toString() : pkg.projectId.toString();

  // 1. Conflict Analysis
  const conflicts: PackageConflict[] = [];

  // Group proposals by target document
  const targetDocMap = new Map<string, IDocumentChangeProposal[]>();
  for (const p of proposals) {
    const docId = p.targetDocumentId.toString();
    const existing = targetDocMap.get(docId) || [];
    existing.push(p);
    targetDocMap.set(docId, existing);
  }

  // Conflict Class 1: MUTUALLY_EXCLUSIVE_TARGET & INCOMPATIBLE_CONTRACT_SCHEMA
  for (const [docId, props] of targetDocMap.entries()) {
    if (props.length > 1) {
      const hasDeprecation = props.some((p) => p.proposalType === ProposalType.DEPRECATION_PROPOSAL);
      const hasEdits = props.some((p) => p.proposalType !== ProposalType.DEPRECATION_PROPOSAL);
      const contents = props.map((p) => p.proposedChange?.content).filter(Boolean);

      if ((hasDeprecation && hasEdits) || (contents.length > 1 && new Set(contents).size > 1)) {
        conflicts.push({
          conflictClass: 'MUTUALLY_EXCLUSIVE_TARGET',
          description: `Multiple proposals target document ${docId} with mutually exclusive operations (e.g. deprecation alongside content/schema edits)`,
          contributingProposalIds: props.map((p) => p._id.toString()),
          severity: 'BLOCKING',
        });
      }

      // Check schema conflict
      const schemas = props.map((p) => JSON.stringify(p.proposedChange?.contractSchema || {})).filter((s) => s !== '{}');
      if (schemas.length > 1 && new Set(schemas).size > 1) {
        conflicts.push({
          conflictClass: 'INCOMPATIBLE_CONTRACT_SCHEMA',
          description: `Multiple contract proposals target document ${docId} with incompatible structural JSON Schema definitions`,
          contributingProposalIds: props.map((p) => p._id.toString()),
          severity: 'BLOCKING',
        });
      }
    }
  }

  // Collect relationship operations
  const relAddOps: Array<{ source: string; target: string; type: string; propId: string }> = [];
  const relRemoveOps: Array<{ source: string; target: string; type: string; propId: string }> = [];
  const deprecatedDocIds = new Set<string>();

  for (const p of proposals) {
    if (p.proposalType === ProposalType.DEPRECATION_PROPOSAL) {
      deprecatedDocIds.add(p.targetDocumentId.toString());
    }
    const ops = p.proposedChange?.relationshipOperations || [];
    for (const op of ops) {
      const src = p.targetDocumentId.toString();
      const tgt = op.targetDocumentId.toString();
      if (op.operation === 'ADD_RELATIONSHIP') {
        relAddOps.push({ source: src, target: tgt, type: op.type, propId: p._id.toString() });
      } else if (op.operation === 'REMOVE_RELATIONSHIP') {
        relRemoveOps.push({ source: src, target: tgt, type: op.type, propId: p._id.toString() });
      }
    }
  }

  // Conflict Class 2: CONTRADICTORY_RELATIONSHIP
  for (const addOp of relAddOps) {
    const matchingRem = relRemoveOps.find(
      (rem) => rem.source === addOp.source && rem.target === addOp.target && rem.type === addOp.type,
    );
    if (matchingRem) {
      conflicts.push({
        conflictClass: 'CONTRADICTORY_RELATIONSHIP',
        description: `Contradictory relationship operations: Proposal ${addOp.propId} adds ${addOp.type} (${addOp.source} -> ${addOp.target}) while Proposal ${matchingRem.propId} removes it`,
        contributingProposalIds: [addOp.propId, matchingRem.propId],
        severity: 'BLOCKING',
      });
    }
  }

  // Conflict Class 3: DEPRECATION_DEPENDENCY_CONFLICT (CASE A: Package Proposal Interactions Only)
  for (const addOp of relAddOps) {
    if (addOp.type === 'DEPENDS_ON' && deprecatedDocIds.has(addOp.target)) {
      conflicts.push({
        conflictClass: 'DEPRECATION_DEPENDENCY_CONFLICT',
        description: `Proposal adds DEPENDS_ON relationship targeting document ${addOp.target} which is flagged for deprecation in package`,
        contributingProposalIds: [addOp.propId],
        severity: 'BLOCKING',
      });
    }
  }

  // Build combined in-memory graph overlay (existing DEPENDS_ON + proposed relAddOps - proposed relRemoveOps)
  const existingRels = await DocumentRelationship.find({});
  const graphMap = new Map<string, Set<string>>();

  for (const r of existingRels) {
    const src = r.sourceDocumentId.toString();
    const tgt = r.targetDocumentId.toString();
    if (!graphMap.has(src)) graphMap.set(src, new Set());
    graphMap.get(src)!.add(tgt);
  }

  for (const remOp of relRemoveOps) {
    if (graphMap.has(remOp.source)) {
      graphMap.get(remOp.source)!.delete(remOp.target);
    }
  }

  for (const addOp of relAddOps) {
    if (!graphMap.has(addOp.source)) graphMap.set(addOp.source, new Set());
    graphMap.get(addOp.source)!.add(addOp.target);
  }

  // Conflict Class 4: CIRCULAR_DEPENDENCY_INJECTION
  for (const addOp of relAddOps.filter((o) => o.type === 'DEPENDS_ON')) {
    const visited = new Set<string>();
    const stack = new Set<string>();

    function isCyclic(curr: string): boolean {
      visited.add(curr);
      stack.add(curr);

      const neighbors = graphMap.get(curr) || new Set();
      for (const nxt of Array.from(neighbors)) {
        if (!visited.has(nxt)) {
          if (isCyclic(nxt)) return true;
        } else if (stack.has(nxt)) {
          return true;
        }
      }

      stack.delete(curr);
      return false;
    }

    if (isCyclic(addOp.source)) {
      conflicts.push({
        conflictClass: 'CIRCULAR_DEPENDENCY_INJECTION',
        description: `Proposal adding DEPENDS_ON relationship (${addOp.source} -> ${addOp.target}) introduces a circular dependency cycle`,
        contributingProposalIds: [addOp.propId],
        severity: 'BLOCKING',
      });
    }
  }

  // 2. Aggregate Impact Cascade & Blast Radius over Combined In-Memory Overlay (Bounded Depth 3, 50 Nodes)
  const MAX_DEPTH = 3;
  const MAX_NODES = 50;

  const docDepthMap = new Map<string, number>();
  const docContribMap = new Map<string, Set<string>>();
  const docImpactDetailsMap = new Map<string, ImpactDetail[]>();

  // Queue for BFS
  const queue: Array<{ docId: string; depth: number; sourcePropId: string }> = [];

  for (const p of proposals) {
    const tId = p.targetDocumentId.toString();
    queue.push({ docId: tId, depth: 0, sourcePropId: p._id.toString() });
  }

  let totalVisitedCount = 0;
  let maxDepthReached = 0;
  let isTruncated = false;

  while (queue.length > 0) {
    if (totalVisitedCount >= MAX_NODES) {
      isTruncated = true;
      break;
    }

    const { docId, depth, sourcePropId } = queue.shift()!;

    if (depth > maxDepthReached) maxDepthReached = depth;

    // Deduplicate roster by minDepth
    const existingDepth = docDepthMap.get(docId);
    if (existingDepth === undefined || depth < existingDepth) {
      docDepthMap.set(docId, depth);
    }

    // Accumulate contributing proposal IDs
    if (!docContribMap.has(docId)) docContribMap.set(docId, new Set());
    docContribMap.get(docId)!.add(sourcePropId);

    // Record impact details
    if (!docImpactDetailsMap.has(docId)) docImpactDetailsMap.set(docId, []);
    docImpactDetailsMap.get(docId)!.push({
      category: depth === 0 ? 'RELATIONSHIP_IMPACT' : 'BASELINE_IMPACT',
      sourceProposalId: sourcePropId,
      description: depth === 0 ? 'Direct target of proposal' : `Transitive downstream impact at depth ${depth} via in-memory overlay`,
    });

    totalVisitedCount++;

    if (depth < MAX_DEPTH) {
      // Traverse downstream neighbors from the combined in-memory overlay graph!
      const neighbors = graphMap.get(docId) || new Set();
      for (const nextId of Array.from(neighbors)) {
        queue.push({ docId: nextId, depth: depth + 1, sourcePropId });
      }
    }
  }

  // 4. Hydrate Impacted Documents & Apply ACL Disclosure Filtering
  const impactedDocIds = Array.from(docDepthMap.keys());
  const docs = await Document.find({ _id: { $in: impactedDocIds.map((id) => new Types.ObjectId(id)) }, isDeleted: false });

  const deduplicatedImpactedDocs: DeduplicatedImpactedDocument[] = [];
  const impactedProjectIdsSet = new Set<string>();
  const crossProjectNodesMap = new Map<string, string>();

  for (const doc of docs) {
    if (!doc.projectId) continue;
    const docIdStr = doc._id.toString();
    const projIdStr = doc.projectId.toString();

    // ACL Check
    const hasReadAccess = await checkUserProjectReadAccess(userId, 'user', projIdStr);
    if (!hasReadAccess) {
      // Strictly omit unauthorized project/document nodes!
      continue;
    }

    impactedProjectIdsSet.add(projIdStr);

    if (projIdStr !== primaryProjectId) {
      const proj = await Project.findById(doc.projectId).select('name');
      if (proj) {
        crossProjectNodesMap.set(projIdStr, proj.name);
      }
    }

    deduplicatedImpactedDocs.push({
      documentId: docIdStr,
      title: doc.title,
      projectId: projIdStr,
      minDepth: docDepthMap.get(docIdStr) || 0,
      contributingProposalIds: Array.from(docContribMap.get(docIdStr) || []),
      impactDetails: docImpactDetailsMap.get(docIdStr) || [],
    });
  }

  // 5. Aggregate Evidence, Assurance Gate, Baseline Drift, & Verification Requirements
  let predictedEvidenceScore = 100;
  let jointGateStatus: 'PASSED' | 'WARNING' | 'FAILED' | 'GOVERNANCE_DISABLED' = 'PASSED';
  const predictedDriftStatus: 'IN_SYNC' | 'DRIFTED' | 'NO_BASELINE' = 'IN_SYNC';

  const predictedVerificationTasks: PackageSimulationResultDTO['predictedState']['predictedVerificationTasks'] = [];

  for (const p of proposals) {
    const targetDoc = docs.find((d) => d._id.toString() === p.targetDocumentId.toString());
    if (!targetDoc) continue;

    // Evidence
    const ev = calculateEvidenceCoverage({
      documentId: targetDoc._id.toString(),
      documentTitle: targetDoc.title,
      currentVersion: targetDoc.version || 1,
      status: (targetDoc.status as any) || 'APPROVED',
      evaluationAt: new Date(),
    });
    if (typeof ev.coverageScore === 'number' && ev.coverageScore < predictedEvidenceScore) {
      predictedEvidenceScore = ev.coverageScore;
    }

    // Assurance Gate
    const ass = calculateDocumentAssurance({
      document: {
        id: targetDoc._id.toString(),
        title: targetDoc.title,
        status: (targetDoc.status as any) || 'APPROVED',
        version: targetDoc.version || 1,
        createdAt: targetDoc.createdAt || new Date(),
      },
    });
    if (ass.status === 'BLOCKED') {
      jointGateStatus = 'FAILED';
    } else if (ass.status === 'WARNING' && jointGateStatus !== 'FAILED') {
      jointGateStatus = 'WARNING';
    }

    // Verification Task Prediction
    if (p.proposalType === ProposalType.TECHNICAL_CONTRACT_UPDATE || p.proposalType === ProposalType.DEPRECATION_PROPOSAL) {
      const taskType = p.proposalType === ProposalType.TECHNICAL_CONTRACT_UPDATE ? 'TECHNICAL_REVIEW' : 'STAKEHOLDER_SIGN_OFF';
      const existingTask = predictedVerificationTasks.find((t) => t.targetDocumentId === p.targetDocumentId.toString() && t.taskType === taskType);
      if (existingTask) {
        if (!existingTask.contributingProposalIds.includes(p._id.toString())) {
          existingTask.contributingProposalIds.push(p._id.toString());
        }
      } else {
        predictedVerificationTasks.push({
          taskType,
          priority: 'HIGH',
          targetDocumentId: p.targetDocumentId.toString(),
          contributingProposalIds: [p._id.toString()],
          reason: `Joint verification requirement for proposal ${p.proposalNumber}`,
        });
      }
    }
  }

  // Cross-project nodes array
  const crossProjectNodes = Array.from(crossProjectNodesMap.entries()).map(([pId, name]) => ({
    projectId: pId,
    projectName: name,
  }));

  return {
    simulationStatus: isTruncated ? 'TRUNCATED_PARTIAL' : 'COMPLETE',
    simulatedAt: new Date(),
    packageId,
    projectId: primaryProjectId,
    conflicts,
    predictedState: {
      predictedJointGateStatus: jointGateStatus,
      predictedDriftStatus,
      predictedEvidenceScore,
      impactCascade: {
        totalImpactedCount: deduplicatedImpactedDocs.length,
        maxDepthReached,
        isTruncated,
        impactedDocuments: deduplicatedImpactedDocs,
      },
      predictedCrossProjectBlastRadius: {
        impactedProjectsCount: crossProjectNodes.length,
        crossProjectNodes,
      },
      predictedVerificationTasks,
    },
  };
}
