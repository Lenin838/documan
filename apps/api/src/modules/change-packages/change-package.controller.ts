/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */
import type { Request, Response } from 'express';
import {
  createChangePackageSchema,
  addProposalToPackageSchema,
  updatePackageStatusSchema,
} from './change-package.schema.js';
import {
  createChangePackage,
  listProjectChangePackages,
  getChangePackageDetails,
  addProposalToPackage,
  removeProposalFromPackage,
  simulateChangePackage,
  updatePackageStatus,
  acceptChangePackage,
} from './change-package.service.js';

export async function handleCreateChangePackage(req: Request, res: Response): Promise<void> {
  const userId = (req as any).user?.id || (req as any).user?._id;
  const role = (req as any).user?.role || 'user';
  const projectId = req.params.projectId as string;

  const parsed = createChangePackageSchema.parse(req.body);
  const result = await createChangePackage(userId, role, projectId, parsed);

  res.status(201).json({
    success: true,
    data: result,
  });
}

export async function handleListProjectChangePackages(req: Request, res: Response): Promise<void> {
  const userId = (req as any).user?.id || (req as any).user?._id;
  const role = (req as any).user?.role || 'user';
  const projectId = req.params.projectId as string;

  const result = await listProjectChangePackages(userId, role, projectId);

  res.status(200).json({
    success: true,
    data: result,
  });
}

export async function handleGetChangePackageDetails(req: Request, res: Response): Promise<void> {
  const userId = (req as any).user?.id || (req as any).user?._id;
  const role = (req as any).user?.role || 'user';
  const id = req.params.id as string;

  const result = await getChangePackageDetails(userId, role, id);

  res.status(200).json({
    success: true,
    data: result.package,
    staleness: result.staleness,
  });
}

export async function handleAddProposalToPackage(req: Request, res: Response): Promise<void> {
  const userId = (req as any).user?.id || (req as any).user?._id;
  const role = (req as any).user?.role || 'user';
  const id = req.params.id as string;

  const parsed = addProposalToPackageSchema.parse(req.body);
  const result = await addProposalToPackage(userId, role, id, parsed.proposalId);

  res.status(200).json({
    success: true,
    data: result,
  });
}

export async function handleRemoveProposalFromPackage(req: Request, res: Response): Promise<void> {
  const userId = (req as any).user?.id || (req as any).user?._id;
  const role = (req as any).user?.role || 'user';
  const id = req.params.id as string;
  const proposalId = req.params.proposalId as string;

  const result = await removeProposalFromPackage(userId, role, id, proposalId);

  res.status(200).json({
    success: true,
    data: result,
  });
}

export async function handleSimulateChangePackage(req: Request, res: Response): Promise<void> {
  const userId = (req as any).user?.id || (req as any).user?._id;
  const role = (req as any).user?.role || 'user';
  const id = req.params.id as string;

  const result = await simulateChangePackage(userId, role, id);

  res.status(200).json({
    success: true,
    data: result.simulation,
    package: result.package,
  });
}

export async function handleUpdatePackageStatus(req: Request, res: Response): Promise<void> {
  const userId = (req as any).user?.id || (req as any).user?._id;
  const role = (req as any).user?.role || 'user';
  const id = req.params.id as string;

  const parsed = updatePackageStatusSchema.parse(req.body);
  const result = await updatePackageStatus(userId, role, id, parsed);

  res.status(200).json({
    success: true,
    data: result,
  });
}

export async function handleAcceptChangePackage(req: Request, res: Response): Promise<void> {
  const userId = (req as any).user?.id || (req as any).user?._id;
  const role = (req as any).user?.role || 'user';
  const id = req.params.id as string;

  const result = await acceptChangePackage(userId, role, id);

  res.status(200).json({
    success: true,
    data: result.package,
    handoffPayload: result.handoffPayload,
  });
}
