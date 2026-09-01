export type HttpMethod =
  | 'GET'
  | 'POST'
  | 'PUT'
  | 'PATCH'
  | 'DELETE'
  | 'HEAD'
  | 'OPTIONS';

export interface ProjectApiSpecInfo {
  id: string;
  title: string;
  version: string;
  format: 'JSON' | 'YAML';
  openApiVersion: string;
  createdAt: string;
}

export interface ProjectApiEndpointInfo {
  id: string;
  method: HttpMethod;
  path: string;
  summary: string | null;
  operationId: string | null;
  tags: string[];
  isDeprecated: boolean;
}

export interface ProjectApiSpecResponse {
  spec: ProjectApiSpecInfo | null;
  endpoints: ProjectApiEndpointInfo[];
}

export interface DocumentEndpointLinkInfo {
  id: string;
  endpointId: string;
  method: HttpMethod;
  path: string;
  summary: string | null;
  operationId: string | null;
  isDeprecated: boolean;
  status: 'LINKED' | 'ORPHANED';
  orphanedReason: string | null;
}
