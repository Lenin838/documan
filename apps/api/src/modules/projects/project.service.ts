import { Types } from 'mongoose';

import { Project } from './project.model.js';
import type { CreateProjectInput, UpdateProjectInput } from './project.schema.js';
import { Document } from '../documents/document.model.js';
import { DocumentShare } from '../document-shares/document-share.model.js';
import { createDocumentAudit } from '../documents/document-audit.service.js';
import { AppError } from '../../errors/app-error.js';

interface ProjectResponse {
  id: string;
  name: string;
  description?: string | undefined;
  ownerId: string;
  isArchived: boolean;
  createdAt: Date;
  updatedAt: Date;
}

function toProjectResponse(project: {
  _id: Types.ObjectId;
  name: string;
  description?: string;
  ownerId: Types.ObjectId;
  isArchived: boolean;
  createdAt: Date;
  updatedAt: Date;
}): ProjectResponse {
  return {
    id: project._id.toString(),
    name: project.name,
    description: project.description,
    ownerId: project.ownerId.toString(),
    isArchived: project.isArchived,
    createdAt: project.createdAt,
    updatedAt: project.updatedAt,
  };
}

function validateObjectId(id: string, errorMessage = 'Resource not found', code = 'NOT_FOUND') {
  if (!Types.ObjectId.isValid(id)) {
    throw new AppError(errorMessage, 404, code);
  }
}

export async function createProject(
  userId: string,
  _role: 'user' | 'admin',
  input: CreateProjectInput,
) {
  const project = await Project.create({
    name: input.name,
    ...(input.description !== undefined ? { description: input.description } : {}),
    ownerId: new Types.ObjectId(userId),
    isArchived: false,
  });

  return toProjectResponse(project);
}

export async function getProjects(userId: string, role: 'user' | 'admin') {
  if (role === 'admin') {
    const projects = await Project.find({ isArchived: false }).sort({ createdAt: -1 });
    return projects.map(toProjectResponse);
  }

  const userObjectId = new Types.ObjectId(userId);

  // Projects owned by user
  const ownedProjects = await Project.find({
    ownerId: userObjectId,
    isArchived: false,
  }).sort({ createdAt: -1 });

  // Projects containing active documents user has READ access to
  const userOwnedDocProjects = await Document.distinct('projectId', {
    ownerId: userObjectId,
    isDeleted: false,
    projectId: { $ne: null },
  });

  const shares = await DocumentShare.find({
    sharedWithUserId: userObjectId,
  }).select('documentId');
  const sharedDocIds = shares.map((s) => s.documentId);

  const sharedDocProjects = await Document.distinct('projectId', {
    _id: { $in: sharedDocIds },
    isDeleted: false,
    projectId: { $ne: null },
  });

  const accessibleProjectIds = Array.from(
    new Set([
      ...ownedProjects.map((p) => p._id.toString()),
      ...userOwnedDocProjects.map((id) => id.toString()),
      ...sharedDocProjects.map((id) => id.toString()),
    ]),
  ).map((id) => new Types.ObjectId(id));

  const projects = await Project.find({
    _id: { $in: accessibleProjectIds },
    isArchived: false,
  }).sort({ createdAt: -1 });

  return projects.map(toProjectResponse);
}

export async function getProjectById(
  userId: string,
  role: 'user' | 'admin',
  projectId: string,
) {
  validateObjectId(projectId, 'Project not found', 'PROJECT_NOT_FOUND');

  const project = await Project.findOne({
    _id: projectId,
    isArchived: false,
  });

  if (!project) {
    throw new AppError('Project not found', 404, 'PROJECT_NOT_FOUND');
  }

  const isOwnerOrAdmin = role === 'admin' || project.ownerId.toString() === userId;

  if (!isOwnerOrAdmin) {
    const userObjectId = new Types.ObjectId(userId);

    // Check if user owns at least one document in this project
    const ownedDocCount = await Document.countDocuments({
      projectId: project._id,
      ownerId: userObjectId,
      isDeleted: false,
    });

    if (ownedDocCount === 0) {
      // Check if user has a share on at least one document in this project
      const shares = await DocumentShare.find({
        sharedWithUserId: userObjectId,
      }).select('documentId');
      const sharedDocIds = shares.map((s) => s.documentId);

      const sharedDocCount = await Document.countDocuments({
        _id: { $in: sharedDocIds },
        projectId: project._id,
        isDeleted: false,
      });

      if (sharedDocCount === 0) {
        throw new AppError('Project not found', 404, 'PROJECT_NOT_FOUND');
      }
    }
  }

  return {
    ...toProjectResponse(project),
    isOwner: isOwnerOrAdmin,
  };
}

export async function updateProject(
  userId: string,
  role: 'user' | 'admin',
  projectId: string,
  input: UpdateProjectInput,
) {
  validateObjectId(projectId, 'Project not found', 'PROJECT_NOT_FOUND');

  const project = await Project.findOne({
    _id: projectId,
    isArchived: false,
  });

  if (!project) {
    throw new AppError('Project not found', 404, 'PROJECT_NOT_FOUND');
  }

  if (role !== 'admin' && project.ownerId.toString() !== userId) {
    throw new AppError('Forbidden', 403, 'FORBIDDEN');
  }

  if (input.name !== undefined) {
    project.name = input.name;
  }
  if (input.description !== undefined) {
    project.description = input.description;
  }

  await project.save();
  return toProjectResponse(project);
}

export async function archiveProject(
  userId: string,
  role: 'user' | 'admin',
  projectId: string,
) {
  validateObjectId(projectId, 'Project not found', 'PROJECT_NOT_FOUND');

  const project = await Project.findOne({
    _id: projectId,
    isArchived: false,
  });

  if (!project) {
    throw new AppError('Project not found', 404, 'PROJECT_NOT_FOUND');
  }

  if (role !== 'admin' && project.ownerId.toString() !== userId) {
    throw new AppError('Forbidden', 403, 'FORBIDDEN');
  }

  project.isArchived = true;
  await project.save();

  return { message: 'Project archived successfully' };
}

export async function getProjectDocuments(
  userId: string,
  role: 'user' | 'admin',
  projectId: string,
) {
  // Verifies project exists and user has view access to project
  await getProjectById(userId, role, projectId);

  const rawDocs = await Document.find({
    projectId: new Types.ObjectId(projectId),
    isDeleted: false,
  }).sort({ createdAt: -1 });

  if (role === 'admin') {
    return rawDocs.map((doc) => ({
      id: doc._id.toString(),
      title: doc.title,
      description: doc.description,
      folderId: doc.folderId ? doc.folderId.toString() : null,
      projectId: doc.projectId ? doc.projectId.toString() : null,
      tags: doc.tags || [],
      fileName: doc.fileName,
      filePath: doc.filePath,
      fileType: doc.fileType,
      fileSize: doc.fileSize,
      ownerId: doc.ownerId.toString(),
      isDeleted: doc.isDeleted,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
    }));
  }

  const userObjectId = new Types.ObjectId(userId);

  const shares = await DocumentShare.find({
    sharedWithUserId: userObjectId,
  }).select('documentId');
  const sharedDocIds = new Set(shares.map((s) => s.documentId.toString()));

  const authorizedDocs = rawDocs.filter(
    (doc) =>
      doc.ownerId.toString() === userId || sharedDocIds.has(doc._id.toString()),
  );

  return authorizedDocs.map((doc) => ({
    id: doc._id.toString(),
    title: doc.title,
    description: doc.description,
    folderId: doc.folderId ? doc.folderId.toString() : null,
    projectId: doc.projectId ? doc.projectId.toString() : null,
    tags: doc.tags || [],
    fileName: doc.fileName,
    filePath: doc.filePath,
    fileType: doc.fileType,
    fileSize: doc.fileSize,
    ownerId: doc.ownerId.toString(),
    isDeleted: doc.isDeleted,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  }));
}

export async function assignDocumentToProject(
  userId: string,
  role: 'user' | 'admin',
  projectId: string,
  documentId: string,
) {
  validateObjectId(projectId, 'Project not found', 'PROJECT_NOT_FOUND');
  validateObjectId(documentId, 'Document not found', 'DOCUMENT_NOT_FOUND');

  const project = await Project.findOne({
    _id: projectId,
    isArchived: false,
  });

  if (!project) {
    throw new AppError('Project not found', 404, 'PROJECT_NOT_FOUND');
  }

  // Requirement 1: User has project-management authority (Owner or Admin)
  if (role !== 'admin' && project.ownerId.toString() !== userId) {
    throw new AppError('Forbidden', 403, 'FORBIDDEN');
  }

  // Requirement 2: User has EDIT access to the document
  const document = await Document.findOne({
    _id: documentId,
    isDeleted: false,
  });

  if (!document) {
    throw new AppError('Document not found', 404, 'DOCUMENT_NOT_FOUND');
  }

  if (role !== 'admin' && document.ownerId.toString() !== userId) {
    const share = await DocumentShare.findOne({
      documentId: document._id,
      sharedWithUserId: new Types.ObjectId(userId),
    });

    if (!share || share.permission !== 'EDIT') {
      throw new AppError('Forbidden', 403, 'FORBIDDEN');
    }
  }

  document.projectId = project._id;
  await document.save();

  await createDocumentAudit(document._id.toString(), userId, 'PROJECT_ASSIGN', {
    projectId: project._id.toString(),
    projectName: project.name,
  });

  return {
    message: 'Document assigned to project successfully',
    documentId: document._id.toString(),
    projectId: project._id.toString(),
  };
}

export async function removeDocumentFromProject(
  userId: string,
  role: 'user' | 'admin',
  projectId: string,
  documentId: string,
) {
  validateObjectId(projectId, 'Project not found', 'PROJECT_NOT_FOUND');
  validateObjectId(documentId, 'Document not found', 'DOCUMENT_NOT_FOUND');

  const project = await Project.findOne({
    _id: projectId,
    isArchived: false,
  });

  if (!project) {
    throw new AppError('Project not found', 404, 'PROJECT_NOT_FOUND');
  }

  // Requirement 1: User has project-management authority over project (Project owner OR Admin)
  if (role !== 'admin' && project.ownerId.toString() !== userId) {
    throw new AppError('Forbidden', 403, 'FORBIDDEN');
  }

  // Requirement 2: User has EDIT access to the document
  const document = await Document.findOne({
    _id: documentId,
    isDeleted: false,
  });

  if (!document) {
    throw new AppError('Document not found', 404, 'DOCUMENT_NOT_FOUND');
  }

  if (role !== 'admin' && document.ownerId.toString() !== userId) {
    const share = await DocumentShare.findOne({
      documentId: document._id,
      sharedWithUserId: new Types.ObjectId(userId),
    });

    if (!share || share.permission !== 'EDIT') {
      throw new AppError('Forbidden', 403, 'FORBIDDEN');
    }
  }

  // Verify document is actually associated with this project
  if (document.projectId?.toString() !== projectId) {
    throw new AppError('Document not found in project', 404, 'DOCUMENT_NOT_FOUND');
  }

  document.projectId = null;
  await document.save();

  await createDocumentAudit(document._id.toString(), userId, 'PROJECT_REMOVE', {
    projectId: project._id.toString(),
    projectName: project.name,
  });

  return {
    message: 'Document removed from project successfully',
    documentId: document._id.toString(),
    projectId: project._id.toString(),
  };
}
