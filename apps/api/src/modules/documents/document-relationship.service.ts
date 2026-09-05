import { Types } from 'mongoose';

import {
  DocumentRelationship,
  type DocumentRelationshipType,
} from './document-relationship.model.js';
import { Document, type DocumentDocument, type DocumentStatus } from './document.model.js';
import { DocumentShare } from '../document-shares/document-share.model.js';
import { ProjectTopologyLink } from '../projects/project-topology.model.js';
import { createDocumentAudit } from './document-audit.service.js';
import type { CreateDocumentRelationshipInput } from './document-relationship.schema.js';
import { AppError } from '../../errors/app-error.js';

export interface RelatedDocumentSummary {
  id: string;
  title: string;
  fileName: string;
  fileType: string;
}

export interface DocumentRelationshipResponse {
  id: string;
  sourceDocumentId: string;
  targetDocumentId: string;
  type: DocumentRelationshipType;
  direction: 'OUTGOING' | 'INCOMING';
  sourceDocument: RelatedDocumentSummary;
  targetDocument: RelatedDocumentSummary;
  relatedDocument: RelatedDocumentSummary;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface DocumentDependencyItem {
  id: string;
  title: string;
  fileName: string;
  fileType: string;
  status: DocumentStatus;
  depth: number;
  direction: 'UPSTREAM' | 'DOWNSTREAM';
}

export interface DocumentDependenciesResponse {
  summary: {
    upstreamCount: number;
    downstreamCount: number;
    cycleDetected: boolean;
  };
  upstream: DocumentDependencyItem[];
  downstream: DocumentDependencyItem[];
}

function validateObjectId(id: string, errorMessage = 'Invalid document ID'): void {
  if (!Types.ObjectId.isValid(id)) {
    throw new AppError(errorMessage, 404, 'DOCUMENT_NOT_FOUND');
  }
}

async function verifyDocumentAccess(
  userId: string,
  role: 'user' | 'admin',
  documentId: string,
  requiredPermission: 'READ' | 'EDIT',
) {
  validateObjectId(documentId, 'Invalid document ID');

  const document = await Document.findOne({
    _id: documentId,
    isDeleted: false,
  });

  if (!document) {
    throw new AppError('Document not found', 404, 'DOCUMENT_NOT_FOUND');
  }

  if (role === 'admin' || document.ownerId.toString() === userId) {
    return { document, isOwner: true, permission: 'EDIT' as const };
  }

  const share = await DocumentShare.findOne({
    documentId: document._id,
    sharedWithUserId: new Types.ObjectId(userId),
  });

  if (!share) {
    throw new AppError('Document not found', 404, 'DOCUMENT_NOT_FOUND');
  }

  if (requiredPermission === 'EDIT' && share.permission !== 'EDIT') {
    throw new AppError('Forbidden', 403, 'FORBIDDEN');
  }

  return { document, isOwner: false, permission: share.permission };
}

export async function createDocumentRelationship(
  userId: string,
  role: 'user' | 'admin',
  sourceDocumentId: string,
  input: CreateDocumentRelationshipInput,
): Promise<DocumentRelationshipResponse> {
  const { document: sourceDocument } = await verifyDocumentAccess(
    userId,
    role,
    sourceDocumentId,
    'EDIT',
  );

  if (sourceDocumentId === input.targetDocumentId) {
    throw new AppError(
      'Cannot create relationship to the same document',
      400,
      'CANNOT_RELATE_TO_SELF',
    );
  }

  const { document: targetDocument } = await verifyDocumentAccess(
    userId,
    role,
    input.targetDocumentId,
    'READ',
  );

  if (
    sourceDocument.projectId &&
    targetDocument.projectId &&
    sourceDocument.projectId.toString() !== targetDocument.projectId.toString()
  ) {
    const topologyLink = await ProjectTopologyLink.findOne({
      $or: [
        { sourceProjectId: sourceDocument.projectId, targetProjectId: targetDocument.projectId },
        { sourceProjectId: targetDocument.projectId, targetProjectId: sourceDocument.projectId },
      ],
    } as unknown as Record<string, unknown>);

    if (!topologyLink) {
      throw new AppError(
        'No valid ProjectTopologyLink exists between the projects for cross-project document relationship',
        400,
        'CROSS_PROJECT_TOPOLOGY_REQUIRED',
      );
    }
  }

  const existing = await DocumentRelationship.findOne({
    sourceDocumentId: sourceDocument._id,
    targetDocumentId: targetDocument._id,
    type: input.type,
  });

  if (existing) {
    throw new AppError(
      'Relationship already exists',
      400,
      'RELATIONSHIP_ALREADY_EXISTS',
    );
  }

  const relationship = await DocumentRelationship.create({
    sourceDocumentId: sourceDocument._id,
    targetDocumentId: targetDocument._id,
    type: input.type,
    createdBy: new Types.ObjectId(userId),
  });

  await createDocumentAudit(
    sourceDocument._id.toString(),
    userId,
    'RELATIONSHIP_CREATE',
    {
      targetDocumentId: targetDocument._id.toString(),
      targetDocumentTitle: targetDocument.title,
      relationshipType: input.type,
      relationshipId: relationship._id.toString(),
    },
  );

  const sourceSummary: RelatedDocumentSummary = {
    id: sourceDocument._id.toString(),
    title: sourceDocument.title,
    fileName: sourceDocument.fileName,
    fileType: sourceDocument.fileType,
  };

  const targetSummary: RelatedDocumentSummary = {
    id: targetDocument._id.toString(),
    title: targetDocument.title,
    fileName: targetDocument.fileName,
    fileType: targetDocument.fileType,
  };

  return {
    id: relationship._id.toString(),
    sourceDocumentId: sourceDocument._id.toString(),
    targetDocumentId: targetDocument._id.toString(),
    type: relationship.type,
    direction: 'OUTGOING',
    sourceDocument: sourceSummary,
    targetDocument: targetSummary,
    relatedDocument: targetSummary,
    createdBy: relationship.createdBy.toString(),
    createdAt: relationship.createdAt,
    updatedAt: relationship.updatedAt,
  };
}

export async function getDocumentRelationships(
  userId: string,
  role: 'user' | 'admin',
  documentId: string,
): Promise<DocumentRelationshipResponse[]> {
  await verifyDocumentAccess(userId, role, documentId, 'READ');

  const docObjectId = new Types.ObjectId(documentId);

  const rawRelationships = await DocumentRelationship.find({
    $or: [{ sourceDocumentId: docObjectId }, { targetDocumentId: docObjectId }],
  })
    .populate<{
      sourceDocumentId: DocumentDocument & { _id: Types.ObjectId };
      targetDocumentId: DocumentDocument & { _id: Types.ObjectId };
    }>([
      { path: 'sourceDocumentId', select: 'title fileName fileType isDeleted ownerId' },
      { path: 'targetDocumentId', select: 'title fileName fileType isDeleted ownerId' },
    ])
    .sort({ createdAt: -1 });

  // Filter out soft-deleted documents
  const activeRelationships = rawRelationships.filter(
    (rel) =>
      rel.sourceDocumentId &&
      !rel.sourceDocumentId.isDeleted &&
      rel.targetDocumentId &&
      !rel.targetDocumentId.isDeleted,
  );

  if (activeRelationships.length === 0) {
    return [];
  }

  // Check authorization for the "other" document if not admin
  let readableDocIdsSet: Set<string> | null = null;
  if (role !== 'admin') {
    const otherDocIds = activeRelationships.map((rel) => {
      const isSource = rel.sourceDocumentId._id.toString() === documentId;
      return isSource ? rel.targetDocumentId._id : rel.sourceDocumentId._id;
    });

    const shares = await DocumentShare.find({
      documentId: { $in: otherDocIds },
      sharedWithUserId: new Types.ObjectId(userId),
    }).select('documentId');

    const sharedDocIds = new Set(shares.map((s) => s.documentId.toString()));

    readableDocIdsSet = new Set<string>();
    for (const rel of activeRelationships) {
      const isSource = rel.sourceDocumentId._id.toString() === documentId;
      const otherDoc = isSource ? rel.targetDocumentId : rel.sourceDocumentId;
      const otherDocIdStr = otherDoc._id.toString();

      if (
        otherDoc.ownerId.toString() === userId ||
        sharedDocIds.has(otherDocIdStr)
      ) {
        readableDocIdsSet.add(otherDocIdStr);
      }
    }
  }

  const results: DocumentRelationshipResponse[] = [];

  for (const rel of activeRelationships) {
    const sourceIdStr = rel.sourceDocumentId._id.toString();
    const targetIdStr = rel.targetDocumentId._id.toString();
    const isSource = sourceIdStr === documentId;
    const otherIdStr = isSource ? targetIdStr : sourceIdStr;

    if (readableDocIdsSet && !readableDocIdsSet.has(otherIdStr)) {
      continue;
    }

    const sourceSummary: RelatedDocumentSummary = {
      id: sourceIdStr,
      title: rel.sourceDocumentId.title,
      fileName: rel.sourceDocumentId.fileName,
      fileType: rel.sourceDocumentId.fileType,
    };

    const targetSummary: RelatedDocumentSummary = {
      id: targetIdStr,
      title: rel.targetDocumentId.title,
      fileName: rel.targetDocumentId.fileName,
      fileType: rel.targetDocumentId.fileType,
    };

    const direction: 'OUTGOING' | 'INCOMING' = isSource ? 'OUTGOING' : 'INCOMING';

    results.push({
      id: rel._id.toString(),
      sourceDocumentId: sourceIdStr,
      targetDocumentId: targetIdStr,
      type: rel.type,
      direction,
      sourceDocument: sourceSummary,
      targetDocument: targetSummary,
      relatedDocument: isSource ? targetSummary : sourceSummary,
      createdBy: rel.createdBy.toString(),
      createdAt: rel.createdAt,
      updatedAt: rel.updatedAt,
    });
  }

  return results;
}

export async function deleteDocumentRelationship(
  userId: string,
  role: 'user' | 'admin',
  documentId: string,
  relationshipId: string,
): Promise<{ message: string }> {
  await verifyDocumentAccess(userId, role, documentId, 'EDIT');

  if (!Types.ObjectId.isValid(relationshipId)) {
    throw new AppError('Relationship not found', 404, 'RELATIONSHIP_NOT_FOUND');
  }

  const relationship = await DocumentRelationship.findById(relationshipId);

  if (!relationship) {
    throw new AppError('Relationship not found', 404, 'RELATIONSHIP_NOT_FOUND');
  }

  // Strict check: verify that relationship actually belongs to the document specified by URL param :id
  const sourceStr = relationship.sourceDocumentId.toString();
  const targetStr = relationship.targetDocumentId.toString();

  if (sourceStr !== documentId && targetStr !== documentId) {
    throw new AppError('Relationship not found', 404, 'RELATIONSHIP_NOT_FOUND');
  }

  const otherDocId = sourceStr === documentId ? targetStr : sourceStr;

  await DocumentRelationship.deleteOne({ _id: relationship._id });

  await createDocumentAudit(documentId, userId, 'RELATIONSHIP_DELETE', {
    targetDocumentId: otherDocId,
    relationshipType: relationship.type,
    relationshipId: relationship._id.toString(),
  });

  return {
    message: 'Relationship deleted successfully',
  };
}

export async function getDocumentDependencies(
  userId: string,
  role: 'user' | 'admin',
  documentId: string,
  maxDepth = 3,
): Promise<DocumentDependenciesResponse> {
  await verifyDocumentAccess(userId, role, documentId, 'READ');

  const effectiveMaxDepth = Math.min(Math.max(maxDepth || 3, 1), 3);
  const MAX_NODES = 50;
  const userObjId = new Types.ObjectId(userId);
  let cycleDetected = false;

  async function getReadableDocIdsSet(
    docObjectIds: Types.ObjectId[],
  ): Promise<Set<string>> {
    if (role === 'admin' || docObjectIds.length === 0) {
      return new Set(docObjectIds.map((id) => id.toString()));
    }

    const docs = await Document.find({
      _id: { $in: docObjectIds },
      isDeleted: false,
    }).select('_id ownerId');

    const ownerDocIds = new Set(
      docs
        .filter((d) => d.ownerId.toString() === userId)
        .map((d) => d._id.toString()),
    );

    const nonOwnerDocIds = docs
      .filter((d) => d.ownerId.toString() !== userId)
      .map((d) => d._id);

    let sharedDocIds = new Set<string>();
    if (nonOwnerDocIds.length > 0) {
      const shares = await DocumentShare.find({
        documentId: { $in: nonOwnerDocIds },
        sharedWithUserId: userObjId,
      }).select('documentId');
      sharedDocIds = new Set(shares.map((s) => s.documentId.toString()));
    }

    const readableSet = new Set<string>();
    for (const d of docs) {
      const idStr = d._id.toString();
      if (ownerDocIds.has(idStr) || sharedDocIds.has(idStr)) {
        readableSet.add(idStr);
      }
    }

    return readableSet;
  }

  // 1. UPSTREAM TRAVERSAL (sourceDocumentId -> targetDocumentId)
  const upstreamItems: DocumentDependencyItem[] = [];
  let currentUpstreamLevelDocIds: string[] = [documentId];
  const visitedUpstreamNodes = new Set<string>([documentId]);

  for (let depth = 1; depth <= effectiveMaxDepth; depth++) {
    if (currentUpstreamLevelDocIds.length === 0 || upstreamItems.length >= MAX_NODES) {
      break;
    }

    const relationships = await DocumentRelationship.find({
      sourceDocumentId: {
        $in: currentUpstreamLevelDocIds.map((id) => new Types.ObjectId(id)),
      },
      type: 'DEPENDS_ON',
    }).populate<{ targetDocumentId: DocumentDocument & { _id: Types.ObjectId } }>({
      path: 'targetDocumentId',
      select: 'title fileName fileType status isDeleted ownerId',
    });

    const activeRels = relationships.filter(
      (rel) => rel.targetDocumentId && !rel.targetDocumentId.isDeleted,
    );

    if (activeRels.length === 0) {
      break;
    }

    const candidateTargetObjIds = activeRels.map((rel) => rel.targetDocumentId._id);
    const readableTargetIdsSet = await getReadableDocIdsSet(candidateTargetObjIds);
    const nextLevelDocIds: string[] = [];

    for (const rel of activeRels) {
      const targetIdStr = rel.targetDocumentId._id.toString();

      // STRICT AUTHORIZATION PRUNING: Stop traversal at unreadable node
      if (!readableTargetIdsSet.has(targetIdStr)) {
        continue;
      }

      if (visitedUpstreamNodes.has(targetIdStr)) {
        cycleDetected = true;
        continue;
      }

      visitedUpstreamNodes.add(targetIdStr);
      nextLevelDocIds.push(targetIdStr);

      upstreamItems.push({
        id: targetIdStr,
        title: rel.targetDocumentId.title,
        fileName: rel.targetDocumentId.fileName,
        fileType: rel.targetDocumentId.fileType,
        status: rel.targetDocumentId.status || 'DRAFT',
        depth,
        direction: 'UPSTREAM',
      });

      if (upstreamItems.length >= MAX_NODES) {
        break;
      }
    }

    currentUpstreamLevelDocIds = nextLevelDocIds;
  }

  // 2. DOWNSTREAM TRAVERSAL (targetDocumentId <- sourceDocumentId)
  const downstreamItems: DocumentDependencyItem[] = [];
  let currentDownstreamLevelDocIds: string[] = [documentId];
  const visitedDownstreamNodes = new Set<string>([documentId]);

  for (let depth = 1; depth <= effectiveMaxDepth; depth++) {
    if (currentDownstreamLevelDocIds.length === 0 || downstreamItems.length >= MAX_NODES) {
      break;
    }

    const relationships = await DocumentRelationship.find({
      targetDocumentId: {
        $in: currentDownstreamLevelDocIds.map((id) => new Types.ObjectId(id)),
      },
      type: 'DEPENDS_ON',
    }).populate<{ sourceDocumentId: DocumentDocument & { _id: Types.ObjectId } }>({
      path: 'sourceDocumentId',
      select: 'title fileName fileType status isDeleted ownerId',
    });

    const activeRels = relationships.filter(
      (rel) => rel.sourceDocumentId && !rel.sourceDocumentId.isDeleted,
    );

    if (activeRels.length === 0) {
      break;
    }

    const candidateSourceObjIds = activeRels.map((rel) => rel.sourceDocumentId._id);
    const readableSourceIdsSet = await getReadableDocIdsSet(candidateSourceObjIds);
    const nextLevelDocIds: string[] = [];

    for (const rel of activeRels) {
      const sourceIdStr = rel.sourceDocumentId._id.toString();

      // STRICT AUTHORIZATION PRUNING: Stop traversal at unreadable node
      if (!readableSourceIdsSet.has(sourceIdStr)) {
        continue;
      }

      if (visitedDownstreamNodes.has(sourceIdStr)) {
        cycleDetected = true;
        continue;
      }

      visitedDownstreamNodes.add(sourceIdStr);
      nextLevelDocIds.push(sourceIdStr);

      downstreamItems.push({
        id: sourceIdStr,
        title: rel.sourceDocumentId.title,
        fileName: rel.sourceDocumentId.fileName,
        fileType: rel.sourceDocumentId.fileType,
        status: rel.sourceDocumentId.status || 'DRAFT',
        depth,
        direction: 'DOWNSTREAM',
      });

      if (downstreamItems.length >= MAX_NODES) {
        break;
      }
    }

    currentDownstreamLevelDocIds = nextLevelDocIds;
  }

  const sortItems = (a: DocumentDependencyItem, b: DocumentDependencyItem) => {
    if (a.depth !== b.depth) {
      return a.depth - b.depth;
    }
    return a.title.localeCompare(b.title);
  };

  upstreamItems.sort(sortItems);
  downstreamItems.sort(sortItems);

  return {
    summary: {
      upstreamCount: upstreamItems.length,
      downstreamCount: downstreamItems.length,
      cycleDetected,
    },
    upstream: upstreamItems,
    downstream: downstreamItems,
  };
}
