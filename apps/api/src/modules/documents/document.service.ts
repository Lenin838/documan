import { Types } from 'mongoose';
import fs from 'node:fs/promises';
import path from 'node:path';

import { Document } from './document.model.js';
import type {
  CreateDocumentInput,
  DocumentsQueryInput,
  UpdateDocumentInput,
} from './document.schema.js';

import { AppError } from '../../errors/app-error.js';

interface DocumentResponse {
  id: string;
  title: string;
  description?: string | undefined;
  fileName: string;
  filePath: string;
  fileType: string;
  fileSize: number;
  ownerId: string;
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

function toDocumentResponse(
  document: {
    _id: Types.ObjectId;
    title: string;
    description?: string;
    fileName: string;
    filePath: string;
    fileType: string;
    fileSize: number;
    ownerId: Types.ObjectId;
    isDeleted: boolean;
    createdAt: Date;
    updatedAt: Date;
  },
): DocumentResponse {
  return {
    id: document._id.toString(),
    title: document.title,
    description: document.description,
    fileName: document.fileName,
    filePath: document.filePath,
    fileType: document.fileType,
    fileSize: document.fileSize,
    ownerId: document.ownerId.toString(),
    isDeleted: document.isDeleted,
    createdAt: document.createdAt,
    updatedAt: document.updatedAt,
  };
}

function validateDocumentId(documentId: string) {
  if (!Types.ObjectId.isValid(documentId)) {
    throw new AppError(
      'Document not found',
      404,
      'DOCUMENT_NOT_FOUND',
    );
  }
}

export async function createDocument(
  ownerId: string,
  input: CreateDocumentInput,
  file: {
    originalname: string;
    path: string;
    mimetype: string;
    size: number;
  },
) {
  const document = await Document.create({
    title: input.title,

    ...(input.description !== undefined
      ? { description: input.description }
      : {}),

    fileName: file.originalname,
    filePath: file.path,
    fileType: file.mimetype,
    fileSize: file.size,

    ownerId: new Types.ObjectId(ownerId),
    isDeleted: false,
  });

  return toDocumentResponse(document);
}

export async function getAllDocuments(
  ownerId: string,
  role: 'user' | 'admin',
  query: DocumentsQueryInput,
) {
  const {
    page,
    limit,
    search,
  } = query;

  const filter: {
    ownerId?: Types.ObjectId;
    isDeleted: boolean;
    $or?: Array<{
      title?: { $regex: string; $options: string };
      fileName?: { $regex: string; $options: string };
    }>;
  } = {
    isDeleted: false,
  };

  if (role !== 'admin') {
    filter.ownerId = new Types.ObjectId(ownerId);
  }

  if (search) {
    filter.$or = [
      {
        title: {
          $regex: search,
          $options: 'i',
        },
      },
      {
        fileName: {
          $regex: search,
          $options: 'i',
        },
      },
    ];
  }

  const skip = (page - 1) * limit;

  const [documents, total] = await Promise.all([
    Document.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),

    Document.countDocuments(filter),
  ]);

  return {
    documents: documents.map(toDocumentResponse),

    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

export async function getDocumentById(
  ownerId: string,
  role: 'user' | 'admin',
  documentId: string,
) {
  validateDocumentId(documentId)
  const filter: {
    _id: string;
    isDeleted: boolean;
    ownerId?: Types.ObjectId;
  } = {
    _id: documentId,
    isDeleted: false,
  };

  if (role !== 'admin') {
    filter.ownerId = new Types.ObjectId(ownerId);
  }

  const document = await Document.findOne(filter);

  if (!document) {
    throw new AppError(
      'Document not found',
      404,
      'DOCUMENT_NOT_FOUND',
    );
  }

  return toDocumentResponse(document);
}

export async function updateDocument(
  ownerId: string,
  documentId: string,
  input: UpdateDocumentInput,
  file?: {
    originalname: string;
    path: string;
    mimetype: string;
    size: number;
  },
) {
  validateDocumentId(documentId)
  const document = await Document.findOne({
    _id: documentId,
    ownerId: new Types.ObjectId(ownerId),
    isDeleted: false,
  });

  if (!document) {
    throw new AppError(
      'Document not found',
      404,
      'DOCUMENT_NOT_FOUND',
    );
  }

  if (input.title !== undefined) {
    document.title = input.title;
  }

  if (input.description !== undefined) {
    document.description = input.description;
  }

  if (file) {
  document.fileName = file.originalname;
  document.filePath = file.path;
  document.fileType = file.mimetype;
  document.fileSize = file.size;
}

  await document.save();

  return toDocumentResponse(document);
}

export async function deleteDocument(
  ownerId: string,
  role: 'user' | 'admin',
  documentId: string,
) {
  validateDocumentId(documentId)
  const filter: {
    _id: string;
    isDeleted: boolean;
    ownerId?: Types.ObjectId;
  } = {
    _id: documentId,
    isDeleted: false,
  };

  if (role !== 'admin') {
    filter.ownerId = new Types.ObjectId(ownerId);
  }

  const document = await Document.findOne(filter);

  if (!document) {
    throw new AppError(
      'Document not found',
      404,
      'DOCUMENT_NOT_FOUND',
    );
  }

  document.isDeleted = true;

  await document.save();

  return {
    message: 'Document deleted successfully',
  };
}

export async function downloadDocument(
  ownerId: string,
  role: 'user' | 'admin',
  documentId: string,
) {
  validateDocumentId(documentId)
  const filter: {
    _id: string;
    isDeleted: boolean;
    ownerId?: Types.ObjectId;
  } = {
    _id: documentId,
    isDeleted: false,
  };

  if (role !== 'admin') {
    filter.ownerId = new Types.ObjectId(ownerId);
  }

  const document = await Document.findOne(filter);

  if (!document) {
    throw new AppError(
      'Document not found',
      404,
      'DOCUMENT_NOT_FOUND',
    );
  }

  try {
    await fs.access(document.filePath);
  } catch {
    throw new AppError(
      'Document file not found',
      404,
      'DOCUMENT_FILE_NOT_FOUND',
    );
  }

  return {
    filePath: path.resolve(document.filePath),
    fileName: document.fileName,
    fileType: document.fileType,
  };
}

export async function viewDocument(
  ownerId: string,
  role: 'user' | 'admin',
  documentId: string,
) {
  validateDocumentId(documentId)
  const filter: {
    _id: string;
    isDeleted: boolean;
    ownerId?: Types.ObjectId;
  } = {
    _id: documentId,
    isDeleted: false,
  };

  if (role !== 'admin') {
    filter.ownerId = new Types.ObjectId(ownerId);
  }

  const document = await Document.findOne(filter);

  if (!document) {
    throw new AppError(
      'Document not found',
      404,
      'DOCUMENT_NOT_FOUND',
    );
  }

  try {
    await fs.access(document.filePath);
  } catch {
    throw new AppError(
      'Document file not found',
      404,
      'DOCUMENT_FILE_NOT_FOUND',
    );
  }

  return {
    filePath: path.resolve(document.filePath),
    fileName: document.fileName,
    fileType: document.fileType,
  };
}