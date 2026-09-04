export type WorkRequestSource =
  | 'MANUAL'
  | 'CHANGE_IMPACT'
  | 'BASELINE_DRIFT'
  | 'VERIFICATION'
  | 'EVIDENCE'
  | 'GOVERNANCE';

export type WorkRequestStatus =
  | 'OPEN'
  | 'ASSIGNED'
  | 'IN_PROGRESS'
  | 'IN_REVIEW'
  | 'RESOLVED'
  | 'SKIPPED';

export interface IWorkRequestOriginatingContext {
  verificationPlanId?: string;
  verificationTaskId?: string;
  baselineId?: string;
  driftDimension?: 'VERSION_DRIFT' | 'DOCUMENT_DELETION_DRIFT' | 'RELATIONSHIP_DRIFT' | 'VERIFICATION_DRIFT';
  evidenceSourceId?: string;
  assuranceCheckId?: string;
  impactSourceDocumentId?: string;
  upstreamVersionNumber?: number;
  changeType?: string;
}

export interface UserSummary {
  _id: string;
  name: string;
  email: string;
}

export interface IDocumentationWorkRequest {
  _id: string;
  projectId: string;
  documentId: string;
  originKey?: string | null;
  targetVersionNumber?: number;
  title: string;
  reason: string;
  source: WorkRequestSource;
  status: WorkRequestStatus;
  createdBy: UserSummary;
  assigneeId?: UserSummary | null;
  originatingContext?: IWorkRequestOriginatingContext | null;
  resolutionNotes?: string | null;
  resolvedAt?: string | null;
  resolvedBy?: string | null;
  skippedAt?: string | null;
  skippedBy?: string | null;
  skipReason?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface WorkRequestsPagination {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface CreateWorkRequestPayload {
  title: string;
  reason: string;
  assigneeId?: string | null;
  targetVersionNumber?: number | null;
}
