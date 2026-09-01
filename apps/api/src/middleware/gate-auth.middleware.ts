import crypto from 'crypto';
import type { Request, Response, NextFunction } from 'express';
import { Types } from 'mongoose';

import { AppError } from '../errors/app-error.js';
import { Project } from '../modules/projects/project.model.js';

export interface GateAuthenticatedRequest extends Request {
  project?: InstanceType<typeof Project>;
  gateTokenId?: string;
}

export async function authenticateGateToken(
  req: Request,
  _res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const authHeader = req.headers.authorization;
    const gateHeader = req.headers['x-documan-gate-token'] as string | undefined;

    let rawToken = '';
    if (authHeader && authHeader.startsWith('Bearer ')) {
      rawToken = authHeader.substring(7).trim();
    } else if (gateHeader) {
      rawToken = gateHeader.trim();
    }

    if (!rawToken || !rawToken.startsWith('documan_gate_')) {
      throw new AppError(
        'Unauthorized: Missing or invalid CI gate token format',
        401,
        'INVALID_GATE_TOKEN',
      );
    }

    const { projectId } = req.params as { projectId: string };
    if (!Types.ObjectId.isValid(projectId)) {
      throw new AppError('Project not found', 404, 'PROJECT_NOT_FOUND');
    }

    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');

    const project = await Project.findOne({
      _id: projectId,
      isArchived: false,
    });

    if (!project) {
      throw new AppError('Project not found', 404, 'PROJECT_NOT_FOUND');
    }

    // Strict project isolation: Find token matching tokenHash inside project.gateTokens
    const matchingToken = (project.gateTokens || []).find(
      (t) => t.tokenHash === tokenHash,
    );

    if (!matchingToken) {
      const existsInOtherProject = await Project.exists({
        'gateTokens.tokenHash': tokenHash,
      });

      if (existsInOtherProject) {
        throw new AppError(
          'Forbidden: Gate token does not belong to the requested project',
          403,
          'FORBIDDEN',
        );
      } else {
        throw new AppError(
          'Unauthorized: Invalid or unknown CI gate token',
          401,
          'INVALID_GATE_TOKEN',
        );
      }
    }

    if (matchingToken.revokedAt) {
      throw new AppError('Unauthorized: CI gate token has been revoked', 401, 'GATE_TOKEN_REVOKED');
    }

    if (matchingToken.expiresAt && matchingToken.expiresAt.getTime() < Date.now()) {
      throw new AppError('Unauthorized: CI gate token has expired', 401, 'GATE_TOKEN_EXPIRED');
    }

    // Update lastUsedAt asynchronously
    matchingToken.lastUsedAt = new Date();
    void project.save().catch(() => {
      // Ignore background save errors
    });

    (req as GateAuthenticatedRequest).project = project;
    (req as GateAuthenticatedRequest).gateTokenId = matchingToken._id.toString();

    next();
  } catch (error) {
    next(error);
  }
}
