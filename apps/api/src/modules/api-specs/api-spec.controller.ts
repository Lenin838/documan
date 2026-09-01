import type { Request, Response } from 'express';

import { sendSuccess } from '../../utils/api-response.js';
import { importApiSpecSchema, linkEndpointSchema } from './api-spec.schema.js';
import {
  importProjectApiSpec,
  getProjectApiSpec,
  deleteProjectApiSpec,
  linkDocumentApiEndpoint,
  unlinkDocumentApiEndpoint,
  getDocumentApiEndpoints,
} from './api-spec.service.js';

export async function importProjectApiSpecHandler(req: Request, res: Response) {
  const user = req.user!;
  const { projectId } = req.params as { projectId: string };
  const input = importApiSpecSchema.parse(req.body);

  const data = await importProjectApiSpec(user.userId, user.role, projectId, input.rawContent);
  sendSuccess(res, data, 201);
}

export async function getProjectApiSpecHandler(req: Request, res: Response) {
  const user = req.user!;
  const { projectId } = req.params as { projectId: string };

  const data = await getProjectApiSpec(user.userId, user.role, projectId);
  sendSuccess(res, data, 200);
}

export async function deleteProjectApiSpecHandler(req: Request, res: Response) {
  const user = req.user!;
  const { projectId, specId } = req.params as { projectId: string; specId: string };

  const data = await deleteProjectApiSpec(user.userId, user.role, projectId, specId);
  sendSuccess(res, data, 200);
}

export async function linkDocumentApiEndpointHandler(req: Request, res: Response) {
  const user = req.user!;
  const { id: documentId } = req.params as { id: string };
  const input = linkEndpointSchema.parse(req.body);

  const data = await linkDocumentApiEndpoint(user.userId, user.role, documentId, input.endpointId);
  sendSuccess(res, data, 201);
}

export async function unlinkDocumentApiEndpointHandler(req: Request, res: Response) {
  const user = req.user!;
  const { id: documentId, endpointId } = req.params as { id: string; endpointId: string };

  const data = await unlinkDocumentApiEndpoint(user.userId, user.role, documentId, endpointId);
  sendSuccess(res, data, 200);
}

export async function getDocumentApiEndpointsHandler(req: Request, res: Response) {
  const user = req.user!;
  const { id: documentId } = req.params as { id: string };

  const data = await getDocumentApiEndpoints(user.userId, user.role, documentId);
  sendSuccess(res, data, 200);
}
