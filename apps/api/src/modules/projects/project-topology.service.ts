import { Types } from 'mongoose';

import { AppError } from '../../errors/app-error.js';
import { Project } from './project.model.js';
import { Document } from '../documents/document.model.js';
import { DocumentRelationship } from '../documents/document-relationship.model.js';
import { DocumentShare } from '../document-shares/document-share.model.js';
import { DocumentAudit } from '../documents/document-audit.model.js';
import {
  ProjectTopologyLink,
  type IProjectTopologyLink,
  type ProjectTopologyType,
} from './project-topology.model.js';
import type {
  CreateProjectTopologyLinkInput,
  UpdateProjectTopologyLinkInput,
} from './project-topology.schema.js';

function validateObjectId(id: string, errorMessage = 'Invalid ID', code = 'NOT_FOUND'): void {
  if (!Types.ObjectId.isValid(id)) {
    throw new AppError(errorMessage, 404, code);
  }
}

export async function checkUserProjectReadAccess(
  userId: string,
  role: 'user' | 'admin',
  projectId: string | Types.ObjectId,
): Promise<boolean> {
  const projObjId = new Types.ObjectId(projectId.toString());
  const project = await Project.findOne({ _id: projObjId, isArchived: false });
  if (!project) return false;

  if (role === 'admin' || project.ownerId.toString() === userId) {
    return true;
  }

  const userObjId = new Types.ObjectId(userId);
  const hasDocAccess = await Document.exists({
    projectId: projObjId,
    isDeleted: false,
    $or: [{ ownerId: userObjId }, { stewardId: userObjId }],
  });

  if (hasDocAccess) return true;

  const sharedDocs = await Document.find({ projectId: projObjId, isDeleted: false }).select('_id');
  const docIds = sharedDocs.map((d) => d._id);
  const hasShareAccess = await DocumentShare.exists({
    documentId: { $in: docIds },
    sharedWithUserId: userObjId,
  });

  return Boolean(hasShareAccess);
}

export async function verifyProjectOwnerOrAdmin(
  userId: string,
  role: 'user' | 'admin',
  projectId: string | Types.ObjectId,
): Promise<InstanceType<typeof Project>> {
  validateObjectId(projectId.toString(), 'Project not found', 'PROJECT_NOT_FOUND');
  const projObjId = new Types.ObjectId(projectId.toString());

  const project = await Project.findOne({ _id: projObjId, isArchived: false });
  if (!project) {
    throw new AppError('Project not found', 404, 'PROJECT_NOT_FOUND');
  }

  const isOwner = project.ownerId.toString() === userId;

  if (role !== 'admin' && !isOwner) {
    throw new AppError(
      'Forbidden: Only project owner or admin can perform this operation',
      403,
      'FORBIDDEN',
    );
  }

  return project;
}

export async function createProjectTopologyLink(
  userId: string,
  role: 'user' | 'admin',
  sourceProjectId: string,
  data: CreateProjectTopologyLinkInput,
): Promise<IProjectTopologyLink> {
  validateObjectId(sourceProjectId, 'Project not found', 'PROJECT_NOT_FOUND');
  validateObjectId(data.targetProjectId, 'Target project not found', 'TARGET_PROJECT_NOT_FOUND');

  if (sourceProjectId === data.targetProjectId) {
    throw new AppError(
      'Self-referencing project topology links are invalid',
      400,
      'INVALID_TOPOLOGY_LINK',
    );
  }

  const sourceProject = await verifyProjectOwnerOrAdmin(userId, role, sourceProjectId);
  const targetProjObjId = new Types.ObjectId(data.targetProjectId);

  const targetProject = await Project.findOne({
    _id: targetProjObjId,
    isArchived: false,
  });

  if (!targetProject) {
    throw new AppError('Target project not found or is archived', 404, 'TARGET_PROJECT_NOT_FOUND');
  }

  const sourceProjObjId = sourceProject._id as Types.ObjectId;

  // 1. Direct duplicate check
  const existingDirect = await ProjectTopologyLink.findOne({
    sourceProjectId: sourceProjObjId,
    targetProjectId: targetProjObjId,
    type: data.type,
  });

  if (existingDirect) {
    throw new AppError(
      'Topology link already exists',
      409,
      'TOPOLOGY_LINK_EXISTS',
    );
  }

  // 2. Semantic duplicate / conflict checks
  if (data.type === 'DEPENDS_ON') {
    const inverseProvides = await ProjectTopologyLink.findOne({
      sourceProjectId: targetProjObjId,
      targetProjectId: sourceProjObjId,
      type: 'PROVIDES_API_TO',
    });
    if (inverseProvides) {
      throw new AppError(
        'Semantic duplicate topology concept already exists in inverse direction',
        409,
        'DUPLICATE_TOPOLOGY_CONCEPT',
      );
    }
  } else if (data.type === 'PROVIDES_API_TO') {
    const inverseDepends = await ProjectTopologyLink.findOne({
      sourceProjectId: targetProjObjId,
      targetProjectId: sourceProjObjId,
      type: 'DEPENDS_ON',
    });
    if (inverseDepends) {
      throw new AppError(
        'Semantic duplicate topology concept already exists in inverse direction',
        409,
        'DUPLICATE_TOPOLOGY_CONCEPT',
      );
    }
  } else if (data.type === 'INTEGRATES_WITH') {
    const inverseIntegrates = await ProjectTopologyLink.findOne({
      sourceProjectId: targetProjObjId,
      targetProjectId: sourceProjObjId,
      type: 'INTEGRATES_WITH',
    });
    if (inverseIntegrates) {
      throw new AppError(
        'Peer integration topology link already exists in inverse direction',
        409,
        'DUPLICATE_TOPOLOGY_CONCEPT',
      );
    }
  } else if (data.type === 'SHARED_LIBRARY') {
    const inverseLibrary = await ProjectTopologyLink.findOne({
      sourceProjectId: targetProjObjId,
      targetProjectId: sourceProjObjId,
      type: 'SHARED_LIBRARY',
    });
    if (inverseLibrary) {
      throw new AppError(
        'Shared library topology link already exists in inverse direction',
        409,
        'DUPLICATE_TOPOLOGY_CONCEPT',
      );
    }
  }

  try {
    const newLink = await ProjectTopologyLink.create({
      sourceProjectId: sourceProjObjId,
      targetProjectId: targetProjObjId,
      type: data.type,
      description: data.description ? data.description.trim() : null,
      createdBy: new Types.ObjectId(userId),
    });

    try {
      await DocumentAudit.create({
        documentId: sourceProjObjId,
        userId: new Types.ObjectId(userId),
        action: 'PROJECT_TOPOLOGY_LINK_CREATED',
        metadata: {
          sourceProjectId: sourceProjObjId.toString(),
          targetProjectId: targetProjObjId.toString(),
          type: data.type,
        },
      });
    } catch {
      // Non-blocking audit failure guard
    }

    return newLink;
  } catch (error: unknown) {
    if (typeof error === 'object' && error !== null && 'code' in error && (error as { code: number }).code === 11000) {
      throw new AppError('Topology link already exists', 409, 'TOPOLOGY_LINK_EXISTS');
    }
    throw error;
  }
}

export async function getProjectTopologyLinks(
  userId: string,
  role: 'user' | 'admin',
  projectId: string,
) {
  validateObjectId(projectId, 'Project not found', 'PROJECT_NOT_FOUND');
  const hasAccess = await checkUserProjectReadAccess(userId, role, projectId);
  if (!hasAccess) {
    throw new AppError('Access denied to project', 403, 'FORBIDDEN');
  }

  const projObjId = new Types.ObjectId(projectId);

  const links = await ProjectTopologyLink.find({
    $or: [{ sourceProjectId: projObjId }, { targetProjectId: projObjId }],
  })
    .populate('sourceProjectId', 'name description isArchived ownerId')
    .populate('targetProjectId', 'name description isArchived ownerId')
    .populate('createdBy', 'name email')
    .sort({ createdAt: -1 });

  const filteredLinks = [];
  for (const link of links) {
    const sourceId = link.sourceProjectId?._id?.toString() || link.sourceProjectId?.toString();
    const targetId = link.targetProjectId?._id?.toString() || link.targetProjectId?.toString();

    const canReadSource = sourceId ? await checkUserProjectReadAccess(userId, role, sourceId) : false;
    const canReadTarget = targetId ? await checkUserProjectReadAccess(userId, role, targetId) : false;

    // Strict Privacy Requirement: Caller must be authorized to read BOTH sides of the topology link
    if (!canReadSource || !canReadTarget) {
      continue;
    }

    filteredLinks.push(link.toObject());
  }

  return filteredLinks;
}

export async function updateProjectTopologyLink(
  userId: string,
  role: 'user' | 'admin',
  projectId: string,
  linkId: string,
  data: UpdateProjectTopologyLinkInput,
): Promise<IProjectTopologyLink> {
  validateObjectId(projectId, 'Project not found', 'PROJECT_NOT_FOUND');
  validateObjectId(linkId, 'Topology link not found', 'LINK_NOT_FOUND');

  await verifyProjectOwnerOrAdmin(userId, role, projectId);

  const link = await ProjectTopologyLink.findOne({
    _id: linkId,
    sourceProjectId: new Types.ObjectId(projectId),
  });

  if (!link) {
    throw new AppError('Topology link not found', 404, 'LINK_NOT_FOUND');
  }

  if (data.type && data.type !== link.type) {
    // Check direct duplicate
    const existingDirect = await ProjectTopologyLink.findOne({
      _id: { $ne: link._id },
      sourceProjectId: link.sourceProjectId,
      targetProjectId: link.targetProjectId,
      type: data.type,
    });
    if (existingDirect) {
      throw new AppError('Topology link already exists', 409, 'TOPOLOGY_LINK_EXISTS');
    }
    link.type = data.type;
  }

  if (data.description !== undefined) {
    link.description = data.description ? data.description.trim() : null;
  }

  await link.save();

  try {
    await DocumentAudit.create({
      documentId: new Types.ObjectId(projectId),
      userId: new Types.ObjectId(userId),
      action: 'PROJECT_TOPOLOGY_LINK_UPDATED',
      metadata: {
        linkId: link._id.toString(),
        type: link.type,
      },
    });
  } catch {
    // Non-blocking audit guard
  }

  return link;
}

export async function deleteProjectTopologyLink(
  userId: string,
  role: 'user' | 'admin',
  projectId: string,
  linkId: string,
): Promise<{ success: boolean; message: string }> {
  validateObjectId(projectId, 'Project not found', 'PROJECT_NOT_FOUND');
  validateObjectId(linkId, 'Topology link not found', 'LINK_NOT_FOUND');

  await verifyProjectOwnerOrAdmin(userId, role, projectId);

  const link = await ProjectTopologyLink.findOne({
    _id: linkId,
    sourceProjectId: new Types.ObjectId(projectId),
  });

  if (!link) {
    throw new AppError('Topology link not found', 404, 'LINK_NOT_FOUND');
  }

  await link.deleteOne();

  try {
    await DocumentAudit.create({
      documentId: new Types.ObjectId(projectId),
      userId: new Types.ObjectId(userId),
      action: 'PROJECT_TOPOLOGY_LINK_DELETED',
      metadata: {
        linkId: link._id.toString(),
      },
    });
  } catch {
    // Non-blocking audit guard
  }

  return { success: true, message: 'Topology link deleted successfully' };
}

export async function getProjectArchitectureGraph(
  userId: string,
  role: 'user' | 'admin',
  projectId: string,
) {
  validateObjectId(projectId, 'Project not found', 'PROJECT_NOT_FOUND');
  const hasAccess = await checkUserProjectReadAccess(userId, role, projectId);
  if (!hasAccess) {
    throw new AppError('Access denied to project', 403, 'FORBIDDEN');
  }

  const projObjId = new Types.ObjectId(projectId);
  const evaluatedAt = new Date();

  // Bounded traversal parameters
  const MAX_DEPTH = 3;
  const MAX_NODES = 50;

  const visitedProjectIds = new Set<string>([projObjId.toString()]);
  const queue: Array<{ id: string; depth: number }> = [{ id: projObjId.toString(), depth: 1 }];

  const nodeMap = new Map<string, { id: string; name: string; isCurrentProject: boolean }>();
  const edgeMap = new Map<
    string,
    {
      id: string;
      sourceProjectId: string;
      targetProjectId: string;
      type: ProjectTopologyType;
      contractCount: number;
      hasActiveDrift: boolean;
    }
  >();

  // Fetch current project detail
  const rootProj = await Project.findById(projObjId).select('_id name');
  if (rootProj) {
    nodeMap.set(projObjId.toString(), {
      id: projObjId.toString(),
      name: rootProj.name,
      isCurrentProject: true,
    });
  }

  while (queue.length > 0 && nodeMap.size < MAX_NODES) {
    const current = queue.shift()!;
    if (current.depth > MAX_DEPTH) continue;

    const currentObjId = new Types.ObjectId(current.id);

    const topologyLinks = await ProjectTopologyLink.find({
      $or: [{ sourceProjectId: currentObjId }, { targetProjectId: currentObjId }],
    }).populate<{ sourceProjectId: InstanceType<typeof Project>; targetProjectId: InstanceType<typeof Project> }>([
      { path: 'sourceProjectId', select: '_id name isArchived ownerId' },
      { path: 'targetProjectId', select: '_id name isArchived ownerId' },
    ]);

    for (const link of topologyLinks) {
      if (!link.sourceProjectId || !link.targetProjectId) continue;
      if (link.sourceProjectId.isArchived || link.targetProjectId.isArchived) continue;

      const srcId = link.sourceProjectId._id.toString();
      const tgtId = link.targetProjectId._id.toString();

      const canReadSrc = await checkUserProjectReadAccess(userId, role, srcId);
      const canReadTgt = await checkUserProjectReadAccess(userId, role, tgtId);

      // Strict Privacy Rule: Completely omit nodes/edges if caller lacks access to either side
      if (!canReadSrc || !canReadTgt) {
        continue;
      }

      if (!nodeMap.has(srcId) && nodeMap.size < MAX_NODES) {
        nodeMap.set(srcId, {
          id: srcId,
          name: link.sourceProjectId.name,
          isCurrentProject: srcId === projObjId.toString(),
        });
      }

      if (!nodeMap.has(tgtId) && nodeMap.size < MAX_NODES) {
        nodeMap.set(tgtId, {
          id: tgtId,
          name: link.targetProjectId.name,
          isCurrentProject: tgtId === projObjId.toString(),
        });
      }

      const neighborId = srcId === current.id ? tgtId : srcId;

      if (!visitedProjectIds.has(neighborId) && current.depth < MAX_DEPTH) {
        visitedProjectIds.add(neighborId);
        queue.push({ id: neighborId, depth: current.depth + 1 });
      }

      const edgeKey = link._id.toString();
      if (!edgeMap.has(edgeKey)) {
        // Count cross-project document contracts between srcId & tgtId authorized for current user
        const srcDocs = await Document.find({ projectId: new Types.ObjectId(srcId), isDeleted: false }).select('_id ownerId impactVerification');
        const tgtDocs = await Document.find({ projectId: new Types.ObjectId(tgtId), isDeleted: false }).select('_id ownerId impactVerification');

        const srcDocIds = srcDocs.map((d) => d._id);
        const tgtDocIds = tgtDocs.map((d) => d._id);

        const rels = await DocumentRelationship.find({
          sourceDocumentId: { $in: srcDocIds },
          targetDocumentId: { $in: tgtDocIds },
          type: 'DEPENDS_ON',
        });

        let authorizedContractCount = 0;
        let hasActiveDrift = false;

        for (const r of rels) {
          const sDoc = srcDocs.find((d) => d._id.toString() === r.sourceDocumentId.toString());
          if (sDoc) {
            authorizedContractCount++;
            if (sDoc.impactVerification?.needsVerification) {
              hasActiveDrift = true;
            }
          }
        }

        edgeMap.set(edgeKey, {
          id: edgeKey,
          sourceProjectId: srcId,
          targetProjectId: tgtId,
          type: link.type,
          contractCount: authorizedContractCount,
          hasActiveDrift,
        });
      }
    }
  }

  return {
    projectId: projObjId.toString(),
    evaluatedAt,
    nodes: Array.from(nodeMap.values()),
    edges: Array.from(edgeMap.values()),
  };
}
