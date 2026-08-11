import type { NextFunction, Request, Response } from 'express';
import { nanoid } from 'nanoid';

export const requestIdMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction,
): void => {
  const requestId = req.header('x-request-id') ?? `req_${nanoid(16)}`;

  req.requestId = requestId;

  res.setHeader('x-request-id', requestId);

  next();
};