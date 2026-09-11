import { Request, Response, NextFunction } from 'express';
import { AppError } from '../../errors/app-error.js';
import { auditReleaseCertificateComplianceDrift } from './system-release-drift.service.js';

export async function auditComplianceDriftHandler(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.user?.userId || (req as unknown as { user: { id: string } }).user.id;
    const userRole = (req.user?.role || (req as unknown as { user: { role: string } }).user.role) as 'user' | 'admin';
    const { certificateId } = req.body || {};

    if (!certificateId || typeof certificateId !== 'string') {
      throw new AppError('certificateId is required', 400, 'BAD_REQUEST');
    }

    const result = await auditReleaseCertificateComplianceDrift(userId, certificateId, userRole);

    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
}
