import { Router } from 'express';
import { authenticate } from '../../middleware/auth.middleware.js';
import {
  handleCreateChangePackage,
  handleListProjectChangePackages,
  handleGetChangePackageDetails,
  handleAddProposalToPackage,
  handleRemoveProposalFromPackage,
  handleSimulateChangePackage,
  handleUpdatePackageStatus,
  handleAcceptChangePackage,
} from './change-package.controller.js';
import {
  handleVerifyPackageFulfillment,
  handleCreatePackageAttestation,
  handleListPackageAttestations,
  handleGetPackageAttestationByVersion,
  handleGetLatestPackageAttestation,
  handleDeriveBaselineHandoff,
} from './change-package-attestation.controller.js';

export const changePackageRouter = Router();

// Project level package endpoints
changePackageRouter.post(
  '/projects/:projectId/change-packages',
  authenticate,
  handleCreateChangePackage,
);

changePackageRouter.get(
  '/projects/:projectId/change-packages',
  authenticate,
  handleListProjectChangePackages,
);

// Package level endpoints
changePackageRouter.get(
  '/change-packages/:id',
  authenticate,
  handleGetChangePackageDetails,
);

changePackageRouter.post(
  '/change-packages/:id/proposals',
  authenticate,
  handleAddProposalToPackage,
);

changePackageRouter.delete(
  '/change-packages/:id/proposals/:proposalId',
  authenticate,
  handleRemoveProposalFromPackage,
);

changePackageRouter.post(
  '/change-packages/:id/simulate',
  authenticate,
  handleSimulateChangePackage,
);

changePackageRouter.patch(
  '/change-packages/:id/status',
  authenticate,
  handleUpdatePackageStatus,
);

changePackageRouter.post(
  '/change-packages/:id/accept',
  authenticate,
  handleAcceptChangePackage,
);

// Phase 17: Fulfillment Verification & Immutable Attestation
changePackageRouter.post(
  '/change-packages/:id/verify-fulfillment',
  authenticate,
  handleVerifyPackageFulfillment,
);

changePackageRouter.post(
  '/change-packages/:id/attestations',
  authenticate,
  handleCreatePackageAttestation,
);

changePackageRouter.get(
  '/change-packages/:id/attestations',
  authenticate,
  handleListPackageAttestations,
);

changePackageRouter.get(
  '/change-packages/:id/attestation',
  authenticate,
  handleGetLatestPackageAttestation,
);

changePackageRouter.get(
  '/change-packages/:id/attestations/:attestationVersion',
  authenticate,
  handleGetPackageAttestationByVersion,
);

changePackageRouter.get(
  '/change-packages/:id/baseline-handoff',
  authenticate,
  handleDeriveBaselineHandoff,
);
