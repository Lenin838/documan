import type { NextFunction, Request, Response } from 'express';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  mockCreateFolder,
  mockGetFolders,
  mockGetFolderById,
  mockUpdateFolder,
  mockDeleteFolder,
} = vi.hoisted(() => ({
  mockCreateFolder: vi.fn(),
  mockGetFolders: vi.fn(),
  mockGetFolderById: vi.fn(),
  mockUpdateFolder: vi.fn(),
  mockDeleteFolder: vi.fn(),
}));

vi.mock('./folder.service.js', () => ({
  createFolder: mockCreateFolder,
  getFolders: mockGetFolders,
  getFolderById: mockGetFolderById,
  updateFolder: mockUpdateFolder,
  deleteFolder: mockDeleteFolder,
}));

import {
  createFolderController,
  deleteFolderController,
  getFolderByIdController,
  getFoldersController,
  updateFolderController,
} from './folder.controller.js';
import { AppError } from '../../errors/app-error.js';

describe('folder.controller', () => {
  let req: Partial<Request>;
  let res: Partial<Response>;
  let next: NextFunction;

  beforeEach(() => {
    vi.clearAllMocks();

    req = {
      user: {
        userId: 'user-123',
        role: 'user',
      },
      body: {},
      params: {},
    };

    res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    };

    next = vi.fn();
  });

  describe('createFolderController', () => {
    it('creates folder and returns 201', async () => {
      req.body = { name: 'Folder 1' };
      const mockFolder = { id: 'f-1', name: 'Folder 1' };
      mockCreateFolder.mockResolvedValue(mockFolder);

      await createFolderController(req as Request, res as Response, next);

      expect(mockCreateFolder).toHaveBeenCalledWith('user-123', { name: 'Folder 1' });
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: mockFolder,
      });
    });

    it('passes error to next if user unauthenticated', async () => {
      delete req.user;
      await createFolderController(req as Request, res as Response, next);

      expect(next).toHaveBeenCalledWith(expect.any(AppError));
    });
  });

  describe('getFoldersController', () => {
    it('returns user folders', async () => {
      const mockFolders = [{ id: 'f-1', name: 'Folder 1' }];
      mockGetFolders.mockResolvedValue(mockFolders);

      await getFoldersController(req as Request, res as Response, next);

      expect(mockGetFolders).toHaveBeenCalledWith('user-123', 'user');
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: { folders: mockFolders },
      });
    });
  });

  describe('getFolderByIdController', () => {
    it('returns folder by id', async () => {
      req.params = { id: 'f-1' };
      const mockFolder = { id: 'f-1', name: 'Folder 1' };
      mockGetFolderById.mockResolvedValue(mockFolder);

      await getFolderByIdController(req as Request, res as Response, next);

      expect(mockGetFolderById).toHaveBeenCalledWith('user-123', 'user', 'f-1');
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: mockFolder,
      });
    });
  });

  describe('updateFolderController', () => {
    it('updates folder', async () => {
      req.params = { id: 'f-1' };
      req.body = { name: 'Renamed' };
      const mockFolder = { id: 'f-1', name: 'Renamed' };
      mockUpdateFolder.mockResolvedValue(mockFolder);

      await updateFolderController(req as Request, res as Response, next);

      expect(mockUpdateFolder).toHaveBeenCalledWith('user-123', 'user', 'f-1', { name: 'Renamed' });
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: mockFolder,
      });
    });
  });

  describe('deleteFolderController', () => {
    it('deletes folder', async () => {
      req.params = { id: 'f-1' };
      mockDeleteFolder.mockResolvedValue({ message: 'Folder deleted successfully' });

      await deleteFolderController(req as Request, res as Response, next);

      expect(mockDeleteFolder).toHaveBeenCalledWith('user-123', 'user', 'f-1');
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: { message: 'Folder deleted successfully' },
      });
    });
  });
});
