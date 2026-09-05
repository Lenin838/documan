import { Router } from 'express';

import {
  createProjectHandler,
  getProjectsHandler,
  getProjectByIdHandler,
  updateProjectHandler,
  archiveProjectHandler,
  getProjectDocumentsHandler,
  assignDocumentToProjectHandler,
  removeDocumentFromProjectHandler,
  getProjectKnowledgeRiskHandler,
} from './project.controller.js';
import {
  createProjectSchema,
  updateProjectSchema,
  projectParamsSchema,
  assignProjectDocumentSchema,
  projectDocumentParamsSchema,
} from './project.schema.js';
import {
  createProjectTopologyLinkController,
  getProjectTopologyLinksController,
  updateProjectTopologyLinkController,
  deleteProjectTopologyLinkController,
  getProjectArchitectureGraphController,
} from './project-topology.controller.js';
import {
  createProjectTopologyLinkSchema,
  updateProjectTopologyLinkSchema,
  projectTopologyParamsSchema,
  projectTopologyIdParamsSchema,
} from './project-topology.schema.js';
import { authenticate } from '../../middleware/auth.middleware.js';
import { validateBody, validateParams } from '../../middleware/validate.middleware.js';

const projectRouter = Router();

projectRouter.use(authenticate);

projectRouter
  .route('/')
  .post(validateBody(createProjectSchema), createProjectHandler)
  .get(getProjectsHandler);

projectRouter
  .route('/:projectId/topology')
  .get(validateParams(projectTopologyParamsSchema), getProjectTopologyLinksController)
  .post(
    validateParams(projectTopologyParamsSchema),
    validateBody(createProjectTopologyLinkSchema),
    createProjectTopologyLinkController,
  );

projectRouter
  .route('/:projectId/topology/:linkId')
  .patch(
    validateParams(projectTopologyIdParamsSchema),
    validateBody(updateProjectTopologyLinkSchema),
    updateProjectTopologyLinkController,
  )
  .delete(
    validateParams(projectTopologyIdParamsSchema),
    deleteProjectTopologyLinkController,
  );

projectRouter
  .route('/:projectId/architecture-graph')
  .get(validateParams(projectTopologyParamsSchema), getProjectArchitectureGraphController);

projectRouter
  .route('/:id/knowledge-risk')
  .get(validateParams(projectParamsSchema), getProjectKnowledgeRiskHandler);

projectRouter
  .route('/:id')
  .get(validateParams(projectParamsSchema), getProjectByIdHandler)
  .patch(
    validateParams(projectParamsSchema),
    validateBody(updateProjectSchema),
    updateProjectHandler,
  )
  .delete(validateParams(projectParamsSchema), archiveProjectHandler);

projectRouter
  .route('/:id/documents')
  .get(validateParams(projectParamsSchema), getProjectDocumentsHandler)
  .post(
    validateParams(projectParamsSchema),
    validateBody(assignProjectDocumentSchema),
    assignDocumentToProjectHandler,
  );

projectRouter
  .route('/:id/documents/:documentId')
  .delete(
    validateParams(projectDocumentParamsSchema),
    removeDocumentFromProjectHandler,
  );

export { projectRouter };
