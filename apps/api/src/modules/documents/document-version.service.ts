import path from 'node:path';
import fs from 'node:fs';
import { Types } from 'mongoose';
import { AppError } from '../../errors/app-error.js';
import { Document, DocumentDocument } from './document.model.js';
import { DocumentVersion, DocumentVersionDocument } from './document-version.model.js';
import { createDocumentAudit } from './document-audit.service.js';

const uploadVersionsDirectory = path.resolve(
  process.cwd(),
  'uploads',
  'documents',
  'versions',
);

fs.mkdirSync(uploadVersionsDirectory, {
  recursive: true,
});

export function sanitizeFileName(name: string): string {
  const basename = path.basename(name);
  return basename.replace(/[^a-zA-Z0-9._-]/g, '_');
}

export function isTextFileType(fileType: string, fileName: string): boolean {
  const lowerType = fileType.toLowerCase();
  const lowerName = fileName.toLowerCase();

  if (
    lowerType.includes('text') ||
    lowerType.includes('json') ||
    lowerType.includes('yaml') ||
    lowerType.includes('markdown') ||
    lowerType.includes('javascript') ||
    lowerType.includes('typescript') ||
    lowerType.includes('xml')
  ) {
    return true;
  }

  if (
    lowerName.endsWith('.md') ||
    lowerName.endsWith('.txt') ||
    lowerName.endsWith('.json') ||
    lowerName.endsWith('.yaml') ||
    lowerName.endsWith('.yml') ||
    lowerName.endsWith('.csv')
  ) {
    return true;
  }

  return false;
}

export interface CreateVersionSnapshotInput {
  document: DocumentDocument;
  sourceFilePath: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  versionNumber: number;
  createdById: Types.ObjectId;
  changeSummary?: string | null;
}

export async function createVersionSnapshot(input: CreateVersionSnapshotInput) {
  const { document, sourceFilePath, fileName, fileType, fileSize, versionNumber, createdById, changeSummary } = input;

  const sanitized = sanitizeFileName(fileName);
  const executionId = `${Date.now()}-${Math.round(Math.random() * 1_000_000)}`;
  const destinationPath = path.join(
    uploadVersionsDirectory,
    `${document._id.toString()}_v${versionNumber}_${executionId}_${sanitized}`,
  );

  // Step 1: Copy physical payload to immutable version path
  try {
    await fs.promises.copyFile(sourceFilePath, destinationPath);
  } catch (err) {
    throw new AppError(
      `Failed to store physical version file payload: ${err instanceof Error ? err.message : String(err)}`,
      500,
      'VERSION_STORAGE_FAILED',
    );
  }

  // Step 2: Insert DB DocumentVersion record with compensation rollback
  let versionDoc;
  try {
    versionDoc = await DocumentVersion.create({
      documentId: document._id,
      projectId: document.projectId as Types.ObjectId,
      versionNumber,
      fileName,
      filePath: destinationPath,
      fileType,
      fileSize,
      changeSummary: changeSummary || null,
      createdById,
    });
  } catch (dbErr) {
    // SAGA COMPENSATION: Unlink copied version file on DB insert failure
    await fs.promises.unlink(destinationPath).catch(() => {});
    throw dbErr;
  }

  // Step 3: Audit log creation
  try {
    await createDocumentAudit(
      document._id.toString(),
      createdById.toString(),
      'DOCUMENT_VERSION_CREATED',
      {
        versionNumber,
        fileName,
        fileSize,
        fileType,
      },
    );
  } catch (auditErr) {
    // Non-blocking audit warning
    console.warn('Document version creation audit failed:', auditErr);
  }

  return versionDoc as DocumentVersionDocument;
}

export async function reserveNextVersionNumber(
  documentId: string,
  currentVersion: number,
): Promise<DocumentDocument> {
  const updatedDoc = await Document.findOneAndUpdate(
    { _id: documentId, version: currentVersion },
    { $inc: { version: 1 } },
    { new: true },
  );

  if (!updatedDoc) {
    throw new AppError(
      'Concurrent document update detected. Please refresh and retry.',
      409,
      'CONCURRENT_UPDATE_CONFLICT',
    );
  }

  return updatedDoc;
}

export async function listDocumentVersions(
  documentId: string,
  projectId?: string | null,
  page = 1,
  limit = 20,
) {
  const skip = (page - 1) * limit;

  const filter: Record<string, unknown> = {
    documentId: new Types.ObjectId(documentId),
  };
  if (projectId && Types.ObjectId.isValid(projectId)) {
    filter.projectId = new Types.ObjectId(projectId);
  }

  const [versions, total] = await Promise.all([
    DocumentVersion.find(filter)
      .sort({ versionNumber: -1 })
      .skip(skip)
      .limit(limit)
      .populate('createdById', 'name email'),
    DocumentVersion.countDocuments(filter),
  ]);

  return {
    versions,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

export async function getDocumentVersionById(
  documentId: string,
  versionId: string,
  projectId?: string | null,
) {
  if (!Types.ObjectId.isValid(versionId) || !Types.ObjectId.isValid(documentId)) {
    throw new AppError('Invalid resource ID', 400, 'INVALID_ID');
  }

  const filter: Record<string, unknown> = {
    _id: new Types.ObjectId(versionId),
    documentId: new Types.ObjectId(documentId),
  };
  if (projectId && Types.ObjectId.isValid(projectId)) {
    filter.projectId = new Types.ObjectId(projectId);
  }

  const version = await DocumentVersion.findOne(filter).populate('createdById', 'name email');

  if (!version) {
    throw new AppError('Document version not found', 404, 'VERSION_NOT_FOUND');
  }

  return version;
}

export interface VersionCompareResult {
  diffSupported: boolean;
  reason?: string;
  sourceVersionNumber: number;
  targetVersionNumber: number;
  sizeDeltaBytes: number;
  summary: {
    additions: number;
    deletions: number;
  };
  textDiff?: string;
}

export async function compareDocumentVersions(
  documentId: string,
  projectId: string | null | undefined,
  sourceVersionId: string,
  targetVersionId: string,
): Promise<VersionCompareResult> {
  const [sourceVersion, targetVersion] = await Promise.all([
    getDocumentVersionById(documentId, sourceVersionId, projectId),
    getDocumentVersionById(documentId, targetVersionId, projectId),
  ]);

  const sizeDeltaBytes = targetVersion.fileSize - sourceVersion.fileSize;

  // Same version comparison optimization
  if (sourceVersion._id.toString() === targetVersion._id.toString()) {
    return {
      diffSupported: true,
      sourceVersionNumber: sourceVersion.versionNumber,
      targetVersionNumber: targetVersion.versionNumber,
      sizeDeltaBytes: 0,
      summary: { additions: 0, deletions: 0 },
      textDiff: '',
    };
  }

  const maxDiffSizeBytes = 1 * 1024 * 1024; // 1 MB limit
  const isSourceText = isTextFileType(sourceVersion.fileType, sourceVersion.fileName);
  const isTargetText = isTextFileType(targetVersion.fileType, targetVersion.fileName);

  if (!isSourceText || !isTargetText) {
    return {
      diffSupported: false,
      reason: 'Binary file format: text comparison is disabled',
      sourceVersionNumber: sourceVersion.versionNumber,
      targetVersionNumber: targetVersion.versionNumber,
      sizeDeltaBytes,
      summary: { additions: 0, deletions: 0 },
    };
  }

  if (sourceVersion.fileSize > maxDiffSizeBytes || targetVersion.fileSize > maxDiffSizeBytes) {
    return {
      diffSupported: false,
      reason: 'File size exceeds 1 MB comparison limit',
      sourceVersionNumber: sourceVersion.versionNumber,
      targetVersionNumber: targetVersion.versionNumber,
      sizeDeltaBytes,
      summary: { additions: 0, deletions: 0 },
    };
  }

  let sourceText: string;
  let targetText: string;

  try {
    sourceText = await fs.promises.readFile(sourceVersion.filePath, 'utf-8');
    targetText = await fs.promises.readFile(targetVersion.filePath, 'utf-8');
  } catch (err) {
    throw new AppError(
      `Failed to read version file for comparison: ${err instanceof Error ? err.message : String(err)}`,
      500,
      'FILE_READ_ERROR',
    );
  }

  const sourceLines = sourceText.split(/\r?\n/);
  const targetLines = targetText.split(/\r?\n/);

  let additions = 0;
  let deletions = 0;
  const diffLines: string[] = [];

  const maxLines = Math.max(sourceLines.length, targetLines.length);
  for (let i = 0; i < maxLines; i++) {
    const sLine = sourceLines[i];
    const tLine = targetLines[i];

    if (sLine === tLine) {
      if (sLine !== undefined) {
        diffLines.push(` ${sLine}`);
      }
    } else {
      if (sLine !== undefined) {
        diffLines.push(`-${sLine}`);
        deletions++;
      }
      if (tLine !== undefined) {
        diffLines.push(`+${tLine}`);
        additions++;
      }
    }
  }

  return {
    diffSupported: true,
    sourceVersionNumber: sourceVersion.versionNumber,
    targetVersionNumber: targetVersion.versionNumber,
    sizeDeltaBytes,
    summary: { additions, deletions },
    textDiff: diffLines.slice(0, 2000).join('\n'), // Bound response size
  };
}

export async function ensureDocumentVersionBaseline(doc: DocumentDocument): Promise<void> {
  const existingV1 = await DocumentVersion.findOne({
    documentId: doc._id,
    versionNumber: 1,
  });

  if (existingV1) {
    return;
  }

  if (!fs.existsSync(doc.filePath)) {
    console.warn(`Baseline version creation skipped: Active file path not found for doc ${doc._id.toString()}`);
    return;
  }

  const sanitized = sanitizeFileName(doc.fileName);
  const destinationPath = path.join(
    uploadVersionsDirectory,
    `${doc._id.toString()}_v1_baseline_${sanitized}`,
  );

  try {
    await fs.promises.copyFile(doc.filePath, destinationPath);

    await DocumentVersion.create({
      documentId: doc._id,
      projectId: doc.projectId as Types.ObjectId,
      versionNumber: 1,
      fileName: doc.fileName,
      filePath: destinationPath,
      fileType: doc.fileType,
      fileSize: doc.fileSize,
      changeSummary: 'Baseline version snapshot created during Phase 7.4 migration',
      createdById: doc.ownerId,
      createdAt: doc.createdAt || new Date(),
    });
  } catch (err) {
    console.warn(`Failed to create baseline v1 for doc ${doc._id.toString()}:`, err);
  }
}
