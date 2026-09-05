/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */
import { Types } from 'mongoose';

import { AppError } from '../../errors/app-error.js';
import { Project } from '../projects/project.model.js';
import { Document } from '../documents/document.model.js';
import { createDocumentAudit } from '../documents/document-audit.service.js';
import { checkProjectAccess } from '../governance/work-request.service.js';
import { checkUserProjectReadAccess } from '../projects/project-topology.service.js';
import { DocumentChangeProposal, ProposalStatus } from '../change-proposals/change-proposal.model.js';
import { computeSimulationStateFingerprint } from '../change-proposals/change-proposal-fingerprint.js';
import { DocumentChangePackage, IDocumentChangePackage, PackageStatus } from './change-package.model.js';
import { computePackageStateFingerprint, PackageStalenessResult } from './change-package-fingerprint.js';
import { runChangePackageSimulation, PackageSimulationResultDTO } from './change-package-simulation.service.js';
import type { CreateChangePackageInput, UpdatePackageStatusInput } from './change-package.schema.js';

export async function createChangePackage(
  userId: string,
  role: 'user' | 'admin',
  projectId: string,
  data: CreateChangePackageInput,
): Promise<IDocumentChangePackage> {
  const project = await checkProjectAccess(userId, role, projectId);
  const projObjId = project._id;

  const count = await DocumentChangePackage.countDocuments({ projectId: projObjId });
  const pPrefix = project.name.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 5) || 'PROJ';
  const randSuffix = Math.floor(1000 + Math.random() * 9000);
  const pNo = `PKG-${pPrefix}-${count + 1}-${randSuffix}`;

  const proposalObjIds: Types.ObjectId[] = [];
  if (data.proposalIds && data.proposalIds.length > 0) {
    const validProps = await DocumentChangeProposal.find({
      _id: { $in: data.proposalIds.map((id) => new Types.ObjectId(id)) },
    });
    for (const p of validProps) {
      proposalObjIds.push(p._id);
    }
  }

  const pkg = await DocumentChangePackage.create({
    packageNumber: pNo,
    projectId: projObjId,
    title: data.title,
    ...(data.description ? { description: data.description } : {}),
    proposals: proposalObjIds,
    status: PackageStatus.DRAFT,
    createdBy: new Types.ObjectId(userId),
  } as any);

  // Audit
  if (proposalObjIds.length > 0) {
    const firstProp = await DocumentChangeProposal.findById(proposalObjIds[0]);
    if (firstProp) {
      try {
        await createDocumentAudit(
          firstProp.targetDocumentId.toString(),
          userId,
          'CHANGE_PACKAGE_CREATED' as any,
          { packageId: pkg._id.toString(), packageNumber: pNo, title: pkg.title },
        );
      } catch {
        // Safe audit fallback
      }
    }
  }

  return pkg;
}

export async function listProjectChangePackages(
  userId: string,
  role: 'user' | 'admin',
  projectId: string,
): Promise<IDocumentChangePackage[]> {
  const hasAccess = await checkUserProjectReadAccess(userId, role, projectId);
  if (!hasAccess) {
    throw new AppError('Unauthorized access to project change packages', 403, 'FORBIDDEN');
  }

  return DocumentChangePackage.find({ projectId: new Types.ObjectId(projectId) })
    .populate('proposals')
    .sort({ createdAt: -1 });
}

export async function getChangePackageDetails(
  userId: string,
  role: 'user' | 'admin',
  packageId: string,
): Promise<{
  package: IDocumentChangePackage;
  staleness: PackageStalenessResult;
}> {
  const pkgObjId = new Types.ObjectId(packageId);
  const pkg = await DocumentChangePackage.findById(pkgObjId).populate('proposals');

  if (!pkg) {
    throw new AppError('Change package not found', 404, 'PACKAGE_NOT_FOUND');
  }

  const hasAccess = await checkUserProjectReadAccess(userId, role, pkg.projectId.toString());
  if (!hasAccess) {
    throw new AppError('Unauthorized access to change package', 403, 'FORBIDDEN');
  }

  const staleness = await computePackageStateFingerprint(pkg._id);

  return {
    package: pkg,
    staleness: staleness.stalenessResult,
  };
}

export async function addProposalToPackage(
  userId: string,
  role: 'user' | 'admin',
  packageId: string,
  proposalId: string,
): Promise<IDocumentChangePackage> {
  const pkgObjId = new Types.ObjectId(packageId);
  const pkg = await DocumentChangePackage.findById(pkgObjId);

  if (!pkg) {
    throw new AppError('Change package not found', 404, 'PACKAGE_NOT_FOUND');
  }

  await checkProjectAccess(userId, role, pkg.projectId.toString());

  if (pkg.status !== PackageStatus.DRAFT) {
    throw new AppError('Proposals can only be added to DRAFT change packages', 400, 'INVALID_PACKAGE_STATUS');
  }

  const propObjId = new Types.ObjectId(proposalId);
  const prop = await DocumentChangeProposal.findById(propObjId);
  if (!prop) {
    throw new AppError('Proposal not found', 404, 'PROPOSAL_NOT_FOUND');
  }

  if (pkg.proposals.some((id) => id.toString() === proposalId)) {
    throw new AppError('Proposal already belongs to this change package', 409, 'DUPLICATE_PROPOSAL_MEMBERSHIP');
  }

  pkg.proposals.push(propObjId);
  pkg.packageStateFingerprint = ''; // Invalidate fingerprint on membership change
  await pkg.save();

  return pkg;
}

export async function removeProposalFromPackage(
  userId: string,
  role: 'user' | 'admin',
  packageId: string,
  proposalId: string,
): Promise<IDocumentChangePackage> {
  const pkgObjId = new Types.ObjectId(packageId);
  const pkg = await DocumentChangePackage.findById(pkgObjId);

  if (!pkg) {
    throw new AppError('Change package not found', 404, 'PACKAGE_NOT_FOUND');
  }

  await checkProjectAccess(userId, role, pkg.projectId.toString());

  if (pkg.status !== PackageStatus.DRAFT) {
    throw new AppError('Proposals can only be removed from DRAFT change packages', 400, 'INVALID_PACKAGE_STATUS');
  }

  pkg.proposals = pkg.proposals.filter((id) => id.toString() !== proposalId);
  pkg.packageStateFingerprint = ''; // Invalidate fingerprint
  await pkg.save();

  return pkg;
}

export async function simulateChangePackage(
  userId: string,
  role: 'user' | 'admin',
  packageId: string,
): Promise<{ package: IDocumentChangePackage; simulation: PackageSimulationResultDTO }> {
  const pkgObjId = new Types.ObjectId(packageId);
  const pkg = await DocumentChangePackage.findById(pkgObjId);

  if (!pkg) {
    throw new AppError('Change package not found', 404, 'PACKAGE_NOT_FOUND');
  }

  const hasAccess = await checkUserProjectReadAccess(userId, role, pkg.projectId.toString());
  if (!hasAccess) {
    throw new AppError('Unauthorized access to simulate change package', 403, 'FORBIDDEN');
  }

  const simulation = await runChangePackageSimulation(packageId, userId);

  // Refresh proposal fingerprints for all constituent proposals in package
  for (const propId of pkg.proposals) {
    const p = await DocumentChangeProposal.findById(propId);
    if (p) {
      const pFp = await computeSimulationStateFingerprint(p.targetDocumentId, p.projectId);
      p.simulationStateFingerprint = pFp;
      p.lastSimulatedAt = new Date();
      if (p.status === ProposalStatus.DRAFT) {
        p.status = ProposalStatus.SIMULATED;
      }
      await p.save();
    }
  }

  const { fingerprint } = await computePackageStateFingerprint(packageId);

  pkg.lastSimulatedAt = new Date();
  pkg.packageStateFingerprint = fingerprint;
  pkg.lastSimulationStatus = simulation.simulationStatus;
  pkg.simulationResultCache = simulation as any;
  if (pkg.status === PackageStatus.DRAFT) {
    pkg.status = PackageStatus.SIMULATED;
  }
  await pkg.save();

  return {
    package: pkg,
    simulation,
  };
}

export async function updatePackageStatus(
  userId: string,
  role: 'user' | 'admin',
  packageId: string,
  data: UpdatePackageStatusInput,
): Promise<IDocumentChangePackage> {
  const pkgObjId = new Types.ObjectId(packageId);
  const pkg = await DocumentChangePackage.findById(pkgObjId);

  if (!pkg) {
    throw new AppError('Change package not found', 404, 'PACKAGE_NOT_FOUND');
  }

  await checkProjectAccess(userId, role, pkg.projectId.toString());

  const newStatus = data.status as PackageStatus;

  if (newStatus === PackageStatus.UNDER_REVIEW) {
    if (pkg.status !== PackageStatus.SIMULATED && pkg.status !== PackageStatus.DRAFT) {
      throw new AppError('Package must be SIMULATED or DRAFT before submitting for review', 400, 'INVALID_STATUS_TRANSITION');
    }
  }

  pkg.status = newStatus;
  pkg.reviewedBy = new Types.ObjectId(userId);
  if (data.reviewComment) {
    pkg.reviewComment = data.reviewComment;
  }
  await pkg.save();

  // Audit
  if (pkg.proposals.length > 0) {
    const firstProp = await DocumentChangeProposal.findById(pkg.proposals[0]);
    if (firstProp) {
      try {
        const auditAction =
          newStatus === PackageStatus.UNDER_REVIEW
            ? 'CHANGE_PACKAGE_SUBMITTED'
            : newStatus === PackageStatus.REJECTED
            ? 'CHANGE_PACKAGE_REJECTED'
            : 'CHANGE_PACKAGE_DISCARDED';
        await createDocumentAudit(
          firstProp.targetDocumentId.toString(),
          userId,
          auditAction as any,
          { packageId: pkg._id.toString(), newStatus, reviewComment: data.reviewComment },
        );
      } catch {
        // Safe audit fallback
      }
    }
  }

  return pkg;
}

export async function acceptChangePackage(
  userId: string,
  role: 'user' | 'admin',
  packageId: string,
): Promise<{
  package: IDocumentChangePackage;
  handoffPayload: {
    message: string;
    nextSteps: string;
    acceptedProposals: Array<{
      proposalId: string;
      targetDocumentId: string;
      proposalType: string;
    }>;
  };
}> {
  const pkgObjId = new Types.ObjectId(packageId);
  const pkg = await DocumentChangePackage.findById(pkgObjId).populate('proposals');

  if (!pkg) {
    throw new AppError('Change package not found', 404, 'PACKAGE_NOT_FOUND');
  }

  await checkProjectAccess(userId, role, pkg.projectId.toString());

  if (pkg.status !== PackageStatus.UNDER_REVIEW) {
    throw new AppError('Only change packages UNDER_REVIEW can be accepted', 400, 'INVALID_PACKAGE_STATUS');
  }

  // Check package staleness
  const { stalenessResult } = await computePackageStateFingerprint(packageId);
  if (stalenessResult.isStale) {
    throw new AppError('Change package is STALE. Please re-run simulation before accepting', 409, 'STALE_PACKAGE_SIMULATION_REQUIRED');
  }

  // Transition package status to ACCEPTED
  pkg.status = PackageStatus.ACCEPTED;
  pkg.reviewedBy = new Types.ObjectId(userId);
  await pkg.save();

  // Transition constituent proposal statuses to ACCEPTED
  const acceptedProposalsList: Array<{ proposalId: string; targetDocumentId: string; proposalType: string }> = [];

  for (const prop of pkg.proposals as any[]) {
    prop.status = ProposalStatus.ACCEPTED;
    prop.reviewedBy = new Types.ObjectId(userId);
    await prop.save();

    acceptedProposalsList.push({
      proposalId: prop._id.toString(),
      targetDocumentId: prop.targetDocumentId.toString(),
      proposalType: prop.proposalType,
    });

    try {
      await createDocumentAudit(
        prop.targetDocumentId.toString(),
        userId,
        'CHANGE_PROPOSAL_ACCEPTED' as any,
        { proposalId: prop._id.toString(), packageId: pkg._id.toString() },
      );
    } catch {
      // Safe audit fallback
    }
  }

  try {
    if (pkg.proposals.length > 0) {
      const firstProp = pkg.proposals[0] as any;
      await createDocumentAudit(
        firstProp.targetDocumentId.toString(),
        userId,
        'CHANGE_PACKAGE_ACCEPTED' as any,
        { packageId: pkg._id.toString(), packageNumber: pkg.packageNumber },
      );
    }
  } catch {
    // Safe audit fallback
  }

  return {
    package: pkg,
    handoffPayload: {
      message: `Change Package ${pkg.packageNumber} has been ACCEPTED`,
      nextSteps:
        'Handoff payload: Execute version updates via DocumentVersion service (Phase 7.4) and submit Work Requests via Phase 13 workflow for target documents.',
      acceptedProposals: acceptedProposalsList,
    },
  };
}
