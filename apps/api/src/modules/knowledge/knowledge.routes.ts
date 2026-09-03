import { Router } from 'express';
import { authenticate } from '../../middleware/auth.middleware.js';
import { searchKnowledgeController } from './knowledge.controller.js';

const knowledgeRouter = Router();

knowledgeRouter.use(authenticate);

knowledgeRouter.get('/search', searchKnowledgeController);

export { knowledgeRouter };
