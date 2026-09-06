import type { Request, Response, NextFunction } from 'express';
import { calculateTraceabilityAudit } from './system-traceability-audit.service.js';

interface RequestWithUser extends Request {
  user?: {
    userId: string;
    role: 'user' | 'admin';
  };
}

export async function getTraceabilityAuditHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const user = (req as RequestWithUser).user!;
    const userId = user.userId;
    const role = user.role;
    const { documentId } = req.params as { documentId: string };

    let versionNumber: number | undefined = undefined;
    if (req.query.versionNumber) {
      const parsed = parseInt(String(req.query.versionNumber), 10);
      if (!isNaN(parsed) && parsed > 0) {
        versionNumber = parsed;
      }
    }

    const auditResult = await calculateTraceabilityAudit(
      userId,
      role,
      documentId,
      versionNumber,
    );

    res.status(200).json({
      success: true,
      data: auditResult,
    });
  } catch (error) {
    next(error);
  }
}
