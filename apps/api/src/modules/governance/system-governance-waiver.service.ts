import mongoose, { Types } from 'mongoose';

import { AppError } from '../../errors/app-error.js';
import { Project } from '../projects/project.model.js';
import { Document } from '../documents/document.model.js';
import { createDocumentAudit } from '../documents/document-audit.service.js';
import { DocumentAuditAction } from '../documents/document-audit.model.js';
import { checkUserProjectReadAccess } from '../projects/project-topology.service.js';
import {
  SystemGovernanceWaiver,
  computeActiveScopeKey,
  SystemBlockerType,
  ISystemGovernanceWaiver,
} from './system-governance-waiver.model.js';

function validateObjectId(id: string, errorMessage = 'Resource not found', code = 'NOT_FOUND'): void {
  if (!Types.ObjectId.isValid(id)) {
    throw new AppError(errorMessage, 404, code);
  }
}

export async function verifySystemWaiverAuthority(
  userId: string,
  role: 'user' | 'admin',
  rootProjectId: string,
  targetProviderProjectId?: string,
): Promise<boolean> {
  if (role === 'admin') return true;

  validateObjectId(rootProjectId, 'Root project not found', 'PROJECT_NOT_FOUND');
  const rootProject = await Project.findOne({ _id: new Types.ObjectId(rootProjectId), isArchived: false });
  if (!rootProject) {
    throw new AppError('Root project not found', 404, 'PROJECT_NOT_FOUND');
  }

  // Root Project Owner possesses waiver authority
  if (rootProject.ownerId.toString() === userId) {
    return true;
  }

  // Target Provider Project Owner possesses waiver authority over provider scope
  if (targetProviderProjectId) {
    validateObjectId(targetProviderProjectId, 'Provider project not found', 'PROJECT_NOT_FOUND');
    const providerProject = await Project.findOne({
      _id: new Types.ObjectId(targetProviderProjectId),
      isArchived: false,
    });
    if (providerProject && providerProject.ownerId.toString() === userId) {
      return true;
    }
  }

  throw new AppError(
    'Forbidden: Granting or revoking system governance waivers requires Root Project Owner, Provider Project Owner, or Admin authority',
    403,
    'FORBIDDEN',
  );
}

export interface GrantWaiverInput {
  targetProviderProjectId: string;
  targetDocumentId?: string | null;
  contractVersionNumber?: number | null;
  blockerType: SystemBlockerType;
  reason: string;
  expiresInDays?: number;
}

const WAIVABLE_BLOCKER_TYPES = new Set<SystemBlockerType>([
  'CONTRACT_MISALIGNED',
  'PROVIDER_ATTESTATION_MISSING',
  'PROVIDER_ATTESTATION_STALE',
  'PROVIDER_LOCAL_GATE_BLOCKED',
  'PROVIDER_GOVERNANCE_DISABLED',
]);

export async function grantSystemGovernanceWaiver(
  userId: string,
  role: 'user' | 'admin',
  projectId: string,
  input: GrantWaiverInput,
): Promise<ISystemGovernanceWaiver> {
  validateObjectId(projectId, 'Root project not found', 'PROJECT_NOT_FOUND');

  if (!input.targetProviderProjectId || typeof input.targetProviderProjectId !== 'string') {
    throw new AppError('targetProviderProjectId is required for system governance waivers', 400, 'VALIDATION_ERROR');
  }
  validateObjectId(input.targetProviderProjectId, 'Provider project not found', 'PROJECT_NOT_FOUND');

  if (!WAIVABLE_BLOCKER_TYPES.has(input.blockerType)) {
    throw new AppError(`Blocker type ${input.blockerType} cannot be waived`, 400, 'NON_WAIVABLE_BLOCKER');
  }

  if (input.blockerType === 'PROVIDER_LOCAL_GATE_BLOCKED' && !input.targetDocumentId) {
    throw new AppError(
      'targetDocumentId is required for PROVIDER_LOCAL_GATE_BLOCKED waivers',
      400,
      'VALIDATION_ERROR',
    );
  }

  if (input.targetDocumentId) {
    validateObjectId(input.targetDocumentId, 'Target document not found', 'DOCUMENT_NOT_FOUND');
    const doc = await Document.findOne({
      _id: new Types.ObjectId(input.targetDocumentId),
      isDeleted: false,
    });
    if (!doc) {
      throw new AppError('Target document not found', 404, 'DOCUMENT_NOT_FOUND');
    }
  }

  if (!input.reason || typeof input.reason !== 'string' || input.reason.trim().length === 0) {
    throw new AppError('Waiver reason is required', 400, 'VALIDATION_ERROR');
  }

  await verifySystemWaiverAuthority(userId, role, projectId, input.targetProviderProjectId);

  const days = Math.min(Math.max(input.expiresInDays || 30, 1), 365);
  const currentTimestamp = new Date();
  const expiresAt = new Date(currentTimestamp.getTime() + days * 86400000);

  const activeScopeKey = computeActiveScopeKey(
    projectId,
    input.targetProviderProjectId,
    input.blockerType,
    input.targetDocumentId,
    input.contractVersionNumber,
  );

  const executeGrant = async (sessionParam?: mongoose.ClientSession) => {
    const opts = sessionParam ? { session: sessionParam } : {};

    // 1. Transactional Pre-Check for Existing Active Waiver
    const existingActiveWaiver = await SystemGovernanceWaiver.findOne(
      {
        activeScopeKey,
        scopeState: 'ACTIVE',
      },
      null,
      opts,
    );

    if (existingActiveWaiver) {
      // If un-revoked and still valid -> Block creation (409 CONFLICT)
      if (!existingActiveWaiver.isRevoked && existingActiveWaiver.expiresAt > currentTimestamp) {
        throw new AppError(
          `An active waiver for scope (${input.blockerType}) already exists (ID: ${existingActiveWaiver._id}). Revoke existing waiver before creating a new one.`,
          409,
          'DUPLICATE_ACTIVE_WAIVER',
        );
      }

      // If expired -> Transition existing record to SUPERSEDED to free unique index slot
      if (existingActiveWaiver.expiresAt <= currentTimestamp) {
        await SystemGovernanceWaiver.updateOne(
          { _id: existingActiveWaiver._id, scopeState: 'ACTIVE' },
          { $set: { scopeState: 'SUPERSEDED' } },
          opts,
        );
      }
    }

    // 2. Insert Waiver Record
    const [waiver] = await SystemGovernanceWaiver.create(
      [
        {
          rootProjectId: new Types.ObjectId(projectId),
          targetProviderProjectId: new Types.ObjectId(input.targetProviderProjectId),
          targetDocumentId: input.targetDocumentId ? new Types.ObjectId(input.targetDocumentId) : null,
          contractVersionNumber: input.contractVersionNumber ?? null,
          blockerType: input.blockerType,
          activeScopeKey,
          scopeState: 'ACTIVE',
          reason: input.reason.trim(),
          grantedByUserId: new Types.ObjectId(userId),
          expiresAt,
          isRevoked: false,
        },
      ],
      opts,
    );

    if (!waiver) {
      throw new AppError('Failed to create waiver', 500, 'FAILED_TO_CREATE_WAIVER');
    }

    const createdWaiver = waiver.toObject();

    // 3. Write Audit Event in Same Transaction
    await createDocumentAudit(
      input.targetDocumentId || projectId,
      userId,
      'GOVERNANCE_SYSTEM_WAIVER_GRANTED' as DocumentAuditAction,
      {
        waiverId: waiver._id.toString(),
        rootProjectId: projectId,
        targetProviderProjectId: input.targetProviderProjectId,
        targetDocumentId: input.targetDocumentId || null,
        contractVersionNumber: input.contractVersionNumber || null,
        blockerType: input.blockerType,
        reason: input.reason.trim(),
        expiresAt,
      },
      opts,
    );

    return createdWaiver;
  };

  try {
    if (mongoose.connection.readyState === 1 && typeof mongoose.connection.getClient === 'function') {
      const session = await mongoose.startSession();
      try {
        let result: ISystemGovernanceWaiver | null = null;
        try {
          await session.withTransaction(async () => {
            result = await executeGrant(session);
          });
          return result!;
        } catch (txErr: unknown) {
          if (
            txErr &&
            typeof txErr === 'object' &&
            (('code' in txErr && (txErr as { code: number }).code === 20) ||
              ('codeName' in txErr && (txErr as { codeName: string }).codeName === 'IllegalOperation') ||
              ('message' in txErr && String((txErr as { message: string }).message).includes('Transaction numbers are only allowed')))
          ) {
            return await executeGrant();
          }
          throw txErr;
        }
      } finally {
        await session.endSession();
      }
    } else {
      return await executeGrant();
    }
  } catch (err: unknown) {
    if (err && typeof err === 'object' && 'code' in err && (err as { code: number }).code === 11000) {
      const errMsg = String((err as { message?: string }).message || '');
      const keyPattern = (err as { keyPattern?: Record<string, number> }).keyPattern;
      if (keyPattern?.activeScopeKey || errMsg.includes('activeScopeKey')) {
        throw new AppError(
          `An active waiver for scope (${input.blockerType}) was created concurrently by another transaction.`,
          409,
          'DUPLICATE_ACTIVE_WAIVER',
        );
      }
    }
    throw err;
  }
}

export async function revokeSystemGovernanceWaiver(
  userId: string,
  role: 'user' | 'admin',
  projectId: string,
  waiverId: string,
  reason?: string,
): Promise<ISystemGovernanceWaiver> {
  validateObjectId(projectId, 'Root project not found', 'PROJECT_NOT_FOUND');
  validateObjectId(waiverId, 'Waiver not found', 'WAIVER_NOT_FOUND');

  const executeRevoke = async (session?: mongoose.ClientSession): Promise<ISystemGovernanceWaiver> => {
    const opts = session ? { session } : {};

    const waiverObjId = new Types.ObjectId(waiverId);
    const waiver = await SystemGovernanceWaiver.findOne({ _id: waiverObjId, rootProjectId: new Types.ObjectId(projectId) }, null, opts);
    if (!waiver) {
      throw new AppError('Waiver not found', 404, 'WAIVER_NOT_FOUND');
    }

    if (waiver.scopeState !== 'ACTIVE' || waiver.isRevoked) {
      throw new AppError('Only active waivers can be revoked', 400, 'WAIVER_NOT_ACTIVE');
    }

    await verifySystemWaiverAuthority(
      userId,
      role,
      waiver.rootProjectId.toString(),
      waiver.targetProviderProjectId.toString(),
    );

    waiver.scopeState = 'REVOKED';
    waiver.isRevoked = true;
    waiver.revokedAt = new Date();
    waiver.revokedByUserId = new Types.ObjectId(userId);
    waiver.revocationReason = reason ? reason.trim() : 'Manual user revocation';

    await waiver.save(opts);

    await createDocumentAudit(
      waiver.targetDocumentId ? waiver.targetDocumentId.toString() : projectId,
      userId,
      'GOVERNANCE_SYSTEM_WAIVER_REVOKED' as DocumentAuditAction,
      {
        waiverId: waiver._id.toString(),
        rootProjectId: projectId,
        targetProviderProjectId: waiver.targetProviderProjectId.toString(),
        targetDocumentId: waiver.targetDocumentId ? waiver.targetDocumentId.toString() : null,
        contractVersionNumber: waiver.contractVersionNumber || null,
        blockerType: waiver.blockerType,
        reason: waiver.revocationReason,
      },
      opts,
    );

    return waiver.toObject();
  };

  if (mongoose.connection.readyState === 1 && typeof mongoose.connection.getClient === 'function') {
    const session = await mongoose.startSession();
    try {
      let result: ISystemGovernanceWaiver | null = null;
      try {
        await session.withTransaction(async () => {
          result = await executeRevoke(session);
        });
        return result!;
      } catch (txErr: unknown) {
        if (
          txErr &&
          typeof txErr === 'object' &&
          (('code' in txErr && (txErr as { code: number }).code === 20) ||
            ('codeName' in txErr && (txErr as { codeName: string }).codeName === 'IllegalOperation') ||
            ('message' in txErr && String((txErr as { message: string }).message).includes('Transaction numbers are only allowed')))
        ) {
          return await executeRevoke();
        }
        throw txErr;
      }
    } finally {
      await session.endSession();
    }
  } else {
    return await executeRevoke();
  }
}

export async function listSystemGovernanceWaivers(
  userId: string,
  role: 'user' | 'admin',
  projectId: string,
  options: { includeExpired?: boolean; includeRevoked?: boolean } = {},
): Promise<ISystemGovernanceWaiver[]> {
  validateObjectId(projectId, 'Root project not found', 'PROJECT_NOT_FOUND');

  const hasAccess = await checkUserProjectReadAccess(userId, role, projectId);
  if (!hasAccess) {
    throw new AppError('Access denied to project', 403, 'FORBIDDEN');
  }

  const filter: Record<string, unknown> = {
    rootProjectId: new Types.ObjectId(projectId),
  };

  if (!options.includeRevoked) {
    filter.isRevoked = false;
  }

  if (!options.includeExpired) {
    filter.expiresAt = { $gt: new Date() };
  }

  const waivers = await SystemGovernanceWaiver.find(filter).sort({ createdAt: -1 }).lean();
  return waivers.map((w) => w as ISystemGovernanceWaiver);
}
