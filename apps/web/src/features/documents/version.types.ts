export interface DocumentVersion {
  _id: string;
  documentId: string;
  projectId: string;
  versionNumber: number;
  fileName: string;
  filePath: string;
  fileType: string;
  fileSize: number;
  changeSummary?: string | null;
  createdById: {
    _id: string;
    name: string;
    email: string;
  } | string;
  createdAt: string;
}

export interface VersionCompareResult {
  diffSupported: boolean;
  reason?: string;
  sourceVersionNumber: number;
  targetVersionNumber: number;
  sizeDeltaBytes: number;
  summary: {
    additions: number;
    deletions: number;
  };
  textDiff?: string;
}

export interface DocumentVersionsResponse {
  versions: DocumentVersion[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}
