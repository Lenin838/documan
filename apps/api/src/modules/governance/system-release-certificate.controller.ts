import { Request, Response, NextFunction } from 'express';
import {
  evaluatePreCertification,
  issueReleaseCertificate,
  listReleaseCertificates,
  getReleaseCertificateDetails,
  verifyCertificateIntegrity,
  revokeReleaseCertificate,
} from './system-release-certificate.service.js';
import { generateReleaseCertificateExportBundle } from './system-release-export.service.js';

export async function evaluatePreCertificationHandler(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.user?.userId || (req as unknown as { user: { id: string } }).user.id;
    const projectId = req.params.projectId as string;
    const { releaseTag } = req.body || {};
    const result = await evaluatePreCertification(userId, projectId, releaseTag || 'pre-check');
    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

export async function issueReleaseCertificateHandler(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.user?.userId || (req as unknown as { user: { id: string } }).user.id;
    const userRole = req.user?.role || (req as unknown as { user: { role: string } }).user.role;
    const projectId = req.params.projectId as string;
    const result = await issueReleaseCertificate(userId, userRole, projectId, req.body);
    res.status(201).json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

export async function listReleaseCertificatesHandler(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.user?.userId || (req as unknown as { user: { id: string } }).user.id;
    const projectId = req.params.projectId as string;
    const result = await listReleaseCertificates(userId, projectId);
    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

export async function getReleaseCertificateDetailsHandler(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.user?.userId || (req as unknown as { user: { id: string } }).user.id;
    const projectId = req.params.projectId as string;
    const certificateId = req.params.certificateId as string;
    const result = await getReleaseCertificateDetails(userId, projectId, certificateId);
    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

export async function verifyCertificateIntegrityHandler(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.user?.userId || (req as unknown as { user: { id: string } }).user.id;
    const projectId = req.params.projectId as string;
    const certificateId = req.params.certificateId as string;
    const result = await verifyCertificateIntegrity(userId, projectId, certificateId);
    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

export async function revokeReleaseCertificateHandler(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.user?.userId || (req as unknown as { user: { id: string } }).user.id;
    const userRole = req.user?.role || (req as unknown as { user: { role: string } }).user.role;
    const projectId = req.params.projectId as string;
    const certificateId = req.params.certificateId as string;
    const result = await revokeReleaseCertificate(userId, userRole, projectId, certificateId, req.body);
    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

export async function exportReleaseCertificateJsonHandler(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.user?.userId || (req as unknown as { user: { id: string } }).user?.id;
    const userRole = req.user?.role || (req as unknown as { user: { role: string } }).user?.role;
    const projectId = req.params.projectId as string;
    const certificateId = req.params.certificateId as string;

    const bundle = await generateReleaseCertificateExportBundle(
      userId,
      projectId,
      certificateId,
      userRole
    );

    const sanitizeFilename = (str: string) => str.replace(/[^a-zA-Z0-9._-]/g, '_');
    const safeTag = sanitizeFilename(bundle.releaseCertificate.releaseTag || 'certificate');
    const filename = `release-certificate-${safeTag}-attestation-bundle.json`;

    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.status(200).send(JSON.stringify(bundle, null, 2));
  } catch (error) {
    next(error);
  }
}
