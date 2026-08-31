/* eslint-disable @typescript-eslint/no-explicit-any */
import { Types } from 'mongoose';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { Project } from './project.model.js';
import {
  createProject,
  getProjects,
  getProjectById,
  updateProject,
  archiveProject,
  getProjectDocuments,
  assignDocumentToProject,
  removeDocumentFromProject,
} from './project.service.js';
import { Document } from '../documents/document.model.js';
import { DocumentShare } from '../document-shares/document-share.model.js';
import * as auditService from '../documents/document-audit.service.js';

vi.mock('./project.model.js', () => ({
  Project: {
    create: vi.fn(),
    find: vi.fn(),
    findOne: vi.fn(),
  },
}));

vi.mock('../documents/document.model.js', () => ({
  Document: {
    find: vi.fn(),
    findOne: vi.fn(),
    distinct: vi.fn(),
    countDocuments: vi.fn(),
  },
}));

vi.mock('../document-shares/document-share.model.js', () => ({
  DocumentShare: {
    find: vi.fn(),
    findOne: vi.fn(),
  },
}));

vi.mock('../documents/document-audit.service.js', () => ({
  createDocumentAudit: vi.fn().mockResolvedValue({}),
}));

describe('Project Service Security & Functionality Tests', () => {
  const OWNER_ID = '507f1f77bcf86cd799439011';
  const OTHER_USER_ID = '507f1f77bcf86cd799439022';
  const PROJECT_ID = '507f1f77bcf86cd799439033';
  const DOC_ID = '507f1f77bcf86cd799439044';

  const mockProject = {
    _id: new Types.ObjectId(PROJECT_ID),
    name: 'Payment Infrastructure',
    description: 'Payment gateway migration',
    ownerId: new Types.ObjectId(OWNER_ID),
    isArchived: false,
    createdAt: new Date(),
    updatedAt: new Date(),
    save: vi.fn().mockResolvedValue(this),
  };

  const mockDocument = {
    _id: new Types.ObjectId(DOC_ID),
    title: 'Payment Spec',
    fileName: 'spec.pdf',
    fileType: 'application/pdf',
    fileSize: 1024,
    ownerId: new Types.ObjectId(OWNER_ID),
    projectId: new Types.ObjectId(PROJECT_ID),
    isDeleted: false,
    createdAt: new Date(),
    updatedAt: new Date(),
    save: vi.fn().mockResolvedValue(this),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createProject', () => {
    it('creates project with logged-in user as owner', async () => {
      vi.mocked(Project.create).mockResolvedValue(mockProject as any);

      const result = await createProject(OWNER_ID, 'user', {
        name: 'Payment Infrastructure',
        description: 'Payment gateway migration',
      });

      expect(result.id).toBe(PROJECT_ID);
      expect(result.ownerId).toBe(OWNER_ID);
      expect(result.name).toBe('Payment Infrastructure');
    });
  });

  describe('getProjects', () => {
    it('1. Owner can view own projects', async () => {
      const mockFind = {
        sort: vi.fn().mockResolvedValue([mockProject]),
      };
      vi.mocked(Project.find).mockReturnValue(mockFind as any);
      vi.mocked(Document.distinct).mockResolvedValue([]);
      vi.mocked(DocumentShare.find).mockReturnValue({
        select: vi.fn().mockResolvedValue([]),
      } as any);

      const projects = await getProjects(OWNER_ID, 'user');
      expect(projects).toHaveLength(1);
      expect(projects[0]?.id).toBe(PROJECT_ID);
    });

    it('2. Admin can view all projects', async () => {
      const mockFind = {
        sort: vi.fn().mockResolvedValue([mockProject]),
      };
      vi.mocked(Project.find).mockReturnValue(mockFind as any);

      const projects = await getProjects(OWNER_ID, 'admin');
      expect(projects).toHaveLength(1);
    });
  });

  describe('getProjectById & Visibility Security Requirements', () => {
    it('1. Owner can view project by ID', async () => {
      vi.mocked(Project.findOne).mockResolvedValue(mockProject as any);

      const project = await getProjectById(OWNER_ID, 'user', PROJECT_ID);
      expect(project.id).toBe(PROJECT_ID);
      expect(project.isOwner).toBe(true);
    });

    it('2. Admin can view project by ID', async () => {
      vi.mocked(Project.findOne).mockResolvedValue(mockProject as any);

      const project = await getProjectById(OTHER_USER_ID, 'admin', PROJECT_ID);
      expect(project.id).toBe(PROJECT_ID);
      expect(project.isOwner).toBe(true);
    });

    it('3. User with READ access to one project document can view project', async () => {
      vi.mocked(Project.findOne).mockResolvedValue(mockProject as any);
      vi.mocked(Document.countDocuments).mockImplementation(((filter: any) => {
        if (filter.ownerId) return Promise.resolve(0);
        if (filter._id) return Promise.resolve(1);
        return Promise.resolve(0);
      }) as any);

      vi.mocked(DocumentShare.find).mockReturnValue({
        select: vi.fn().mockResolvedValue([{ documentId: new Types.ObjectId(DOC_ID) }]),
      } as any);

      const project = await getProjectById(OTHER_USER_ID, 'user', PROJECT_ID);
      expect(project.id).toBe(PROJECT_ID);
      expect(project.isOwner).toBe(false);
    });

    it('4 & 14. User with no access to any project document cannot view project and receives 404', async () => {
      vi.mocked(Project.findOne).mockResolvedValue(mockProject as any);
      vi.mocked(Document.countDocuments).mockResolvedValue(0);
      vi.mocked(DocumentShare.find).mockReturnValue({
        select: vi.fn().mockResolvedValue([]),
      } as any);

      await expect(
        getProjectById(OTHER_USER_ID, 'user', PROJECT_ID),
      ).rejects.toMatchObject({
        statusCode: 404,
        code: 'PROJECT_NOT_FOUND',
      });
    });
  });

  describe('updateProject & archiveProject Permissions', () => {
    it('5. Project viewer (non-owner) cannot modify project', async () => {
      vi.mocked(Project.findOne).mockResolvedValue(mockProject as any);

      await expect(
        updateProject(OTHER_USER_ID, 'user', PROJECT_ID, { name: 'Hacked Name' }),
      ).rejects.toMatchObject({
        statusCode: 403,
        code: 'FORBIDDEN',
      });
    });

    it('6. Project viewer (non-owner) cannot archive project', async () => {
      vi.mocked(Project.findOne).mockResolvedValue(mockProject as any);

      await expect(
        archiveProject(OTHER_USER_ID, 'user', PROJECT_ID),
      ).rejects.toMatchObject({
        statusCode: 403,
        code: 'FORBIDDEN',
      });
    });
  });

  describe('Document Removal Dual-Condition Authorization', () => {
    it('7. User with EDIT document access but NO project authority cannot remove document', async () => {
      vi.mocked(Project.findOne).mockResolvedValue(mockProject as any); // owner is OWNER_ID

      // OTHER_USER_ID has EDIT access to Document, but does NOT own project
      const docOwnedByOther = { ...mockDocument, ownerId: new Types.ObjectId(OTHER_USER_ID) };
      vi.mocked(Document.findOne).mockResolvedValue(docOwnedByOther as any);

      await expect(
        removeDocumentFromProject(OTHER_USER_ID, 'user', PROJECT_ID, DOC_ID),
      ).rejects.toMatchObject({
        statusCode: 403,
        code: 'FORBIDDEN',
      });
    });

    it('8. Project owner WITHOUT EDIT access to document cannot remove document', async () => {
      vi.mocked(Project.findOne).mockResolvedValue(mockProject as any); // owner is OWNER_ID

      // Document is owned by OTHER_USER_ID, and OWNER_ID has NO share/edit access to document
      const docOwnedByOther = { ...mockDocument, ownerId: new Types.ObjectId(OTHER_USER_ID) };
      vi.mocked(Document.findOne).mockResolvedValue(docOwnedByOther as any);
      vi.mocked(DocumentShare.findOne).mockResolvedValue(null);

      await expect(
        removeDocumentFromProject(OWNER_ID, 'user', PROJECT_ID, DOC_ID),
      ).rejects.toMatchObject({
        statusCode: 403,
        code: 'FORBIDDEN',
      });
    });

    it('9. Project owner WITH EDIT access to document CAN remove document', async () => {
      const projToSave = { ...mockProject };
      const docToSave = { ...mockDocument, projectId: new Types.ObjectId(PROJECT_ID), save: vi.fn().mockResolvedValue(this) };

      vi.mocked(Project.findOne).mockResolvedValue(projToSave as any);
      vi.mocked(Document.findOne).mockResolvedValue(docToSave as any);

      const result = await removeDocumentFromProject(OWNER_ID, 'user', PROJECT_ID, DOC_ID);
      expect(result.message).toBe('Document removed from project successfully');
      expect(docToSave.projectId).toBeNull();
      expect(auditService.createDocumentAudit).toHaveBeenCalledWith(
        DOC_ID,
        OWNER_ID,
        'PROJECT_REMOVE',
        expect.objectContaining({ projectId: PROJECT_ID }),
      );
    });

    it('10. Admin WITH EDIT access CAN remove document', async () => {
      const projToSave = { ...mockProject };
      const docToSave = { ...mockDocument, projectId: new Types.ObjectId(PROJECT_ID), save: vi.fn().mockResolvedValue(this) };

      vi.mocked(Project.findOne).mockResolvedValue(projToSave as any);
      vi.mocked(Document.findOne).mockResolvedValue(docToSave as any);

      const result = await removeDocumentFromProject(OTHER_USER_ID, 'admin', PROJECT_ID, DOC_ID);
      expect(result.message).toBe('Document removed from project successfully');
      expect(docToSave.projectId).toBeNull();
    });
  });

  describe('getProjectDocuments & Document Visibility Security', () => {
    it('11, 15, 16. Project document listing hides unauthorized documents and does not grant doc access', async () => {
      vi.mocked(Project.findOne).mockResolvedValue(mockProject as any);

      const docShared = { ...mockDocument, _id: new Types.ObjectId('507f1f77bcf86cd799439044'), ownerId: new Types.ObjectId(OWNER_ID) };
      const docUnshared = { ...mockDocument, _id: new Types.ObjectId('507f1f77bcf86cd799439055'), ownerId: new Types.ObjectId('507f1f77bcf86cd799439099') };

      const mockFind = {
        sort: vi.fn().mockResolvedValue([docShared, docUnshared]),
      };
      vi.mocked(Document.find).mockReturnValue(mockFind as any);

      // OTHER_USER_ID has READ access to docShared only
      vi.mocked(Document.countDocuments).mockImplementation(((filter: any) => {
        if (filter.ownerId) return Promise.resolve(0);
        if (filter._id) return Promise.resolve(1);
        return Promise.resolve(0);
      }) as any);

      vi.mocked(DocumentShare.find).mockReturnValue({
        select: vi.fn().mockResolvedValue([{ documentId: new Types.ObjectId('507f1f77bcf86cd799439044') }]),
      } as any);

      const docs = await getProjectDocuments(OTHER_USER_ID, 'user', PROJECT_ID);

      // OTHER_USER_ID can view project, but gets ONLY docShared (1 doc), docUnshared is hidden
      expect(docs).toHaveLength(1);
      expect(docs[0]?.id).toBe('507f1f77bcf86cd799439044');
    });

    it('12. Soft-deleted documents are not exposed in project document listing', async () => {
      vi.mocked(Project.findOne).mockResolvedValue(mockProject as any);

      const mockFind = {
        sort: vi.fn().mockResolvedValue([]),
      };
      vi.mocked(Document.find).mockReturnValue(mockFind as any);

      const docs = await getProjectDocuments(OWNER_ID, 'user', PROJECT_ID);
      expect(docs).toHaveLength(0);
      expect(Document.find).toHaveBeenCalledWith({
        projectId: new Types.ObjectId(PROJECT_ID),
        isDeleted: false,
      });
    });

    it('13. Restored documents become visible again only if requesting user has READ access', async () => {
      vi.mocked(Project.findOne).mockResolvedValue(mockProject as any);

      const restoredDoc = { ...mockDocument, isDeleted: false };
      const mockFind = {
        sort: vi.fn().mockResolvedValue([restoredDoc]),
      };
      vi.mocked(Document.find).mockReturnValue(mockFind as any);

      const docs = await getProjectDocuments(OWNER_ID, 'user', PROJECT_ID);
      expect(docs).toHaveLength(1);
      expect(docs[0]?.id).toBe(DOC_ID);
    });
  });

  describe('assignDocumentToProject', () => {
    it('assigns document to project when user is project owner and has doc EDIT access', async () => {
      const docToSave = { ...mockDocument, save: vi.fn().mockResolvedValue(this) };

      vi.mocked(Project.findOne).mockResolvedValue(mockProject as any);
      vi.mocked(Document.findOne).mockResolvedValue(docToSave as any);

      const result = await assignDocumentToProject(OWNER_ID, 'user', PROJECT_ID, DOC_ID);

      expect(result.message).toBe('Document assigned to project successfully');
      expect(docToSave.projectId.toString()).toBe(PROJECT_ID);
      expect(auditService.createDocumentAudit).toHaveBeenCalledWith(
        DOC_ID,
        OWNER_ID,
        'PROJECT_ASSIGN',
        expect.objectContaining({ projectId: PROJECT_ID }),
      );
    });
  });
});
