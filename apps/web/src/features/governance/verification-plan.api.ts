import { apiClient } from '../../api/client';

export interface VerificationTaskItem {
  _id: string;
  planId: string;
  projectId: string;
  targetDocumentId: {
    _id: string;
    title: string;
    version: number;
    status: string;
  } | string;
  triggerDocumentId: string;
  triggerVersion: string;
  relationshipType: string;
  impactPath: string[];
  impactExplanations: string[];
  verificationMethod: 'EVIDENCE_RENEWAL' | 'API_ALIGNMENT' | 'TECHNICAL_REVIEW' | 'CONTENT_AUDIT';
  applicableMethods: string[];
  status: 'OPEN' | 'IN_REVIEW' | 'VERIFIED' | 'SKIPPED';
  assignedStewardId: {
    _id: string;
    name: string;
    email: string;
  } | string;
  verifiedBy?: {
    _id: string;
    name: string;
    email: string;
  };
  verifiedAt?: string;
  skipReason?: string;
  createdAt: string;
}

export interface VerificationPlanDetails {
  _id: string;
  projectId: string;
  triggerDocumentId: {
    _id: string;
    title: string;
    version: number;
    status: string;
  } | string;
  triggerVersion: string;
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'COMPLETED_WITH_SKIPS' | 'BYPASSED';
  totalTasks: number;
  completedTasks: number;
  skippedTasks: number;
  createdBy: {
    _id: string;
    name: string;
    email: string;
  } | string;
  completedAt?: string;
  bypassedAt?: string;
  bypassReason?: string;
  createdAt: string;
}

export interface GetPlanDetailsResponse {
  success: boolean;
  data: {
    plan: VerificationPlanDetails;
    tasks: VerificationTaskItem[];
  };
}

export interface GetProjectPlansResponse {
  success: boolean;
  data: VerificationPlanDetails[];
}

export async function getProjectVerificationPlans(projectId: string): Promise<VerificationPlanDetails[]> {
  const res = await apiClient.get<GetProjectPlansResponse>(`/projects/${projectId}/governance/verification-plans`);
  return res.data.data;
}

export async function getVerificationPlanById(planId: string): Promise<{ plan: VerificationPlanDetails; tasks: VerificationTaskItem[] }> {
  const res = await apiClient.get<GetPlanDetailsResponse>(`/verification-plans/${planId}`);
  return res.data.data;
}

export async function generateVerificationPlan(documentId: string): Promise<VerificationPlanDetails> {
  const res = await apiClient.post<{ success: boolean; data: VerificationPlanDetails }>(`/documents/${documentId}/verification-plans/generate`);
  return res.data.data;
}

export async function updateVerificationTaskStatus(
  taskId: string,
  params: { status: 'IN_REVIEW' | 'VERIFIED' | 'SKIPPED'; skipReason?: string; evidenceReferenceId?: string },
): Promise<VerificationTaskItem> {
  const res = await apiClient.patch<{ success: boolean; data: VerificationTaskItem }>(`/verification-tasks/${taskId}`, params);
  return res.data.data;
}

export async function bypassVerificationPlan(
  planId: string,
  params: { bypassReason: string },
): Promise<VerificationPlanDetails> {
  const res = await apiClient.post<{ success: boolean; data: VerificationPlanDetails }>(`/verification-plans/${planId}/bypass`, params);
  return res.data.data;
}
