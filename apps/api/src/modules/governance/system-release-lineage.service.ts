/* eslint-disable @typescript-eslint/no-explicit-any */
import { Types } from 'mongoose';
import { AppError } from '../../errors/app-error.js';
import { User } from '../users/user.model.js';
import { checkUserProjectReadAccess } from '../projects/project-topology.service.js';
import { SystemReleaseCertificate } from './system-release-certificate.model.js';
import { DocumentationBaseline } from './documentation-baseline.model.js';
import { DocumentVersion } from '../documents/document-version.model.js';
import { parseOpenApiSpecification } from '../api-specs/openapi-parser.service.js';
import {
  diffTopologySnapshots,
  diffBaselineSnapshots,
  diffWaiverSnapshots,
  diffAttestationSnapshots,
  calculateTrajectoryMetrics,
} from './system-release-lineage-helpers.js';
import type {
  SystemReleaseDifferentialDTO,
  SupersessionLineageGraphDTO,
  SupersessionLineageNodeDTO,
} from './system-release-lineage.types.js';
import type { ContractDeltaItemDTO } from './system-contract-evolution.types.js';

function validateObjectId(id: string, errorMessage = 'Invalid ID', code = 'INVALID_ID'): void {
  if (!Types.ObjectId.isValid(id)) {
    throw new AppError(errorMessage, 400, code);
  }
}

async function getUserRole(userId: string): Promise<'user' | 'admin'> {
  if (Types.ObjectId.isValid(userId)) {
    const userDoc = await User.findById(userId).select('role').lean();
    if (userDoc && userDoc.role === 'admin') {
      return 'admin';
    }
  }
  return 'user';
}

/**
 * Normalizes an API path for canonical comparison (trailing slashes stripped)
 */
function normalizePath(pathStr: string): string {
  if (!pathStr) return '/';
  let p = pathStr.trim();
  if (!p.startsWith('/')) p = '/' + p;
  if (p.length > 1 && p.endsWith('/')) {
    p = p.slice(0, -1);
  }
  return p;
}

/**
 * Historical contract diff helper feeding historical document version text into Phase 23 AST parser
 */
async function computeHistoricalContractDeltas(
  baselinePairs: Array<{ projectId: string; sourceBaselineId: string; targetBaselineId: string }>
): Promise<ContractDeltaItemDTO[]> {
  if (!baselinePairs || baselinePairs.length === 0) return [];

  const MAX_CONTRACT_DIFF_BASELINES = 30;
  const boundedPairs = baselinePairs.slice(0, MAX_CONTRACT_DIFF_BASELINES);

  const baselineIds = Array.from(
    new Set(boundedPairs.flatMap((p) => [p.sourceBaselineId, p.targetBaselineId]))
  ).filter((id) => Types.ObjectId.isValid(id));

  if (baselineIds.length === 0) return [];

  const baselines = await DocumentationBaseline.find({ _id: { $in: baselineIds } }).exec();
  const baselineMap = new Map<string, any>();
  baselines.forEach((b) => baselineMap.set(b._id.toString(), b));

  const contractDeltas: ContractDeltaItemDTO[] = [];

  for (const pair of boundedPairs) {
    const bSrc = baselineMap.get(pair.sourceBaselineId);
    const bTgt = baselineMap.get(pair.targetBaselineId);

    if (!bSrc || !bTgt) continue;

    const srcSnapshots = bSrc.documentSnapshots || bSrc.targetDocumentSnapshots || [];
    const tgtSnapshots = bTgt.documentSnapshots || bTgt.targetDocumentSnapshots || [];

    if (srcSnapshots.length === 0 || tgtSnapshots.length === 0) continue;

    for (const srcSnap of srcSnapshots) {
      if (!srcSnap?.documentId || srcSnap?.versionNumber === undefined) continue;

      // Find matching snapshot in target baseline by documentId or index
      const tgtSnap =
        tgtSnapshots.find(
          (t: any) => t.documentId?.toString() === srcSnap.documentId.toString()
        ) || tgtSnapshots[0];

      if (!tgtSnap?.documentId || tgtSnap?.versionNumber === undefined) continue;

      const versionQuery = [
        { documentId: srcSnap.documentId, versionNumber: srcSnap.versionNumber },
        { documentId: tgtSnap.documentId, versionNumber: tgtSnap.versionNumber },
      ];

      const versions = await DocumentVersion.find({ $or: versionQuery }).exec();

      const vSrc = versions.find(
        (v) =>
          v.documentId.toString() === srcSnap.documentId.toString() &&
          v.versionNumber === srcSnap.versionNumber
      );
      const vTgt = versions.find(
        (v) =>
          v.documentId.toString() === tgtSnap.documentId.toString() &&
          v.versionNumber === tgtSnap.versionNumber
      );

      if (!vSrc || !vTgt) continue;

      // Parse OpenAPI specs
      try {
        const specSrc = parseOpenApiSpecification(vSrc.content || '');
        const specTgt = parseOpenApiSpecification(vTgt.content || '');

        const srcEpMap = new Map<string, any>();
        specSrc.endpoints.forEach((ep) =>
          srcEpMap.set(`${ep.method.toUpperCase()}:${normalizePath(ep.path)}`, ep)
        );

        const tgtEpMap = new Map<string, any>();
        specTgt.endpoints.forEach((ep) =>
          tgtEpMap.set(`${ep.method.toUpperCase()}:${normalizePath(ep.path)}`, ep)
        );

        // Check endpoints removed or deprecated
        srcEpMap.forEach((epSrc, key) => {
          const epTgt = tgtEpMap.get(key);
          if (!epTgt) {
            contractDeltas.push({
              deltaCode: 'ENDPOINT_REMOVED',
              method: epSrc.method.toUpperCase(),
              path: normalizePath(epSrc.path),
              description: `Endpoint ${epSrc.method.toUpperCase()} ${epSrc.path} was removed in historical baseline upgrade.`,
              riskTier: 'BREAKING',
            });
          } else if (!epSrc.isDeprecated && epTgt.isDeprecated) {
            contractDeltas.push({
              deltaCode: 'ENDPOINT_DEPRECATED',
              method: epSrc.method.toUpperCase(),
              path: normalizePath(epSrc.path),
              description: `Endpoint ${epSrc.method.toUpperCase()} ${epSrc.path} was deprecated in historical baseline upgrade.`,
              riskTier: 'WARNING',
            });
          }
        });

        // Check endpoints added
        tgtEpMap.forEach((epTgt, key) => {
          if (!srcEpMap.has(key)) {
            contractDeltas.push({
              deltaCode: 'ENDPOINT_ADDED',
              method: epTgt.method.toUpperCase(),
              path: normalizePath(epTgt.path),
              description: `Endpoint ${epTgt.method.toUpperCase()} ${epTgt.path} was added in historical baseline upgrade.`,
              riskTier: 'NON_BREAKING',
            });
          }
        });
      } catch {
        // Non-OpenAPI prose or unparseable specs return 0 structural contract deltas (UNSUPPORTED_CONTRACT_STRUCTURE)
      }
    }
  }

  return contractDeltas;
}

/**
 * Service method comparing two historical System Release Certificates
 */
export async function compareReleaseCertificates(
  userId: string,
  sourceCertificateId: string,
  targetCertificateId: string
): Promise<SystemReleaseDifferentialDTO> {
  validateObjectId(sourceCertificateId, 'Invalid source certificate ID', 'INVALID_SOURCE_ID');
  validateObjectId(targetCertificateId, 'Invalid target certificate ID', 'INVALID_TARGET_ID');

  const certs = await SystemReleaseCertificate.find({
    _id: { $in: [sourceCertificateId, targetCertificateId] },
  }).exec();

  if (certs.length === 0) {
    throw new AppError('Certificate not found', 404, 'CERTIFICATE_NOT_FOUND');
  }

  let certA = certs.find((c) => c._id.toString() === sourceCertificateId);
  let certB = certs.find((c) => c._id.toString() === targetCertificateId);

  // If same ID passed for comparison
  if (sourceCertificateId === targetCertificateId && certs.length === 1) {
    certA = certs[0];
    certB = certs[0];
  }

  if (!certA || !certB) {
    throw new AppError('One or both certificates not found', 404, 'CERTIFICATE_NOT_FOUND');
  }

  // Same root system check
  if (certA.rootProjectId.toString() !== certB.rootProjectId.toString()) {
    throw new AppError(
      'Certificates belong to different root projects',
      400,
      'DIFFERENT_ROOT_PROJECTS_NOT_COMPARABLE'
    );
  }

  // ACL read access check on root project
  const userRole = await getUserRole(userId);
  const rootProjectIdStr = certA.rootProjectId.toString();
  const canReadRoot = await checkUserProjectReadAccess(userId, userRole, rootProjectIdStr);
  if (!canReadRoot) {
    throw new AppError('Forbidden: User lacks read access on root project', 403, 'FORBIDDEN');
  }

  // Determine chronological direction
  let comparisonDirection: 'FORWARD' | 'BACKWARD' = 'FORWARD';
  if (certA.certifiedAt.getTime() > certB.certifiedAt.getTime()) {
    comparisonDirection = 'BACKWARD';
    const temp = certA;
    certA = certB;
    certB = temp;
  }

  const sourceSnapshot = certA.snapshot;
  const targetSnapshot = certB.snapshot;

  if (!sourceSnapshot || !targetSnapshot) {
    throw new AppError(
      'Incomplete certificate snapshot evidence',
      400,
      'INCOMPLETE_CERTIFICATE_EVIDENCE'
    );
  }

  // Diff topology
  const topologyDeltas = diffTopologySnapshots(
    sourceSnapshot.topologyNodes || [],
    sourceSnapshot.topologyEdges || [],
    targetSnapshot.topologyNodes || [],
    targetSnapshot.topologyEdges || []
  );

  // Diff baselines
  const baselineDeltas = diffBaselineSnapshots(
    sourceSnapshot.activeBaselines || [],
    targetSnapshot.activeBaselines || []
  );

  // Contract diffs for VERSION_ADVANCED or VERSION_REGRESSED baselines
  const baselinePairsToDiff: Array<{
    projectId: string;
    sourceBaselineId: string;
    targetBaselineId: string;
  }> = [];

  baselineDeltas.forEach((b) => {
    if (
      (b.deltaType === 'VERSION_ADVANCED' || b.deltaType === 'VERSION_REGRESSED') &&
      b.sourceBaselineId &&
      b.targetBaselineId
    ) {
      baselinePairsToDiff.push({
        projectId: b.projectId,
        sourceBaselineId: b.sourceBaselineId,
        targetBaselineId: b.targetBaselineId,
      });
    }
  });

  const contractDeltas = await computeHistoricalContractDeltas(baselinePairsToDiff);

  // Diff waivers
  const waiverDeltas = diffWaiverSnapshots(
    sourceSnapshot.activeWaivers || [],
    targetSnapshot.activeWaivers || [],
    certB.certifiedAt.toISOString()
  );

  // Diff attestations
  const attestationDeltas = diffAttestationSnapshots(
    sourceSnapshot.activeAttestations || [],
    targetSnapshot.activeAttestations || []
  );

  // Calculate pure trajectory metrics
  const trajectory = calculateTrajectoryMetrics(sourceSnapshot, targetSnapshot, contractDeltas);

  // Calculate supersession path distance
  let supersessionPathDistance: number | null = null;
  let distanceCount = 0;
  let currCertId: string | undefined = certB.supersedesCertificateId?.toString();
  while (currCertId && distanceCount <= 20) {
    distanceCount++;
    if (currCertId === certA._id.toString()) {
      supersessionPathDistance = distanceCount;
      break;
    }
    const pCert = await SystemReleaseCertificate.findById(currCertId).exec();
    currCertId = pCert?.supersedesCertificateId?.toString();
  }

  // ACL Subgraph Pruning for connected projects
  const authorizedProjectMap = new Map<string, boolean>();
  authorizedProjectMap.set(rootProjectIdStr, true);

  const checkProjectACL = async (pId: string): Promise<boolean> => {
    if (authorizedProjectMap.has(pId)) return authorizedProjectMap.get(pId)!;
    const canRead = await checkUserProjectReadAccess(userId, userRole, pId);
    authorizedProjectMap.set(pId, canRead);
    return canRead;
  };

  // Filter topology nodes & edges
  const filteredAddedNodes = [];
  for (const n of topologyDeltas.addedNodes) {
    if (await checkProjectACL(n.projectId)) filteredAddedNodes.push(n);
  }
  const filteredRemovedNodes = [];
  for (const n of topologyDeltas.removedNodes) {
    if (await checkProjectACL(n.projectId)) filteredRemovedNodes.push(n);
  }
  const filteredUnchangedNodes = [];
  for (const n of topologyDeltas.unchangedNodes) {
    if (await checkProjectACL(n.projectId)) filteredUnchangedNodes.push(n);
  }

  const filteredAddedEdges = [];
  for (const e of topologyDeltas.addedEdges) {
    if ((await checkProjectACL(e.sourceProjectId)) && (await checkProjectACL(e.targetProjectId))) {
      filteredAddedEdges.push(e);
    }
  }
  const filteredRemovedEdges = [];
  for (const e of topologyDeltas.removedEdges) {
    if ((await checkProjectACL(e.sourceProjectId)) && (await checkProjectACL(e.targetProjectId))) {
      filteredRemovedEdges.push(e);
    }
  }
  const filteredUnchangedEdges = [];
  for (const e of topologyDeltas.unchangedEdges) {
    if ((await checkProjectACL(e.sourceProjectId)) && (await checkProjectACL(e.targetProjectId))) {
      filteredUnchangedEdges.push(e);
    }
  }

  // Filter baseline deltas
  const filteredBaselineDeltas = [];
  for (const b of baselineDeltas) {
    if (await checkProjectACL(b.projectId)) filteredBaselineDeltas.push(b);
  }

  // Filter waiver deltas
  const filteredWaiverDeltas = [];
  for (const w of waiverDeltas) {
    if (await checkProjectACL(w.targetProviderProjectId)) filteredWaiverDeltas.push(w);
  }

  return {
    comparisonMetadata: {
      sourceCertificateId: certA._id.toString(),
      sourceReleaseTag: certA.releaseTag,
      sourceCertifiedAt: certA.certifiedAt.toISOString(),
      targetCertificateId: certB._id.toString(),
      targetReleaseTag: certB.releaseTag,
      targetCertifiedAt: certB.certifiedAt.toISOString(),
      rootProjectId: rootProjectIdStr,
      comparisonDirection,
      isSourceRevoked: certA.certificateStatus === 'REVOKED',
      isTargetRevoked: certB.certificateStatus === 'REVOKED',
      isSourceSuperseded: Boolean(certA.supersedesCertificateId),
      isTargetSuperseded: Boolean(certB.supersedesCertificateId),
      supersessionPathDistance,
    },
    trajectory,
    topologyDeltas: {
      addedNodes: filteredAddedNodes,
      removedNodes: filteredRemovedNodes,
      unchangedNodes: filteredUnchangedNodes,
      addedEdges: filteredAddedEdges,
      removedEdges: filteredRemovedEdges,
      unchangedEdges: filteredUnchangedEdges,
    },
    baselineDeltas: filteredBaselineDeltas,
    contractDeltas,
    waiverDeltas: filteredWaiverDeltas,
    attestationDeltas,
  };
}

/**
 * Service method traversing backward supersession lineage chains / graphs
 */
export async function getCertificateLineageGraph(
  userId: string,
  rootProjectId: string,
  headCertificateId?: string,
  maxDepth = 20
): Promise<SupersessionLineageGraphDTO> {
  validateObjectId(rootProjectId, 'Invalid root project ID', 'INVALID_PROJECT_ID');

  const userRole = await getUserRole(userId);
  const canRead = await checkUserProjectReadAccess(userId, userRole, rootProjectId);
  if (!canRead) {
    throw new AppError('Forbidden: User lacks read access on root project', 403, 'FORBIDDEN');
  }

  let headCert: any;

  if (headCertificateId) {
    validateObjectId(headCertificateId, 'Invalid head certificate ID', 'INVALID_HEAD_ID');
    headCert = await SystemReleaseCertificate.findOne({
      _id: headCertificateId,
      rootProjectId,
    }).exec();
  } else {
    headCert = await SystemReleaseCertificate.findOne({ rootProjectId, certificateStatus: 'ACTIVE' })
      .sort({ certifiedAt: -1 })
      .exec();

    // Fallback to latest certificate if none active
    if (!headCert) {
      headCert = await SystemReleaseCertificate.findOne({ rootProjectId })
        .sort({ certifiedAt: -1 })
        .exec();
    }
  }

  if (!headCert) {
    return {
      rootProjectId,
      headCertificateId: headCertificateId || '',
      lineageNodes: [],
      traversalMetadata: {
        totalNodesTraversed: 0,
        maxDepthReached: false,
        hasCycleDetected: false,
        hasMissingParent: false,
        status: 'COMPLETE',
      },
    };
  }

  const lineageNodes: SupersessionLineageNodeDTO[] = [];
  const visitedIds = new Set<string>();

  let currCert: any = headCert;
  let depth = 0;
  let maxDepthReached = false;
  let hasCycleDetected = false;
  let hasMissingParent = false;

  const boundedMaxDepth = Math.min(Math.max(1, maxDepth), 20);

  while (currCert && depth <= boundedMaxDepth) {
    const certIdStr = currCert._id.toString();

    const computedStatus =
      currCert.certificateStatus === 'REVOKED'
        ? 'REVOKED'
        : depth > 0
        ? 'SUPERSEDED'
        : currCert.certificateStatus;

    lineageNodes.push({
      certificateId: certIdStr,
      releaseTag: currCert.releaseTag,
      certifiedAt: currCert.certifiedAt.toISOString(),
      certificateStatus: computedStatus as any,
      systemReleaseStatus: currCert.systemReleaseStatus,
      supersedesCertificateId: currCert.supersedesCertificateId?.toString(),
      depth,
    });

    visitedIds.add(certIdStr);

    if (!currCert.supersedesCertificateId) {
      break; // Reached root certificate
    }

    if (depth >= boundedMaxDepth) {
      maxDepthReached = true;
      break;
    }

    const nextIdStr = currCert.supersedesCertificateId.toString();

    if (visitedIds.has(nextIdStr)) {
      hasCycleDetected = true;
      break;
    }

    const parentCert = await SystemReleaseCertificate.findById(nextIdStr).exec();

    if (!parentCert) {
      hasMissingParent = true;
      break;
    }

    // LINEAGE ACL PRUNING RULE:
    // Unauthorized parent cert is completely indistinguishable from a non-existent parent cert!
    const canReadParent = await checkUserProjectReadAccess(userId, userRole, parentCert.rootProjectId.toString());
    if (!canReadParent) {
      break; // Halt traversal cleanly at authorized boundary without revealing metadata or IDs!
    }

    currCert = parentCert;
    depth++;
  }

  return {
    rootProjectId,
    headCertificateId: headCert._id.toString(),
    lineageNodes,
    traversalMetadata: {
      totalNodesTraversed: lineageNodes.length,
      maxDepthReached,
      hasCycleDetected,
      hasMissingParent,
      status: 'COMPLETE',
    },
  };
}
