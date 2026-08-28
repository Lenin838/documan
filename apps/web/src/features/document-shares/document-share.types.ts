export type SharePermission = 'READ' | 'EDIT';

export interface DocumentShare {
  id: string;
  documentId: string;
  sharedWithUser: {
    id: string;
    name: string;
    email: string;
  };
  permission: SharePermission;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateShareParams {
  email: string;
  permission: SharePermission;
}

export interface UpdateShareParams {
  permission: SharePermission;
}

export interface GetSharesResponse {
  success: boolean;
  data: {
    shares: DocumentShare[];
  };
}

export interface ShareResponse {
  success: boolean;
  data: DocumentShare;
}

export interface RevokeShareResponse {
  success: boolean;
  data: {
    message: string;
  };
}
