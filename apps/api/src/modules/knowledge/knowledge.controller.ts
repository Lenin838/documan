import type { RequestHandler } from 'express';
import { AppError } from '../../errors/app-error.js';
import { sendSuccess } from '../../utils/api-response.js';
import { knowledgeSearchQuerySchema } from './knowledge.schema.js';
import { searchTechnicalKnowledge } from './knowledge.service.js';

export const searchKnowledgeController: RequestHandler = async (req, res, next) => {
  try {
    if (!req.user) {
      return next(new AppError('Authentication required', 401, 'UNAUTHORIZED'));
    }

    const parseResult = knowledgeSearchQuerySchema.safeParse(req.query);
    if (!parseResult.success) {
      const issue = parseResult.error.issues[0];
      return next(
        new AppError(
          issue ? `${issue.path.join('.')}: ${issue.message}` : 'Invalid query parameters',
          400,
          'INVALID_QUERY_PARAMS',
        ),
      );
    }

    const input = parseResult.data;
    const result = await searchTechnicalKnowledge(req.user.userId, req.user.role, input);

    return sendSuccess(res, result);
  } catch (err) {
    return next(err);
  }
};
