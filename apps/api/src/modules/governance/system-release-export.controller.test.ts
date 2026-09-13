/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.hoisted(() => {
  process.env.NODE_ENV = 'test';
  process.env.MONGO_URI = 'mongodb://localhost:27017/documan-test';
  process.env.JWT_SECRET = 'test-secret-key-that-is-at-least-32-characters-long';
});

import request from 'supertest';
import { app } from '../../app.js';
import * as jwtUtils from '../../utils/jwt.js';
import { User } from '../users/user.model.js';
import { AppError } from '../../errors/app-error.js';
import * as exportService from './system-release-export.service.js';

vi.mock('../users/user.model.js');
vi.mock('../projects/project.model.js');
vi.mock('./system-release-certificate.model.js');
vi.mock('../projects/project-topology.service.js');
vi.mock('./system-release-export.service.js');

describe('POST /api/v1/projects/:projectId/release-certificates/:certificateId/export/json', () => {
  const mockUserId = '507f1f77bcf86cd799439011';
  const mockProjectId = '507f1f77bcf86cd799439022';
  const mockCertId = '507f1f77bcf86cd799439033';
  let validAuthToken: string;

  beforeEach(() => {
    vi.clearAllMocks();
    validAuthToken = jwtUtils.generateAccessToken(mockUserId);

    const mockUserDoc: any = {
      _id: mockUserId,
      id: mockUserId,
      role: 'user',
      isActive: true,
      name: 'Auditor User',
      email: 'auditor@example.com',
    };

    vi.spyOn(User, 'findById').mockImplementation(() => {
      const queryObj: any = {
        select: vi.fn().mockImplementation(() => queryObj),
        lean: vi.fn().mockResolvedValue(mockUserDoc),
        exec: vi.fn().mockResolvedValue(mockUserDoc),
        then: (onFulfilled: any) => Promise.resolve(mockUserDoc).then(onFulfilled),
      };
      return queryObj;
    });
  });

  it('should return 401 Unauthorized when request lacks JWT authentication token', async () => {
    const res = await request(app)
      .post(`/api/v1/projects/${mockProjectId}/release-certificates/${mockCertId}/export/json`)
      .send();

    expect(res.status).toBe(401);
  });

  it('should return 403 Forbidden when user lacks read access to project', async () => {
    vi.spyOn(exportService, 'generateReleaseCertificateExportBundle').mockRejectedValue(
      new AppError('Access denied to project', 403, 'FORBIDDEN')
    );

    const res = await request(app)
      .post(`/api/v1/projects/${mockProjectId}/release-certificates/${mockCertId}/export/json`)
      .set('Authorization', `Bearer ${validAuthToken}`)
      .send();

    expect(res.status).toBe(403);
  });

  it('should return 404 Not Found when certificate does not exist', async () => {
    vi.spyOn(exportService, 'generateReleaseCertificateExportBundle').mockRejectedValue(
      new AppError('Release certificate not found', 404, 'NOT_FOUND')
    );

    const res = await request(app)
      .post(`/api/v1/projects/${mockProjectId}/release-certificates/${mockCertId}/export/json`)
      .set('Authorization', `Bearer ${validAuthToken}`)
      .send();

    expect(res.status).toBe(404);
  });

  it('should return 200 OK with correct JSON payload and attachment headers on valid export', async () => {
    const mockExportBundle: any = {
      exportSchemaVersion: '1.0',
      exportMetadata: {
        generatedAt: '2026-09-13T20:00:00.000Z',
        generatedByUserId: mockUserId,
        generatedByUserName: 'Auditor User',
        exportBundleDigest: 'a1b2c3d4e5f678901234567890abcdef1234567890abcdef1234567890abcdef',
      },
      releaseCertificate: {
        certificateId: mockCertId,
        rootProjectId: mockProjectId,
        rootProjectName: 'Core Platform',
        releaseTag: 'v1.0.0',
        certificateVersion: 1,
        certificateStatus: 'ACTIVE',
        systemReleaseStatus: 'PASSED',
        certificateHash: 'hash_abc123',
        certifiedByUserId: mockUserId,
        certifiedAt: '2026-01-01T00:00:00Z',
        lifecycleEvents: [],
        snapshot: {},
      },
      complianceDriftAudit: {
        auditTimestamp: '2026-09-13T20:00:00.000Z',
        complianceStatus: 'FULLY_COMPLIANT',
        matchesCertifiedState: true,
        isIntegrityVerified: true,
        varianceSummary: {
          topologyVarianceCount: 0,
          baselineVarianceCount: 0,
          contractVarianceCount: 0,
          waiverVarianceCount: 0,
          attestationVarianceCount: 0,
        },
        varianceExplanations: [],
        nextReviewConsiderations: [],
        topologyDeltas: { addedNodes: [], removedNodes: [], addedEdges: [], removedEdges: [] },
        baselineDeltas: [],
        contractDeltas: [],
        waiverDeltas: [],
        attestationDeltas: [],
      },
    };

    vi.spyOn(exportService, 'generateReleaseCertificateExportBundle').mockResolvedValue(mockExportBundle);

    const res = await request(app)
      .post(`/api/v1/projects/${mockProjectId}/release-certificates/${mockCertId}/export/json`)
      .set('Authorization', `Bearer ${validAuthToken}`)
      .send();

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toContain('application/json');
    expect(res.headers['content-disposition']).toContain('attachment; filename="release-certificate-v1.0.0-attestation-bundle.json"');

    const body = res.body;
    expect(body.exportSchemaVersion).toBe('1.0');
    expect(body.exportMetadata.exportBundleDigest).toBe('a1b2c3d4e5f678901234567890abcdef1234567890abcdef1234567890abcdef');
    expect(body.releaseCertificate.releaseTag).toBe('v1.0.0');
    expect(body.complianceDriftAudit.complianceStatus).toBe('FULLY_COMPLIANT');

    // Verify sensitive properties are not present
    const rawText = JSON.stringify(body);
    expect(rawText).not.toContain('password');
    expect(rawText).not.toContain('refreshToken');
    expect(rawText).not.toContain('hmacSecret');
  });
});
