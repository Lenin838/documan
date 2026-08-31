import type { Request, Response } from 'express';

import {
  createProject,
  getProjects,
  getProjectById,
  updateProject,
  archiveProject,
  getProjectDocuments,
  assignDocumentToProject,
  removeDocumentFromProject,
} from './project.service.js';
import type {
  CreateProjectInput,
  UpdateProjectInput,
  ProjectParamsInput,
  AssignProjectDocumentInput,
  ProjectDocumentParamsInput,
} from './project.schema.js';
import { sendSuccess } from '../../utils/api-response.js';

export async function createProjectHandler(
  req: Request<unknown, unknown, CreateProjectInput>,
  res: Response,
) {
  const project = await createProject(req.user!.userId, req.user!.role, req.body);
  sendSuccess(res, { project }, 201);
}

export async function getProjectsHandler(req: Request, res: Response) {
  const projects = await getProjects(req.user!.userId, req.user!.role);
  sendSuccess(res, { projects }, 200);
}

export async function getProjectByIdHandler(
  req: Request<ProjectParamsInput>,
  res: Response,
) {
  const project = await getProjectById(
    req.user!.userId,
    req.user!.role,
    req.params.id,
  );
  sendSuccess(res, { project }, 200);
}

export async function updateProjectHandler(
  req: Request<ProjectParamsInput, unknown, UpdateProjectInput>,
  res: Response,
) {
  const project = await updateProject(
    req.user!.userId,
    req.user!.role,
    req.params.id,
    req.body,
  );
  sendSuccess(res, { project }, 200);
}

export async function archiveProjectHandler(
  req: Request<ProjectParamsInput>,
  res: Response,
) {
  const result = await archiveProject(
    req.user!.userId,
    req.user!.role,
    req.params.id,
  );
  sendSuccess(res, result, 200);
}

export async function getProjectDocumentsHandler(
  req: Request<ProjectParamsInput>,
  res: Response,
) {
  const documents = await getProjectDocuments(
    req.user!.userId,
    req.user!.role,
    req.params.id,
  );
  sendSuccess(res, { documents }, 200);
}

export async function assignDocumentToProjectHandler(
  req: Request<ProjectParamsInput, unknown, AssignProjectDocumentInput>,
  res: Response,
) {
  const result = await assignDocumentToProject(
    req.user!.userId,
    req.user!.role,
    req.params.id,
    req.body.documentId,
  );
  sendSuccess(res, result, 200);
}

export async function removeDocumentFromProjectHandler(
  req: Request<ProjectDocumentParamsInput>,
  res: Response,
) {
  const result = await removeDocumentFromProject(
    req.user!.userId,
    req.user!.role,
    req.params.id,
    req.params.documentId,
  );
  sendSuccess(res, result, 200);
}
