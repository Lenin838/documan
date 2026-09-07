import { Types } from 'mongoose';

import { AppError } from '../../errors/app-error.js';
import { Project } from '../projects/project.model.js';
import { ProjectTopologyLink } from '../projects/project-topology.model.js';
import { User } from '../users/user.model.js';
import { checkUserProjectReadAccess } from '../projects/project-topology.service.js';
import { calculateSystemContractMatrix } from './system-contract-matrix.service.js';
import type {
  SystemContractPlanResponseDTO,
  CandidateChangeActionDTO,
  ActionRole,
  ActionEvidenceDTO,
  DraftProposalPayloadDTO,
  UnresolvedDecisionDTO,
  DraftChangePackagePayloadDTO,
  ContractChangePlanRequestDTO,
} from './system-contract-plan.types.js';

function validateObjectId(id: string, errorMessage = 'Invalid ID', code = 'INVALID_ID'): void {
  if (!Types.ObjectId.isValid(id)) {
    throw new AppError(errorMessage, 404, code);
  }
}

/**
 * Deterministically generates ephemeral action IDs (e.g. "act_1", "act_2")
 */
function createActionId(index: number): string {
  return `act_${index + 1}`;
}

/**
 * System-Wide Contract Change Planning & Multi-Project Change Package Synthesis Service
 * Pure request-scoped derived calculation (Persistence = 0, Workers = 0, Audit Writes = 0)
 */
export async function generateSystemContractChangePlan(
  userId: string,
  targetProjectId: string,
  options?: ContractChangePlanRequestDTO,
  userRoleOverride?: 'user' | 'admin',
): Promise<SystemContractPlanResponseDTO> {
  validateObjectId(targetProjectId, 'Invalid target project ID', 'PROJECT_NOT_FOUND');

  // Determine user role
  let role: 'user' | 'admin' = userRoleOverride || 'user';
  if (!userRoleOverride && Types.ObjectId.isValid(userId)) {
    const userDoc = await User.findById(userId).select('role').lean();
    if (userDoc && userDoc.role === 'admin') {
      role = 'admin';
    }
  }

  // 1. Pre-traversal ACL Authorization Check
  const hasAccess = await checkUserProjectReadAccess(userId, role, targetProjectId);
  if (!hasAccess) {
    throw new AppError('Forbidden: Unauthorized project access', 403, 'FORBIDDEN');
  }

  const project = await Project.findById(targetProjectId).lean();
  if (!project || project.isArchived) {
    throw new AppError('Target project not found', 404, 'PROJECT_NOT_FOUND');
  }

  // 2. Consume Phase 25 Contract Interoperability Matrix findings directly
  const matrixResponse = await calculateSystemContractMatrix(userId, role, targetProjectId);

  const candidateActions: CandidateChangeActionDTO[] = [];
  const unresolvedDecisions: UnresolvedDecisionDTO[] = [];
  let actionCounter = 0;

  const severityFilter = options?.severityFilter || 'ALL';
  const targetProviderFilter = options?.targetProviderProjectId;

  // Process Critical Incompatibilities from Matrix
  for (const item of matrixResponse.criticalIncompatibilities) {
    if (targetProviderFilter && item.providerProjectId !== targetProviderFilter) {
      continue;
    }

    if (item.issueType === 'BREAKING_SCHEMA_DELTA') {
      if (severityFilter === 'MISALIGNED_ONLY') continue;

      actionCounter += 1;
      const act1Id = createActionId(actionCounter - 1);

      actionCounter += 1;
      const act2Id = createActionId(actionCounter - 1);

      // Alternative 1: Consumer Adaptation
      const evidence1: ActionEvidenceDTO = {
        sourceProjectId: item.consumerProjectId,
        targetProjectId: item.providerProjectId,
        targetDocumentId: item.documentId,
        interoperabilityState: 'BREAKING_CONTRACT_DELTA',
        deltaType: 'BREAKING_SCHEMA_DELTA',
        reason: item.description,
        affectedDownstreamDocumentsCount: 1,
      };

      const action1: CandidateChangeActionDTO = {
        actionId: act1Id,
        actionRole: 'CONSUMER_ADAPTATION',
        candidateProposalType: 'TECHNICAL_CONTRACT_UPDATE',
        title: `Adapt Consumer ${item.consumerProjectName} to Breaking Spec Delta`,
        description: `Update consumer client documentation and spec links for ${item.documentTitle} to adapt to breaking change in ${item.providerProjectName}`,
        sourceProjectId: item.consumerProjectId,
        targetProjectId: item.providerProjectId,
        targetDocumentId: item.documentId,
        targetDocumentTitle: item.documentTitle,
        relevantEvidence: evidence1,
        proposedChanges: {
          proposedContent: `// Proposed consumer adaptation for ${item.documentTitle}\n// Adapt client usage to contract delta in ${item.providerProjectName}`,
        },
        alternativeActionIds: [act2Id],
        prerequisiteActionIds: [],
      };

      // Alternative 2: Provider Compatibility Restoration
      const evidence2: ActionEvidenceDTO = {
        sourceProjectId: item.providerProjectId,
        targetProjectId: item.consumerProjectId,
        targetDocumentId: item.documentId,
        interoperabilityState: 'BREAKING_CONTRACT_DELTA',
        deltaType: 'BREAKING_SCHEMA_DELTA',
        reason: `Provider restoration alternative for ${item.description}`,
        affectedDownstreamDocumentsCount: 1,
      };

      const action2: CandidateChangeActionDTO = {
        actionId: act2Id,
        actionRole: 'PROVIDER_COMPATIBILITY_RESTORATION',
        candidateProposalType: 'TECHNICAL_CONTRACT_UPDATE',
        title: `Restore Compatibility in Provider ${item.providerProjectName}`,
        description: `Restore backward compatibility in ${item.providerProjectName} for ${item.documentTitle} with deprecation warning`,
        sourceProjectId: item.providerProjectId,
        targetProjectId: item.consumerProjectId,
        targetDocumentId: item.documentId,
        targetDocumentTitle: item.documentTitle,
        relevantEvidence: evidence2,
        proposedChanges: {
          proposedSpecContent: `// Proposed provider restoration for ${item.documentTitle}\n// Restore deprecated endpoint/field for backward compatibility`,
        },
        alternativeActionIds: [act1Id],
        prerequisiteActionIds: [],
      };

      candidateActions.push(action1, action2);

      unresolvedDecisions.push({
        decisionId: `dec_${unresolvedDecisions.length + 1}`,
        topic: `Breaking Contract Remediation Strategy: ${item.documentTitle}`,
        description: `Select whether ${item.consumerProjectName} adapts to the breaking change (${act1Id}) or ${item.providerProjectName} restores compatibility (${act2Id})`,
        alternativeOptions: [act1Id, act2Id],
      });
    } else if (item.issueType === 'STRUCTURAL_BASELINE_MISALIGNMENT') {
      if (severityFilter === 'BREAKING_ONLY') continue;

      actionCounter += 1;
      const actId = createActionId(actionCounter - 1);

      const evidence: ActionEvidenceDTO = {
        sourceProjectId: item.consumerProjectId,
        targetProjectId: item.providerProjectId,
        targetDocumentId: item.documentId,
        interoperabilityState: 'STRUCTURALLY_MISALIGNED',
        reason: item.description,
        affectedDownstreamDocumentsCount: 1,
      };

      const action: CandidateChangeActionDTO = {
        actionId: actId,
        actionRole: 'COORDINATED_REALIGNMENT',
        candidateProposalType: 'RELATIONSHIP_UPDATE',
        title: `Realign Baseline Reference for ${item.documentTitle}`,
        description: `Consumer ${item.consumerProjectName} references outdated version; candidate target is active provider baseline in ${item.providerProjectName}`,
        sourceProjectId: item.consumerProjectId,
        targetProjectId: item.providerProjectId,
        targetDocumentId: item.documentId,
        targetDocumentTitle: item.documentTitle,
        relevantEvidence: evidence,
        proposedChanges: {
          proposedRelationships: [
            {
              targetDocumentId: item.documentId,
              relationshipType: 'DEPENDS_ON',
              note: 'Realign relationship to active provider baseline',
            },
          ],
        },
        alternativeActionIds: [],
        prerequisiteActionIds: [],
      };

      candidateActions.push(action);
    } else if (item.issueType === 'MISSING_PROVIDER_CONTRACT') {
      if (severityFilter === 'BREAKING_ONLY' || severityFilter === 'MISALIGNED_ONLY') continue;

      actionCounter += 1;
      const actId = createActionId(actionCounter - 1);

      const evidence: ActionEvidenceDTO = {
        sourceProjectId: item.providerProjectId,
        targetProjectId: item.consumerProjectId,
        targetDocumentId: item.documentId,
        interoperabilityState: 'MISSING_AUTHORITATIVE_CONTRACT',
        reason: item.description,
        affectedDownstreamDocumentsCount: 1,
      };

      const action: CandidateChangeActionDTO = {
        actionId: actId,
        actionRole: 'AUTHORITY_COMPLETION',
        candidateProposalType: 'TECHNICAL_CONTRACT_UPDATE',
        title: `Attach OpenAPI Specification to ${item.documentTitle}`,
        description: `Import and attach an authoritative OpenAPI specification to provider document in ${item.providerProjectName}`,
        sourceProjectId: item.providerProjectId,
        targetProjectId: item.consumerProjectId,
        targetDocumentId: item.documentId,
        targetDocumentTitle: item.documentTitle,
        relevantEvidence: evidence,
        proposedChanges: {
          proposedSpecContent: `openapi: 3.0.3\ninfo:\n  title: ${item.documentTitle}\n  version: 1.0.0\npaths: {}`,
        },
        alternativeActionIds: [],
        prerequisiteActionIds: [],
      };

      candidateActions.push(action);
    } else if (item.issueType === 'UNSUPPORTED_CONTRACT_STRUCTURE') {
      if (severityFilter === 'BREAKING_ONLY' || severityFilter === 'MISALIGNED_ONLY') continue;

      actionCounter += 1;
      const actId = createActionId(actionCounter - 1);

      const evidence: ActionEvidenceDTO = {
        sourceProjectId: item.providerProjectId,
        targetProjectId: item.consumerProjectId,
        targetDocumentId: item.documentId,
        interoperabilityState: 'UNSUPPORTED_CONTRACT',
        reason: item.description,
        affectedDownstreamDocumentsCount: 1,
      };

      const action: CandidateChangeActionDTO = {
        actionId: actId,
        actionRole: 'AUTHORITY_COMPLETION',
        candidateProposalType: 'DOCUMENT_CONTENT_UPDATE',
        title: `Convert Plain Prose Specification for ${item.documentTitle}`,
        description: `Document specification text is plain prose; convert to structured OpenAPI 3.0/3.1 JSON or YAML format`,
        sourceProjectId: item.providerProjectId,
        targetProjectId: item.consumerProjectId,
        targetDocumentId: item.documentId,
        targetDocumentTitle: item.documentTitle,
        relevantEvidence: evidence,
        proposedChanges: {
          proposedContent: `# Converted OpenAPI Specification for ${item.documentTitle}\n\nConvert plain text prose into structured OpenAPI JSON/YAML.`,
        },
        alternativeActionIds: [],
        prerequisiteActionIds: [],
      };

      candidateActions.push(action);
    }
  }

  // Also check non-breaking / informational states across cells
  for (const row of matrixResponse.matrix) {
    for (const cell of row) {
      if (targetProviderFilter && cell.colProjectId !== targetProviderFilter && cell.rowProjectId !== targetProviderFilter) {
        continue;
      }

      if (cell.interoperabilityState === 'UNSUPPORTED_CONTRACT' || cell.interoperabilityState === 'MISSING_AUTHORITATIVE_CONTRACT') {
        if (severityFilter === 'BREAKING_ONLY' || severityFilter === 'MISALIGNED_ONLY') continue;

        actionCounter += 1;
        const actId = createActionId(actionCounter - 1);

        const evidence: ActionEvidenceDTO = {
          sourceProjectId: cell.rowProjectId,
          targetProjectId: cell.colProjectId,
          targetDocumentId: cell.rowProjectId,
          interoperabilityState: cell.interoperabilityState,
          reason: cell.indeterminacyReason || 'Contract evidence is ambiguous or unparseable',
          affectedDownstreamDocumentsCount: 1,
        };

        const action: CandidateChangeActionDTO = {
          actionId: actId,
          actionRole: 'AUTHORITY_COMPLETION',
          candidateProposalType: 'DOCUMENT_CONTENT_UPDATE',
          title: `Investigate Indeterminate Contract Evidence between ${cell.rowProjectName} and ${cell.colProjectName}`,
          description: `Contract evidence is ambiguous or incomplete. Perform manual verification of contract boundary.`,
          sourceProjectId: cell.rowProjectId,
          targetProjectId: cell.colProjectId,
          targetDocumentId: cell.rowProjectId,
          targetDocumentTitle: `${cell.rowProjectName} Contract Document`,
          relevantEvidence: evidence,
          proposedChanges: {},
          alternativeActionIds: [],
          prerequisiteActionIds: [],
        };

        candidateActions.push(action);
      }
    }
  }

  // Apply bounds constraint (MAX_CANDIDATE_ACTIONS = 50)
  const MAX_CANDIDATE_ACTIONS = 50;
  const isTruncated = candidateActions.length > MAX_CANDIDATE_ACTIONS;
  const finalCandidateActions = candidateActions.slice(0, MAX_CANDIDATE_ACTIONS);

  // 4. Calculate Informational Topological Dependency Sequence
  // Primary ordering derived from actual topology dependency evidence (Provider/Upstream -> Consumer/Downstream)
  // Role priority acts strictly as a deterministic tie-breaker when topological relationship is neutral/equal.
  const allLinks = await ProjectTopologyLink.find({ type: 'DEPENDS_ON' }).lean();
  const depMap = new Map<string, Set<string>>();
  for (const link of allLinks) {
    const src = link.sourceProjectId.toString();
    const tgt = link.targetProjectId.toString();
    if (!depMap.has(src)) depMap.set(src, new Set());
    depMap.get(src)!.add(tgt);
  }

  function isProjectDependent(consumerId: string, providerId: string, visited = new Set<string>()): boolean {
    if (consumerId === providerId) return false;
    const targets = depMap.get(consumerId);
    if (!targets) return false;
    if (targets.has(providerId)) return true;
    for (const t of targets) {
      if (!visited.has(t)) {
        visited.add(t);
        if (isProjectDependent(t, providerId, visited)) return true;
      }
    }
    return false;
  }

  const rolePriority: Record<ActionRole, number> = {
    AUTHORITY_COMPLETION: 1,
    PROVIDER_COMPATIBILITY_RESTORATION: 2,
    COORDINATED_REALIGNMENT: 3,
    CONSUMER_ADAPTATION: 4,
  };

  const sortedActions = [...finalCandidateActions].sort((a, b) => {
    const projA = a.targetProjectId || a.sourceProjectId;
    const projB = b.targetProjectId || b.sourceProjectId;

    if (projA !== projB) {
      if (isProjectDependent(projA, projB)) {
        return 1;
      }
      if (isProjectDependent(projB, projA)) {
        return -1;
      }
    }

    const prioA = rolePriority[a.actionRole] || 5;
    const prioB = rolePriority[b.actionRole] || 5;
    if (prioA !== prioB) {
      return prioA - prioB;
    }
    return a.actionId.localeCompare(b.actionId);
  });

  const dependencyOrderedSequence = sortedActions.map((a) => a.actionId);

  // 5. Synthesize Draft Change Package Payload (Non-persistent DTO)
  const candidateProposals: DraftProposalPayloadDTO[] = [];

  for (let i = 0; i < finalCandidateActions.length; i++) {
    const action = finalCandidateActions[i];
    if (!action) continue;
    if (action.alternativeActionIds.length > 0 && action.actionRole === 'PROVIDER_COMPATIBILITY_RESTORATION') {
      continue;
    }

    candidateProposals.push({
      tempId: `draft_prop_${candidateProposals.length + 1}`,
      targetDocumentId: action.targetDocumentId,
      targetDocumentTitle: action.targetDocumentTitle,
      proposalType: action.candidateProposalType,
      title: action.title,
      description: action.description,
      proposedChanges: action.proposedChanges,
      selectedActionRole: action.actionRole,
    });
  }

  const draftChangePackage: DraftChangePackagePayloadDTO = {
    draftPackageName: `DRAFT-PKG-REALIGN-${project.name.toUpperCase().replace(/[^A-Z0-9]/g, '-')}`,
    description: `Draft change package addressing contract friction for project ${project.name}`,
    targetProjectId: targetProjectId,
    candidateProposals: candidateProposals,
    recommendedDependencySequence: candidateProposals.map((p) => p.tempId),
    unresolvedDecisions: unresolvedDecisions,
  };

  return {
    targetProjectId,
    evaluatedAt: new Date().toISOString(),
    summary: {
      totalContractProblems: matrixResponse.criticalIncompatibilities.length,
      candidateActionsCount: finalCandidateActions.length,
      hasAlternatives: unresolvedDecisions.length > 0,
      isTruncated,
    },
    candidateActions: finalCandidateActions,
    dependencyOrderedSequence,
    draftChangePackage,
  };
}
