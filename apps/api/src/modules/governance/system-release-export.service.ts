/* eslint-disable @typescript-eslint/no-explicit-any */
import crypto from 'crypto';
import { Types } from 'mongoose';
import { AppError } from '../../errors/app-error.js';
import { User } from '../users/user.model.js';
import { checkUserProjectReadAccess } from '../projects/project-topology.service.js';
import { getReleaseCertificateDetails } from './system-release-certificate.service.js';
import { auditReleaseCertificateComplianceDrift } from './system-release-drift.service.js';

export interface SystemReleaseExportBundleDTO {
  exportSchemaVersion: '1.0';
  exportMetadata: {
    generatedAt: string;
    generatedByUserId: string;
    generatedByUserName: string;
    exportBundleDigest: string;
  };
  releaseCertificate: {
    certificateId: string;
    rootProjectId: string;
    rootProjectName: string;
    releaseTag: string;
    certificateVersion: number;
    certificateStatus: 'ACTIVE' | 'REVOKED' | 'SUPERSEDED';
    systemReleaseStatus: 'PASSED' | 'PASSED_WITH_WAIVER';
    certificateHash: string;
    certifiedByUserId: string;
    certifiedAt: string;
    notes?: string;
    supersedesCertificateId?: string;
    supersededByCertificateId?: string;
    lifecycleEvents: Array<{
      eventType: 'ISSUED' | 'REVOKED';
      performedByUserId: string;
      timestamp: string;
      reason?: string;
    }>;
    snapshot: any;
  };
  complianceDriftAudit: {
    auditTimestamp: string;
    complianceStatus: string;
    complianceReason?: string;
    matchesCertifiedState: boolean;
    isIntegrityVerified: boolean;
    varianceSummary: {
      topologyVarianceCount: number;
      baselineVarianceCount: number;
      contractVarianceCount: number;
      waiverVarianceCount: number;
      attestationVarianceCount: number;
    };
    varianceExplanations: string[];
    nextReviewConsiderations: string[];
    topologyDeltas: any;
    baselineDeltas: any[];
    contractDeltas: any[];
    waiverDeltas: any[];
    attestationDeltas: any[];
  };
}

/**
 * Recursively canonicalizes a JavaScript value to a deterministic JSON string.
 * Omits undefined keys, keys starting with '$', '_doc', and 'exportBundleDigest'.
 * Sorts object keys alphabetically.
 */
export function canonicalizeExportPayload(obj: any): string {
  if (obj === null || obj === undefined) {
    return JSON.stringify(null);
  }
  if (typeof obj !== 'object') {
    return JSON.stringify(obj);
  }
  let target = obj;
  if (typeof target.toObject === 'function') {
    target = target.toObject();
  }
  if (Array.isArray(target)) {
    return '[' + target.map((item) => canonicalizeExportPayload(item)).join(',') + ']';
  }

  const sortedKeys = Object.keys(target)
    .filter(
      (k) =>
        !k.startsWith('$') &&
        k !== '_doc' &&
        k !== 'exportBundleDigest' &&
        target[k] !== undefined
    )
    .sort();

  const keyValues = sortedKeys.map(
    (key) => JSON.stringify(key) + ':' + canonicalizeExportPayload(target[key])
  );
  return '{' + keyValues.join(',') + '}';
}

/**
 * Computes deterministic SHA-256 hex digest over canonicalized export bundle payload.
 */
export function computeExportBundleDigest(payloadWithoutDigest: any): string {
  const canonicalJson = canonicalizeExportPayload(payloadWithoutDigest);
  return crypto.createHash('sha256').update(canonicalJson, 'utf8').digest('hex');
}

/**
 * Read-Only Export Service: Generates System Release Certificate & Compliance Drift Export Bundle.
 * Persistence = 0 (Assembled in memory dynamically from Phase 27 & 29 authoritative services).
 */
export async function generateReleaseCertificateExportBundle(
  userId: string,
  rootProjectId: string,
  certificateId: string,
  userRoleOverride?: string
): Promise<SystemReleaseExportBundleDTO> {
  if (!Types.ObjectId.isValid(rootProjectId)) {
    throw new AppError('Invalid project ID', 404, 'INVALID_PROJECT_ID');
  }
  if (!Types.ObjectId.isValid(certificateId)) {
    throw new AppError('Invalid certificate ID', 404, 'CERTIFICATE_NOT_FOUND');
  }

  let role: 'user' | 'admin' = userRoleOverride === 'admin' ? 'admin' : 'user';
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

  // Retrieve Phase 27 authoritative release certificate details
  const certDetails = await getReleaseCertificateDetails(
    userId,
    rootProjectId,
    certificateId,
    role
  );

  // Retrieve Phase 29 authoritative compliance drift audit
  const driftAudit = await auditReleaseCertificateComplianceDrift(
    userId,
    certificateId,
    role
  );

  // Lookup requesting user info
  let userName = 'User';
  if (Types.ObjectId.isValid(userId)) {
    const userDoc = await User.findById(userId).select('name email').lean();
    if (userDoc) {
      userName = userDoc.name || userDoc.email || 'User';
    }
  }

  const generatedAt = new Date().toISOString();

  // Assemble base export payload without exportBundleDigest
  const bundlePayload: Omit<SystemReleaseExportBundleDTO, 'exportMetadata'> & {
    exportMetadata: Omit<SystemReleaseExportBundleDTO['exportMetadata'], 'exportBundleDigest'>;
  } = {
    exportSchemaVersion: '1.0',
    exportMetadata: {
      generatedAt,
      generatedByUserId: userId,
      generatedByUserName: userName,
    },
    releaseCertificate: {
      certificateId: certDetails.id,
      rootProjectId: certDetails.rootProjectId,
      rootProjectName: (certDetails.snapshot as any)?.rootProjectName || 'Root Project',
      releaseTag: certDetails.releaseTag,
      certificateVersion: certDetails.certificateVersion,
      certificateStatus: certDetails.certificateStatus,
      systemReleaseStatus: certDetails.systemReleaseStatus,
      certificateHash: certDetails.certificateHash,
      certifiedByUserId: certDetails.certifiedByUserId,
      certifiedAt: certDetails.certifiedAt,
      ...(certDetails.notes ? { notes: certDetails.notes } : {}),
      ...(certDetails.supersedesCertificateId
        ? { supersedesCertificateId: certDetails.supersedesCertificateId }
        : {}),
      ...(certDetails.supersededByCertificateId
        ? { supersededByCertificateId: certDetails.supersededByCertificateId }
        : {}),
      lifecycleEvents: certDetails.lifecycleEvents || [],
      snapshot: certDetails.snapshot,
    },
    complianceDriftAudit: {
      auditTimestamp: driftAudit.auditMetadata.auditTimestamp,
      complianceStatus: driftAudit.complianceStatus,
      ...(driftAudit.complianceReason ? { complianceReason: driftAudit.complianceReason } : {}),
      matchesCertifiedState: driftAudit.auditMetadata.matchesCertifiedState,
      isIntegrityVerified: driftAudit.auditMetadata.isIntegrityVerified,
      varianceSummary: driftAudit.varianceSummary,
      varianceExplanations: driftAudit.varianceExplanations || [],
      nextReviewConsiderations: driftAudit.nextReviewConsiderations || [],
      topologyDeltas: driftAudit.topologyDeltas,
      baselineDeltas: driftAudit.baselineDeltas || [],
      contractDeltas: driftAudit.contractDeltas || [],
      waiverDeltas: driftAudit.waiverDeltas || [],
      attestationDeltas: driftAudit.attestationDeltas || [],
    },
  };

  // Compute deterministic SHA-256 digest over canonicalized payload
  const exportBundleDigest = computeExportBundleDigest(bundlePayload);

  return {
    ...bundlePayload,
    exportMetadata: {
      ...bundlePayload.exportMetadata,
      exportBundleDigest,
    },
  };
}
