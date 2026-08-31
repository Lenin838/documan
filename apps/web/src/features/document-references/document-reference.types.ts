export type TechnicalReferenceType =
  | 'API'
  | 'REPOSITORY'
  | 'SPECIFICATION'
  | 'ISSUE'
  | 'OTHER';

export interface DocumentReference {
  id: string;
  documentId: string;
  type: TechnicalReferenceType;
  title: string;
  url: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateDocumentReferenceInput {
  type: TechnicalReferenceType;
  title: string;
  url: string;
}

export interface UpdateDocumentReferenceInput {
  type?: TechnicalReferenceType;
  title?: string;
  url?: string;
}
