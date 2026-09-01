export type DocumentRelationshipType =
  | 'RELATED'
  | 'REFERENCES'
  | 'REPLACES'
  | 'DEPENDS_ON';

export type RelationshipDirection = 'OUTGOING' | 'INCOMING';

export interface RelatedDocumentSummary {
  id: string;
  title: string;
  fileName: string;
  fileType: string;
}

export interface DocumentRelationship {
  id: string;
  sourceDocumentId: string;
  targetDocumentId: string;
  type: DocumentRelationshipType;
  direction: RelationshipDirection;
  sourceDocument: RelatedDocumentSummary;
  targetDocument: RelatedDocumentSummary;
  relatedDocument: RelatedDocumentSummary;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateDocumentRelationshipParams {
  targetDocumentId: string;
  type: DocumentRelationshipType;
}

export interface GetDocumentRelationshipsResponse {
  success: boolean;
  data: {
    relationships: DocumentRelationship[];
  };
}

export interface CreateDocumentRelationshipResponse {
  success: boolean;
  data: DocumentRelationship;
}

export interface DeleteDocumentRelationshipResponse {
  success: boolean;
  data: {
    message: string;
  };
}

export interface DocumentDependencyItem {
  id: string;
  title: string;
  fileName: string;
  fileType: string;
  depth: number;
  direction: 'UPSTREAM' | 'DOWNSTREAM';
  status?: string;
}

export interface DocumentDependencySummary {
  upstreamCount: number;
  downstreamCount: number;
  cycleDetected: boolean;
}

export interface GetDocumentDependenciesResponse {
  success: boolean;
  data: {
    summary: DocumentDependencySummary;
    upstream: DocumentDependencyItem[];
    downstream: DocumentDependencyItem[];
  };
}
