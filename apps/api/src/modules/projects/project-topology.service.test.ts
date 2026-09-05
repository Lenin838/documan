/* eslint-disable @typescript-eslint/no-explicit-any */
import { Types } from 'mongoose';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { Project } from './project.model.js';
import { ProjectTopologyLink } from './project-topology.model.js';
import {
  createProjectTopologyLink,
  getProjectArchitectureGraph,
} from './project-topology.service.js';

vi.mock('./project.model.js', () => ({
  Project: {
    findOne: vi.fn(),
    findById: vi.fn(),
  },
}));

vi.mock('./project-topology.model.js', () => ({
  ProjectTopologyLink: {
    create: vi.fn(),
    findOne: vi.fn(),
    find: vi.fn(),
    findById: vi.fn(),
  },
}));

vi.mock('../documents/document.model.js', () => ({
  Document: {
    exists: vi.fn().mockResolvedValue(false),
    find: vi.fn().mockImplementation(() => ({
      select: vi.fn().mockResolvedValue([]),
    })),
  },
}));

vi.mock('../document-shares/document-share.model.js', () => ({
  DocumentShare: {
    exists: vi.fn(),
    find: vi.fn(),
  },
}));

vi.mock('../documents/document-relationship.model.js', () => ({
  DocumentRelationship: {
    find: vi.fn(),
  },
}));

vi.mock('../documents/document-audit.model.js', () => ({
  DocumentAudit: {
    create: vi.fn().mockResolvedValue({}),
  },
}));

describe('Project Topology Service Unit Tests', () => {
  const OWNER_ID = '507f1f77bcf86cd799439011';
  const OTHER_USER_ID = '507f1f77bcf86cd799439022';
  const PROJ_A_ID = '507f1f77bcf86cd799439033';
  const PROJ_B_ID = '507f1f77bcf86cd799439044';
  const LINK_ID = '507f1f77bcf86cd799439055';

  const mockProjectA = {
    _id: new Types.ObjectId(PROJ_A_ID),
    name: 'Auth Service',
    ownerId: new Types.ObjectId(OWNER_ID),
    isArchived: false,
  };

  const mockProjectB = {
    _id: new Types.ObjectId(PROJ_B_ID),
    name: 'Payment Service',
    ownerId: new Types.ObjectId(OTHER_USER_ID),
    isArchived: false,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createProjectTopologyLink', () => {
    it('rejects self-referencing project topology link', async () => {
      await expect(
        createProjectTopologyLink(OWNER_ID, 'user', PROJ_A_ID, {
          targetProjectId: PROJ_A_ID,
          type: 'DEPENDS_ON',
        }),
      ).rejects.toThrow('Self-referencing project topology links are invalid');
    });

    it('rejects creation if user is not project owner or admin', async () => {
      vi.mocked(Project.findOne).mockResolvedValueOnce(mockProjectA as any);

      await expect(
        createProjectTopologyLink(OTHER_USER_ID, 'user', PROJ_A_ID, {
          targetProjectId: PROJ_B_ID,
          type: 'DEPENDS_ON',
        }),
      ).rejects.toThrow('Forbidden: Only project owner or admin can perform this operation');
    });

    it('rejects semantic inverse duplicate topology link (PROVIDES_API_TO vs DEPENDS_ON)', async () => {
      vi.mocked(Project.findOne)
        .mockResolvedValueOnce(mockProjectA as any) // source
        .mockResolvedValueOnce(mockProjectB as any); // target

      vi.mocked(ProjectTopologyLink.findOne)
        .mockResolvedValueOnce(null) // direct check
        .mockResolvedValueOnce({ _id: new Types.ObjectId() } as any); // inverse check

      await expect(
        createProjectTopologyLink(OWNER_ID, 'user', PROJ_A_ID, {
          targetProjectId: PROJ_B_ID,
          type: 'DEPENDS_ON',
        }),
      ).rejects.toThrow('Semantic duplicate topology concept already exists in inverse direction');
    });

    it('successfully creates topology link when authorized and non-duplicate', async () => {
      vi.mocked(Project.findOne)
        .mockResolvedValueOnce(mockProjectA as any)
        .mockResolvedValueOnce(mockProjectB as any);

      vi.mocked(ProjectTopologyLink.findOne).mockResolvedValue(null);

      const mockNewLink = {
        _id: new Types.ObjectId(LINK_ID),
        sourceProjectId: new Types.ObjectId(PROJ_A_ID),
        targetProjectId: new Types.ObjectId(PROJ_B_ID),
        type: 'PROVIDES_API_TO',
      };
      vi.mocked(ProjectTopologyLink.create).mockResolvedValueOnce(mockNewLink as any);

      const result = await createProjectTopologyLink(OWNER_ID, 'user', PROJ_A_ID, {
        targetProjectId: PROJ_B_ID,
        type: 'PROVIDES_API_TO',
      });

      expect(result.type).toBe('PROVIDES_API_TO');
      expect(ProjectTopologyLink.create).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'PROVIDES_API_TO',
        }),
      );
    });
  });

  describe('getProjectArchitectureGraph Privacy Rules', () => {
    it('completely omits unauthorized project nodes and edges from the graph', async () => {
      // User has read access to Project A, but NOT Project B
      vi.mocked(Project.findOne).mockImplementation(((query: any) => {
        if (query._id && query._id.toString() === PROJ_A_ID) return Promise.resolve(mockProjectA as any);
        if (query._id && query._id.toString() === PROJ_B_ID) return Promise.resolve(mockProjectB as any);
        return Promise.resolve(null);
      }) as any);

      vi.mocked(Project.findById).mockReturnValueOnce({
        select: vi.fn().mockResolvedValue(mockProjectA),
      } as any);

      const mockLink = {
        _id: new Types.ObjectId(LINK_ID),
        sourceProjectId: mockProjectA,
        targetProjectId: mockProjectB,
        type: 'PROVIDES_API_TO',
      };

      vi.mocked(ProjectTopologyLink.find).mockReturnValue({
        populate: vi.fn().mockResolvedValue([mockLink]),
      } as any);

      // Caller is OWNER_ID. OWNER_ID has access to PROJ_A, but NOT PROJ_B (owner is OTHER_USER_ID)
      const graph = await getProjectArchitectureGraph(OWNER_ID, 'user', PROJ_A_ID);

      // Node map should only contain Project A, Project B must be completely omitted
      expect(graph.nodes.length).toBe(1);
      expect(graph.nodes[0]!.id).toBe(PROJ_A_ID);
      expect(graph.nodes.some((n) => n.id === PROJ_B_ID)).toBe(false);
      expect(graph.edges.length).toBe(0);
    });
  });
});
