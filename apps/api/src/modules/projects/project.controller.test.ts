/* eslint-disable @typescript-eslint/no-explicit-any */
import type { Request, Response } from 'express';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  createProjectHandler,
  getProjectsHandler,
  getProjectByIdHandler,
  updateProjectHandler,
  archiveProjectHandler,
  getProjectDocumentsHandler,
  assignDocumentToProjectHandler,
  removeDocumentFromProjectHandler,
} from './project.controller.js';
import * as projectService from './project.service.js';

vi.mock('./project.service.js', () => ({
  createProject: vi.fn(),
  getProjects: vi.fn(),
  getProjectById: vi.fn(),
  updateProject: vi.fn(),
  archiveProject: vi.fn(),
  getProjectDocuments: vi.fn(),
  assignDocumentToProject: vi.fn(),
  removeDocumentFromProject: vi.fn(),
}));

describe('Project Controller', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let responseJson: any;
  let responseStatus: number;

  beforeEach(() => {
    vi.clearAllMocks();
    responseJson = null;
    responseStatus = 200;

    mockResponse = {
      status: vi.fn().mockImplementation((status: number) => {
        responseStatus = status;
        return mockResponse;
      }),
      json: vi.fn().mockImplementation((data: any) => {
        responseJson = data;
        return mockResponse;
      }),
    };

    mockRequest = {
      user: {
        userId: '507f1f77bcf86cd799439011',
        role: 'user',
      },
    };
  });

  it('createProjectHandler returns 201 Created', async () => {
    mockRequest.body = { name: 'New Project' };
    const mockCreated = { id: 'proj-1', name: 'New Project' };
    vi.mocked(projectService.createProject).mockResolvedValue(mockCreated as any);

    await createProjectHandler(mockRequest as any, mockResponse as any);

    expect(responseStatus).toBe(201);
    expect(responseJson.success).toBe(true);
    expect(responseJson.data.project).toEqual(mockCreated);
  });

  it('getProjectsHandler returns 200 OK', async () => {
    const mockList = [{ id: 'proj-1', name: 'Proj 1' }];
    vi.mocked(projectService.getProjects).mockResolvedValue(mockList as any);

    await getProjectsHandler(mockRequest as any, mockResponse as any);

    expect(responseStatus).toBe(200);
    expect(responseJson.data.projects).toEqual(mockList);
  });

  it('getProjectByIdHandler returns 200 OK', async () => {
    mockRequest.params = { id: 'proj-1' };
    const mockProject = { id: 'proj-1', name: 'Proj 1', isOwner: true };
    vi.mocked(projectService.getProjectById).mockResolvedValue(mockProject as any);

    await getProjectByIdHandler(mockRequest as any, mockResponse as any);

    expect(responseStatus).toBe(200);
    expect(responseJson.data.project).toEqual(mockProject);
  });

  it('updateProjectHandler returns 200 OK', async () => {
    mockRequest.params = { id: 'proj-1' };
    mockRequest.body = { name: 'Updated' };
    const mockUpdated = { id: 'proj-1', name: 'Updated' };
    vi.mocked(projectService.updateProject).mockResolvedValue(mockUpdated as any);

    await updateProjectHandler(mockRequest as any, mockResponse as any);

    expect(responseStatus).toBe(200);
    expect(responseJson.data.project).toEqual(mockUpdated);
  });

  it('archiveProjectHandler returns 200 OK', async () => {
    mockRequest.params = { id: 'proj-1' };
    vi.mocked(projectService.archiveProject).mockResolvedValue({
      message: 'Project archived successfully',
    });

    await archiveProjectHandler(mockRequest as any, mockResponse as any);

    expect(responseStatus).toBe(200);
    expect(responseJson.data.message).toBe('Project archived successfully');
  });

  it('getProjectDocumentsHandler returns 200 OK', async () => {
    mockRequest.params = { id: 'proj-1' };
    const mockDocs = [{ id: 'doc-1', title: 'Doc 1' }];
    vi.mocked(projectService.getProjectDocuments).mockResolvedValue(mockDocs as any);

    await getProjectDocumentsHandler(mockRequest as any, mockResponse as any);

    expect(responseStatus).toBe(200);
    expect(responseJson.data.documents).toEqual(mockDocs);
  });

  it('assignDocumentToProjectHandler returns 200 OK', async () => {
    mockRequest.params = { id: 'proj-1' };
    mockRequest.body = { documentId: 'doc-1' };
    vi.mocked(projectService.assignDocumentToProject).mockResolvedValue({
      message: 'Document assigned to project successfully',
      documentId: 'doc-1',
      projectId: 'proj-1',
    });

    await assignDocumentToProjectHandler(mockRequest as any, mockResponse as any);

    expect(responseStatus).toBe(200);
    expect(responseJson.data.projectId).toBe('proj-1');
  });

  it('removeDocumentFromProjectHandler returns 200 OK', async () => {
    mockRequest.params = { id: 'proj-1', documentId: 'doc-1' };
    vi.mocked(projectService.removeDocumentFromProject).mockResolvedValue({
      message: 'Document removed from project successfully',
      documentId: 'doc-1',
      projectId: 'proj-1',
    });

    await removeDocumentFromProjectHandler(mockRequest as any, mockResponse as any);

    expect(responseStatus).toBe(200);
    expect(responseJson.data.projectId).toBe('proj-1');
  });
});
