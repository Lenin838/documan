/* eslint-disable @typescript-eslint/no-explicit-any */
import type { Request, Response, NextFunction } from 'express';
import { AppError } from '../../errors/app-error.js';
import {
  verifyChangePackageFulfillment,
  createAttestation,
  listHistoricalAttestations,
  getAttestationByVersion,
  getLatestAttestation,
  deriveBaselineHandoffPayload,
} from './change-package-attestation.service.js';

export async function handleVerifyPackageFulfillment(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = (req as any).user?.userId || (req as any).user?.id || (req as any).user?._id;
    const role = (req as any).user?.role || 'user';
    const packageId = req.params.id as string;

    if (!userId) {
      throw new AppError('Unauthorized', 401, 'UNAUTHORIZED');
    }

    const result = await verifyChangePackageFulfillment(userId, role, packageId);
    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

export async function handleCreatePackageAttestation(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = (req as any).user?.userId || (req as any).user?.id || (req as any).user?._id;
    const role = (req as any).user?.role || 'user';
    const packageId = req.params.id as string;
    const { acceptedScopeVariance, scopeReviewComment } = req.body || {};

    if (!userId) {
      throw new AppError('Unauthorized', 401, 'UNAUTHORIZED');
    }

    const attestation = await createAttestation(userId, role, packageId, {
      acceptedScopeVariance: Boolean(acceptedScopeVariance),
      scopeReviewComment,
    });

    res.status(201).json({
      success: true,
      data: attestation,
    });
  } catch (error) {
    next(error);
  }
}

export async function handleListPackageAttestations(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = (req as any).user?.userId || (req as any).user?.id || (req as any).user?._id;
    const role = (req as any).user?.role || 'user';
    const packageId = req.params.id as string;

    if (!userId) {
      throw new AppError('Unauthorized', 401, 'UNAUTHORIZED');
    }

    const attestations = await listHistoricalAttestations(userId, role, packageId);
    res.json({
      success: true,
      data: attestations,
    });
  } catch (error) {
    next(error);
  }
}

export async function handleGetPackageAttestationByVersion(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = (req as any).user?.userId || (req as any).user?.id || (req as any).user?._id;
    const role = (req as any).user?.role || 'user';
    const packageId = req.params.id as string;
    const versionNum = parseInt(req.params.attestationVersion as string, 10);

    if (!userId) {
      throw new AppError('Unauthorized', 401, 'UNAUTHORIZED');
    }

    if (isNaN(versionNum)) {
      throw new AppError('Invalid attestation version number', 400, 'INVALID_VERSION_NUMBER');
    }

    const attestation = await getAttestationByVersion(userId, role, packageId, versionNum);
    res.json({
      success: true,
      data: attestation,
    });
  } catch (error) {
    next(error);
  }
}

export async function handleGetLatestPackageAttestation(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = (req as any).user?.userId || (req as any).user?.id || (req as any).user?._id;
    const role = (req as any).user?.role || 'user';
    const packageId = req.params.id as string;

    if (!userId) {
      throw new AppError('Unauthorized', 401, 'UNAUTHORIZED');
    }

    const result = await getLatestAttestation(userId, role, packageId);
    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

export async function handleDeriveBaselineHandoff(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = (req as any).user?.userId || (req as any).user?.id || (req as any).user?._id;
    const role = (req as any).user?.role || 'user';
    const packageId = req.params.id as string;

    if (!userId) {
      throw new AppError('Unauthorized', 401, 'UNAUTHORIZED');
    }

    const handoff = await deriveBaselineHandoffPayload(userId, role, packageId);
    res.json({
      success: true,
      data: handoff,
    });
  } catch (error) {
    next(error);
  }
}
