import type { DocumentStatus } from '../documents/document.types';

export interface KnowledgeSearchResultItem {
  documentId: string;
  title: string;
  description?: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  status: DocumentStatus;
  version: number;
  lastApprovedVersion?: number | null;
  isApprovedVersion: boolean;
  projectId?: string | null;
  projectName?: string | null;
  owner: {
    id: string;
    name: string;
  };
  steward?: {
    id: string;
    name: string;
    isExplicitSteward: boolean;
  };
  lastReviewedAt?: string | null;
  ranking: {
    score: number;
    relevanceReasons: string[];
  };
  health: {
    riskScore: number;
    riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  };
  traceability: {
    relatedDocuments: Array<{
      documentId: string;
      title: string;
      type: string;
      status: DocumentStatus;
    }>;
    linkedApiEndpoints: Array<{
      endpointId: string;
      method: string;
      path: string;
      summary?: string;
      status: string;
    }>;
  };
}

export interface KnowledgeSearchPagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface KnowledgeSearchData {
  query: string;
  results: KnowledgeSearchResultItem[];
  pagination: KnowledgeSearchPagination;
}

export interface KnowledgeSearchResponse {
  success: boolean;
  data: KnowledgeSearchData;
}

export interface KnowledgeSearchParams {
  q?: string;
  projectId?: string;
  page?: number;
  limit?: number;
}
