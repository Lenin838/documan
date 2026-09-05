/* eslint-disable @typescript-eslint/no-explicit-any */
import fs from 'node:fs';
import crypto from 'crypto';
import { Types } from 'mongoose';

import { AppError } from '../../errors/app-error.js';
import { checkUserProjectReadAccess, verifyProjectOwnerOrAdmin } from '../projects/project-topology.service.js';
import { DocumentChangePackage, PackageStatus } from './change-package.model.js';
import { DocumentChangeProposal, ProposalType } from '../change-proposals/change-proposal.model.js';
import { Document } from '../documents/document.model.js';
import { DocumentVersion } from '../documents/document-version.model.js';
import { DocumentRelationship } from '../documents/document-relationship.model.js';
import { DocumentAudit } from '../documents/document-audit.model.js';
import { createDocumentAudit } from '../documents/document-audit.service.js';
import { computePackageStateFingerprint } from './change-package-fingerprint.js';
import { PackageFulfillmentAttestation, IPackageFulfillmentAttestation } from './change-package-attestation.model.js';
import type {
  FulfillmentStatus,
  PackageVerificationResultDTO,
  ProposalVerificationResult,
  ScopeVarianceItem,
  BaselineEligibilityHandoffPayload,
  DerivedValidityDTO,
  DriftDetailItem,
} from './change-package-attestation.types.js';

// Helper: Canonicalize JSON stringification with sorted keys
function canonicalizeJSON(obj: any): string {
  if (obj === null || typeof obj !== 'object') {
    return JSON.stringify(obj);
  }
  if (Array.isArray(obj)) {
    return JSON.stringify(obj.map((item) => (typeof item === 'object' && item !== null ? JSON.parse(canonicalizeJSON(item)) : item)));
  }
  const sortedKeys = Object.keys(obj).sort();
  const sortedObj: Record<string, any> = {};
  for (const key of sortedKeys) {
    const val = obj[key];
    sortedObj[key] = typeof val === 'object' && val !== null ? JSON.parse(canonicalizeJSON(val)) : val;
  }
  return JSON.stringify(sortedObj);
}

// Helper: Calculate SHA-256 hash of normalized text
function sha256Normalized(text: string): string {
  const normalized = text.replace(/\r\n/g, '\n').trim();
  return crypto.createHash('sha256').update(normalized, 'utf8').digest('hex');
}

// Helper: Get text content of DocumentVersion
async function getVersionContent(v: any): Promise<string> {
  if (v.content) return v.content;
  if (v.filePath && fs.existsSync(v.filePath)) {
    try {
      return await fs.promises.readFile(v.filePath, 'utf-8');
    } catch {
      return '';
    }
  }
  return '';
}

// Helper: Get checksum of DocumentVersion
async function getVersionChecksum(v: any): Promise<string> {
  if (v.checksum) return v.checksum;
  const content = await getVersionContent(v);
  return crypto.createHash('sha256').update(content, 'utf8').digest('hex');
}

/**
 * 1. Authoritative Package Acceptance Timestamp ($T_{\text{accept}}$)
 * Returns the exact createdAt of the CHANGE_PACKAGE_ACCEPTED audit event.
 * Returns null if missing (no fallback to package.updatedAt!).
 */
export async function getAuthoritativeAcceptanceTimestamp(packageId: Types.ObjectId): Promise<Date | null> {
  const audit = await DocumentAudit.findOne({
    action: 'CHANGE_PACKAGE_ACCEPTED' as any,
    'metadata.packageId': packageId.toString(),
  }).sort({ createdAt: -1 });

  return audit ? audit.createdAt : null;
}

/**
 * 2. Verify Change Package Fulfillment & Scope Variance
 * Non-mutating calculation. Requires READ project access.
 */
export async function verifyChangePackageFulfillment(
  userId: string,
  role: 'user' | 'admin',
  packageId: string,
): Promise<PackageVerificationResultDTO> {
  const pkgObjId = new Types.ObjectId(packageId);
  const pkg = await DocumentChangePackage.findById(pkgObjId);

  if (!pkg) {
    throw new AppError('Change package not found', 404, 'PACKAGE_NOT_FOUND');
  }

  const hasAccess = await checkUserProjectReadAccess(userId, role, pkg.projectId.toString());
  if (!hasAccess) {
    throw new AppError('Unauthorized access to change package', 403, 'FORBIDDEN');
  }

  if (pkg.status !== PackageStatus.ACCEPTED) {
    return {
      packageId: pkg._id.toString(),
      packageNumber: pkg.packageNumber,
      fulfillmentStatus: 'UNFULFILLED',
      hasScopeVariance: false,
      scopeVarianceDetails: [],
      attestationEligibility: 'INELIGIBLE',
      proposalResults: [],
      indeterminacyReason: 'Change package is not in ACCEPTED state',
    };
  }

  // Authoritative Acceptance Timestamp
  const T_accept = await getAuthoritativeAcceptanceTimestamp(pkg._id);
  if (!T_accept) {
    return {
      packageId: pkg._id.toString(),
      packageNumber: pkg.packageNumber,
      fulfillmentStatus: 'INDETERMINATE',
      hasScopeVariance: false,
      scopeVarianceDetails: [],
      attestationEligibility: 'INELIGIBLE',
      proposalResults: [],
      indeterminacyReason: 'MISSING_PACKAGE_ACCEPTANCE_AUDIT_LOG',
    };
  }

  const proposals = await DocumentChangeProposal.find({ _id: { $in: pkg.proposals } });
  const targetDocObjIds = Array.from(new Set(proposals.map((p) => p.targetDocumentId)));

  // Bulk query candidate DocumentVersions created on or after T_accept
  const candidateVersions = await DocumentVersion.find({
    documentId: { $in: targetDocObjIds },
    createdAt: { $gte: T_accept },
  }).sort({ versionNumber: 1 });

  // Map versions by documentId
  const versionsByDocMap = new Map<string, typeof candidateVersions>();
  for (const v of candidateVersions) {
    const docKey = v.documentId.toString();
    if (!versionsByDocMap.has(docKey)) {
      versionsByDocMap.set(docKey, []);
    }
    versionsByDocMap.get(docKey)!.push(v);
  }

  const proposalResults: ProposalVerificationResult[] = [];
  const scopeVarianceDetails: ScopeVarianceItem[] = [];

  for (const prop of proposals) {
    const docKey = prop.targetDocumentId.toString();
    const docCandidates = versionsByDocMap.get(docKey) || [];

    if (prop.proposalType === ProposalType.DOCUMENT_CONTENT_UPDATE) {
      if (prop.proposedChange && typeof prop.proposedChange.content === 'string') {
        const expectedHash = sha256Normalized(prop.proposedChange.content);
        let matchingVer = null;
        let matchingChecksum = '';

        for (const candidate of docCandidates) {
          const candidateContent = await getVersionContent(candidate);
          const candidateHash = sha256Normalized(candidateContent);
          if (candidateHash === expectedHash) {
            matchingVer = candidate;
            matchingChecksum = await getVersionChecksum(candidate);
            break;
          }
        }

        if (matchingVer) {
          proposalResults.push({
            proposalId: prop._id.toString(),
            proposalType: prop.proposalType,
            targetDocumentId: docKey,
            status: 'FULFILLED',
            fulfillingVersionId: matchingVer._id.toString(),
            fulfillingVersionNumber: matchingVer.versionNumber,
            fulfillingChecksum: matchingChecksum,
          });
        } else {
          proposalResults.push({
            proposalId: prop._id.toString(),
            proposalType: prop.proposalType,
            targetDocumentId: docKey,
            status: 'UNFULFILLED',
            details: 'No candidate version created on or after T_accept matched the proposed content hash',
          });
        }
      } else {
        proposalResults.push({
          proposalId: prop._id.toString(),
          proposalType: prop.proposalType,
          targetDocumentId: docKey,
          status: 'INDETERMINATE',
          indeterminacyReason: 'UNRECONSTRUCTABLE_PROPOSAL_CONTENT',
        });
      }
    } else if (prop.proposalType === ProposalType.TECHNICAL_CONTRACT_UPDATE) {
      if (prop.proposedChange && prop.proposedChange.contractSchema) {
        const expectedCanonicalSchema = canonicalizeJSON(prop.proposedChange.contractSchema);
        let matchingVer = null;
        let matchingChecksum = '';

        for (const candidate of docCandidates) {
          try {
            const candidateContent = await getVersionContent(candidate);
            const parsed = JSON.parse(candidateContent);
            const candidateCanonical = canonicalizeJSON(parsed);
            if (candidateCanonical === expectedCanonicalSchema) {
              matchingVer = candidate;
              matchingChecksum = await getVersionChecksum(candidate);
              break;
            }
          } catch {
            // Invalid JSON in candidate version, skip
          }
        }

        if (matchingVer) {
          proposalResults.push({
            proposalId: prop._id.toString(),
            proposalType: prop.proposalType,
            targetDocumentId: docKey,
            status: 'FULFILLED',
            fulfillingVersionId: matchingVer._id.toString(),
            fulfillingVersionNumber: matchingVer.versionNumber,
            fulfillingChecksum: matchingChecksum,
          });
        } else {
          proposalResults.push({
            proposalId: prop._id.toString(),
            proposalType: prop.proposalType,
            targetDocumentId: docKey,
            status: 'UNFULFILLED',
            details: 'No candidate version matched the proposed technical contract schema',
          });
        }
      } else {
        proposalResults.push({
          proposalId: prop._id.toString(),
          proposalType: prop.proposalType,
          targetDocumentId: docKey,
          status: 'INDETERMINATE',
          indeterminacyReason: 'UNRECONSTRUCTABLE_CONTRACT_SCHEMA',
        });
      }
    } else if (prop.proposalType === ProposalType.RELATIONSHIP_UPDATE) {
      const activeRels = await DocumentRelationship.find({
        $or: [{ sourceDocumentId: prop.targetDocumentId }, { targetDocumentId: prop.targetDocumentId }],
      });

      let allOpsSatisfied = true;
      const ops = prop.proposedChange?.relationshipOperations || [];

      for (const op of ops) {
        if (op.operation === 'ADD_RELATIONSHIP') {
          const exists = activeRels.some(
            (r) =>
              r.sourceDocumentId.toString() === prop.targetDocumentId.toString() &&
              r.targetDocumentId.toString() === op.targetDocumentId.toString() &&
              r.type === op.type,
          );
          if (!exists) allOpsSatisfied = false;
        } else if (op.operation === 'REMOVE_RELATIONSHIP') {
          const exists = activeRels.some(
            (r) =>
              r.sourceDocumentId.toString() === prop.targetDocumentId.toString() &&
              r.targetDocumentId.toString() === op.targetDocumentId.toString() &&
              r.type === op.type,
          );
          if (exists) allOpsSatisfied = false;
        }
      }

      if (allOpsSatisfied && ops.length > 0) {
        const headVer = docCandidates[docCandidates.length - 1] || (await DocumentVersion.findOne({ documentId: prop.targetDocumentId }).sort({ versionNumber: -1 }));
        if (headVer) {
          const headChecksum = await getVersionChecksum(headVer);
          proposalResults.push({
            proposalId: prop._id.toString(),
            proposalType: prop.proposalType,
            targetDocumentId: docKey,
            status: 'FULFILLED',
            fulfillingVersionId: headVer._id.toString(),
            fulfillingVersionNumber: headVer.versionNumber,
            fulfillingChecksum: headChecksum,
          });
        } else {
          proposalResults.push({
            proposalId: prop._id.toString(),
            proposalType: prop.proposalType,
            targetDocumentId: docKey,
            status: 'INDETERMINATE',
            indeterminacyReason: 'MISSING_DOCUMENT_VERSION',
          });
        }
      } else {
        proposalResults.push({
          proposalId: prop._id.toString(),
          proposalType: prop.proposalType,
          targetDocumentId: docKey,
          status: 'UNFULFILLED',
          details: 'Relationship operations were not satisfied in active relationships',
        });
      }
    } else if (prop.proposalType === ProposalType.DEPRECATION_PROPOSAL) {
      const doc = await Document.findById(prop.targetDocumentId);

      if (!doc) {
        proposalResults.push({
          proposalId: prop._id.toString(),
          proposalType: prop.proposalType,
          targetDocumentId: docKey,
          status: 'INDETERMINATE',
          indeterminacyReason: 'TARGET_DOCUMENT_NOT_FOUND',
        });
      } else if ((doc as any).status === 'DEPRECATED') {
        const headVer = docCandidates[docCandidates.length - 1] || (await DocumentVersion.findOne({ documentId: prop.targetDocumentId }).sort({ versionNumber: -1 }));
        if (headVer) {
          const headChecksum = await getVersionChecksum(headVer);
          proposalResults.push({
            proposalId: prop._id.toString(),
            proposalType: prop.proposalType,
            targetDocumentId: docKey,
            status: 'FULFILLED',
            fulfillingVersionId: headVer._id.toString(),
            fulfillingVersionNumber: headVer.versionNumber,
            fulfillingChecksum: headChecksum,
          });
        } else {
          proposalResults.push({
            proposalId: prop._id.toString(),
            proposalType: prop.proposalType,
            targetDocumentId: docKey,
            status: 'INDETERMINATE',
            indeterminacyReason: 'MISSING_DOCUMENT_VERSION',
          });
        }
      } else if (doc.isDeleted && (doc as any).status !== 'DEPRECATED') {
        proposalResults.push({
          proposalId: prop._id.toString(),
          proposalType: prop.proposalType,
          targetDocumentId: docKey,
          status: 'UNFULFILLED',
          details: 'Target document soft deleted without DEPRECATED status',
        });
      } else {
        proposalResults.push({
          proposalId: prop._id.toString(),
          proposalType: prop.proposalType,
          targetDocumentId: docKey,
          status: 'UNFULFILLED',
          details: `Target document status is ${doc.status}, expected DEPRECATED`,
        });
      }
    }
  }

  // Check Scope Variance (extraneous versions created after T_accept that were unrequested)
  for (const docObjId of targetDocObjIds) {
    const docKey = docObjId.toString();
    const docCandidates = versionsByDocMap.get(docKey) || [];
    const docPropResults = proposalResults.filter((r) => r.targetDocumentId === docKey && r.status === 'FULFILLED');

    if (docPropResults.length > 0 && docCandidates.length > docPropResults.length) {
      scopeVarianceDetails.push({
        documentId: docKey,
        varianceType: 'EXTRANEOUS_DOCUMENT_VERSIONS',
        description: `Target document ${docKey} has ${docCandidates.length} post-acceptance versions, but only ${docPropResults.length} were required by proposals.`,
      });
    }
  }

  // Package Aggregation
  let aggregatedStatus: FulfillmentStatus;
  const propStatuses = proposalResults.map((r) => r.status);

  if (propStatuses.every((s) => s === 'FULFILLED')) {
    aggregatedStatus = 'FULFILLED';
  } else if (propStatuses.every((s) => s === 'UNFULFILLED')) {
    aggregatedStatus = 'UNFULFILLED';
  } else if (propStatuses.some((s) => s === 'INDETERMINATE')) {
    aggregatedStatus = 'INDETERMINATE';
  } else if (propStatuses.some((s) => s === 'UNSUPPORTED')) {
    aggregatedStatus = 'UNSUPPORTED';
  } else {
    aggregatedStatus = 'PARTIALLY_FULFILLED';
  }

  const hasScopeVariance = scopeVarianceDetails.length > 0;
  let attestationEligibility: 'CLEAN_ATTESTATION_ELIGIBLE' | 'REQUIRES_SCOPE_REVIEW' | 'INELIGIBLE' = 'INELIGIBLE';

  if (aggregatedStatus === 'FULFILLED') {
    attestationEligibility = hasScopeVariance ? 'REQUIRES_SCOPE_REVIEW' : 'CLEAN_ATTESTATION_ELIGIBLE';
  }

  return {
    packageId: pkg._id.toString(),
    packageNumber: pkg.packageNumber,
    fulfillmentStatus: aggregatedStatus,
    hasScopeVariance,
    scopeVarianceDetails,
    attestationEligibility,
    proposalResults,
    acceptanceTimestamp: T_accept,
  };
}

/**
 * 3. Create Immutable Attestation
 * Persistent mutation. Requires WRITE / Project Owner / Admin access.
 */
export async function createAttestation(
  userId: string,
  role: 'user' | 'admin',
  packageId: string,
  input?: { acceptedScopeVariance?: boolean; scopeReviewComment?: string },
): Promise<IPackageFulfillmentAttestation> {
  const pkgObjId = new Types.ObjectId(packageId);
  const pkg = await DocumentChangePackage.findById(pkgObjId);

  if (!pkg) {
    throw new AppError('Change package not found', 404, 'PACKAGE_NOT_FOUND');
  }

  // Enforce WRITE / Owner / Admin access
  await verifyProjectOwnerOrAdmin(userId, role, pkg.projectId.toString());

  if (pkg.status !== PackageStatus.ACCEPTED) {
    throw new AppError('Only ACCEPTED change packages can be attested', 400, 'INVALID_PACKAGE_STATUS');
  }

  const verification = await verifyChangePackageFulfillment(userId, role, packageId);

  if (verification.fulfillmentStatus !== 'FULFILLED') {
    throw new AppError('Only FULFILLED change packages can be attested', 409, 'PACKAGE_NOT_FULFILLED');
  }

  if (verification.hasScopeVariance) {
    if (!input?.acceptedScopeVariance) {
      throw new AppError('Scope variance review required before attestation', 409, 'SCOPE_REVIEW_REQUIRED');
    }
  }

  // Compute next sequential attestation version
  const lastAttestation = await PackageFulfillmentAttestation.findOne({ changePackageId: pkg._id }).sort({ attestationVersion: -1 });
  const nextVersion = (lastAttestation?.attestationVersion || 0) + 1;

  // Build Snapshot Tuple
  const verifiedVersionSnapshot = verification.proposalResults.map((r) => ({
    documentId: new Types.ObjectId(r.targetDocumentId),
    proposalId: new Types.ObjectId(r.proposalId),
    documentVersionId: new Types.ObjectId(r.fulfillingVersionId!),
    versionNumber: r.fulfillingVersionNumber!,
    checksum: r.fulfillingChecksum!,
  }));

  const { fingerprint: packageFingerprint } = await computePackageStateFingerprint(packageId);

  const proposals = await DocumentChangeProposal.find({ _id: { $in: pkg.proposals } });
  const constituentProposals = proposals.map((p) => ({
    proposalId: p._id,
    proposalFingerprint: p.simulationStateFingerprint || '',
  }));

  const attestationData: Record<string, any> = {
    changePackageId: pkg._id,
    projectId: pkg.projectId,
    attestationVersion: nextVersion,
    packageStateFingerprint: packageFingerprint,
    constituentProposals,
    verifiedVersionSnapshot,
    fulfillmentStatus: 'FULFILLED',
    hasScopeVariance: verification.hasScopeVariance,
    scopeVarianceDetails: verification.scopeVarianceDetails.map((v) => ({
      documentId: new Types.ObjectId(v.documentId),
      varianceType: v.varianceType,
      description: v.description,
    })),
    acceptedScopeVariance: input?.acceptedScopeVariance || false,
    attestedBy: new Types.ObjectId(userId),
    attestedByRole: role,
  };

  if (input?.scopeReviewComment) {
    attestationData.scopeReviewComment = input.scopeReviewComment;
  }

  const attestation = await PackageFulfillmentAttestation.create(attestationData as any);

  // Log Audit Event
  try {
    if (proposals && proposals.length > 0 && proposals[0]?.targetDocumentId) {
      await createDocumentAudit(
        proposals[0].targetDocumentId.toString(),
        userId,
        'CHANGE_PACKAGE_ATTESTED' as any,
        {
          packageId: pkg._id.toString(),
          attestationId: (attestation as any)._id.toString(),
          attestationVersion: nextVersion,
          fulfillmentStatus: 'FULFILLED',
          hasScopeVariance: verification.hasScopeVariance,
        },
      );
    }
  } catch {
    // Safe audit fallback
  }

  return attestation;
}

/**
 * 4. Get Latest Attestation with Derived Staleness (Read-Only)
 */
export async function getLatestAttestation(
  userId: string,
  role: 'user' | 'admin',
  packageId: string,
): Promise<{ attestation: IPackageFulfillmentAttestation; derivedValidity: DerivedValidityDTO }> {
  const pkgObjId = new Types.ObjectId(packageId);
  const pkg = await DocumentChangePackage.findById(pkgObjId);

  if (!pkg) {
    throw new AppError('Change package not found', 404, 'PACKAGE_NOT_FOUND');
  }

  const hasAccess = await checkUserProjectReadAccess(userId, role, pkg.projectId.toString());
  if (!hasAccess) {
    throw new AppError('Unauthorized access to change package attestation', 403, 'FORBIDDEN');
  }

  const attestation = await PackageFulfillmentAttestation.findOne({ changePackageId: pkgObjId }).sort({ attestationVersion: -1 });

  if (!attestation) {
    throw new AppError('No attestation found for this change package', 404, 'PACKAGE_ATTESTATION_NOT_FOUND');
  }

  const driftDetails: DriftDetailItem[] = [];

  for (const snap of attestation.verifiedVersionSnapshot) {
    const headVer = await DocumentVersion.findOne({ documentId: snap.documentId }).sort({ versionNumber: -1 });
    if (headVer) {
      const headChecksum = await getVersionChecksum(headVer);
      if (headVer.versionNumber !== snap.versionNumber || headChecksum !== snap.checksum) {
        driftDetails.push({
          documentId: snap.documentId.toString(),
          snapshotVersion: snap.versionNumber,
          headVersion: headVer.versionNumber,
          snapshotChecksum: snap.checksum,
          headChecksum,
        });
      }
    }
  }

  const isStale = driftDetails.length > 0;
  const derivedValidity: DerivedValidityDTO = {
    isCurrentlyValid: !isStale,
    isStale,
    currentFulfillmentStatus: isStale ? 'STALE' : 'FULFILLED',
    driftDetails,
  };

  return {
    attestation,
    derivedValidity,
  };
}

/**
 * 5. List Historical Attestations
 */
export async function listHistoricalAttestations(
  userId: string,
  role: 'user' | 'admin',
  packageId: string,
): Promise<IPackageFulfillmentAttestation[]> {
  const pkgObjId = new Types.ObjectId(packageId);
  const pkg = await DocumentChangePackage.findById(pkgObjId);

  if (!pkg) {
    throw new AppError('Change package not found', 404, 'PACKAGE_NOT_FOUND');
  }

  const hasAccess = await checkUserProjectReadAccess(userId, role, pkg.projectId.toString());
  if (!hasAccess) {
    throw new AppError('Unauthorized access to change package attestations', 403, 'FORBIDDEN');
  }

  return PackageFulfillmentAttestation.find({ changePackageId: pkgObjId }).sort({ attestationVersion: 1 });
}

/**
 * 6. Get Historical Attestation by Version
 */
export async function getAttestationByVersion(
  userId: string,
  role: 'user' | 'admin',
  packageId: string,
  attestationVersion: number,
): Promise<IPackageFulfillmentAttestation> {
  const pkgObjId = new Types.ObjectId(packageId);
  const pkg = await DocumentChangePackage.findById(pkgObjId);

  if (!pkg) {
    throw new AppError('Change package not found', 404, 'PACKAGE_NOT_FOUND');
  }

  const hasAccess = await checkUserProjectReadAccess(userId, role, pkg.projectId.toString());
  if (!hasAccess) {
    throw new AppError('Unauthorized access to change package attestation', 403, 'FORBIDDEN');
  }

  const attestation = await PackageFulfillmentAttestation.findOne({
    changePackageId: pkgObjId,
    attestationVersion,
  });

  if (!attestation) {
    throw new AppError(`Attestation version ${attestationVersion} not found`, 404, 'ATTESTATION_VERSION_NOT_FOUND');
  }

  return attestation;
}

/**
 * 7. Derive Baseline Eligibility Handoff Payload
 * Reads latest attestation and derives handoff payload for Phase 12 Baselines.
 * NEVER invokes Phase 12 createBaseline internally!
 */
export async function deriveBaselineHandoffPayload(
  userId: string,
  role: 'user' | 'admin',
  packageId: string,
): Promise<BaselineEligibilityHandoffPayload> {
  const { attestation, derivedValidity } = await getLatestAttestation(userId, role, packageId);
  const pkg = await DocumentChangePackage.findById(attestation.changePackageId);

  return {
    packageId: attestation.changePackageId.toString(),
    packageNumber: pkg ? pkg.packageNumber : '',
    attestationId: (attestation as any)._id.toString(),
    attestationVersion: attestation.attestationVersion,
    isEligibleForBaseline: derivedValidity.isCurrentlyValid,
    baselineSnapshotInput: attestation.verifiedVersionSnapshot.map((s) => ({
      documentId: s.documentId.toString(),
      versionNumber: s.versionNumber,
      checksum: s.checksum,
    })),
  };
}
