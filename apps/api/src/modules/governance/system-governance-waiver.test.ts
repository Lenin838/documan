import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Types } from 'mongoose';
import {
  computeActiveScopeKey,
  SystemGovernanceWaiver,
} from './system-governance-waiver.model.js';
import {
  verifySystemWaiverAuthority,
} from './system-governance-waiver.service.js';
import { matchWaiverForDependency } from './system-topology-governance-gate.service.js';
import { Project } from '../projects/project.model.js';

vi.mock('../projects/project.model.js');
vi.mock('../documents/document.model.js');
vi.mock('../documents/document-audit.service.js');
vi.mock('../projects/project-topology.service.js', () => ({
  checkUserProjectReadAccess: vi.fn().mockResolvedValue(true),
}));

describe('Phase 20 — System Governance Waiver Service & Matching Unit Tests', () => {
  const mockUserId = new Types.ObjectId().toString();
  const mockOwnerId = new Types.ObjectId().toString();
  const mockRootProjectId = new Types.ObjectId().toString();
  const mockProviderProjectId = new Types.ObjectId().toString();
  const mockDocumentId = new Types.ObjectId().toString();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Active Scope Key Computation', () => {
    it('computes deterministic activeScopeKey format', () => {
      const key1 = computeActiveScopeKey(
        mockRootProjectId,
        mockProviderProjectId,
        'CONTRACT_MISALIGNED',
        mockDocumentId,
        1,
      );
      expect(key1).toBe(`${mockRootProjectId}:${mockProviderProjectId}:${mockDocumentId}:v1:CONTRACT_MISALIGNED`);

      const key2 = computeActiveScopeKey(
        mockRootProjectId,
        mockProviderProjectId,
        'PROVIDER_ATTESTATION_MISSING',
        null,
        null,
      );
      expect(key2).toBe(`${mockRootProjectId}:${mockProviderProjectId}:ALL_DOCS:ANY_VER:PROVIDER_ATTESTATION_MISSING`);
    });
  });

  describe('verifySystemWaiverAuthority', () => {
    it('grants authority to System Admin', async () => {
      const auth = await verifySystemWaiverAuthority(mockUserId, 'admin', mockRootProjectId, mockProviderProjectId);
      expect(auth).toBe(true);
    });

    it('grants authority to Root Project Owner', async () => {
      vi.mocked(Project.findOne).mockResolvedValueOnce({
        _id: new Types.ObjectId(mockRootProjectId),
        ownerId: new Types.ObjectId(mockUserId),
      } as unknown as InstanceType<typeof Project>);

      const auth = await verifySystemWaiverAuthority(mockUserId, 'user', mockRootProjectId, mockProviderProjectId);
      expect(auth).toBe(true);
    });

    it('grants authority to Target Provider Project Owner', async () => {
      vi.mocked(Project.findOne)
        .mockResolvedValueOnce({
          _id: new Types.ObjectId(mockRootProjectId),
          ownerId: new Types.ObjectId(mockOwnerId),
        } as unknown as InstanceType<typeof Project>)
        .mockResolvedValueOnce({
          _id: new Types.ObjectId(mockProviderProjectId),
          ownerId: new Types.ObjectId(mockUserId),
        } as unknown as InstanceType<typeof Project>);

      const auth = await verifySystemWaiverAuthority(mockUserId, 'user', mockRootProjectId, mockProviderProjectId);
      expect(auth).toBe(true);
    });

    it('rejects ordinary shared user with 403 FORBIDDEN', async () => {
      vi.mocked(Project.findOne)
        .mockResolvedValueOnce({
          _id: new Types.ObjectId(mockRootProjectId),
          ownerId: new Types.ObjectId(mockOwnerId),
        } as unknown as InstanceType<typeof Project>)
        .mockResolvedValueOnce({
          _id: new Types.ObjectId(mockProviderProjectId),
          ownerId: new Types.ObjectId(mockOwnerId),
        } as unknown as InstanceType<typeof Project>);

      await expect(
        verifySystemWaiverAuthority(mockUserId, 'user', mockRootProjectId, mockProviderProjectId),
      ).rejects.toThrow('Forbidden: Granting or revoking system governance waivers requires Root Project Owner, Provider Project Owner, or Admin authority');
    });
  });

  describe('matchWaiverForDependency Algorithm', () => {
    const activeWaivers = [
      {
        _id: new Types.ObjectId(),
        rootProjectId: new Types.ObjectId(mockRootProjectId),
        targetProviderProjectId: new Types.ObjectId(mockProviderProjectId),
        targetDocumentId: new Types.ObjectId(mockDocumentId),
        contractVersionNumber: 1,
        blockerType: 'PROVIDER_LOCAL_GATE_BLOCKED',
        activeScopeKey: 'test-key-1',
        scopeState: 'ACTIVE',
        reason: 'Testing local gate waiver',
        grantedByUserId: new Types.ObjectId(mockUserId),
        expiresAt: new Date(Date.now() + 86400000),
        isRevoked: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        _id: new Types.ObjectId(),
        rootProjectId: new Types.ObjectId(mockRootProjectId),
        targetProviderProjectId: new Types.ObjectId(mockProviderProjectId),
        targetDocumentId: null,
        contractVersionNumber: 1,
        blockerType: 'CONTRACT_MISALIGNED',
        activeScopeKey: 'test-key-2',
        scopeState: 'ACTIVE',
        reason: 'Testing version 1 contract mismatch waiver',
        grantedByUserId: new Types.ObjectId(mockUserId),
        expiresAt: new Date(Date.now() + 86400000),
        isRevoked: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];

    it('matches exact provider, document, and version for local gate blocker', () => {
      const match = matchWaiverForDependency(
        'PROVIDER_LOCAL_GATE_BLOCKED',
        mockProviderProjectId,
        mockDocumentId,
        1,
        activeWaivers as unknown as InstanceType<typeof SystemGovernanceWaiver>[],
      );
      expect(match).toBeDefined();
      expect(match?.reason).toBe('Testing local gate waiver');
    });

    it('rejects provider local gate blocker match when target document differs', () => {
      const differentDocId = new Types.ObjectId().toString();
      const match = matchWaiverForDependency(
        'PROVIDER_LOCAL_GATE_BLOCKED',
        mockProviderProjectId,
        differentDocId,
        1,
        activeWaivers as unknown as InstanceType<typeof SystemGovernanceWaiver>[],
      );
      expect(match).toBeUndefined();
    });

    it('strictly enforces version binding (v1 waiver does NOT match v2)', () => {
      const match = matchWaiverForDependency(
        'CONTRACT_MISALIGNED',
        mockProviderProjectId,
        null,
        2, // Baseline updated to v2
        activeWaivers as unknown as InstanceType<typeof SystemGovernanceWaiver>[],
      );
      expect(match).toBeUndefined();
    });
  });
});
