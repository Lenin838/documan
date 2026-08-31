/* eslint-disable @typescript-eslint/no-explicit-any */
import { Types } from 'mongoose';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { Folder } from './folder.model.js';
import {
  createFolder,
  deleteFolder,
  getFolderById,
  getFolders,
  updateFolder,
} from './folder.service.js';
import { AppError } from '../../errors/app-error.js';
import { Document } from '../documents/document.model.js';

vi.mock('./folder.model.js', () => ({
  Folder: {
    create: vi.fn(),
    find: vi.fn(),
    findOne: vi.fn(),
    deleteOne: vi.fn(),
  },
}));

vi.mock('../documents/document.model.js', () => ({
  Document: {
    updateMany: vi.fn(),
  },
}));

describe('Folder Service', () => {
  const mockOwnerId = '507f1f77bcf86cd799439011';
  const mockFolderId = '507f1f77bcf86cd799439022';

  const mockFolderDoc = {
    _id: new Types.ObjectId(mockFolderId),
    name: 'Work',
    ownerId: new Types.ObjectId(mockOwnerId),
    createdAt: new Date(),
    updatedAt: new Date(),
    save: vi.fn().mockResolvedValue(this),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createFolder', () => {
    it('creates a new folder', async () => {
      vi.mocked(Folder.create).mockResolvedValue(mockFolderDoc as any);

      const result = await createFolder(mockOwnerId, { name: 'Work' });

      expect(Folder.create).toHaveBeenCalledWith({
        name: 'Work',
        ownerId: expect.any(Types.ObjectId),
      });
      expect(result).toEqual({
        id: mockFolderId,
        name: 'Work',
        ownerId: mockOwnerId,
        createdAt: mockFolderDoc.createdAt,
        updatedAt: mockFolderDoc.updatedAt,
      });
    });
  });

  describe('getFolders', () => {
    it('returns folders for user', async () => {
      const mockFind = {
        sort: vi.fn().mockResolvedValue([mockFolderDoc]),
      };
      vi.mocked(Folder.find).mockReturnValue(mockFind as any);

      const result = await getFolders(mockOwnerId, 'user');

      expect(Folder.find).toHaveBeenCalledWith({
        ownerId: expect.any(Types.ObjectId),
      });
      expect(result).toHaveLength(1);
      expect(result[0]?.name).toBe('Work');
    });

    it('returns all folders for admin', async () => {
      const mockFind = {
        sort: vi.fn().mockResolvedValue([mockFolderDoc]),
      };
      vi.mocked(Folder.find).mockReturnValue(mockFind as any);

      const result = await getFolders(mockOwnerId, 'admin');

      expect(Folder.find).toHaveBeenCalledWith({});
      expect(result).toHaveLength(1);
    });
  });

  describe('getFolderById', () => {
    it('returns folder by ID', async () => {
      vi.mocked(Folder.findOne).mockResolvedValue(mockFolderDoc as any);

      const result = await getFolderById(mockOwnerId, 'user', mockFolderId);

      expect(result.id).toBe(mockFolderId);
    });

    it('throws error if invalid ID', async () => {
      await expect(
        getFolderById(mockOwnerId, 'user', 'invalid-id'),
      ).rejects.toThrow(AppError);
    });

    it('throws 404 if folder not found', async () => {
      vi.mocked(Folder.findOne).mockResolvedValue(null);

      await expect(
        getFolderById(mockOwnerId, 'user', mockFolderId),
      ).rejects.toThrow('Folder not found');
    });
  });

  describe('updateFolder', () => {
    it('updates folder name', async () => {
      const folderToSave = {
        ...mockFolderDoc,
        save: vi.fn().mockResolvedValue(this),
      };
      vi.mocked(Folder.findOne).mockResolvedValue(folderToSave as any);

      const result = await updateFolder(mockOwnerId, 'user', mockFolderId, {
        name: 'New Name',
      });

      expect(folderToSave.name).toBe('New Name');
      expect(folderToSave.save).toHaveBeenCalled();
      expect(result.name).toBe('New Name');
    });
  });

  describe('deleteFolder', () => {
    it('deletes folder and unsets folderId on documents', async () => {
      vi.mocked(Folder.findOne).mockResolvedValue(mockFolderDoc as any);
      vi.mocked(Folder.deleteOne).mockResolvedValue({ acknowledged: true, deletedCount: 1 } as any);
      vi.mocked(Document.updateMany).mockResolvedValue({ acknowledged: true, modifiedCount: 2 } as any);

      const result = await deleteFolder(mockOwnerId, 'user', mockFolderId);

      expect(Folder.deleteOne).toHaveBeenCalledWith({ _id: mockFolderDoc._id });
      expect(Document.updateMany).toHaveBeenCalledWith(
        { folderId: mockFolderDoc._id },
        { $set: { folderId: null } },
      );
      expect(result).toEqual({ message: 'Folder deleted successfully' });
    });
  });
});
