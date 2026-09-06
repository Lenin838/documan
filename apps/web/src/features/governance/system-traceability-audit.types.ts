export type RequirementStatus =
  | 'APPLICABLE_AND_PRESENT'
  | 'APPLICABLE_AND_MISSING'
  | 'APPLICABLE_BUT_INDETERMINATE'
  | 'NOT_APPLICABLE';

export type TraceabilityRequirementType =
  | 'REQ_DOCUMENT_EXISTENCE'
  | 'REQ_VERSION_BINDING'
  | 'REQ_RELATIONSHIP_VERIFICATION'
  | 'REQ_CHANGE_TRACE'
  | 'REQ_VERIFICATION_FULFILLMENT'
  | 'REQ_EVIDENCE_ATTACHMENT'
  | 'REQ_BASELINE_SNAPSHOT'
  | 'REQ_CONTRACT_SPECIFICATION';

export type TraceabilityGapType =
  | 'MISSING_VERSION'
  | 'MISSING_RELATIONSHIP'
  | 'MISSING_CHANGE_TRACE'
  | 'MISSING_VERIFICATION_FULFILLMENT'
  | 'MISSING_OR_EXPIRED_EVIDENCE'
  | 'UNBASELINED_DOCUMENT_VERSION'
  | 'UNSUPPORTED_OR_MISSING_CONTRACT';

export type TraceabilitySeverity = 'CRITICAL' | 'WARNING' | 'INFO';

export interface ITraceabilityRequirementItem {
  requirementType: TraceabilityRequirementType;
  applicable: boolean;
  status: RequirementStatus;
  authoritativeSource: string;
  linkedEntityId?: string;
  gapType?: TraceabilityGapType;
  severity?: TraceabilitySeverity;
  explanation: string;
}

export interface ITraceabilityGapItem {
  gapType: TraceabilityGapType;
  severity: TraceabilitySeverity;
  requirementType: TraceabilityRequirementType;
  explanation: string;
  authoritativeSource: string;
  linkedEntityId?: string;
  remediation: string;
}

export interface ITraceabilityCompleteness {
  satisfiedRequirementsCount: number;
  applicableRequirementsCount: number;
  completenessPercentage: number | null;
  indeterminateRequirementsCount: number;
  missingRequirementsCount: number;
}

export interface ITraceabilityAuditResponse {
  documentId: string;
  selectedVersionNumber: number;
  selectedVersionId?: string;
  documentStatus: string;
  traceabilityStatus: 'COMPLETE' | 'INCOMPLETE' | 'INDETERMINATE';
  completeness: ITraceabilityCompleteness;
  requirements: ITraceabilityRequirementItem[];
  gaps: ITraceabilityGapItem[];
  evaluatedAt: string;
}
