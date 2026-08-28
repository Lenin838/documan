import { Types } from 'mongoose';

import { Folder } from './folder.model.js';
import { Document } from '../documents/document.model.js';
import type { CreateFolderInput, UpdateFolderInput } from './folder.schema.js';
import { AppError } from '../../errors/app-error.js';

interface FolderResponse {
  id: string;
  name: string;
  ownerId: string;
  createdAt: Date;
  updatedAt: Date;
}

function toFolderResponse(folder: {
  _id: Types.ObjectId;
  name: string;
  ownerId: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}): FolderResponse {
  return {
    id: folder._id.toString(),
    name: folder.name,
    ownerId: folder.ownerId.toString(),
    createdAt: folder.createdAt,
    updatedAt: folder.updatedAt,
  };
}

function validateFolderId(folderId: string): void {
  if (!Types.ObjectId.isValid(folderId)) {
    throw new AppError('Invalid folder ID', 400, 'INVALID_FOLDER_ID');
  }
}

export async function createFolder(
  ownerId: string,
  input: CreateFolderInput,
): Promise<FolderResponse> {
  const folder = await Folder.create({
    name: input.name,
    ownerId: new Types.ObjectId(ownerId),
  });

  return toFolderResponse(folder);
}

export async function getFolders(
  ownerId: string,
  role: 'user' | 'admin',
): Promise<FolderResponse[]> {
  const filter: { ownerId?: Types.ObjectId } = {};

  if (role !== 'admin') {
    filter.ownerId = new Types.ObjectId(ownerId);
  }

  const folders = await Folder.find(filter).sort({ name: 1 });
  return folders.map(toFolderResponse);
}

export async function getFolderById(
  ownerId: string,
  role: 'user' | 'admin',
  folderId: string,
): Promise<FolderResponse> {
  validateFolderId(folderId);

  const filter: { _id: string; ownerId?: Types.ObjectId } = {
    _id: folderId,
  };

  if (role !== 'admin') {
    filter.ownerId = new Types.ObjectId(ownerId);
  }

  const folder = await Folder.findOne(filter);

  if (!folder) {
    throw new AppError('Folder not found', 404, 'FOLDER_NOT_FOUND');
  }

  return toFolderResponse(folder);
}

export async function updateFolder(
  ownerId: string,
  role: 'user' | 'admin',
  folderId: string,
  input: UpdateFolderInput,
): Promise<FolderResponse> {
  validateFolderId(folderId);

  const filter: { _id: string; ownerId?: Types.ObjectId } = {
    _id: folderId,
  };

  if (role !== 'admin') {
    filter.ownerId = new Types.ObjectId(ownerId);
  }

  const folder = await Folder.findOne(filter);

  if (!folder) {
    throw new AppError('Folder not found', 404, 'FOLDER_NOT_FOUND');
  }

  folder.name = input.name;
  await folder.save();

  return toFolderResponse(folder);
}

export async function deleteFolder(
  ownerId: string,
  role: 'user' | 'admin',
  folderId: string,
): Promise<{ message: string }> {
  validateFolderId(folderId);

  const filter: { _id: string; ownerId?: Types.ObjectId } = {
    _id: folderId,
  };

  if (role !== 'admin') {
    filter.ownerId = new Types.ObjectId(ownerId);
  }

  const folder = await Folder.findOne(filter);

  if (!folder) {
    throw new AppError('Folder not found', 404, 'FOLDER_NOT_FOUND');
  }

  await Folder.deleteOne({ _id: folder._id });

  // Unset folderId on all documents that were in this folder
  await Document.updateMany(
    { folderId: folder._id },
    { $set: { folderId: null } },
  );

  return {
    message: 'Folder deleted successfully',
  };
}
