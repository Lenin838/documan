export interface StructuredReasonData {
  code: string;
  label: string;
  detail: string;
}

export interface FactorDetailData {
  score: number;
  maxScore: number;
  triggered: boolean;
  reasons: StructuredReasonData[];
}

export interface RemediationActionData {
  code: string;
  label: string;
  detail: string;
}

export interface EffectiveContactData {
  id: string;
  name: string;
  email: string;
  isExplicitSteward: boolean;
  isActive: boolean;
}

export interface KnowledgeHealthData {
  documentId: string;
  riskScore: number;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  healthScore: number;
  effectiveContact: EffectiveContactData | null;
  factors: {
    impact: FactorDetailData;
    version: FactorDetailData;
    freshness: FactorDetailData;
    apiDrift: FactorDetailData;
    stewardship: FactorDetailData;
  };
  remediations: RemediationActionData[];
}

export interface HighRiskDocumentSummary {
  documentId: string;
  title: string;
  riskScore: number;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  primaryRemediation: string | null;
}

export interface ProjectKnowledgeRiskData {
  projectId: string;
  visibleDocumentCount: number;
  averageRiskScore: number;
  riskDistribution: {
    LOW: number;
    MEDIUM: number;
    HIGH: number;
    CRITICAL: number;
  };
  highRiskDocuments: HighRiskDocumentSummary[];
  unassignedStewardCount: number;
  pagination: {
    page: number;
    limit: number;
    totalHighRisk: number;
    totalPages: number;
  };
}
