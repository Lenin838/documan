/* eslint-disable @typescript-eslint/no-explicit-any */
import { Types } from 'mongoose';

import { AppError } from '../../errors/app-error.js';
import { User } from '../users/user.model.js';
import { Project } from '../projects/project.model.js';
import { ProjectTopologyLink } from '../projects/project-topology.model.js';
import { checkUserProjectReadAccess } from '../projects/project-topology.service.js';
import { SystemReleaseCertificate } from './system-release-certificate.model.js';
import { DocumentationBaseline } from './documentation-baseline.model.js';
import { SystemGovernanceWaiver } from './system-governance-waiver.model.js';
import { PackageFulfillmentAttestation } from '../change-packages/change-package-attestation.model.js';
import { DocumentVersion } from '../documents/document-version.model.js';
import { parseOpenApiSpecification } from '../api-specs/openapi-parser.service.js';
import { verifyCertificateIntegrity } from './system-release-certificate.service.js';

import {
  diffTopologyWithLive,
  diffBaselinesWithLive,
  diffWaiversWithLive,
  diffAttestationsWithLive,
  evaluateLiveComplianceStatus,
  synthesizeVarianceExplanations,
  synthesizeNextReviewConsiderations,
} from './system-release-drift-helpers.js';

import type {
  ReleaseCertificateComplianceAuditDTO,
} from './system-release-drift.types.js';
import type { ContractDeltaItemDTO } from './system-contract-evolution.types.js';
import type {
  ITopologyNodeSnapshot,
  ITopologyEdgeSnapshot,
} from './system-release-certificate.types.js';

const MAX_CONNECTED_PROJECTS = 50;
const MAX_CONTRACT_DIFF_BASELINES = 30;

function validateObjectId(id: string, errorMessage = 'Invalid ID', code = 'INVALID_ID'): void {
  if (!Types.ObjectId.isValid(id)) {
    throw new AppError(errorMessage, 404, code);
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
 * Computes contract deltas between certified document versions and live active document versions
 */
async function computeContractDeltasWithLive(
  certBaselines: Array<{ projectId: string; baselineId: string }>,
  liveBaselines: Array<{ projectId: string; baselineId: string }>
): Promise<ContractDeltaItemDTO[]> {
  const certBaselineMap = new Map<string, string>();
  certBaselines.forEach((cb) => certBaselineMap.set(cb.projectId, cb.baselineId));

  const baselinePairs: Array<{ projectId: string; certifiedBaselineId: string; liveBaselineId: string }> = [];
  for (const lb of liveBaselines) {
    const certBId = certBaselineMap.get(lb.projectId);
    if (certBId) {
      baselinePairs.push({
        projectId: lb.projectId,
        certifiedBaselineId: certBId,
        liveBaselineId: lb.baselineId,
      });
    }
  }

  if (baselinePairs.length === 0) return [];

  const boundedPairs = baselinePairs.slice(0, MAX_CONTRACT_DIFF_BASELINES);
  const baselineIds = Array.from(
    new Set(boundedPairs.flatMap((p) => [p.certifiedBaselineId, p.liveBaselineId]))
  ).filter((id) => Types.ObjectId.isValid(id));

  if (baselineIds.length === 0) return [];

  const baselines = await DocumentationBaseline.find({ _id: { $in: baselineIds } }).exec();
  const baselineMap = new Map<string, any>();
  baselines.forEach((b) => baselineMap.set(b._id.toString(), b));

  const contractDeltas: ContractDeltaItemDTO[] = [];

  for (const pair of boundedPairs) {
    const bSrc = baselineMap.get(pair.certifiedBaselineId);
    const bTgt = baselineMap.get(pair.liveBaselineId);

    if (!bSrc || !bTgt) continue;

    const srcSnapshots = bSrc.documentSnapshots || bSrc.targetDocumentSnapshots || [];
    const tgtSnapshots = bTgt.documentSnapshots || bTgt.targetDocumentSnapshots || [];

    if (srcSnapshots.length === 0 || tgtSnapshots.length === 0) continue;

    for (const srcSnap of srcSnapshots) {
      if (!srcSnap?.documentId || srcSnap?.versionNumber === undefined) continue;

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

      if (!vSrc?.content || !vTgt?.content) continue;

      // Try OpenAPI parsing
      try {
        const specSrc = parseOpenApiSpecification(vSrc.content);
        const specTgt = parseOpenApiSpecification(vTgt.content);

        // Check for removed endpoints (BREAKING)
        const tgtEndpointKeys = new Set(
          specTgt.endpoints.map((e) => `${e.method.toUpperCase()}:${e.path}`)
        );

        for (const srcEp of specSrc.endpoints) {
          const key = `${srcEp.method.toUpperCase()}:${srcEp.path}`;
          if (!tgtEndpointKeys.has(key)) {
            contractDeltas.push({
              deltaCode: 'ENDPOINT_REMOVED',
              riskTier: 'BREAKING',
              method: srcEp.method.toUpperCase(),
              path: srcEp.path,
              description: `Endpoint ${srcEp.method.toUpperCase()} ${srcEp.path} was removed in live active baseline.`,
            });
          }
        }

        // Check for added endpoints (NON_BREAKING)
        const srcEndpointKeys = new Set(
          specSrc.endpoints.map((e) => `${e.method.toUpperCase()}:${e.path}`)
        );

        for (const tgtEp of specTgt.endpoints) {
          const key = `${tgtEp.method.toUpperCase()}:${tgtEp.path}`;
          if (!srcEndpointKeys.has(key)) {
            contractDeltas.push({
              deltaCode: 'ENDPOINT_ADDED',
              riskTier: 'NON_BREAKING',
              method: tgtEp.method.toUpperCase(),
              path: tgtEp.path,
              description: `New endpoint ${tgtEp.method.toUpperCase()} ${tgtEp.path} added in live active baseline.`,
            });
          }
        }
      } catch {
        // Not an OpenAPI contract spec or parsing failed, skip
      }
    }
  }

  return contractDeltas;
}

/**
 * Main Phase 29 Compliance Drift & Post-Certification Variance Audit Engine Execution
 */
export async function auditReleaseCertificateComplianceDrift(
  userId: string,
  certificateId: string,
  userRoleOverride?: 'user' | 'admin'
): Promise<ReleaseCertificateComplianceAuditDTO> {
  validateObjectId(certificateId, 'Release certificate not found', 'CERTIFICATE_NOT_FOUND');

  const role = userRoleOverride || (await getUserRole(userId));

  const cert = await SystemReleaseCertificate.findById(certificateId);
  if (!cert) {
    throw new AppError('Release certificate not found', 404, 'CERTIFICATE_NOT_FOUND');
  }

  const rootProjectId = cert.rootProjectId.toString();

  // Phase 14 ACL Check on Root Project
  const hasAccess = await checkUserProjectReadAccess(userId, role, rootProjectId);
  if (!hasAccess) {
    throw new AppError('Access denied to project', 403, 'FORBIDDEN');
  }

  const nowIso = new Date().toISOString();

  // Phase 27 /verify integration
  const verifyResult = await verifyCertificateIntegrity(userId, rootProjectId, certificateId, role);

  // Retrieve topology links & projects connected to rootProjectId
  const rootProjectDoc = await Project.findById(rootProjectId).lean();
  const rootProjectName = (rootProjectDoc as any)?.name || 'Root Project';

  const topologyLinks = await ProjectTopologyLink.find({
    $or: [{ sourceProjectId: rootProjectId }, { targetProjectId: rootProjectId }],
  }).lean();

  const connectedProjectIds = new Set<string>();
  connectedProjectIds.add(rootProjectId);

  const rawEdges: ITopologyEdgeSnapshot[] = [];
  topologyLinks.forEach((link: any) => {
    const sId = link.sourceProjectId.toString();
    const tId = link.targetProjectId.toString();
    connectedProjectIds.add(sId);
    connectedProjectIds.add(tId);
    rawEdges.push({
      sourceProjectId: sId,
      targetProjectId: tId,
      linkType: link.linkType || 'PROVIDES_API_TO',
    });
  });

  const connectedArray = Array.from(connectedProjectIds);
  const isTruncated = connectedArray.length > MAX_CONNECTED_PROJECTS;
  const boundedProjectIds = connectedArray.slice(0, MAX_CONNECTED_PROJECTS);

  const projectDocs = await Project.find({ _id: { $in: boundedProjectIds } }).lean();
  const projectMap = new Map<string, any>();
  projectDocs.forEach((p: any) => projectMap.set(p._id.toString(), p));

  const authorizedProjectIds: string[] = [];
  const allLiveNodes: ITopologyNodeSnapshot[] = [];

  for (const pId of boundedProjectIds) {
    const canRead = await checkUserProjectReadAccess(userId, role, pId);
    if (canRead) {
      authorizedProjectIds.push(pId);
      const pDoc = projectMap.get(pId);
      allLiveNodes.push({
        projectId: pId,
        projectName: pDoc?.name || (pId === rootProjectId ? rootProjectName : 'Project'),
        isGovernanceEnabled: Boolean(pDoc?.isGovernanceEnabled),
        localGatePassed: true,
      });
    }
  }

  const authIdSet = new Set(authorizedProjectIds);
  const allLiveEdges = rawEdges.filter(
    (e) => authIdSet.has(e.sourceProjectId) && authIdSet.has(e.targetProjectId)
  );

  // Bulk query current live active baselines for authorized projects
  const liveBaselineDocs = await DocumentationBaseline.find({
    projectId: { $in: authorizedProjectIds },
    isActive: true,
  }).lean();

  const liveBaselines = liveBaselineDocs.map((b: any) => ({
    projectId: b.projectId.toString(),
    projectName: projectMap.get(b.projectId.toString())?.name || 'Project',
    baselineId: b._id.toString(),
    versionTag: b.versionTag,
  }));

  // Bulk query current live active waivers for authorized provider projects
  const liveWaiverDocs = await SystemGovernanceWaiver.find({
    targetProviderProjectId: { $in: authorizedProjectIds },
    isRevoked: { $ne: true },
  }).lean();

  const liveWaivers = liveWaiverDocs.map((w: any) => ({
    waiverId: w._id.toString(),
    targetProviderProjectId: w.targetProviderProjectId.toString(),
    blockerType: w.blockerType,
    expiresAt: w.expiresAt instanceof Date ? w.expiresAt.toISOString() : new Date(w.expiresAt).toISOString(),
    waiverScope: w.waiverScope || 'ALL',
    isRevoked: Boolean(w.isRevoked),
  }));

  // Bulk query live package fulfillment attestations
  const liveAttestationDocs = await PackageFulfillmentAttestation.find({
    projectId: { $in: authorizedProjectIds },
  }).lean();

  const liveAttestations = liveAttestationDocs.map((a: any) => ({
    attestationId: a._id.toString(),
    packageId: a.packageId?.toString() || a._id.toString(),
    packageName: a.packageName || 'Package',
    fulfillmentStatus: a.fulfillmentStatus || 'FULFILLED',
  }));

  // Filter certified snapshot elements by ACL authorization
  const certSnapshot = cert.snapshot;
  const certNodes = (certSnapshot.topologyNodes || []).filter((n) => authIdSet.has(n.projectId));
  const certEdges = (certSnapshot.topologyEdges || []).filter(
    (e) => authIdSet.has(e.sourceProjectId) && authIdSet.has(e.targetProjectId)
  );
  const certBaselines = (certSnapshot.activeBaselines || []).filter((b) => authIdSet.has(b.projectId));
  const certWaivers = (certSnapshot.activeWaivers || []).filter((w) =>
    authIdSet.has(w.targetProviderProjectId)
  );
  const certAttestations = certSnapshot.activeAttestations || [];

  // Compute 5 Variance Dimensions
  const topologyDiff = diffTopologyWithLive(certNodes, certEdges, allLiveNodes, allLiveEdges);
  const baselineDeltas = diffBaselinesWithLive(certBaselines, liveBaselines);
  const waiverDeltas = diffWaiversWithLive(certWaivers, liveWaivers, nowIso);
  const attestationDeltas = diffAttestationsWithLive(certAttestations, liveAttestations);

  const contractDeltas = await computeContractDeltasWithLive(
    certBaselines.map((b) => ({ projectId: b.projectId, baselineId: b.baselineId })),
    liveBaselines.map((b) => ({ projectId: b.projectId, baselineId: b.baselineId }))
  );

  const totalApplicableContracts = certSnapshot.evidenceSummary?.totalApplicableContracts || 0;

  // Pure Compliance Classification
  const complianceResult = evaluateLiveComplianceStatus({
    liveSystemReleaseStatus: verifyResult.currentLiveSystem.currentSystemReleaseStatus,
    totalApplicableContracts,
    isTruncated,
    topologyVarianceCount: topologyDiff.varianceCount,
    baselineDeltas,
    contractDeltas,
    waiverDeltas,
    attestationDeltas,
  });

  // Synthesize Explanations & Considerations
  const varianceExplanations = synthesizeVarianceExplanations({
    topologyDiff,
    baselineDeltas,
    contractDeltas,
    waiverDeltas,
    attestationDeltas,
  });

  const nextReviewConsiderations = synthesizeNextReviewConsiderations({
    complianceStatus: complianceResult.status,
    waiverDeltas,
    contractDeltas,
    baselineDeltas,
  });

  return {
    auditMetadata: {
      certificateId: cert._id.toString(),
      releaseTag: cert.releaseTag,
      certifiedAt: cert.certifiedAt.toISOString(),
      auditTimestamp: nowIso,
      rootProjectId,
      certificateStatus: verifyResult.lifecycle.status,
      certifiedSystemReleaseStatus: cert.systemReleaseStatus,
      liveSystemReleaseStatus: verifyResult.currentLiveSystem.currentSystemReleaseStatus,
      matchesCertifiedState: verifyResult.currentLiveSystem.matchesCertifiedState,
      isIntegrityVerified: verifyResult.integrity.integrityStatus === 'INTEGRITY_VERIFIED',
    },
    complianceStatus: complianceResult.status,
    complianceReason: complianceResult.reason,
    varianceExplanations,
    nextReviewConsiderations,
    varianceSummary: {
      topologyVarianceCount: topologyDiff.varianceCount,
      baselineVarianceCount: baselineDeltas.filter((b) => b.deltaType !== 'UNCHANGED').length,
      contractVarianceCount: contractDeltas.length,
      waiverVarianceCount: waiverDeltas.filter((w) => w.deltaType !== 'CARRIED_FORWARD').length,
      attestationVarianceCount: attestationDeltas.filter((a) => a.deltaType !== 'EVIDENCE_UNCHANGED').length,
    },
    topologyDeltas: {
      addedNodes: topologyDiff.addedNodes,
      removedNodes: topologyDiff.removedNodes,
      addedEdges: topologyDiff.addedEdges,
      removedEdges: topologyDiff.removedEdges,
    },
    baselineDeltas,
    contractDeltas,
    waiverDeltas,
    attestationDeltas,
  };
}
