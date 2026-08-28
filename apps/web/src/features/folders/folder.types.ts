export interface Folder {
  id: string;
  name: string;
  ownerId: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateFolderParams {
  name: string;
}

export interface UpdateFolderParams {
  name: string;
}

export interface GetFoldersResponse {
  success: boolean;
  data: {
    folders: Folder[];
  };
}

export interface GetFolderResponse {
  success: boolean;
  data: Folder;
}

export interface DeleteFolderResponse {
  success: boolean;
  data: {
    message: string;
  };
}
