import crypto from 'crypto';
import { Types } from 'mongoose';
import { AppError } from '../../errors/app-error.js';
import { User } from '../users/user.model.js';
import { Project } from '../projects/project.model.js';
import { ProjectTopologyLink } from '../projects/project-topology.model.js';
import { DocumentAudit } from '../documents/document-audit.model.js';
import { DocumentationBaseline } from './documentation-baseline.model.js';
import { PackageFulfillmentAttestation, IPackageFulfillmentAttestation } from '../change-packages/change-package-attestation.model.js';
import { SystemGovernanceWaiver } from './system-governance-waiver.model.js';
import { checkUserProjectReadAccess } from '../projects/project-topology.service.js';
import { evaluateSystemTopologyGovernanceGate } from './system-topology-governance-gate.service.js';
import { calculateSystemBaselineAlignment } from './system-baseline-alignment.service.js';
import { SystemReleaseCertificate, ISystemReleaseCertificateDoc } from './system-release-certificate.model.js';
import type {
  ISystemReleaseSnapshot,
  ITopologyNodeSnapshot,
  ITopologyEdgeSnapshot,
  IBaselineSnapshot,
  IAttestationSnapshot,
  IWaiverSnapshot,
  SystemReleasePreCheckResponseDTO,
  IssueReleaseCertificateRequestDTO,
  RevokeReleaseCertificateRequestDTO,
  SystemReleaseCertificateResponseDTO,
  CertificateVerificationResponseDTO,
} from './system-release-certificate.types.js';

const MAX_TOPOLOGY_PROJECTS = 50;

/**
 * Recursively canonicalize an object or array for deterministic SHA-256 hashing.
 */
/* eslint-disable-next-line @typescript-eslint/no-explicit-any */
export function canonicalizeSnapshot(obj: any): string {
  if (obj === null || typeof obj !== 'object') {
    return JSON.stringify(obj);
  }
  let target = obj;
  if (typeof target.toObject === 'function') {
    target = target.toObject();
  }
  if (Array.isArray(target)) {
    return '[' + target.map(canonicalizeSnapshot).join(',') + ']';
  }
  const sortedKeys = Object.keys(target)
    .filter((k) => !k.startsWith('$') && k !== '_doc' && target[k] !== undefined)
    .sort();
  const keyValues = sortedKeys.map(
    (key) => JSON.stringify(key) + ':' + canonicalizeSnapshot(target[key])
  );
  return '{' + keyValues.join(',') + '}';
}

/**
 * Compute cryptographic SHA-256 hash over canonical snapshot.
 */
export function computeCertificateHash(snapshot: ISystemReleaseSnapshot): string {
  const canonicalJson = canonicalizeSnapshot(snapshot);
  return crypto.createHash('sha256').update(canonicalJson, 'utf8').digest('hex');
}

/**
 * Sort arrays inside snapshot deterministically before hashing/saving.
 */
function sortSnapshotArrays(snapshot: ISystemReleaseSnapshot): ISystemReleaseSnapshot {
  return {
    ...snapshot,
    topologyNodes: [...snapshot.topologyNodes].sort((a, b) => a.projectId.localeCompare(b.projectId)),
    topologyEdges: [...snapshot.topologyEdges].sort((a, b) =>
      `${a.sourceProjectId}:${a.targetProjectId}:${a.linkType}`.localeCompare(
        `${b.sourceProjectId}:${b.targetProjectId}:${b.linkType}`
      )
    ),
    activeBaselines: [...snapshot.activeBaselines].sort((a, b) =>
      `${a.projectId}:${a.baselineId}`.localeCompare(`${b.projectId}:${b.baselineId}`)
    ),
    activeAttestations: [...snapshot.activeAttestations].sort((a, b) =>
      a.attestationId.localeCompare(b.attestationId)
    ),
    activeWaivers: [...snapshot.activeWaivers].sort((a, b) => a.waiverId.localeCompare(b.waiverId)),
  };
}

/**
 * Map Mongoose certificate document to response DTO.
 */
function mapCertificateToDTO(
  cert: ISystemReleaseCertificateDoc,
  supersededByMap?: Map<string, { id: string; releaseTag: string }>
): SystemReleaseCertificateResponseDTO {
  const certIdStr = cert._id.toString();
  const supersededInfo = supersededByMap?.get(certIdStr);
  const derivedStatus: 'ACTIVE' | 'REVOKED' | 'SUPERSEDED' =
    cert.certificateStatus === 'REVOKED'
      ? 'REVOKED'
      : supersededInfo
      ? 'SUPERSEDED'
      : 'ACTIVE';

  return {
    id: certIdStr,
    rootProjectId: cert.rootProjectId.toString(),
    releaseTag: cert.releaseTag,
    certificateVersion: cert.certificateVersion,
    certificateStatus: derivedStatus,
    systemReleaseStatus: cert.systemReleaseStatus,
    certificateHash: cert.certificateHash,
    certifiedByUserId: cert.certifiedByUserId.toString(),
    certifiedAt: cert.certifiedAt.toISOString(),
    ...(cert.notes ? { notes: cert.notes } : {}),
    ...(cert.supersedesCertificateId ? { supersedesCertificateId: cert.supersedesCertificateId.toString() } : {}),
    ...(supersededInfo?.id ? { supersededByCertificateId: supersededInfo.id } : {}),
    lifecycleEvents: (cert.lifecycleEvents || []).map((evt) => ({
      eventType: evt.eventType,
      performedByUserId: evt.performedByUserId.toString(),
      timestamp: evt.timestamp.toISOString(),
      ...(evt.reason ? { reason: evt.reason } : {}),
    })),
    snapshot: cert.snapshot,
    createdAt: cert.createdAt.toISOString(),
    updatedAt: cert.updatedAt.toISOString(),
  };
}

/**
 * Check whether user is global admin or root project owner.
 */
async function checkCertificationAuthority(userId: string, userRole: string, projectId: string): Promise<boolean> {
  if (userRole === 'admin') {
    return true;
  }
  const project = await Project.findById(projectId);
  if (!project) {
    throw new AppError('Root project not found', 404, 'PROJECT_NOT_FOUND');
  }
  return project.ownerId.toString() === userId;
}

/**
 * Helper to traverse authorized topology graph from root project.
 */
async function buildTopologyGraphForRoot(
  userId: string,
  role: 'user' | 'admin',
  rootProjectId: string
): Promise<{
  nodes: ITopologyNodeSnapshot[];
  edges: ITopologyEdgeSnapshot[];
  authorizedProjectIds: string[];
}> {
  const rootProject = await Project.findById(rootProjectId);
  if (!rootProject) {
    throw new AppError('Root project not found', 404, 'PROJECT_NOT_FOUND');
  }

  const visitedProjectIds = new Set<string>([rootProjectId]);
  const queue: Array<{ id: string; depth: number }> = [{ id: rootProjectId, depth: 1 }];
  const authorizedProjectIds: string[] = [rootProjectId];

  const nodes: ITopologyNodeSnapshot[] = [
    {
      projectId: rootProjectId,
      projectName: rootProject.name,
      isGovernanceEnabled: rootProject.governanceSettings?.isGovernanceEnabled ?? true,
      localGatePassed: true,
    },
  ];

  const edges: ITopologyEdgeSnapshot[] = [];

  while (queue.length > 0 && authorizedProjectIds.length < MAX_TOPOLOGY_PROJECTS) {
    const current = queue.shift()!;
    if (current.depth > 3) continue;

    const links = await ProjectTopologyLink.find({ sourceProjectId: current.id }).lean();
    for (const link of links) {
      const targetId = link.targetProjectId.toString();

      const hasRead = await checkUserProjectReadAccess(userId, role, targetId);
      if (!hasRead) continue;

      edges.push({
        sourceProjectId: current.id,
        targetProjectId: targetId,
        linkType: link.type,
      });

      if (!visitedProjectIds.has(targetId)) {
        visitedProjectIds.add(targetId);
        const targetProj = await Project.findById(targetId);
        if (targetProj && !targetProj.isArchived) {
          authorizedProjectIds.push(targetId);
          nodes.push({
            projectId: targetId,
            projectName: targetProj.name,
            isGovernanceEnabled: targetProj.governanceSettings?.isGovernanceEnabled ?? true,
            localGatePassed: true,
          });
          queue.push({ id: targetId, depth: current.depth + 1 });
        }
      }
    }
  }

  return { nodes, edges, authorizedProjectIds };
}

/**
 * Evaluate pre-certification system release readiness.
 */
export async function evaluatePreCertification(
  userId: string,
  rootProjectId: string,
  releaseTag: string,
  userRoleOverride?: 'user' | 'admin'
): Promise<SystemReleasePreCheckResponseDTO> {
  let role: 'user' | 'admin' = userRoleOverride || 'user';
  if (!userRoleOverride && Types.ObjectId.isValid(userId)) {
    const userDoc = await User.findById(userId).select('role').lean();
    if (userDoc && userDoc.role === 'admin') {
      role = 'admin';
    }
  }

  const hasAccess = await checkUserProjectReadAccess(userId, role, rootProjectId);
  if (!hasAccess) {
    throw new AppError('Access denied to root project', 403, 'FORBIDDEN');
  }

  const rootProject = await Project.findById(rootProjectId);
  if (!rootProject) {
    throw new AppError('Root project not found', 404, 'PROJECT_NOT_FOUND');
  }

  // Evaluate Phase 19 authoritative system release gate
  const gateResult = await evaluateSystemTopologyGovernanceGate(userId, role, rootProjectId);

  const canCertify =
    gateResult.systemReleaseStatus === 'PASSED' || gateResult.systemReleaseStatus === 'PASSED_WITH_WAIVER';

  // Build topology nodes & edges for snapshot preview
  const { nodes: topologyNodes, edges: topologyEdges, authorizedProjectIds } = await buildTopologyGraphForRoot(
    userId,
    role,
    rootProjectId
  );

  const totalTopologyProjects = topologyNodes.length;

  // Extract blocking reasons if blocked
  const blockingReasons: string[] = [];
  if (!canCertify) {
    if (gateResult.systemReleaseStatus === 'BLOCKED') {
      (gateResult.evidence?.blockingDependencies || []).forEach((b) => {
        blockingReasons.push(`Dependency blocked: ${b.providerProjectId} - ${b.reason}`);
      });
      if (gateResult.evidence?.rootLocalGate && gateResult.evidence.rootLocalGate.status === 'BLOCKED') {
        blockingReasons.push('Root project local release gate failed');
      }
    } else {
      blockingReasons.push(`System release status is ${gateResult.systemReleaseStatus}`);
    }
  }

  // Check topology bounds
  if (totalTopologyProjects > MAX_TOPOLOGY_PROJECTS) {
    blockingReasons.push(`Topology project count (${totalTopologyProjects}) exceeds maximum allowed (${MAX_TOPOLOGY_PROJECTS})`);
    return {
      rootProjectId,
      rootProjectName: rootProject.name,
      canCertify: false,
      systemReleaseStatus: gateResult.systemReleaseStatus,
      summary: {
        totalTopologyProjects,
        totalActiveBaselines: 0,
        totalActiveAttestations: 0,
        totalActiveWaivers: 0,
        blockingDependenciesCount: gateResult.evidence?.blockingDependencies?.length || 0,
      },
      blockingReasons,
      snapshotPreview: null,
    };
  }

  if (!canCertify) {
    return {
      rootProjectId,
      rootProjectName: rootProject.name,
      canCertify: false,
      systemReleaseStatus: gateResult.systemReleaseStatus,
      summary: {
        totalTopologyProjects,
        totalActiveBaselines: 0,
        totalActiveAttestations: 0,
        totalActiveWaivers: 0,
        blockingDependenciesCount: gateResult.evidence?.blockingDependencies?.length || 0,
      },
      blockingReasons,
      snapshotPreview: null,
    };
  }

  // Bulk fetch active baselines across authorized topology projects
  const baselines = await DocumentationBaseline.find({
    projectId: { $in: authorizedProjectIds },
    isActive: true,
  }).lean();

  // Map project names
  const projectMap = new Map<string, string>();
  topologyNodes.forEach((n) => projectMap.set(n.projectId, n.projectName));

  const activeBaselines: IBaselineSnapshot[] = baselines.map((b) => ({
    projectId: b.projectId.toString(),
    projectName: projectMap.get(b.projectId.toString()) || 'Unknown Project',
    baselineId: b._id.toString(),
    versionTag: b.versionTag,
    documentSnapshotsCount: (b as { documentSnapshots?: unknown[] }).documentSnapshots?.length || 0,
    createdTimestamp: b.createdAt ? new Date(b.createdAt).toISOString() : new Date().toISOString(),
  }));

  // Bulk fetch active attestations across target packages
  const attestations = await PackageFulfillmentAttestation.find({
    fulfillmentStatus: 'FULFILLED',
  }).sort({ createdAt: -1 }).lean();

  const activeAttestations: IAttestationSnapshot[] = (
    attestations as unknown as IPackageFulfillmentAttestation[]
  ).map((a) => ({
    attestationId: a._id.toString(),
    packageId: a.changePackageId.toString(),
    packageName: `PKG-${a.changePackageId.toString().slice(-6)}`,
    attestedAt: a.createdAt ? new Date(a.createdAt).toISOString() : new Date().toISOString(),
    attestorUserId: a.attestedBy.toString(),
    fulfillmentStatus: a.fulfillmentStatus,
  }));

  // Bulk fetch active policy waivers
  const waivers = await SystemGovernanceWaiver.find({
    rootProjectId,
    isRevoked: false,
  }).lean();

  const now = new Date();
  const activeWaivers: IWaiverSnapshot[] = waivers
    .filter((w) => new Date(w.expiresAt) > now)
    .map((w) => ({
      waiverId: w._id.toString(),
      targetProviderProjectId: w.targetProviderProjectId.toString(),
      blockerType: w.blockerType,
      ...(w.targetDocumentId ? { targetDocumentId: w.targetDocumentId.toString() } : {}),
      grantedByUserId: w.grantedByUserId.toString(),
      grantedAt: w.createdAt ? new Date(w.createdAt).toISOString() : new Date().toISOString(),
      expiresAt: new Date(w.expiresAt).toISOString(),
      waiverScope: w.targetDocumentId ? 'DOCUMENT_LEVEL' : 'PROVIDER_PROJECT_LEVEL',
    }));

  // Calculate baseline alignment metrics
  const alignmentResult = await calculateSystemBaselineAlignment(userId, role, rootProjectId);

  const rawSnapshot: ISystemReleaseSnapshot = {
    rootProjectId,
    rootProjectName: rootProject.name,
    releaseTag,
    certifiedAt: new Date().toISOString(),
    systemReleaseStatus: gateResult.systemReleaseStatus as 'PASSED' | 'PASSED_WITH_WAIVER',
    topologyNodes,
    topologyEdges,
    activeBaselines,
    activeAttestations,
    activeWaivers,
    evidenceSummary: {
      totalApplicableContracts: alignmentResult.summary?.applicableUnits ?? 0,
      alignedContractsCount: alignmentResult.summary?.alignedUnits ?? 0,
      waivedBlockersCount: activeWaivers.length,
      systemAlignmentScore: alignmentResult.alignmentScore ?? 100,
      evidenceCompletenessScore: alignmentResult.evidenceCompleteness ?? 100,
    },
  };

  const snapshotPreview = sortSnapshotArrays(rawSnapshot);

  return {
    rootProjectId,
    rootProjectName: rootProject.name,
    canCertify: true,
    systemReleaseStatus: gateResult.systemReleaseStatus,
    summary: {
      totalTopologyProjects: topologyNodes.length,
      totalActiveBaselines: activeBaselines.length,
      totalActiveAttestations: activeAttestations.length,
      totalActiveWaivers: activeWaivers.length,
      blockingDependenciesCount: 0,
    },
    snapshotPreview,
  };
}

/**
 * Issue a persistent, signed System Release Certificate.
 */
export async function issueReleaseCertificate(
  userId: string,
  userRole: string,
  rootProjectId: string,
  requestDTO: IssueReleaseCertificateRequestDTO
): Promise<SystemReleaseCertificateResponseDTO> {
  const isAuthorized = await checkCertificationAuthority(userId, userRole, rootProjectId);
  if (!isAuthorized) {
    throw new AppError('Only Project Owner or System Admin can issue a release certificate', 403, 'FORBIDDEN');
  }

  if (!requestDTO.releaseTag || requestDTO.releaseTag.trim() === '') {
    throw new AppError('Release tag is required', 400, 'INVALID_INPUT');
  }

  const trimmedTag = requestDTO.releaseTag.trim();

  // Run pre-check evaluation
  const preCheck = await evaluatePreCertification(
    userId,
    rootProjectId,
    trimmedTag,
    userRole as 'user' | 'admin'
  );
  if (!preCheck.canCertify || !preCheck.snapshotPreview) {
    throw new AppError(
      `System topology governance gate must be PASSED or PASSED_WITH_WAIVER to issue a release certificate. Current status: ${preCheck.systemReleaseStatus}`,
      412,
      'PRECONDITION_FAILED'
    );
  }

  // Check if an ACTIVE certificate already exists for this release tag
  const existingActive = await SystemReleaseCertificate.findOne({
    rootProjectId,
    releaseTag: trimmedTag,
    certificateStatus: 'ACTIVE',
  });

  if (existingActive) {
    throw new AppError(`An active release certificate already exists for release tag '${trimmedTag}'`, 409, 'CONFLICT');
  }

  // Calculate certificateVersion for re-certification history
  const previousCerts = await SystemReleaseCertificate.find({
    rootProjectId,
    releaseTag: trimmedTag,
  }).sort({ certificateVersion: -1 }).lean();

  const certificateVersion = previousCerts.length > 0 && previousCerts[0] ? previousCerts[0].certificateVersion + 1 : 1;

  // Verify supersedesCertificateId if provided
  let supersedesObjectId: Types.ObjectId | undefined;
  if (requestDTO.supersedesCertificateId) {
    const targetSuperseded = await SystemReleaseCertificate.findOne({
      _id: requestDTO.supersedesCertificateId,
      rootProjectId,
    });
    if (!targetSuperseded) {
      throw new AppError('Target superseded certificate not found', 404, 'NOT_FOUND');
    }
    supersedesObjectId = targetSuperseded._id as Types.ObjectId;
  }

  const now = new Date();
  const frozenSnapshot: ISystemReleaseSnapshot = {
    ...preCheck.snapshotPreview,
    certifiedAt: now.toISOString(),
  };

  const certificateHash = computeCertificateHash(frozenSnapshot);

  const certDoc = new SystemReleaseCertificate({
    rootProjectId,
    releaseTag: trimmedTag,
    certificateVersion,
    certificateStatus: 'ACTIVE',
    systemReleaseStatus: preCheck.systemReleaseStatus,
    certificateHash,
    certifiedByUserId: userId,
    certifiedAt: now,
    notes: requestDTO.notes,
    supersedesCertificateId: supersedesObjectId,
    lifecycleEvents: [
      {
        eventType: 'ISSUED',
        performedByUserId: userId,
        timestamp: now,
        reason: requestDTO.notes,
      },
    ],
    snapshot: frozenSnapshot,
  });

  await certDoc.save();

  // Log audit event
  await DocumentAudit.create({
    documentId: new Types.ObjectId(),
    userId: new Types.ObjectId(userId),
    action: 'CREATE',
    metadata: {
      eventType: 'SYSTEM_RELEASE_CERTIFICATE_ISSUED',
      certificateId: certDoc._id.toString(),
      rootProjectId,
      releaseTag: trimmedTag,
      certificateVersion,
      certificateHash,
      systemReleaseStatus: preCheck.systemReleaseStatus,
    },
  });

  return mapCertificateToDTO(certDoc);
}

/**
 * List release certificates for a project.
 */
export async function listReleaseCertificates(
  userId: string,
  rootProjectId: string,
  userRoleOverride?: 'user' | 'admin'
): Promise<SystemReleaseCertificateResponseDTO[]> {
  let role: 'user' | 'admin' = userRoleOverride || 'user';
  if (!userRoleOverride && Types.ObjectId.isValid(userId)) {
    const userDoc = await User.findById(userId).select('role').lean();
    if (userDoc && userDoc.role === 'admin') {
      role = 'admin';
    }
  }

  const hasAccess = await checkUserProjectReadAccess(userId, role, rootProjectId);
  if (!hasAccess) {
    throw new AppError('Access denied to project', 403, 'FORBIDDEN');
  }

  const certs = await SystemReleaseCertificate.find({ rootProjectId }).sort({ certifiedAt: -1 });

  // Map supersession pointers in-memory
  const supersededByMap = new Map<string, { id: string; releaseTag: string }>();
  certs.forEach((c) => {
    if (c.supersedesCertificateId) {
      supersededByMap.set(c.supersedesCertificateId.toString(), {
        id: c._id.toString(),
        releaseTag: c.releaseTag,
      });
    }
  });

  return certs.map((c) => mapCertificateToDTO(c, supersededByMap));
}

/**
 * Get details of a single release certificate.
 */
export async function getReleaseCertificateDetails(
  userId: string,
  rootProjectId: string,
  certificateId: string,
  userRoleOverride?: 'user' | 'admin'
): Promise<SystemReleaseCertificateResponseDTO> {
  let role: 'user' | 'admin' = userRoleOverride || 'user';
  if (!userRoleOverride && Types.ObjectId.isValid(userId)) {
    const userDoc = await User.findById(userId).select('role').lean();
    if (userDoc && userDoc.role === 'admin') {
      role = 'admin';
    }
  }

  const hasAccess = await checkUserProjectReadAccess(userId, role, rootProjectId);
  if (!hasAccess) {
    throw new AppError('Access denied to project', 403, 'FORBIDDEN');
  }

  const cert = await SystemReleaseCertificate.findOne({ _id: certificateId, rootProjectId });
  if (!cert) {
    throw new AppError('Release certificate not found', 404, 'NOT_FOUND');
  }

  // Check if superseded by any newer certificate
  const newerCert = await SystemReleaseCertificate.findOne({ supersedesCertificateId: cert._id, rootProjectId });
  const supersededByMap = new Map<string, { id: string; releaseTag: string }>();
  if (newerCert) {
    supersededByMap.set(cert._id.toString(), {
      id: newerCert._id.toString(),
      releaseTag: newerCert.releaseTag,
    });
  }

  return mapCertificateToDTO(cert, supersededByMap);
}

/**
 * Verify certificate integrity, lifecycle validity, and current live readiness.
 */
export async function verifyCertificateIntegrity(
  userId: string,
  rootProjectId: string,
  certificateId: string,
  userRoleOverride?: 'user' | 'admin'
): Promise<CertificateVerificationResponseDTO> {
  let role: 'user' | 'admin' = userRoleOverride || 'user';
  if (!userRoleOverride && Types.ObjectId.isValid(userId)) {
    const userDoc = await User.findById(userId).select('role').lean();
    if (userDoc && userDoc.role === 'admin') {
      role = 'admin';
    }
  }

  const hasAccess = await checkUserProjectReadAccess(userId, role, rootProjectId);
  if (!hasAccess) {
    throw new AppError('Access denied to project', 403, 'FORBIDDEN');
  }

  const cert = await SystemReleaseCertificate.findOne({ _id: certificateId, rootProjectId });
  if (!cert) {
    throw new AppError('Release certificate not found', 404, 'NOT_FOUND');
  }

  // Concept 1: Snapshot Integrity
  const computedHash = computeCertificateHash(cert.snapshot);
  const isHashValid = computedHash === cert.certificateHash;

  // Concept 2: Lifecycle Validity
  const newerCert = await SystemReleaseCertificate.findOne({ supersedesCertificateId: cert._id, rootProjectId });
  const isSuperseded = !!newerCert;

  const derivedLifecycleStatus: 'ACTIVE' | 'REVOKED' | 'SUPERSEDED' =
    cert.certificateStatus === 'REVOKED'
      ? 'REVOKED'
      : isSuperseded
      ? 'SUPERSEDED'
      : 'ACTIVE';

  // Concept 3: Current Live System Readiness (Informational)
  const currentGateResult = await evaluateSystemTopologyGovernanceGate(userId, role, rootProjectId);
  const currentSystemReleaseStatus = currentGateResult.systemReleaseStatus;
  const matchesCertifiedState = currentSystemReleaseStatus === cert.systemReleaseStatus;

  return {
    certificateId: cert._id.toString(),
    releaseTag: cert.releaseTag,
    integrity: {
      isHashValid,
      computedHash,
      storedHash: cert.certificateHash,
      integrityStatus: isHashValid ? 'INTEGRITY_VERIFIED' : 'TAMPER_DETECTED',
    },
    lifecycle: {
      status: derivedLifecycleStatus,
      certifiedAt: cert.certifiedAt.toISOString(),
      certifiedByUserId: cert.certifiedByUserId.toString(),
      lifecycleEvents: (cert.lifecycleEvents || []).map((evt) => ({
        eventType: evt.eventType,
        performedByUserId: evt.performedByUserId.toString(),
        timestamp: evt.timestamp.toISOString(),
        ...(evt.reason ? { reason: evt.reason } : {}),
      })),
      ...(newerCert
        ? {
            supersededBy: {
              newerCertificateId: newerCert._id.toString(),
              newerReleaseTag: newerCert.releaseTag,
            },
          }
        : {}),
    },
    currentLiveSystem: {
      currentSystemReleaseStatus,
      matchesCertifiedState,
    },
  };
}

/**
 * Revoke a release certificate (append-only lifecycle event model).
 */
export async function revokeReleaseCertificate(
  userId: string,
  userRole: string,
  rootProjectId: string,
  certificateId: string,
  requestDTO: RevokeReleaseCertificateRequestDTO
): Promise<SystemReleaseCertificateResponseDTO> {
  const isAuthorized = await checkCertificationAuthority(userId, userRole, rootProjectId);
  if (!isAuthorized) {
    throw new AppError('Only Project Owner or System Admin can revoke a release certificate', 403, 'FORBIDDEN');
  }

  if (!requestDTO.revocationReason || requestDTO.revocationReason.trim() === '') {
    throw new AppError('Revocation reason is required', 400, 'INVALID_INPUT');
  }

  const cert = await SystemReleaseCertificate.findOne({ _id: certificateId, rootProjectId });
  if (!cert) {
    throw new AppError('Release certificate not found', 404, 'NOT_FOUND');
  }

  if (cert.certificateStatus === 'REVOKED') {
    throw new AppError('Release certificate is already revoked', 400, 'ALREADY_REVOKED');
  }

  const now = new Date();
  const trimmedReason = requestDTO.revocationReason.trim();

  // Append REVOKED lifecycle event
  cert.lifecycleEvents.push({
    eventType: 'REVOKED',
    performedByUserId: new Types.ObjectId(userId),
    timestamp: now,
    reason: trimmedReason,
  });

  // Materialize certificateStatus to REVOKED (snapshot and certificateHash remain 100% UNMUTATED)
  cert.certificateStatus = 'REVOKED';

  await cert.save();

  // Log audit event
  await DocumentAudit.create({
    documentId: new Types.ObjectId(),
    userId: new Types.ObjectId(userId),
    action: 'UPDATE',
    metadata: {
      eventType: 'SYSTEM_RELEASE_CERTIFICATE_REVOKED',
      certificateId: cert._id.toString(),
      rootProjectId,
      releaseTag: cert.releaseTag,
      certificateVersion: cert.certificateVersion,
      revocationReason: trimmedReason,
    },
  });

  return mapCertificateToDTO(cert);
}
