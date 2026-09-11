import { Router } from 'express';
import { authenticate } from '../../middleware/auth.middleware.js';
import {
  evaluatePreCertificationHandler,
  issueReleaseCertificateHandler,
  listReleaseCertificatesHandler,
  getReleaseCertificateDetailsHandler,
  verifyCertificateIntegrityHandler,
  revokeReleaseCertificateHandler,
} from './system-release-certificate.controller.js';
import {
  compareReleaseCertificatesHandler,
  getCertificateLineageGraphHandler,
} from './system-release-lineage.controller.js';

const router = Router();

// Phase 28 Release Certificate Lineage & Comparison endpoints
router.post('/release-certificates/compare', authenticate, compareReleaseCertificatesHandler);
router.get('/projects/:projectId/release-certificates/lineage', authenticate, getCertificateLineageGraphHandler);

// Phase 27 System Release Certificate endpoints
router.post('/projects/:projectId/release-certificates/pre-check', authenticate, evaluatePreCertificationHandler);
router.post('/projects/:projectId/release-certificates', authenticate, issueReleaseCertificateHandler);
router.get('/projects/:projectId/release-certificates', authenticate, listReleaseCertificatesHandler);
router.get('/projects/:projectId/release-certificates/:certificateId', authenticate, getReleaseCertificateDetailsHandler);
router.post('/projects/:projectId/release-certificates/:certificateId/verify', authenticate, verifyCertificateIntegrityHandler);
router.post('/projects/:projectId/release-certificates/:certificateId/revoke', authenticate, revokeReleaseCertificateHandler);

export default router;
