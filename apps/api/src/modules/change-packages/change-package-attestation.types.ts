import { Types } from 'mongoose';

export type FulfillmentStatus =
  | 'FULFILLED'
  | 'PARTIALLY_FULFILLED'
  | 'UNFULFILLED'
  | 'INDETERMINATE'
  | 'UNSUPPORTED'
  | 'STALE';

export type AttestationEligibility =
  | 'CLEAN_ATTESTATION_ELIGIBLE'
  | 'REQUIRES_SCOPE_REVIEW'
  | 'INELIGIBLE';

export interface ProposalVerificationResult {
  proposalId: string;
  proposalType: string;
  targetDocumentId: string;
  status: FulfillmentStatus;
  indeterminacyReason?: string;
  fulfillingVersionId?: string;
  fulfillingVersionNumber?: number;
  fulfillingChecksum?: string;
  details?: string;
}

export interface ScopeVarianceItem {
  documentId: string;
  varianceType: string;
  description: string;
}

export interface PackageVerificationResultDTO {
  packageId: string;
  packageNumber: string;
  fulfillmentStatus: FulfillmentStatus;
  hasScopeVariance: boolean;
  scopeVarianceDetails: ScopeVarianceItem[];
  attestationEligibility: AttestationEligibility;
  proposalResults: ProposalVerificationResult[];
  acceptanceTimestamp?: Date;
  indeterminacyReason?: string;
}

export interface VerifiedVersionSnapshotItem {
  documentId: Types.ObjectId | string;
  proposalId: Types.ObjectId | string;
  documentVersionId: Types.ObjectId | string;
  versionNumber: number;
  checksum: string;
}

export interface BaselineEligibilityHandoffPayload {
  packageId: string;
  packageNumber: string;
  attestationId: string;
  attestationVersion: number;
  isEligibleForBaseline: boolean;
  baselineSnapshotInput: Array<{
    documentId: string;
    versionNumber: number;
    checksum: string;
  }>;
}

export interface DriftDetailItem {
  documentId: string;
  snapshotVersion: number;
  headVersion: number;
  snapshotChecksum: string;
  headChecksum: string;
}

export interface DerivedValidityDTO {
  isCurrentlyValid: boolean;
  isStale: boolean;
  currentFulfillmentStatus: FulfillmentStatus;
  driftDetails: DriftDetailItem[];
}
