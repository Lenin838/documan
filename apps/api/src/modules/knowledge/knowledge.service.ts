import { Types } from 'mongoose';
import { AppError } from '../../errors/app-error.js';
import { Document, type DocumentDocument, type DocumentStatus } from '../documents/document.model.js';
import { DocumentShare } from '../document-shares/document-share.model.js';
import { DocumentRelationship } from '../documents/document-relationship.model.js';
import { DocumentReference } from '../documents/document-reference.model.js';
import { DocumentEndpointLink } from '../api-specs/document-endpoint-link.model.js';
import { ProjectApiEndpoint } from '../api-specs/project-api-endpoint.model.js';
import { Project } from '../projects/project.model.js';
import { User } from '../users/user.model.js';
import {
  calculateKnowledgeRisk,
  type KnowledgeRiskContext,
  type DocumentUserContext,
} from '../documents/knowledge-risk-calculator.js';
import type { KnowledgeSearchQueryInput } from './knowledge.schema.js';

export interface KnowledgeSearchResultItem {
  documentId: string;
  title: string;
  description?: string | undefined;
  fileName: string;
  fileType: string;
  fileSize: number;
  status: DocumentStatus;
  version: number;
  lastApprovedVersion?: number | null | undefined;
  isApprovedVersion: boolean;
  projectId?: string | null | undefined;
  projectName?: string | null | undefined;
  owner: {
    id: string;
    name: string;
  };
  steward?: {
    id: string;
    name: string;
    isExplicitSteward: boolean;
  } | undefined;
  lastReviewedAt?: Date | null | undefined;
  ranking: {
    score: number;
    relevanceReasons: string[];
  };
  health: {
    riskScore: number;
    riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  };
  traceability: {
    relatedDocuments: Array<{
      documentId: string;
      title: string;
      type: string;
      status: DocumentStatus;
    }>;
    linkedApiEndpoints: Array<{
      endpointId: string;
      method: string;
      path: string;
      summary?: string | undefined;
      status: string;
    }>;
  };
}

export interface KnowledgeSearchResponse {
  query: string;
  results: KnowledgeSearchResultItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

interface ParsedApiQuery {
  method?: string | undefined;
  path?: string | undefined;
}

function parseApiQuery(query: string): ParsedApiQuery {
  const trimmed = query.trim();
  const httpMethods = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'];
  const parts = trimmed.split(/\s+/);

  if (parts[0] && parts.length >= 2 && httpMethods.includes(parts[0].toUpperCase())) {
    const method = parts[0].toUpperCase();
    const path = parts.slice(1).join(' ');
    if (path.startsWith('/')) {
      return { method, path };
    }
  }

  if (trimmed.startsWith('/')) {
    return { path: trimmed };
  }

  return {};
}

function normalizeQuery(query: string): string {
  return query.trim().replace(/\s+/g, ' ');
}

export async function searchTechnicalKnowledge(
  userId: string,
  role: 'user' | 'admin',
  input: KnowledgeSearchQueryInput,
): Promise<KnowledgeSearchResponse> {
  const page = input.page ?? 1;
  const limit = input.limit ?? 20;
  const { projectId } = input;
  const rawQuery = input.q || '';
  const normalized = normalizeQuery(rawQuery);

  // Validate projectId if supplied
  if (projectId) {
    if (!Types.ObjectId.isValid(projectId)) {
      throw new AppError('Invalid project ID', 400, 'INVALID_PROJECT_ID');
    }
    const projectExists = await Project.exists({ _id: projectId, isArchived: false });
    if (!projectExists) {
      throw new AppError('Project not found', 404, 'PROJECT_NOT_FOUND');
    }
  }

  // Branch B: Empty Browse Query (q === "")
  if (!normalized) {
    return executeEmptyQueryBrowse(userId, role, projectId, page, limit);
  }

  // Branch A: Non-Empty Search Query
  return executeNonEmptySearch(userId, role, rawQuery, normalized, projectId, page, limit);
}

async function executeEmptyQueryBrowse(
  userId: string,
  role: 'user' | 'admin',
  projectId?: string,
  page = 1,
  limit = 20,
): Promise<KnowledgeSearchResponse> {
  const filter: Record<string, unknown> = {
    isDeleted: false,
  };

  if (projectId) {
    filter.projectId = new Types.ObjectId(projectId);
  }

  if (role !== 'admin') {
    const userObjId = new Types.ObjectId(userId);
    const shares = await DocumentShare.find({
      sharedWithUserId: userObjId,
    }).select('documentId');
    const sharedDocObjIds = shares.map((s) => s.documentId);

    filter.$or = [
      { ownerId: userObjId },
      { _id: { $in: sharedDocObjIds } },
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

  const results = await enrichPageDocuments(userId, role, documents, new Map(), new Map(), '');

  return {
    query: '',
    results,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit) || 0,
    },
  };
}

async function executeNonEmptySearch(
  userId: string,
  role: 'user' | 'admin',
  rawQuery: string,
  normalized: string,
  projectId?: string,
  page = 1,
  limit = 20,
): Promise<KnowledgeSearchResponse> {
  const parsedApi = parseApiQuery(normalized);
  const lowerQuery = normalized.toLowerCase();

  // Tier 1: Exact Technical Candidates (Unbounded, Guaranteed Inclusion)
  const exactApiDocIdsSet = new Set<string>();
  const exactRefDocIdsSet = new Set<string>();
  const exactMatchReasonsMap = new Map<string, Set<string>>();

  function addExactReason(docId: string, reason: string) {
    if (!exactMatchReasonsMap.has(docId)) {
      exactMatchReasonsMap.set(docId, new Set());
    }
    exactMatchReasonsMap.get(docId)!.add(reason);
  }

  // 1A. Exact API Path & Method matching
  if (parsedApi.path) {
    const endpointQuery: Record<string, unknown> = {};
    if (parsedApi.method) {
      endpointQuery.method = parsedApi.method;
      endpointQuery.path = parsedApi.path;
    } else {
      endpointQuery.path = parsedApi.path;
    }

    const matchedEndpoints = await ProjectApiEndpoint.find(endpointQuery).select('_id method path');
    if (matchedEndpoints.length > 0) {
      const endpointIds = matchedEndpoints.map((e) => e._id);
      const links = await DocumentEndpointLink.find({
        endpointId: { $in: endpointIds },
        status: 'LINKED',
      }).select('documentId endpointId');

      for (const link of links) {
        const docIdStr = link.documentId.toString();
        exactApiDocIdsSet.add(docIdStr);
        if (parsedApi.method) {
          addExactReason(docIdStr, 'Exact HTTP Method & API Endpoint Match');
        } else {
          addExactReason(docIdStr, 'Exact API Endpoint Path Match');
        }
      }
    }
  }

  // 1B. Exact Technical Reference matching
  const matchedRefs = await DocumentReference.find({
    $or: [
      { title: rawQuery },
      { title: normalized },
      { url: rawQuery },
    ],
  }).select('documentId title url');

  for (const ref of matchedRefs) {
    const docIdStr = ref.documentId.toString();
    exactRefDocIdsSet.add(docIdStr);
    addExactReason(docIdStr, 'Exact Technical Reference Match');
  }

  // Tier 2: Bounded Text Candidates ($text search bounded to top N=250)
  const textDocIdsSet = new Set<string>();
  const textScoreMap = new Map<string, number>();

  try {
    const textMatches = await Document.find(
      { isDeleted: false, $text: { $search: normalized } },
      { score: { $meta: 'textScore' } },
    )
      .sort({ score: { $meta: 'textScore' } })
      .limit(250)
      .select('_id score');

    for (const match of textMatches) {
      const idStr = match._id.toString();
      textDocIdsSet.add(idStr);
      const metaScore = typeof match.get === 'function' ? (match.get('score') as number) : 1;
      textScoreMap.set(idStr, metaScore || 1);
    }
  } catch {
    // Fallback regex search if text index query fails
    const regexFilter = {
      isDeleted: false,
      $or: [
        { title: { $regex: normalized, $options: 'i' } },
        { description: { $regex: normalized, $options: 'i' } },
        { fileName: { $regex: normalized, $options: 'i' } },
        { tags: { $in: [lowerQuery] } },
      ],
    };
    const regexMatches = await Document.find(regexFilter).limit(250).select('_id');
    for (const m of regexMatches) {
      const idStr = m._id.toString();
      textDocIdsSet.add(idStr);
      textScoreMap.set(idStr, 1);
    }
  }

  // Candidate Union
  const candidateDocIds = Array.from(
    new Set([...exactApiDocIdsSet, ...exactRefDocIdsSet, ...textDocIdsSet]),
  );

  if (candidateDocIds.length === 0) {
    return {
      query: rawQuery,
      results: [],
      pagination: { page, limit, total: 0, totalPages: 0 },
    };
  }

  // Authorization Scope Intersection & Project Scoping
  const aclFilter: Record<string, unknown> = {
    _id: { $in: candidateDocIds.map((id) => new Types.ObjectId(id)) },
    isDeleted: false,
  };

  if (projectId) {
    aclFilter.projectId = new Types.ObjectId(projectId);
  }

  if (role !== 'admin') {
    const userObjId = new Types.ObjectId(userId);
    const shares = await DocumentShare.find({
      sharedWithUserId: userObjId,
    }).select('documentId');
    const sharedDocObjIds = shares.map((s) => s.documentId);

    aclFilter.$or = [
      { ownerId: userObjId },
      { _id: { $in: sharedDocObjIds } },
    ];
  }

  const candidateDocuments = await Document.find(aclFilter);
  const authorizedDocIds = candidateDocuments.map((d) => d._id.toString());
  const total = authorizedDocIds.length;

  if (total === 0) {
    return {
      query: rawQuery,
      results: [],
      pagination: { page, limit, total: 0, totalPages: 0 },
    };
  }

  // Retrieve stewardship context to rank documents accurately
  const stewardUserIds = new Set<string>();
  for (const doc of candidateDocuments) {
    stewardUserIds.add(doc.ownerId.toString());
    if (doc.stewardId) {
      stewardUserIds.add(doc.stewardId.toString());
    }
  }

  const stewardUsers = await User.find({
    _id: { $in: Array.from(stewardUserIds).map((id) => new Types.ObjectId(id)) },
  }).select('_id isActive isDeleted');

  const stewardActiveMap = new Map<string, boolean>();
  for (const u of stewardUsers) {
    stewardActiveMap.set(u._id.toString(), u.isActive && !u.isDeleted);
  }

  // Rank Candidate Documents Deterministically
  const rankedDocsWithScores = candidateDocuments.map((doc) => {
    const docIdStr = doc._id.toString();
    const exactReasons = exactMatchReasonsMap.get(docIdStr) || new Set();

    let technicalScore = 0;
    const relevanceReasons: string[] = [];

    if (exactReasons.has('Exact HTTP Method & API Endpoint Match')) {
      technicalScore = Math.max(technicalScore, 35);
      relevanceReasons.push('Exact HTTP Method & API Endpoint Match');
    } else if (exactReasons.has('Exact API Endpoint Path Match')) {
      technicalScore = Math.max(technicalScore, 30);
      relevanceReasons.push('Exact API Endpoint Path Match');
    }

    if (exactReasons.has('Exact Technical Reference Match')) {
      technicalScore = Math.max(technicalScore, 25);
      relevanceReasons.push('Exact Technical Reference Match');
    }

    // Base Text Relevance
    let textRelevanceScore = 0;
    const docTitleLower = doc.title.toLowerCase();
    const docFileNameLower = doc.fileName.toLowerCase();

    if (docTitleLower === lowerQuery) {
      textRelevanceScore += 40;
      relevanceReasons.push('Exact Title Match');
    } else if (docTitleLower.includes(lowerQuery)) {
      textRelevanceScore += 30;
      relevanceReasons.push('Title Token Match');
    }

    if (doc.tags && doc.tags.some((t) => t.toLowerCase() === lowerQuery)) {
      textRelevanceScore += 20;
      relevanceReasons.push('Tag Match');
    } else if (doc.description && doc.description.toLowerCase().includes(lowerQuery)) {
      textRelevanceScore += 20;
      relevanceReasons.push('Description Match');
    }

    if (docFileNameLower.includes(lowerQuery)) {
      textRelevanceScore += 10;
      relevanceReasons.push('File Name Match');
    }

    // Authority / Status Score
    let authorityScore = 0;
    if (doc.status === 'APPROVED') {
      authorityScore += 20;
      relevanceReasons.push('Approved Knowledge');
    } else if (doc.status === 'IN_REVIEW') {
      authorityScore += 10;
    } else if (doc.status === 'DRAFT') {
      authorityScore += 5;
    } else if (doc.status === 'DEPRECATED') {
      authorityScore -= 10;
      relevanceReasons.push('Deprecated Status');
    }

    if (doc.lastApprovedVersion && doc.version === doc.lastApprovedVersion) {
      authorityScore += 10;
      relevanceReasons.push('Approved Version v' + doc.version);
    }

    // Stewardship Score
    let stewardshipScore = 0;
    if (doc.stewardId) {
      const isStewardActive = stewardActiveMap.get(doc.stewardId.toString()) ?? false;
      if (isStewardActive) {
        stewardshipScore += 10;
        relevanceReasons.push('Active Steward Assigned');
      }
    } else {
      const isOwnerActive = stewardActiveMap.get(doc.ownerId.toString()) ?? false;
      if (isOwnerActive) {
        stewardshipScore += 5;
      }
    }

    const compositeScore = technicalScore + textRelevanceScore + authorityScore + stewardshipScore;

    return {
      doc,
      compositeScore,
      relevanceReasons: Array.from(new Set(relevanceReasons)),
    };
  });

  // Sort deterministically
  rankedDocsWithScores.sort((a, b) => {
    if (b.compositeScore !== a.compositeScore) {
      return b.compositeScore - a.compositeScore;
    }
    const aRev = a.doc.lastReviewedAt ? new Date(a.doc.lastReviewedAt).getTime() : 0;
    const bRev = b.doc.lastReviewedAt ? new Date(b.doc.lastReviewedAt).getTime() : 0;
    if (bRev !== aRev) {
      return bRev - aRev;
    }
    const aCreated = new Date(a.doc.createdAt).getTime();
    const bCreated = new Date(b.doc.createdAt).getTime();
    if (bCreated !== aCreated) {
      return bCreated - aCreated;
    }
    return a.doc._id.toString().localeCompare(b.doc._id.toString());
  });

  // Paginate Ranked Candidate Document Set
  const skip = (page - 1) * limit;
  const paginatedItems = rankedDocsWithScores.slice(skip, skip + limit);
  const pageDocs = paginatedItems.map((item) => item.doc);

  const scoresMap = new Map<string, { score: number; reasons: string[] }>();
  for (const item of paginatedItems) {
    scoresMap.set(item.doc._id.toString(), {
      score: item.compositeScore,
      reasons: item.relevanceReasons,
    });
  }

  const results = await enrichPageDocuments(userId, role, pageDocs, scoresMap, exactMatchReasonsMap, rawQuery);

  return {
    query: rawQuery,
    results,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit) || 0,
    },
  };
}

async function enrichPageDocuments(
  userId: string,
  role: 'user' | 'admin',
  pageDocs: DocumentDocument[],
  scoresMap: Map<string, { score: number; reasons: string[] }>,
  _exactMatchReasonsMap: Map<string, Set<string>>,
  _rawQuery: string,
): Promise<KnowledgeSearchResultItem[]> {
  if (pageDocs.length === 0) {
    return [];
  }

  const pageDocIds = pageDocs.map((d) => d._id);
  const pageDocIdStrs = pageDocs.map((d) => d._id.toString());

  // 1. Bulk retrieve User records for owners and stewards
  const userIdsSet = new Set<string>();
  for (const doc of pageDocs) {
    userIdsSet.add(doc.ownerId.toString());
    if (doc.stewardId) {
      userIdsSet.add(doc.stewardId.toString());
    }
  }

  const users = await User.find({
    _id: { $in: Array.from(userIdsSet).map((id) => new Types.ObjectId(id)) },
  }).select('_id name email isActive isDeleted');

  const userMap = new Map<string, DocumentUserContext>();
  for (const u of users) {
    userMap.set(u._id.toString(), {
      id: u._id.toString(),
      name: u.name,
      email: u.email,
      isActive: u.isActive,
      isDeleted: u.isDeleted,
    });
  }

  // 2. Bulk retrieve Project records
  const projectIdsSet = new Set<string>();
  for (const doc of pageDocs) {
    if (doc.projectId) {
      projectIdsSet.add(doc.projectId.toString());
    }
  }

  const projects = await Project.find({
    _id: { $in: Array.from(projectIdsSet).map((id) => new Types.ObjectId(id)) },
  }).select('_id name governanceSettings');

  const projectMap = new Map<string, { name: string; isGovernanceEnabled: boolean; maxUnreviewedDays: number }>();
  for (const p of projects) {
    projectMap.set(p._id.toString(), {
      name: p.name,
      isGovernanceEnabled: p.governanceSettings?.isGovernanceEnabled ?? true,
      maxUnreviewedDays: p.governanceSettings?.maxUnreviewedDays ?? 90,
    });
  }

  // 3. Bulk retrieve DocumentRelationships
  const relationships = await DocumentRelationship.find({
    $or: [
      { sourceDocumentId: { $in: pageDocIds } },
      { targetDocumentId: { $in: pageDocIds } },
    ],
  }).populate<{ sourceDocumentId: { _id: Types.ObjectId; title: string; status: DocumentStatus; isDeleted: boolean; ownerId: Types.ObjectId }; targetDocumentId: { _id: Types.ObjectId; title: string; status: DocumentStatus; isDeleted: boolean; ownerId: Types.ObjectId } }>([
    { path: 'sourceDocumentId', select: '_id title status isDeleted ownerId' },
    { path: 'targetDocumentId', select: '_id title status isDeleted ownerId' },
  ]);

  // Determine ACL for related documents in single batch
  const relatedDocIdsSet = new Set<string>();
  for (const rel of relationships) {
    if (rel.sourceDocumentId && !rel.sourceDocumentId.isDeleted) {
      relatedDocIdsSet.add(rel.sourceDocumentId._id.toString());
    }
    if (rel.targetDocumentId && !rel.targetDocumentId.isDeleted) {
      relatedDocIdsSet.add(rel.targetDocumentId._id.toString());
    }
  }

  const accessibleRelatedDocIds = new Set<string>();
  if (role === 'admin') {
    for (const id of relatedDocIdsSet) accessibleRelatedDocIds.add(id);
  } else {
    const userObjId = new Types.ObjectId(userId);
    const shares = await DocumentShare.find({
      sharedWithUserId: userObjId,
      documentId: { $in: Array.from(relatedDocIdsSet).map((id) => new Types.ObjectId(id)) },
    }).select('documentId');
    for (const s of shares) {
      accessibleRelatedDocIds.add(s.documentId.toString());
    }
    for (const doc of pageDocs) {
      accessibleRelatedDocIds.add(doc._id.toString());
    }
  }

  // Group relationship items per document
  const pageRelMap = new Map<string, Array<{ documentId: string; title: string; type: string; status: DocumentStatus }>>();
  for (const docIdStr of pageDocIdStrs) {
    pageRelMap.set(docIdStr, []);
  }

  for (const rel of relationships) {
    const sourceDoc = rel.sourceDocumentId;
    const targetDoc = rel.targetDocumentId;

    if (!sourceDoc || sourceDoc.isDeleted || !targetDoc || targetDoc.isDeleted) {
      continue;
    }

    const srcId = sourceDoc._id.toString();
    const tgtId = targetDoc._id.toString();

    // Check ownership or share permission for standard users
    const isSrcOwner = role === 'admin' || sourceDoc.ownerId.toString() === userId;
    const isTgtOwner = role === 'admin' || targetDoc.ownerId.toString() === userId;

    const canSeeSrc = isSrcOwner || accessibleRelatedDocIds.has(srcId);
    const canSeeTgt = isTgtOwner || accessibleRelatedDocIds.has(tgtId);

    if (pageRelMap.has(srcId) && canSeeTgt) {
      const list = pageRelMap.get(srcId)!;
      if (list.length < 10) {
        list.push({
          documentId: tgtId,
          title: targetDoc.title,
          type: rel.type,
          status: targetDoc.status,
        });
      }
    }

    if (pageRelMap.has(tgtId) && canSeeSrc) {
      const list = pageRelMap.get(tgtId)!;
      if (list.length < 10) {
        list.push({
          documentId: srcId,
          title: sourceDoc.title,
          type: rel.type,
          status: sourceDoc.status,
        });
      }
    }
  }

  // 4. Bulk retrieve DocumentEndpointLinks
  const endpointLinks = await DocumentEndpointLink.find({
    documentId: { $in: pageDocIds },
  }).populate<{ endpointId: { _id: Types.ObjectId; method: string; path: string; summary?: string } }>({
    path: 'endpointId',
    select: '_id method path summary',
  });

  const pageEndpointMap = new Map<string, Array<{ endpointId: string; method: string; path: string; summary?: string; status: string }>>();
  for (const docIdStr of pageDocIdStrs) {
    pageEndpointMap.set(docIdStr, []);
  }

  for (const link of endpointLinks) {
    const docIdStr = link.documentId.toString();
    const ep = link.endpointId;
    if (pageEndpointMap.has(docIdStr) && ep) {
      const list = pageEndpointMap.get(docIdStr)!;
      if (list.length < 10) {
        list.push({
          endpointId: ep._id.toString(),
          method: ep.method,
          path: ep.path,
          ...(ep.summary ? { summary: ep.summary } : {}),
          status: link.status,
        });
      }
    }
  }

  // Construct Final Results
  const evaluationAt = new Date();
  const results: KnowledgeSearchResultItem[] = [];

  for (const doc of pageDocs) {
    const docIdStr = doc._id.toString();
    const ownerUser = userMap.get(doc.ownerId.toString()) || null;
    const stewardUser = doc.stewardId ? userMap.get(doc.stewardId.toString()) || null : null;
    const projInfo = doc.projectId ? projectMap.get(doc.projectId.toString()) : null;

    const riskCtx: KnowledgeRiskContext = {
      documentId: docIdStr,
      title: doc.title,
      version: doc.version || 1,
      lastApprovedVersion: doc.lastApprovedVersion,
      status: doc.status,
      lastReviewedAt: doc.lastReviewedAt,
      createdAt: doc.createdAt,
      needsVerification: doc.impactVerification?.needsVerification,
      activeImpactSources: doc.impactVerification?.activeImpactSources
        ? doc.impactVerification.activeImpactSources.map((s) => ({
            upstreamDocumentId: s.upstreamDocumentId.toString(),
            upstreamVersionNumber: s.upstreamVersionNumber,
            changeType: s.changeType,
            flaggedAt: s.flaggedAt,
          }))
        : [],
      isGovernanceEnabled: projInfo?.isGovernanceEnabled ?? true,
      maxUnreviewedDays: projInfo?.maxUnreviewedDays ?? 90,
      stewardUser,
      ownerUser,
      evaluationAt,
    };

    const riskRes = calculateKnowledgeRisk(riskCtx);
    const scoreData = scoresMap.get(docIdStr) || { score: 10, reasons: [] };

    let stewardPayload: { id: string; name: string; isExplicitSteward: boolean } | undefined;

    if (stewardUser) {
      stewardPayload = {
        id: stewardUser.id,
        name: stewardUser.name,
        isExplicitSteward: true,
      };
    } else if (ownerUser) {
      stewardPayload = {
        id: ownerUser.id,
        name: ownerUser.name,
        isExplicitSteward: false,
      };
    }

    results.push({
      documentId: docIdStr,
      title: doc.title,
      description: doc.description,
      fileName: doc.fileName,
      fileType: doc.fileType,
      fileSize: doc.fileSize,
      status: doc.status,
      version: doc.version || 1,
      lastApprovedVersion: doc.lastApprovedVersion,
      isApprovedVersion: Boolean(doc.lastApprovedVersion && doc.version === doc.lastApprovedVersion),
      projectId: doc.projectId ? doc.projectId.toString() : null,
      projectName: projInfo?.name || null,
      owner: {
        id: doc.ownerId.toString(),
        name: ownerUser?.name || 'Unknown Owner',
      },
      steward: stewardPayload,
      lastReviewedAt: doc.lastReviewedAt,
      ranking: {
        score: scoreData.score,
        relevanceReasons: scoreData.reasons.length > 0 ? scoreData.reasons : ['Matched Search Scope'],
      },
      health: {
        riskScore: riskRes.riskScore,
        riskLevel: riskRes.riskLevel,
      },
      traceability: {
        relatedDocuments: pageRelMap.get(docIdStr) || [],
        linkedApiEndpoints: pageEndpointMap.get(docIdStr) || [],
      },
    });
  }

  return results;
}
