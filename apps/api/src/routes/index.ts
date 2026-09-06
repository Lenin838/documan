import { Router } from 'express';

import { healthRouter } from '../modules/health/health.routes.js';
import { userRouter } from '../modules/users/user.routes.js';
import { authRouter } from '../modules/auth/auth.routes.js';
import { documentRouter } from '../modules/documents/document.routes.js';
import { folderRouter } from '../modules/folders/folder.routes.js';
import { projectRouter } from '../modules/projects/project.routes.js';
import { reviewRouter } from '../modules/documents/document-review.routes.js';
import { notificationRouter } from '../modules/notifications/notification.routes.js';
import webhookRouter from '../modules/webhooks/webhook.routes.js';
import { projectGovernanceRouter } from '../modules/governance/governance.routes.js';
import { baselineRouter } from '../modules/governance/baseline.routes.js';
import { systemBaselineAlignmentRouter } from '../modules/governance/system-baseline-alignment.routes.js';
import { systemTopologyGovernanceGateRouter } from '../modules/governance/system-topology-governance-gate.routes.js';
import { systemTopologySimulationRouter } from '../modules/governance/system-topology-simulation.routes.js';
import { systemGovernanceWaiverRouter } from '../modules/governance/system-governance-waiver.routes.js';
import { projectApiSpecRouter } from '../modules/api-specs/api-spec.routes.js';
import { knowledgeRouter } from '../modules/knowledge/knowledge.routes.js';
import { evidenceRouter } from '../modules/knowledge/evidence.routes.js';
import {
  verificationPlanRouter,
  verificationTaskRouter,
  documentVerificationPlanRouter,
} from '../modules/governance/verification-plan.routes.js';

import workRequestRouter from '../modules/governance/work-request.routes.js';
import { changeProposalRouter } from '../modules/change-proposals/change-proposal.routes.js';
import { changePackageRouter } from '../modules/change-packages/change-package.routes.js';

import systemGovernanceLineageRouter from '../modules/governance/system-governance-lineage.routes.js';
import { systemContractEvolutionRouter } from '../modules/governance/system-contract-evolution.routes.js';
import systemTraceabilityAuditRouter from '../modules/governance/system-traceability-audit.routes.js';
import { systemContractMatrixRouter } from '../modules/governance/system-contract-matrix.routes.js';

const apiRouter = Router();

apiRouter.use('/health', healthRouter);
apiRouter.use('/users', userRouter);
apiRouter.use('/auth', authRouter);
apiRouter.use('/documents', documentRouter);
apiRouter.use('/', systemTraceabilityAuditRouter);
apiRouter.use('/', systemContractMatrixRouter);
apiRouter.use('/documents/:documentId/verification-plans', documentVerificationPlanRouter);
apiRouter.use('/folders', folderRouter);
apiRouter.use('/projects', projectRouter);
apiRouter.use('/reviews', reviewRouter);
apiRouter.use('/notifications', notificationRouter);
apiRouter.use('/knowledge', knowledgeRouter);
apiRouter.use('/evidence', evidenceRouter);
apiRouter.use('/verification-plans', verificationPlanRouter);
apiRouter.use('/verification-tasks', verificationTaskRouter);
apiRouter.use('/projects/:projectId/webhooks', webhookRouter);
apiRouter.use('/projects/:projectId/governance', projectGovernanceRouter);
apiRouter.use('/projects/:projectId/baselines', baselineRouter);
apiRouter.use('/projects/:projectId/system-baseline-alignment', systemBaselineAlignmentRouter);
apiRouter.use('/projects/:projectId/system-governance-gate', systemTopologyGovernanceGateRouter);
apiRouter.use('/projects/:projectId/system-governance-gate', systemTopologySimulationRouter);
apiRouter.use('/projects/:projectId/system-topology-gate', systemTopologySimulationRouter);
apiRouter.use('/projects/:projectId/system-governance-waivers', systemGovernanceWaiverRouter);
apiRouter.use('/projects/:projectId/api-specs', projectApiSpecRouter);
apiRouter.use('/governance', systemGovernanceLineageRouter);
apiRouter.use('/governance/system-governance', systemContractEvolutionRouter);
apiRouter.use('/', workRequestRouter);
apiRouter.use('/', changeProposalRouter);
apiRouter.use('/', changePackageRouter);

export { apiRouter };