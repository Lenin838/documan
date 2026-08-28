export interface Document {
  id: string;
  title: string;
  description?: string;
  fileName: string;
  filePath: string;
  fileType: string;
  fileSize: number;
  ownerId: string;
  isDeleted: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface DocumentsPagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface GetDocumentsParams {
  page?: number;
  limit?: number;
  search?: string;
}

export interface GetDocumentsResponse {
  success: boolean;
  data: {
    documents: Document[];
    pagination: DocumentsPagination;
  };
}
