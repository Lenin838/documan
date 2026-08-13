import type { Request, Response } from 'express';

import { sendSuccess } from '../../utils/api-response.js';
import { createUser } from './user.service.js';

export async function createUserController(
  req: Request,
  res: Response,
) {
  const user = await createUser(req.body);

  return sendSuccess(res, user, 201);
}