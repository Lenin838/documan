export interface DocumentSnapshot {
  documentId: string;
  documentVersionId?: string;
  versionNumber: number;
  checksum: string;
}

export interface RelationshipSnapshot {
  sourceDocumentId: string;
  targetDocumentId: string;
  type: 'RELATED' | 'REFERENCES' | 'REPLACES' | 'DEPENDS_ON';
}

export interface DocumentationBaseline {
  _id: string;
  projectId: string;
  name: string;
  versionTag: string;
  description?: string;
  isActive: boolean;
  isArchived: boolean;
  archivedAt?: string;
  archivedBy?: string;
  createdBy: string;
  documentSnapshots: DocumentSnapshot[];
  relationshipSnapshots: RelationshipSnapshot[];
  createdAt: string;
  updatedAt: string;
}

export interface DocumentDriftDetail {
  documentId: string;
  documentTitle: string;
  baselineVersionNumber?: number;
  currentVersionNumber?: number;
  baselineChecksum?: string;
  currentChecksum?: string;
  driftDimensions: string[];
  severity: 'BLOCKING' | 'WARNING' | 'CLEAN';
  details: string[];
}

export interface RelationshipDriftDetail {
  sourceDocumentId: string;
  targetDocumentId: string;
  relationshipType: string;
  changeType: 'ADDED' | 'REMOVED';
  severity: 'BLOCKING' | 'WARNING' | 'CLEAN';
  details: string;
}

export interface DriftReport {
  projectId: string;
  baselineId?: string;
  baselineVersionTag?: string;
  evaluatedAt: string;
  hasActiveBaseline: boolean;
  hasDrift: boolean;
  driftScore: number;
  severity: 'BLOCKING' | 'WARNING' | 'CLEAN';
  summary: {
    totalBaselineDocuments: number;
    driftedDocumentsCount: number;
    versionDriftCount: number;
    deletionDriftCount: number;
    relationshipDriftCount: number;
    verificationDriftCount: number;
  };
  driftedDocuments: DocumentDriftDetail[];
  relationshipDrifts: RelationshipDriftDetail[];
}
