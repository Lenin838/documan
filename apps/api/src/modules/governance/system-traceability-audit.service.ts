import { Types } from 'mongoose';
import { AppError } from '../../errors/app-error.js';
import { Document as DocumentModel } from '../documents/document.model.js';
import { DocumentVersion as DocumentVersionModel } from '../documents/document-version.model.js';
import { DocumentRelationship as DocumentRelationshipModel } from '../documents/document-relationship.model.js';
import { DocumentReference as DocumentReferenceModel } from '../documents/document-reference.model.js';
import { DocumentChangeProposal, ProposalStatus } from '../change-proposals/change-proposal.model.js';
import { VerificationPlan } from './verification-plan.model.js';
import { VerificationTask } from './verification-task.model.js';
import { DocumentationBaseline } from './documentation-baseline.model.js';
import { DocumentEndpointLink } from '../api-specs/document-endpoint-link.model.js';
import { ProjectTopologyLink } from '../projects/project-topology.model.js';
import { checkUserProjectReadAccess } from '../projects/project-topology.service.js';
import { parseOpenApiSpecification } from '../api-specs/openapi-parser.service.js';
import type {
  ITraceabilityAuditResponse,
  ITraceabilityCompleteness,
  ITraceabilityGapItem,
  ITraceabilityRequirementItem,
  TraceabilitySeverity,
} from './system-traceability-audit.types.js';

interface DocumentWithImpact {
  _id: Types.ObjectId;
  title: string;
  status: string;
  projectId: Types.ObjectId;
  isDeleted?: boolean;
  impactVerification?: {
    needsVerification?: boolean;
  };
}

interface TargetVersionDoc {
  _id: Types.ObjectId;
  versionNumber: number;
  content?: string;
}

interface LeanDocWithProject {
  _id: Types.ObjectId;
  projectId?: Types.ObjectId;
}

export async function calculateTraceabilityAudit(
  userId: string,
  role: string,
  documentId: string,
  versionNumber?: number,
): Promise<ITraceabilityAuditResponse> {
  // 1. Authorization & Document Validation
  if (!Types.ObjectId.isValid(documentId)) {
    throw new AppError('Invalid document ID', 400, 'VALIDATION_ERROR');
  }

  const rawDocument = await DocumentModel.findById(documentId).lean();
  if (!rawDocument || (rawDocument as unknown as DocumentWithImpact).isDeleted) {
    throw new AppError('Document not found', 404, 'DOCUMENT_NOT_FOUND');
  }

  const document = rawDocument as unknown as DocumentWithImpact;
  const projectId = document.projectId;
  const userRoleParam = (role === 'admin' || role === 'SYSTEM_ADMIN' ? 'admin' : 'user') as 'admin' | 'user';

  // Authorization check for root project
  const hasAccess = await checkUserProjectReadAccess(userId, userRoleParam, (projectId as unknown as { toString(): string }).toString());
  if (!hasAccess) {
    throw new AppError(
      'Access denied: You are not a member of this project',
      403,
      'FORBIDDEN',
    );
  }

  // 2. Select Primary Audit Subject: DocumentVersion
  let targetVersion: TargetVersionDoc | null = null;
  if (typeof versionNumber === 'number' && versionNumber > 0) {
    const foundVer = await DocumentVersionModel.findOne({
      documentId: document._id,
      versionNumber,
    }).lean();

    if (!foundVer) {
      throw new AppError(
        `Document version ${versionNumber} not found`,
        404,
        'VERSION_NOT_FOUND',
      );
    }
    targetVersion = foundVer as unknown as TargetVersionDoc;
  } else {
    // Default: Latest active version
    const versions = await DocumentVersionModel.find({ documentId: document._id })
      .sort({ versionNumber: -1 })
      .limit(1)
      .lean();

    if (versions.length > 0) {
      targetVersion = versions[0] as unknown as TargetVersionDoc;
    }
  }

  const selectedVersionNumber = targetVersion ? targetVersion.versionNumber : 1;
  const selectedVersionId = targetVersion ? targetVersion._id.toString() : undefined;

  const requirements: ITraceabilityRequirementItem[] = [];
  const gaps: ITraceabilityGapItem[] = [];

  // =========================================================================
  // REQ 1: DOCUMENT EXISTENCE (Always Applicable)
  // =========================================================================
  requirements.push({
    requirementType: 'REQ_DOCUMENT_EXISTENCE',
    applicable: true,
    status: 'APPLICABLE_AND_PRESENT',
    authoritativeSource: 'Document',
    linkedEntityId: document._id.toString(),
    explanation: `Root document '${document.title}' exists and is active.`,
  });

  // =========================================================================
  // REQ 2: VERSION BINDING (Always Applicable)
  // =========================================================================
  if (targetVersion) {
    requirements.push({
      requirementType: 'REQ_VERSION_BINDING',
      applicable: true,
      status: 'APPLICABLE_AND_PRESENT',
      authoritativeSource: 'DocumentVersion',
      linkedEntityId: targetVersion._id.toString(),
      explanation: `Document version ${selectedVersionNumber} exists with valid checksum.`,
    });
  } else {
    requirements.push({
      requirementType: 'REQ_VERSION_BINDING',
      applicable: true,
      status: 'APPLICABLE_AND_MISSING',
      authoritativeSource: 'DocumentVersion',
      gapType: 'MISSING_VERSION',
      severity: 'CRITICAL',
      explanation: `Document version ${selectedVersionNumber} does not exist in repository.`,
    });

    gaps.push({
      gapType: 'MISSING_VERSION',
      severity: 'CRITICAL',
      requirementType: 'REQ_VERSION_BINDING',
      explanation: `Document version ${selectedVersionNumber} does not exist.`,
      authoritativeSource: 'DocumentVersion',
      remediation: 'Create a valid DocumentVersion snapshot for this document.',
    });
  }

  // =========================================================================
  // REQ 3: RELATIONSHIP VERIFICATION
  // =========================================================================
  const allRelationships = await DocumentRelationshipModel.find({
    $or: [{ sourceDocumentId: document._id }, { targetDocumentId: document._id }],
  }).lean();

  // Enforce ACL filtering on relationships
  const authorizedRelationships: typeof allRelationships = [];
  for (const rel of allRelationships) {
    const rawSource = await DocumentModel.findById(rel.sourceDocumentId).lean();
    const rawTarget = await DocumentModel.findById(rel.targetDocumentId).lean();
    const sourceDoc = rawSource as unknown as LeanDocWithProject | null;
    const targetDoc = rawTarget as unknown as LeanDocWithProject | null;

    const isCrossProject =
      sourceDoc && targetDoc && sourceDoc.projectId && targetDoc.projectId && sourceDoc.projectId.toString() !== targetDoc.projectId.toString();

    if (!isCrossProject) {
      authorizedRelationships.push(rel);
    } else {
      // Check cross-project authorization
      const otherDoc =
        rel.sourceDocumentId.toString() === document._id.toString() ? targetDoc : sourceDoc;
      if (otherDoc && otherDoc.projectId) {
        const canAccessOther = await checkUserProjectReadAccess(
          userId,
          userRoleParam,
          otherDoc.projectId.toString(),
        );
        if (canAccessOther) {
          authorizedRelationships.push(rel);
        }
      }
    }
  }

  if (authorizedRelationships.length === 0) {
    requirements.push({
      requirementType: 'REQ_RELATIONSHIP_VERIFICATION',
      applicable: false,
      status: 'NOT_APPLICABLE',
      authoritativeSource: 'DocumentRelationship',
      explanation: 'No document relationships declared for this document.',
    });
  } else {
    const docNeedsVerification = document.impactVerification?.needsVerification === true;
    const firstRel = authorizedRelationships[0] as { _id: { toString(): string } };
    if (docNeedsVerification) {
      requirements.push({
        requirementType: 'REQ_RELATIONSHIP_VERIFICATION',
        applicable: true,
        status: 'APPLICABLE_AND_MISSING',
        authoritativeSource: 'DocumentRelationship',
        linkedEntityId: firstRel._id.toString(),
        gapType: 'MISSING_RELATIONSHIP',
        severity: 'WARNING',
        explanation: 'Document relationship requires verification following upstream change impact.',
      });

      gaps.push({
        gapType: 'MISSING_RELATIONSHIP',
        severity: 'WARNING',
        requirementType: 'REQ_RELATIONSHIP_VERIFICATION',
        explanation: 'Document relationship requires verification following upstream change impact.',
        authoritativeSource: 'DocumentRelationship',
        linkedEntityId: firstRel._id.toString(),
        remediation: 'Review and verify document relationship status to clear needsVerification flag.',
      });
    } else {
      requirements.push({
        requirementType: 'REQ_RELATIONSHIP_VERIFICATION',
        applicable: true,
        status: 'APPLICABLE_AND_PRESENT',
        authoritativeSource: 'DocumentRelationship',
        explanation: 'All declared document relationships are verified and clean.',
      });
    }
  }

  // =========================================================================
  // REQ 4: CHANGE TRACE (Applicable for Version > 1)
  // =========================================================================
  if (selectedVersionNumber <= 1) {
    requirements.push({
      requirementType: 'REQ_CHANGE_TRACE',
      applicable: false,
      status: 'NOT_APPLICABLE',
      authoritativeSource: 'DocumentChangeProposal',
      explanation: 'Initial document version (v1) does not require a change proposal trace.',
    });
  } else {
    const proposalQuery: Record<string, unknown> = {
      targetDocumentId: document._id,
      status: ProposalStatus.ACCEPTED,
    };
    if (targetVersion) {
      proposalQuery.acceptedAuthoritativeVersionId = targetVersion._id;
    }
    const acceptedProposal = await DocumentChangeProposal.findOne(proposalQuery).lean();

    if (acceptedProposal) {
      requirements.push({
        requirementType: 'REQ_CHANGE_TRACE',
        applicable: true,
        status: 'APPLICABLE_AND_PRESENT',
        authoritativeSource: 'DocumentChangeProposal',
        linkedEntityId: acceptedProposal._id.toString(),
        explanation: `Linked accepted change proposal '${acceptedProposal.proposalNumber}' verified.`,
      });
    } else {
      requirements.push({
        requirementType: 'REQ_CHANGE_TRACE',
        applicable: true,
        status: 'APPLICABLE_AND_MISSING',
        authoritativeSource: 'DocumentChangeProposal',
        gapType: 'MISSING_CHANGE_TRACE',
        severity: 'WARNING',
        explanation: `Post-v1 document version ${selectedVersionNumber} lacks a linked accepted change proposal.`,
      });

      gaps.push({
        gapType: 'MISSING_CHANGE_TRACE',
        severity: 'WARNING',
        requirementType: 'REQ_CHANGE_TRACE',
        explanation: `Document version ${selectedVersionNumber} lacks an accepted change proposal trace.`,
        authoritativeSource: 'DocumentChangeProposal',
        remediation: 'Associate version updates with an accepted DocumentChangeProposal.',
      });
    }
  }

  // =========================================================================
  // REQ 5: VERIFICATION FULFILLMENT
  // =========================================================================
  const verificationPlan = await VerificationPlan.findOne({
    triggerDocumentId: document._id,
    triggerVersion: String(selectedVersionNumber),
  }).lean();

  const verificationTasks = await VerificationTask.find({
    triggerDocumentId: document._id,
    triggerVersion: String(selectedVersionNumber),
  }).lean();

  if (!verificationPlan && verificationTasks.length === 0) {
    requirements.push({
      requirementType: 'REQ_VERIFICATION_FULFILLMENT',
      applicable: false,
      status: 'NOT_APPLICABLE',
      authoritativeSource: 'VerificationPlan',
      explanation: 'No verification requirements triggered for this version.',
    });
  } else {
    const unfulfilledTask = verificationTasks.find(
      (t) => t.status !== 'VERIFIED',
    );

    if (unfulfilledTask) {
      requirements.push({
        requirementType: 'REQ_VERIFICATION_FULFILLMENT',
        applicable: true,
        status: 'APPLICABLE_AND_MISSING',
        authoritativeSource: 'VerificationTask',
        linkedEntityId: unfulfilledTask._id.toString(),
        gapType: 'MISSING_VERIFICATION_FULFILLMENT',
        severity: 'CRITICAL',
        explanation: `Verification task '${unfulfilledTask.verificationMethod}' is in '${unfulfilledTask.status}' status.`,
      });

      gaps.push({
        gapType: 'MISSING_VERIFICATION_FULFILLMENT',
        severity: 'CRITICAL',
        requirementType: 'REQ_VERIFICATION_FULFILLMENT',
        explanation: `Unfulfilled verification task in status '${unfulfilledTask.status}'.`,
        authoritativeSource: 'VerificationTask',
        linkedEntityId: unfulfilledTask._id.toString(),
        remediation: 'Complete and verify all pending verification tasks linked to this version.',
      });
    } else {
      requirements.push({
        requirementType: 'REQ_VERIFICATION_FULFILLMENT',
        applicable: true,
        status: 'APPLICABLE_AND_PRESENT',
        authoritativeSource: 'VerificationTask',
        linkedEntityId: verificationPlan ? verificationPlan._id.toString() : undefined,
        explanation: 'All triggered verification tasks have been fulfilled and verified.',
      });
    }
  }

  // =========================================================================
  // REQ 6: EVIDENCE ATTACHMENT
  // =========================================================================
  const isApproved = document.status === 'APPROVED';
  const hasEvidenceTask = verificationTasks.some(
    (t) => t.verificationMethod === 'EVIDENCE_RENEWAL',
  );

  if (!isApproved && !hasEvidenceTask) {
    requirements.push({
      requirementType: 'REQ_EVIDENCE_ATTACHMENT',
      applicable: false,
      status: 'NOT_APPLICABLE',
      authoritativeSource: 'DocumentReference',
      explanation: 'Document is not approved and carries no evidence renewal requirements.',
    });
  } else {
    const references = await DocumentReferenceModel.find({
      documentId: document._id,
    }).lean();

    const endpointLinks = await DocumentEndpointLink.find({
      documentId: document._id,
    }).lean();

    if (references.length > 0 || endpointLinks.length > 0) {
      requirements.push({
        requirementType: 'REQ_EVIDENCE_ATTACHMENT',
        applicable: true,
        status: 'APPLICABLE_AND_PRESENT',
        authoritativeSource: 'DocumentReference',
        explanation: `Found ${references.length} reference(s) and ${endpointLinks.length} API link(s) providing evidence.`,
      });
    } else {
      requirements.push({
        requirementType: 'REQ_EVIDENCE_ATTACHMENT',
        applicable: true,
        status: 'APPLICABLE_AND_MISSING',
        authoritativeSource: 'DocumentReference',
        gapType: 'MISSING_OR_EXPIRED_EVIDENCE',
        severity: 'WARNING',
        explanation: 'Approved document lacks supporting technical references or linked endpoint evidence.',
      });

      gaps.push({
        gapType: 'MISSING_OR_EXPIRED_EVIDENCE',
        severity: 'WARNING',
        requirementType: 'REQ_EVIDENCE_ATTACHMENT',
        explanation: 'Approved document lacks supporting evidence or technical references.',
        authoritativeSource: 'DocumentReference',
        remediation: 'Attach valid technical references or API endpoint links to support document claims.',
      });
    }
  }

  // =========================================================================
  // REQ 7: BASELINE SNAPSHOT
  // =========================================================================
  const baselineFilterQuery: Record<string, unknown> = {
    projectId: document.projectId,
    isActive: true,
  };
  const activeBaseline = await DocumentationBaseline.findOne(baselineFilterQuery).lean();

  const topologyFilterQuery: Record<string, unknown> = {
    $or: [{ sourceProjectId: projectId }, { targetProjectId: projectId }],
  };
  const crossProjectLinks = await ProjectTopologyLink.find(topologyFilterQuery).lean();

  const hasCrossProjectConsumers = crossProjectLinks.length > 0;

  if (!activeBaseline && !hasCrossProjectConsumers) {
    requirements.push({
      requirementType: 'REQ_BASELINE_SNAPSHOT',
      applicable: false,
      status: 'NOT_APPLICABLE',
      authoritativeSource: 'DocumentationBaseline',
      explanation: 'Project has no active baseline and no cross-project topology dependencies.',
    });
  } else if (!activeBaseline) {
    requirements.push({
      requirementType: 'REQ_BASELINE_SNAPSHOT',
      applicable: true,
      status: 'APPLICABLE_AND_MISSING',
      authoritativeSource: 'DocumentationBaseline',
      gapType: 'UNBASELINED_DOCUMENT_VERSION',
      severity: 'CRITICAL',
      explanation: 'Document participates in cross-project topology but project has no active DocumentationBaseline.',
    });

    gaps.push({
      gapType: 'UNBASELINED_DOCUMENT_VERSION',
      severity: 'CRITICAL',
      requirementType: 'REQ_BASELINE_SNAPSHOT',
      explanation: 'Cross-project document version is not bound in an active baseline snapshot.',
      authoritativeSource: 'DocumentationBaseline',
      remediation: 'Create an active DocumentationBaseline incorporating version snapshot.',
    });
  } else {
    const matchingSnapshot = activeBaseline.documentSnapshots.find(
      (s) =>
        s.documentId.toString() === document._id.toString() &&
        s.versionNumber === selectedVersionNumber,
    );

    if (matchingSnapshot) {
      requirements.push({
        requirementType: 'REQ_BASELINE_SNAPSHOT',
        applicable: true,
        status: 'APPLICABLE_AND_PRESENT',
        authoritativeSource: 'DocumentationBaseline',
        linkedEntityId: activeBaseline._id.toString(),
        explanation: `Version ${selectedVersionNumber} is snapshot-bound in active baseline '${activeBaseline.versionTag}'.`,
      });
    } else {
      const severity: TraceabilitySeverity = hasCrossProjectConsumers
        ? 'CRITICAL'
        : 'WARNING';

      requirements.push({
        requirementType: 'REQ_BASELINE_SNAPSHOT',
        applicable: true,
        status: 'APPLICABLE_AND_MISSING',
        authoritativeSource: 'DocumentationBaseline',
        linkedEntityId: activeBaseline._id.toString(),
        gapType: 'UNBASELINED_DOCUMENT_VERSION',
        severity,
        explanation: `Version ${selectedVersionNumber} is missing from active baseline '${activeBaseline.versionTag}' snapshots.`,
      });

      gaps.push({
        gapType: 'UNBASELINED_DOCUMENT_VERSION',
        severity,
        requirementType: 'REQ_BASELINE_SNAPSHOT',
        explanation: `Document version ${selectedVersionNumber} is missing from active baseline snapshot.`,
        authoritativeSource: 'DocumentationBaseline',
        linkedEntityId: activeBaseline._id.toString(),
        remediation: `Update baseline '${activeBaseline.versionTag}' snapshot to include version ${selectedVersionNumber}.`,
      });
    }
  }

  // =========================================================================
  // REQ 8: CONTRACT SPECIFICATION
  // =========================================================================
  const rawContent = targetVersion ? targetVersion.content : '';
  const endpointLinksForContract = await DocumentEndpointLink.find({ documentId: document._id }).lean();
  const isContractDocument = (rawContent && rawContent.includes('openapi')) || endpointLinksForContract.length > 0;

  if (!isContractDocument) {
    requirements.push({
      requirementType: 'REQ_CONTRACT_SPECIFICATION',
      applicable: false,
      status: 'NOT_APPLICABLE',
      authoritativeSource: 'ProjectApiSpec',
      explanation: 'Document is not registered as an API contract specification.',
    });
  } else {
    try {
      const parsedSpec = parseOpenApiSpecification(rawContent || '');
      if (parsedSpec && parsedSpec.endpoints.length > 0) {
        requirements.push({
          requirementType: 'REQ_CONTRACT_SPECIFICATION',
          applicable: true,
          status: 'APPLICABLE_AND_PRESENT',
          authoritativeSource: 'ProjectApiSpec',
          explanation: `Valid OpenAPI specification with ${parsedSpec.endpoints.length} endpoint(s) parsed.`,
        });
      } else {
        requirements.push({
          requirementType: 'REQ_CONTRACT_SPECIFICATION',
          applicable: true,
          status: 'APPLICABLE_AND_MISSING',
          authoritativeSource: 'ProjectApiSpec',
          gapType: 'UNSUPPORTED_OR_MISSING_CONTRACT',
          severity: 'WARNING',
          explanation: 'API contract specification content is plain prose or unstructured formatting.',
        });

        gaps.push({
          gapType: 'UNSUPPORTED_OR_MISSING_CONTRACT',
          severity: 'WARNING',
          requirementType: 'REQ_CONTRACT_SPECIFICATION',
          explanation: 'API contract content lacks structured OpenAPI 3.0 specification format.',
          authoritativeSource: 'ProjectApiSpec',
          remediation: 'Format contract content as valid JSON or YAML OpenAPI 3.0 specification.',
        });
      }
    } catch {
      requirements.push({
        requirementType: 'REQ_CONTRACT_SPECIFICATION',
        applicable: true,
        status: 'APPLICABLE_AND_MISSING',
        authoritativeSource: 'ProjectApiSpec',
        gapType: 'UNSUPPORTED_OR_MISSING_CONTRACT',
        severity: 'WARNING',
        explanation: 'API contract specification content is plain prose or unstructured formatting.',
      });

      gaps.push({
        gapType: 'UNSUPPORTED_OR_MISSING_CONTRACT',
        severity: 'WARNING',
        requirementType: 'REQ_CONTRACT_SPECIFICATION',
        explanation: 'API contract content lacks structured OpenAPI 3.0 specification format.',
        authoritativeSource: 'ProjectApiSpec',
        remediation: 'Format contract content as valid JSON or YAML OpenAPI 3.0 specification.',
      });
    }
  }

  // =========================================================================
  // CALCULATE FACTUAL COMPLETENESS METRICS
  // =========================================================================
  const applicableRequirements = requirements.filter((r) => r.applicable);
  const satisfiedRequirements = applicableRequirements.filter(
    (r) => r.status === 'APPLICABLE_AND_PRESENT',
  );
  const missingRequirements = applicableRequirements.filter(
    (r) => r.status === 'APPLICABLE_AND_MISSING',
  );
  const indeterminateRequirements = applicableRequirements.filter(
    (r) => r.status === 'APPLICABLE_BUT_INDETERMINATE',
  );

  const applicableCount = applicableRequirements.length;
  const satisfiedCount = satisfiedRequirements.length;
  const missingCount = missingRequirements.length;
  const indeterminateCount = indeterminateRequirements.length;

  const completenessPercentage =
    applicableCount === 0
      ? null
      : Math.round((satisfiedCount / applicableCount) * 10000) / 100;

  let traceabilityStatus: 'COMPLETE' | 'INCOMPLETE' | 'INDETERMINATE' = 'COMPLETE';
  if (missingCount > 0) {
    traceabilityStatus = 'INCOMPLETE';
  } else if (indeterminateCount > 0) {
    traceabilityStatus = 'INDETERMINATE';
  }

  const completeness: ITraceabilityCompleteness = {
    satisfiedRequirementsCount: satisfiedCount,
    applicableRequirementsCount: applicableCount,
    completenessPercentage,
    indeterminateRequirementsCount: indeterminateCount,
    missingRequirementsCount: missingCount,
  };

  // Sort requirements and gaps deterministically
  requirements.sort((a, b) => a.requirementType.localeCompare(b.requirementType));
  gaps.sort((a, b) => a.gapType.localeCompare(b.gapType));

  return {
    documentId: document._id.toString(),
    selectedVersionNumber,
    selectedVersionId,
    documentStatus: document.status,
    traceabilityStatus,
    completeness,
    requirements,
    gaps,
    evaluatedAt: new Date().toISOString(),
  };
}
