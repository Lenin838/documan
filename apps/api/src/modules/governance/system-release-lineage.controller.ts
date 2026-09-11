import type { Request, Response, NextFunction } from 'express';
import {
  compareReleaseCertificates,
  getCertificateLineageGraph,
} from './system-release-lineage.service.js';

export async function compareReleaseCertificatesHandler(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId =
      req.user?.userId ||
      (req as unknown as { user?: { id?: string; _id?: { toString(): string } } }).user?.id ||
      '';
    const { sourceCertificateId, targetCertificateId } = req.body || {};

    const result = await compareReleaseCertificates(
      userId,
      sourceCertificateId,
      targetCertificateId
    );

    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (err) {
    next(err);
  }
}

export async function getCertificateLineageGraphHandler(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId =
      req.user?.userId ||
      (req as unknown as { user?: { id?: string; _id?: { toString(): string } } }).user?.id ||
      '';
    const projectId = req.params.projectId as string;
    const { headCertificateId, maxDepth } = req.query;

    const parsedMaxDepth = maxDepth ? parseInt(maxDepth as string, 10) : 20;

    const result = await getCertificateLineageGraph(
      userId,
      projectId as string,
      headCertificateId as string | undefined,
      parsedMaxDepth
    );

    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (err) {
    next(err);
  }
}
