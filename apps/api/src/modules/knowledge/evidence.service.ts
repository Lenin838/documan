import { Types } from 'mongoose';
import { AppError } from '../../errors/app-error.js';
import { Document, type DocumentDocument, type DocumentStatus } from '../documents/document.model.js';
import { DocumentShare } from '../document-shares/document-share.model.js';
import { DocumentRelationship } from '../documents/document-relationship.model.js';
import { DocumentReference } from '../documents/document-reference.model.js';
import { DocumentVersion } from '../documents/document-version.model.js';
import { DocumentEndpointLink } from '../api-specs/document-endpoint-link.model.js';
import { ProjectApiEndpoint } from '../api-specs/project-api-endpoint.model.js';
import { Project } from '../projects/project.model.js';
import { User } from '../users/user.model.js';
import { calculateEvidenceCoverage } from './evidence-calculator.js';
import type {
  DependencyRelationContext,
  DocumentVersionContext,
  EvidenceCoverageContext,
  EvidenceCoverageResult,
  ExternalReferenceContext,
  LinkedEndpointContext,
  UserProvenanceSummary,
} from './evidence.types.js';

export interface SourceDocumentSummary {
  id: string;
  title: string;
  fileName: string;
  fileType: string;
  status: DocumentStatus;
  version: number;
  lastApprovedVersion?: number | null | undefined;
  relationshipType?: string | undefined;
}

export interface ReverseEndpointResponse {
  endpointId: string;
  method: string;
  path: string;
  summary?: string | undefined;
  citingDocuments: SourceDocumentSummary[];
}

export interface ReverseDocumentResponse {
  targetDocumentId: string;
  targetTitle: string;
  citingDocuments: SourceDocumentSummary[];
}

export interface ReverseReferenceResponse {
  url: string;
  citingDocuments: SourceDocumentSummary[];
}

function validateObjectId(id: string, errorMessage = 'Invalid ID'): void {
  if (!Types.ObjectId.isValid(id)) {
    throw new AppError(errorMessage, 400, 'INVALID_ID');
  }
}

async function verifyDocumentAccessInternal(
  userId: string,
  role: 'user' | 'admin',
  documentId: string,
): Promise<{ document: DocumentDocument; isOwner: boolean }> {
  validateObjectId(documentId, 'Invalid document ID');

  const document = await Document.findOne({
    _id: new Types.ObjectId(documentId),
    isDeleted: false,
  });

  if (!document) {
    throw new AppError('Document not found', 404, 'DOCUMENT_NOT_FOUND');
  }

  if (role === 'admin' || document.ownerId.toString() === userId) {
    return { document, isOwner: true };
  }

  const share = await DocumentShare.findOne({
    documentId: document._id,
    sharedWithUserId: new Types.ObjectId(userId),
  });

  if (!share) {
    throw new AppError('Document not found', 404, 'DOCUMENT_NOT_FOUND');
  }

  return { document, isOwner: false };
}

export async function getForwardEvidence(
  userId: string,
  role: 'user' | 'admin',
  documentId: string,
): Promise<EvidenceCoverageResult> {
  const { document } = await verifyDocumentAccessInternal(userId, role, documentId);
  const docObjId = document._id;

  // Bulk query pre-fetching in parallel
  const [endpointLinks, relationships, references, versions, project] = await Promise.all([
    DocumentEndpointLink.find({ documentId: docObjId }).populate<{
      endpointId: { _id: Types.ObjectId; method: string; path: string; summary?: string; isDeprecated?: boolean };
    }>('endpointId'),

    DocumentRelationship.find({ sourceDocumentId: docObjId }).populate<{
      targetDocumentId: { _id: Types.ObjectId; title: string; status: DocumentStatus; version: number; isDeleted: boolean };
    }>('targetDocumentId'),

    DocumentReference.find({ documentId: docObjId }),

    DocumentVersion.find({ documentId: docObjId }).populate<{
      createdById: { _id: Types.ObjectId; name: string };
    }>('createdById', 'name'),

    document.projectId ? Project.findById(document.projectId) : Promise.resolve(null),
  ]);

  // Collect user IDs for owner & steward
  const userIdsSet = new Set<string>();
  userIdsSet.add(document.ownerId.toString());
  if (document.stewardId) {
    userIdsSet.add(document.stewardId.toString());
  }

  const users = await User.find({
    _id: { $in: Array.from(userIdsSet).map((id) => new Types.ObjectId(id)) },
  }).select('_id name');

  const userMap = new Map<string, UserProvenanceSummary>();
  for (const u of users) {
    userMap.set(u._id.toString(), { id: u._id.toString(), name: u.name });
  }

  // Construct Linked Endpoint Contexts
  const endpointContexts: LinkedEndpointContext[] = [];
  for (const link of endpointLinks) {
    const ep = link.endpointId;
    if (ep) {
      endpointContexts.push({
        linkId: link._id.toString(),
        endpointId: ep._id.toString(),
        method: ep.method,
        path: ep.path,
        summary: ep.summary || undefined,
        status: link.status,
        isDeprecated: ep.isDeprecated,
      });
    }
  }

  // Construct Dependency Relation Contexts
  const dependencyContexts: DependencyRelationContext[] = [];
  for (const rel of relationships) {
    const tgt = rel.targetDocumentId;
    if (tgt) {
      dependencyContexts.push({
        relationshipId: rel._id.toString(),
        targetDocumentId: tgt._id.toString(),
        targetTitle: tgt.title,
        type: rel.type,
        targetStatus: tgt.status,
        targetVersion: tgt.version,
        isDeleted: tgt.isDeleted ?? false,
      });
    }
  }

  // Construct External Reference Contexts
  const referenceContexts: ExternalReferenceContext[] = [];
  for (const ref of references) {
    referenceContexts.push({
      referenceId: ref._id.toString(),
      title: ref.title,
      type: ref.type,
      url: ref.url,
    });
  }

  // Construct Document Version Contexts
  const versionContexts: DocumentVersionContext[] = [];
  for (const v of versions) {
    const author = v.createdById;
    versionContexts.push({
      versionNumber: v.versionNumber,
      createdAt: v.createdAt,
      createdById: author ? author._id.toString() : 'unknown',
      createdByName: author ? author.name : 'Unknown Author',
    });
  }

  const evaluationAt = new Date();

  const context: EvidenceCoverageContext = {
    documentId: document._id.toString(),
    documentTitle: document.title,
    currentVersion: document.version || 1,
    lastApprovedVersion: document.lastApprovedVersion,
    status: document.status,
    needsVerification: document.impactVerification?.needsVerification,
    activeImpactSources: document.impactVerification?.activeImpactSources
      ? document.impactVerification.activeImpactSources.map((s) => ({
          upstreamDocumentId: s.upstreamDocumentId.toString(),
          upstreamVersionNumber: s.upstreamVersionNumber,
          changeType: s.changeType,
          flaggedAt: s.flaggedAt,
        }))
      : [],
    endpoints: endpointContexts,
    dependencies: dependencyContexts,
    references: referenceContexts,
    versions: versionContexts,
    governance: {
      status: document.status,
      currentVersion: document.version || 1,
      lastApprovedVersion: document.lastApprovedVersion,
      lastReviewedAt: document.lastReviewedAt,
      createdAt: document.createdAt,
      isGovernanceEnabled: project?.governanceSettings?.isGovernanceEnabled ?? true,
      maxUnreviewedDays: project?.governanceSettings?.maxUnreviewedDays ?? 90,
      stewardUser: document.stewardId ? userMap.get(document.stewardId.toString()) || null : null,
      ownerUser: userMap.get(document.ownerId.toString()) || null,
    },
    evaluationAt,
  };

  return calculateEvidenceCoverage(context);
}

export async function getReverseEndpoint(
  userId: string,
  role: 'user' | 'admin',
  endpointId: string,
): Promise<ReverseEndpointResponse> {
  validateObjectId(endpointId, 'Invalid endpoint ID');

  const endpoint = await ProjectApiEndpoint.findById(endpointId);
  if (!endpoint) {
    throw new AppError('API endpoint not found', 404, 'ENDPOINT_NOT_FOUND');
  }

  const links = await DocumentEndpointLink.find({
    endpointId: new Types.ObjectId(endpointId),
    status: 'LINKED',
  }).populate<{
    documentId: {
      _id: Types.ObjectId;
      title: string;
      fileName: string;
      fileType: string;
      status: DocumentStatus;
      version: number;
      lastApprovedVersion?: number;
      isDeleted: boolean;
      ownerId: Types.ObjectId;
    };
  }>('documentId');

  const citingDocuments: SourceDocumentSummary[] = [];

  for (const link of links) {
    const doc = link.documentId;
    if (!doc || doc.isDeleted) {
      continue;
    }

    try {
      await verifyDocumentAccessInternal(userId, role, doc._id.toString());
      citingDocuments.push({
        id: doc._id.toString(),
        title: doc.title,
        fileName: doc.fileName,
        fileType: doc.fileType,
        status: doc.status,
        version: doc.version,
        lastApprovedVersion: doc.lastApprovedVersion,
      });
    } catch {
      // Omit inaccessible documents safely
    }
  }

  return {
    endpointId: endpoint._id.toString(),
    method: endpoint.method,
    path: endpoint.path,
    summary: endpoint.summary || undefined,
    citingDocuments,
  };
}

export async function getReverseDocument(
  userId: string,
  role: 'user' | 'admin',
  targetDocumentId: string,
  relationshipType?: string,
): Promise<ReverseDocumentResponse> {
  validateObjectId(targetDocumentId, 'Invalid target document ID');

  const targetDoc = await Document.findOne({
    _id: new Types.ObjectId(targetDocumentId),
    isDeleted: false,
  });

  if (!targetDoc) {
    throw new AppError('Target document not found', 404, 'DOCUMENT_NOT_FOUND');
  }

  const filter: Record<string, unknown> = {
    targetDocumentId: new Types.ObjectId(targetDocumentId),
  };

  if (relationshipType && relationshipType !== 'ALL') {
    filter.type = relationshipType;
  }

  const relationships = await DocumentRelationship.find(filter).populate<{
    sourceDocumentId: {
      _id: Types.ObjectId;
      title: string;
      fileName: string;
      fileType: string;
      status: DocumentStatus;
      version: number;
      lastApprovedVersion?: number;
      isDeleted: boolean;
      ownerId: Types.ObjectId;
    };
  }>('sourceDocumentId');

  const citingDocuments: SourceDocumentSummary[] = [];

  for (const rel of relationships) {
    const doc = rel.sourceDocumentId;
    if (!doc || doc.isDeleted) {
      continue;
    }

    try {
      await verifyDocumentAccessInternal(userId, role, doc._id.toString());
      citingDocuments.push({
        id: doc._id.toString(),
        title: doc.title,
        fileName: doc.fileName,
        fileType: doc.fileType,
        status: doc.status,
        version: doc.version,
        lastApprovedVersion: doc.lastApprovedVersion,
        relationshipType: rel.type,
      });
    } catch {
      // Omit inaccessible documents safely
    }
  }

  return {
    targetDocumentId: targetDoc._id.toString(),
    targetTitle: targetDoc.title,
    citingDocuments,
  };
}

export async function getReverseReference(
  userId: string,
  role: 'user' | 'admin',
  url: string,
): Promise<ReverseReferenceResponse> {
  const trimmedUrl = url.trim();
  if (!trimmedUrl) {
    throw new AppError('URL parameter is required', 400, 'URL_REQUIRED');
  }

  const references = await DocumentReference.find({
    url: trimmedUrl,
  }).populate<{
    documentId: {
      _id: Types.ObjectId;
      title: string;
      fileName: string;
      fileType: string;
      status: DocumentStatus;
      version: number;
      lastApprovedVersion?: number;
      isDeleted: boolean;
      ownerId: Types.ObjectId;
    };
  }>('documentId');

  const citingDocuments: SourceDocumentSummary[] = [];

  for (const ref of references) {
    const doc = ref.documentId;
    if (!doc || doc.isDeleted) {
      continue;
    }

    try {
      await verifyDocumentAccessInternal(userId, role, doc._id.toString());
      citingDocuments.push({
        id: doc._id.toString(),
        title: doc.title,
        fileName: doc.fileName,
        fileType: doc.fileType,
        status: doc.status,
        version: doc.version,
        lastApprovedVersion: doc.lastApprovedVersion,
      });
    } catch {
      // Omit inaccessible documents safely
    }
  }

  return {
    url: trimmedUrl,
    citingDocuments,
  };
}
