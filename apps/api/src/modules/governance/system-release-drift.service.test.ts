/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { auditReleaseCertificateComplianceDrift } from './system-release-drift.service.js';
import { SystemReleaseCertificate } from './system-release-certificate.model.js';
import { checkUserProjectReadAccess } from '../projects/project-topology.service.js';
import { verifyCertificateIntegrity } from './system-release-certificate.service.js';
import { evaluateSystemTopologyGovernanceGate } from './system-topology-governance-gate.service.js';
import { DocumentationBaseline } from './documentation-baseline.model.js';
import { SystemGovernanceWaiver } from './system-governance-waiver.model.js';
import { Project } from '../projects/project.model.js';
import { ProjectTopologyLink } from '../projects/project-topology.model.js';
import { PackageFulfillmentAttestation } from '../change-packages/change-package-attestation.model.js';

vi.mock('../projects/project.model.js');
vi.mock('../projects/project-topology.model.js');
vi.mock('../projects/project-topology.service.js');
vi.mock('./system-release-certificate.service.js');
vi.mock('./system-topology-governance-gate.service.js');
vi.mock('./system-release-certificate.model.js');
vi.mock('./documentation-baseline.model.js');
vi.mock('./system-governance-waiver.model.js');
vi.mock('../change-packages/change-package-attestation.model.js');

describe('system-release-drift.service', () => {
  const mockUserId = '507f1f77bcf86cd799439011';
  const mockCertId = '507f1f77bcf86cd799439022';
  const mockRootProjectId = '507f1f77bcf86cd799439033';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('throws 404 CERTIFICATE_NOT_FOUND when certificate does not exist', async () => {
    vi.mocked(SystemReleaseCertificate.findById).mockResolvedValue(null as any);

    await expect(
      auditReleaseCertificateComplianceDrift(mockUserId, mockCertId, 'user')
    ).rejects.toThrow('Release certificate not found');
  });

  it('throws 403 FORBIDDEN when user lacks read access on root project', async () => {
    const mockCertDoc = {
      _id: mockCertId,
      rootProjectId: mockRootProjectId,
      releaseTag: 'v1.0.0',
      certificateStatus: 'ACTIVE',
      systemReleaseStatus: 'PASSED',
      certifiedAt: new Date('2026-01-01T00:00:00Z'),
      snapshot: {
        rootProjectId: mockRootProjectId,
        releaseTag: 'v1.0.0',
        topologyNodes: [{ projectId: mockRootProjectId, projectName: 'Root', isGovernanceEnabled: true, localGatePassed: true }],
        topologyEdges: [],
        activeBaselines: [],
        activeAttestations: [],
        activeWaivers: [],
        evidenceSummary: { totalApplicableContracts: 1, systemAlignmentScore: 100 },
      },
    };

    vi.mocked(SystemReleaseCertificate.findById).mockResolvedValue(mockCertDoc as any);
    vi.mocked(checkUserProjectReadAccess).mockResolvedValue(false);

    await expect(
      auditReleaseCertificateComplianceDrift(mockUserId, mockCertId, 'user')
    ).rejects.toThrow('Access denied to project');
  });

  it('audits compliance drift for an ACTIVE certificate returning FULLY_COMPLIANT when zero material variance exists', async () => {
    const mockCertDoc = {
      _id: mockCertId,
      rootProjectId: mockRootProjectId,
      releaseTag: 'v1.0.0',
      certificateStatus: 'ACTIVE',
      systemReleaseStatus: 'PASSED',
      certifiedAt: new Date('2026-01-01T00:00:00Z'),
      snapshot: {
        rootProjectId: mockRootProjectId,
        releaseTag: 'v1.0.0',
        topologyNodes: [{ projectId: mockRootProjectId, projectName: 'Root', isGovernanceEnabled: true, localGatePassed: true }],
        topologyEdges: [],
        activeBaselines: [
          {
            projectId: mockRootProjectId,
            projectName: 'Root',
            baselineId: 'b1',
            versionTag: 'v1.0.0',
            documentSnapshotsCount: 1,
            createdTimestamp: '2026-01-01T00:00:00Z',
          },
        ],
        activeAttestations: [],
        activeWaivers: [],
        evidenceSummary: { totalApplicableContracts: 1, systemAlignmentScore: 100 },
      },
    };

    vi.mocked(SystemReleaseCertificate.findById).mockResolvedValue(mockCertDoc as any);
    vi.mocked(checkUserProjectReadAccess).mockResolvedValue(true);
    vi.mocked(verifyCertificateIntegrity).mockResolvedValue({
      certificateId: mockCertId,
      releaseTag: 'v1.0.0',
      integrity: { isHashValid: true, computedHash: 'h1', storedHash: 'h1', integrityStatus: 'INTEGRITY_VERIFIED' },
      lifecycle: { status: 'ACTIVE', certifiedAt: '2026-01-01T00:00:00Z', certifiedByUserId: 'u1', lifecycleEvents: [] },
      currentLiveSystem: { currentSystemReleaseStatus: 'PASSED', matchesCertifiedState: true },
    } as any);

    vi.mocked(Project.findById).mockReturnValue({
      lean: vi.fn().mockResolvedValue({ _id: mockRootProjectId, name: 'Root Project', isGovernanceEnabled: true }),
    } as any);

    vi.mocked(Project.find).mockReturnValue({
      lean: vi.fn().mockResolvedValue([{ _id: mockRootProjectId, name: 'Root Project', isGovernanceEnabled: true }]),
    } as any);

    vi.mocked(ProjectTopologyLink.find).mockReturnValue({
      lean: vi.fn().mockResolvedValue([]),
    } as any);

    vi.mocked(evaluateSystemTopologyGovernanceGate).mockResolvedValue({
      topologyNodes: [{ projectId: mockRootProjectId, projectName: 'Root', isGovernanceEnabled: true, localGatePassed: true }],
      topologyEdges: [],
    } as any);

    vi.mocked(DocumentationBaseline.find).mockReturnValue({
      lean: vi.fn().mockResolvedValue([
        { _id: 'b1', projectId: mockRootProjectId, projectName: 'Root', versionTag: 'v1.0.0' },
      ]),
      exec: vi.fn().mockResolvedValue([]),
    } as any);

    vi.mocked(SystemGovernanceWaiver.find).mockReturnValue({
      lean: vi.fn().mockResolvedValue([]),
    } as any);

    vi.mocked(PackageFulfillmentAttestation.find).mockReturnValue({
      lean: vi.fn().mockResolvedValue([]),
    } as any);

    const result = await auditReleaseCertificateComplianceDrift(mockUserId, mockCertId, 'user');

    expect(result.complianceStatus).toBe('FULLY_COMPLIANT');
    expect(result.auditMetadata.certificateStatus).toBe('ACTIVE');
    expect(result.varianceExplanations).toContain(
      'No material variance detected between historical certificate snapshot and current live system state.'
    );
  });
});
