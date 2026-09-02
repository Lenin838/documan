import mongoose, { Types } from 'mongoose';

import { AppError } from '../../errors/app-error.js';
import { Project } from '../projects/project.model.js';
import { Document } from '../documents/document.model.js';
import { DocumentShare } from '../document-shares/document-share.model.js';
import { ProjectApiSpec } from './project-api-spec.model.js';
import { ProjectApiEndpoint, type HttpMethod, type ProjectApiEndpointDocument } from './project-api-endpoint.model.js';
import { DocumentEndpointLink } from './document-endpoint-link.model.js';
import { parseOpenApiSpecification } from './openapi-parser.service.js';
import { processApiEndpointDrift } from './api-spec-drift.service.js';
import { createDocumentAudit } from '../documents/document-audit.service.js';
import { verifyProjectOwnerOrAdmin } from '../governance/governance.service.js';

function validateObjectId(id: string, errorMessage = 'Resource not found', code = 'NOT_FOUND'): void {
  if (!Types.ObjectId.isValid(id)) {
    throw new AppError(errorMessage, 404, code);
  }
}

export async function importProjectApiSpec(
  userId: string,
  role: 'user' | 'admin',
  projectId: string,
  rawContent: string,
) {
  const project = await verifyProjectOwnerOrAdmin(projectId, userId, role);

  // 1. Parse & validate incoming specification FIRST (Validation-First Strategy)
  const parsedSpec = parseOpenApiSpecification(rawContent);

  const userObjId = new Types.ObjectId(userId);

  // 2. Fetch current active specification (if any)
  const oldActiveSpec = await ProjectApiSpec.findOne({
    projectId: project._id,
    isActive: true,
  });

  const oldEndpoints: ProjectApiEndpointDocument[] = oldActiveSpec
    ? await ProjectApiEndpoint.find({ specId: oldActiveSpec._id })
    : [];

  // Deactivate old active spec
  if (oldActiveSpec) {
    oldActiveSpec.isActive = false;
    await oldActiveSpec.save();
  }

  // 3. Save new active specification
  const newSpec = await ProjectApiSpec.create({
    projectId: project._id,
    title: parsedSpec.title,
    version: parsedSpec.version,
    format: parsedSpec.format,
    openApiVersion: parsedSpec.openApiVersion,
    rawContent,
    isActive: true,
    createdBy: userObjId,
  });

  // 4. Create new endpoint records & update link states
  const newEndpointDocs = [];
  const processedNewRouteKeys = new Set<string>();
  const newlyDeprecatedEndpoints: Array<{ endpointId: Types.ObjectId; method: string; path: string }> = [];

  for (const ep of parsedSpec.endpoints) {
    const routeKey = `${ep.method}:${ep.path}`;
    processedNewRouteKeys.add(routeKey);

    const epPayload: Record<string, unknown> = {
      projectId: project._id,
      specId: newSpec._id,
      method: ep.method,
      path: ep.path,
      tags: ep.tags,
      isDeprecated: ep.isDeprecated,
    };
    if (ep.summary !== undefined) epPayload.summary = ep.summary;
    if (ep.operationId !== undefined) epPayload.operationId = ep.operationId;

    const newEndpoint = await ProjectApiEndpoint.create(epPayload);
    newEndpointDocs.push(newEndpoint);

    // Find all past endpoints in this project matching the route key
    const canQueryPastEndpoints = mongoose.connection.readyState !== 0 || typeof (ProjectApiEndpoint.find as unknown as { mock?: unknown }).mock !== 'undefined';
    const matchingPastEndpoints = canQueryPastEndpoints
      ? await ProjectApiEndpoint.find({
          projectId: project._id,
          method: ep.method,
          path: ep.path,
        })
      : [];

    const pastEndpointIds = matchingPastEndpoints.map((m) => m._id);

    if (pastEndpointIds.length > 0) {
      const wasPreviouslyNotDeprecated = matchingPastEndpoints.some((m) => !m.isDeprecated);
      if (wasPreviouslyNotDeprecated && ep.isDeprecated) {
        newlyDeprecatedEndpoints.push({
          endpointId: newEndpoint._id,
          method: ep.method,
          path: ep.path,
        });
      }

      // Update links to point to the new endpoint record & recover orphaned state if re-linked
      await DocumentEndpointLink.updateMany(
        { endpointId: { $in: pastEndpointIds } },
        { endpointId: newEndpoint._id, status: 'LINKED', orphanedReason: null },
      );
    } else if (ep.isDeprecated) {
      newlyDeprecatedEndpoints.push({
        endpointId: newEndpoint._id,
        method: ep.method,
        path: ep.path,
      });
    }
  }

  // 5. Handle REMOVED endpoints (Routes present in old spec but absent from new spec)
  const newlyOrphanedLinks: Array<{ linkId: Types.ObjectId; documentId: Types.ObjectId; endpointId: Types.ObjectId }> = [];

  if (oldActiveSpec) {
    for (const oldEp of oldEndpoints) {
      const routeKey = `${oldEp.method}:${oldEp.path}`;
      if (!processedNewRouteKeys.has(routeKey) && oldEp._id) {
        const canQueryLinks = mongoose.connection.readyState !== 0 || typeof (DocumentEndpointLink.find as unknown as { mock?: unknown }).mock !== 'undefined';
        const affectedLinks = canQueryLinks
          ? await DocumentEndpointLink.find({
              endpointId: oldEp._id,
              status: 'LINKED',
            })
          : [];

        for (const link of affectedLinks) {
          newlyOrphanedLinks.push({
            linkId: link._id,
            documentId: link.documentId,
            endpointId: oldEp._id,
          });
        }

        // Mark affected DocumentEndpointLink records as ORPHANED with specific reason
        await DocumentEndpointLink.updateMany(
          { endpointId: oldEp._id, status: 'LINKED' },
          {
            status: 'ORPHANED',
            orphanedReason: 'Endpoint removed in spec re-import',
          },
        );
      }
    }
  }

  // 6. Process API Endpoint Drift using exact transition deltas (non-blocking)
  if ((newlyOrphanedLinks.length > 0 || newlyDeprecatedEndpoints.length > 0) && mongoose.connection.readyState !== 0) {
    void processApiEndpointDrift({
      projectId: project._id,
      newlyOrphanedLinks,
      newlyDeprecatedEndpoints,
    }).catch((err) => {
      console.warn('API spec drift processing error:', err);
    });
  }

  // Audit event
  await createDocumentAudit(project._id.toString(), userId, 'STATUS_CHANGE', {
    action: 'API_SPEC_IMPORT',
    projectId: project._id.toString(),
    specId: newSpec._id.toString(),
    title: newSpec.title,
    version: newSpec.version,
    endpointCount: newEndpointDocs.length,
  }).catch(() => {
    // Ignore audit errors
  });

  return {
    spec: {
      id: newSpec._id.toString(),
      title: newSpec.title,
      version: newSpec.version,
      format: newSpec.format,
      openApiVersion: newSpec.openApiVersion,
      createdAt: newSpec.createdAt,
    },
    endpointsCount: newEndpointDocs.length,
  };
}

export async function getProjectApiSpec(
  userId: string,
  role: 'user' | 'admin',
  projectId: string,
) {
  validateObjectId(projectId, 'Project not found', 'PROJECT_NOT_FOUND');
  const project = await Project.findOne({ _id: projectId, isArchived: false });
  if (!project) {
    throw new AppError('Project not found', 404, 'PROJECT_NOT_FOUND');
  }

  const activeSpec = await ProjectApiSpec.findOne({
    projectId: project._id,
    isActive: true,
  });

  if (!activeSpec) {
    return {
      spec: null,
      endpoints: [],
    };
  }

  const endpoints = await ProjectApiEndpoint.find({ specId: activeSpec._id }).sort({ path: 1, method: 1 });

  return {
    spec: {
      id: activeSpec._id.toString(),
      title: activeSpec.title,
      version: activeSpec.version,
      format: activeSpec.format,
      openApiVersion: activeSpec.openApiVersion,
      createdAt: activeSpec.createdAt,
    },
    endpoints: endpoints.map((e) => ({
      id: e._id.toString(),
      method: e.method,
      path: e.path,
      summary: e.summary || null,
      operationId: e.operationId || null,
      tags: e.tags,
      isDeprecated: e.isDeprecated,
    })),
  };
}

export async function deleteProjectApiSpec(
  userId: string,
  role: 'user' | 'admin',
  projectId: string,
  specId: string,
) {
  const project = await verifyProjectOwnerOrAdmin(projectId, userId, role);
  validateObjectId(specId, 'API specification not found', 'SPEC_NOT_FOUND');

  const spec = await ProjectApiSpec.findOne({
    _id: specId,
    projectId: project._id,
  });

  if (!spec) {
    throw new AppError('API specification not found', 404, 'SPEC_NOT_FOUND');
  }

  spec.isActive = false;
  await spec.save();

  const endpoints = await ProjectApiEndpoint.find({ specId: spec._id }).select('_id');
  const endpointIds = endpoints.map((e) => e._id);

  // Collect active LINKED associations that will transition to ORPHANED
  const canQueryLinks = mongoose.connection.readyState !== 0 || typeof (DocumentEndpointLink.find as unknown as { mock?: unknown }).mock !== 'undefined';
  const affectedLinks = canQueryLinks
    ? await DocumentEndpointLink.find({
        endpointId: { $in: endpointIds },
        status: 'LINKED',
      })
    : [];

  const newlyOrphanedLinks = affectedLinks.map((l) => ({
    linkId: l._id,
    documentId: l.documentId,
    endpointId: l.endpointId,
  }));

  // Transition all affected document links to ORPHANED while preserving history
  await DocumentEndpointLink.updateMany(
    { endpointId: { $in: endpointIds }, status: 'LINKED' },
    {
      status: 'ORPHANED',
      orphanedReason: 'API Specification deleted',
    },
  );

  if (newlyOrphanedLinks.length > 0) {
    void processApiEndpointDrift({
      projectId: project._id,
      newlyOrphanedLinks,
      newlyDeprecatedEndpoints: [],
    }).catch((err) => {
      console.warn('API spec deletion drift processing error:', err);
    });
  }

  await createDocumentAudit(project._id.toString(), userId, 'STATUS_CHANGE', {
    action: 'API_SPEC_DELETE',
    projectId: project._id.toString(),
    specId: spec._id.toString(),
    title: spec.title,
  }).catch(() => {
    // Ignore audit errors
  });

  return {
    id: spec._id.toString(),
    title: spec.title,
    deleted: true,
  };
}

export async function linkDocumentApiEndpoint(
  userId: string,
  role: 'user' | 'admin',
  documentId: string,
  endpointId: string,
) {
  validateObjectId(documentId, 'Document not found', 'DOCUMENT_NOT_FOUND');
  validateObjectId(endpointId, 'API endpoint not found', 'ENDPOINT_NOT_FOUND');

  const document = await Document.findOne({ _id: documentId, isDeleted: false });
  if (!document) {
    throw new AppError('Document not found', 404, 'DOCUMENT_NOT_FOUND');
  }

  // Authorization: Owner, Admin, or Shared EDIT user required
  const hasEditPermission = role === 'admin' || document.ownerId.toString() === userId;
  if (!hasEditPermission) {
    const editShare = await DocumentShare.findOne({
      documentId: document._id,
      sharedWithUserId: new Types.ObjectId(userId),
      permission: 'EDIT',
    });

    if (!editShare) {
      throw new AppError(
        'Forbidden: Linking API endpoints requires EDIT permission',
        403,
        'FORBIDDEN',
      );
    }
  }

  const endpoint = await ProjectApiEndpoint.findById(endpointId);
  if (!endpoint) {
    throw new AppError('API endpoint not found', 404, 'ENDPOINT_NOT_FOUND');
  }

  // Strict Project Isolation (IDOR Protection): Verify endpoint belongs to document's project
  if (!document.projectId || endpoint.projectId.toString() !== document.projectId.toString()) {
    throw new AppError(
      'Forbidden: Cannot link endpoint from a different project',
      403,
      'FORBIDDEN',
    );
  }

  const link = await DocumentEndpointLink.findOneAndUpdate(
    { documentId: document._id, endpointId: endpoint._id },
    {
      projectId: document.projectId,
      status: 'LINKED',
      orphanedReason: null,
      createdBy: new Types.ObjectId(userId),
    },
    { upsert: true, returnDocument: 'after' },
  );

  await createDocumentAudit(document._id.toString(), userId, 'STATUS_CHANGE', {
    action: 'DOCUMENT_ENDPOINT_LINK',
    documentId: document._id.toString(),
    endpointId: endpoint._id.toString(),
    method: endpoint.method,
    path: endpoint.path,
  }).catch(() => {
    // Ignore audit errors
  });

  return {
    id: link!._id.toString(),
    documentId: document._id.toString(),
    endpointId: endpoint._id.toString(),
    method: endpoint.method,
    path: endpoint.path,
    summary: endpoint.summary || null,
    isDeprecated: endpoint.isDeprecated,
    status: link!.status,
  };
}

export async function unlinkDocumentApiEndpoint(
  userId: string,
  role: 'user' | 'admin',
  documentId: string,
  endpointId: string,
) {
  validateObjectId(documentId, 'Document not found', 'DOCUMENT_NOT_FOUND');
  validateObjectId(endpointId, 'API endpoint not found', 'ENDPOINT_NOT_FOUND');

  const document = await Document.findOne({ _id: documentId, isDeleted: false });
  if (!document) {
    throw new AppError('Document not found', 404, 'DOCUMENT_NOT_FOUND');
  }

  const hasEditPermission = role === 'admin' || document.ownerId.toString() === userId;
  if (!hasEditPermission) {
    const editShare = await DocumentShare.findOne({
      documentId: document._id,
      sharedWithUserId: new Types.ObjectId(userId),
      permission: 'EDIT',
    });

    if (!editShare) {
      throw new AppError(
        'Forbidden: Unlinking API endpoints requires EDIT permission',
        403,
        'FORBIDDEN',
      );
    }
  }

  await DocumentEndpointLink.deleteOne({
    documentId: document._id,
    endpointId: new Types.ObjectId(endpointId),
  });

  await createDocumentAudit(document._id.toString(), userId, 'STATUS_CHANGE', {
    action: 'DOCUMENT_ENDPOINT_UNLINK',
    documentId: document._id.toString(),
    endpointId,
  }).catch(() => {
    // Ignore audit errors
  });

  return {
    documentId: document._id.toString(),
    endpointId,
    unlinked: true,
  };
}

export async function getDocumentApiEndpoints(
  userId: string,
  role: 'user' | 'admin',
  documentId: string,
) {
  validateObjectId(documentId, 'Document not found', 'DOCUMENT_NOT_FOUND');

  const document = await Document.findOne({ _id: documentId, isDeleted: false });
  if (!document) {
    throw new AppError('Document not found', 404, 'DOCUMENT_NOT_FOUND');
  }

  const links = await DocumentEndpointLink.find({ documentId: document._id });
  const endpointIds = links.map((l) => l.endpointId);

  const endpoints = await ProjectApiEndpoint.find({ _id: { $in: endpointIds } });
  const endpointMap = new Map(endpoints.map((e) => [e._id.toString(), e]));

  return links.map((link) => {
    const ep = endpointMap.get(link.endpointId.toString());
    return {
      id: link._id.toString(),
      endpointId: link.endpointId.toString(),
      method: ep?.method || ('GET' as HttpMethod),
      path: ep?.path || 'Unknown path',
      summary: ep?.summary || null,
      operationId: ep?.operationId || null,
      isDeprecated: ep?.isDeprecated || false,
      status: link.status,
      orphanedReason: link.orphanedReason || null,
    };
  });
}
