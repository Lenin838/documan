export interface Project {
  id: string;
  name: string;
  description?: string;
  ownerId: string;
  isArchived: boolean;
  createdAt: string;
  updatedAt: string;
  isOwner?: boolean;
}

export interface CreateProjectInput {
  name: string;
  description?: string;
}

export interface UpdateProjectInput {
  name?: string;
  description?: string;
}
