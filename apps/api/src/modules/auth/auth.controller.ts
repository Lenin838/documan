import type { RequestHandler } from 'express';

import { sendSuccess } from '../../utils/api-response.js';

import { loginUser } from './auth.service.js';

export const loginController: RequestHandler = async (req, res, next) => {
  try {
    const result = await loginUser(req.body);

    return sendSuccess(res, result);
  } catch (error) {
    return next(error);
  }
};