/* eslint-disable @typescript-eslint/no-explicit-any */
import { Types } from 'mongoose';

import { AppError } from '../../errors/app-error.js';
import { Project } from '../projects/project.model.js';
import { ProjectTopologyLink } from '../projects/project-topology.model.js';
import { checkUserProjectReadAccess } from '../projects/project-topology.service.js';
import { Document } from '../documents/document.model.js';
import { DocumentRelationship } from '../documents/document-relationship.model.js';
import { DocumentVersion } from '../documents/document-version.model.js';
import { DocumentationBaseline } from './documentation-baseline.model.js';
import { parseOpenApiSpecification, type ParsedOpenApiSpec } from '../api-specs/openapi-parser.service.js';
import type {
  SystemContractMatrixResponseDTO,
  MatrixCellDTO,
  MatrixCellInteroperabilityState,
  MatrixCellRelationshipType,
  CriticalIncompatibilityItemDTO,
} from './system-contract-matrix.types.js';

function validateObjectId(id: string, errorMessage = 'Invalid ID', code = 'INVALID_ID'): void {
  if (!Types.ObjectId.isValid(id)) {
    throw new AppError(errorMessage, 404, code);
  }
}

/**
 * Normalizes an API path for canonical comparison (trailing slashes stripped)
 */
function normalizePath(pathStr: string): string {
  if (!pathStr) return '/';
  let p = pathStr.trim();
  if (!p.startsWith('/')) p = '/' + p;
  if (p.length > 1 && p.endsWith('/')) {
    p = p.slice(0, -1);
  }
  return p;
}

interface CanonicalEndpoint {
  method: string;
  path: string;
  isDeprecated: boolean;
  operationId?: string | undefined;
  summary?: string | undefined;
}

interface CanonicalContract {
  endpoints: Map<string, CanonicalEndpoint>;
  schemas: Map<string, { properties: Map<string, { type?: string | undefined; required?: boolean | undefined; enumValues?: string[] | undefined }> }>;
}

/**
 * Parses and canonicalizes a raw contract content string into a CanonicalContract
 */
function parseAndCanonicalizeContract(content: string): CanonicalContract | null {
  if (!content || typeof content !== 'string') return null;

  const trimmed = content.trim();

  // 1. Try parsing via OpenAPI specification parser
  try {
    const parsedSpec: ParsedOpenApiSpec = parseOpenApiSpecification(trimmed);
    const endpoints = new Map<string, CanonicalEndpoint>();
    const schemas = new Map<string, { properties: Map<string, { type?: string | undefined; required?: boolean | undefined; enumValues?: string[] | undefined }> }>();

    for (const ep of parsedSpec.endpoints) {
      const canonicalMethod = ep.method.toUpperCase();
      const canonicalPath = normalizePath(ep.path);
      const key = `${canonicalMethod}:${canonicalPath}`;

      endpoints.set(key, {
        method: canonicalMethod,
        path: canonicalPath,
        isDeprecated: Boolean(ep.isDeprecated),
        operationId: ep.operationId,
        summary: ep.summary,
      });
    }

    // Parse components.schemas if present in JSON object
    let parsedObj: Record<string, any> | null = null;
    try {
      parsedObj = JSON.parse(trimmed);
    } catch {
      // Ignore if YAML or non-JSON object
    }

    if (parsedObj && parsedObj.components && parsedObj.components.schemas) {
      for (const [schemaName, schemaObj] of Object.entries<any>(parsedObj.components.schemas)) {
        if (!schemaObj || typeof schemaObj !== 'object') continue;
        const requiredList = Array.isArray(schemaObj.required) ? schemaObj.required : [];
        const propsMap = new Map<string, { type?: string | undefined; required?: boolean | undefined; enumValues?: string[] | undefined }>();

        if (schemaObj.properties && typeof schemaObj.properties === 'object') {
          for (const [propName, propDef] of Object.entries<any>(schemaObj.properties)) {
            if (!propDef || typeof propDef !== 'object') continue;
            const isRequired = requiredList.includes(propName);
            const enumValues = Array.isArray(propDef.enum)
              ? [...propDef.enum].map(String).sort((a, b) => a.localeCompare(b))
              : undefined;

            propsMap.set(propName, {
              type: propDef.type || (propDef.$ref ? 'reference' : 'unknown'),
              required: isRequired,
              enumValues,
            });
          }
        }

        schemas.set(schemaName, { properties: propsMap });
      }
    }

    return { endpoints, schemas };
  } catch {
    // If OpenAPI parsing fails, check if content is valid raw JSON Schema object
    if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
      try {
        const jsonDoc = JSON.parse(trimmed);
        if (jsonDoc && (jsonDoc.properties || jsonDoc.type || jsonDoc.paths)) {
          const endpoints = new Map<string, CanonicalEndpoint>();
          const schemas = new Map<string, { properties: Map<string, { type?: string | undefined; required?: boolean | undefined; enumValues?: string[] | undefined }> }>();

          if (jsonDoc.paths && typeof jsonDoc.paths === 'object') {
            for (const [pathKey, pathObj] of Object.entries<any>(jsonDoc.paths)) {
              if (!pathObj || typeof pathObj !== 'object') continue;
              for (const [methodKey, opObj] of Object.entries<any>(pathObj)) {
                const method = methodKey.toUpperCase();
                const path = normalizePath(pathKey);
                const key = `${method}:${path}`;
                endpoints.set(key, {
                  method,
                  path,
                  isDeprecated: Boolean(opObj?.deprecated),
                  operationId: opObj?.operationId,
                  summary: opObj?.summary,
                });
              }
            }
          }

          if (jsonDoc.properties && typeof jsonDoc.properties === 'object') {
            const requiredList = Array.isArray(jsonDoc.required) ? jsonDoc.required : [];
            const propsMap = new Map<string, { type?: string | undefined; required?: boolean | undefined; enumValues?: string[] | undefined }>();

            for (const [propName, propDef] of Object.entries<any>(jsonDoc.properties)) {
              if (!propDef || typeof propDef !== 'object') continue;
              const enumValues = Array.isArray(propDef.enum)
                ? [...propDef.enum].map(String).sort((a, b) => a.localeCompare(b))
                : undefined;

              propsMap.set(propName, {
                type: propDef.type || 'unknown',
                required: requiredList.includes(propName),
                enumValues,
              });
            }

            schemas.set('RootSchema', { properties: propsMap });
          }

          if (endpoints.size > 0 || schemas.size > 0) {
            return { endpoints, schemas };
          }
        }
      } catch {
        // Fallthrough to null
      }
    }

    return null;
  }
}

/**
 * Detects breaking schema changes between two canonical contracts
 */
function detectBreakingContractDeltas(contractA: CanonicalContract, contractB: CanonicalContract): string[] {
  const deltas: string[] = [];

  // Check removed endpoints (in A but not in B)
  for (const [key, epA] of contractA.endpoints.entries()) {
    if (!contractB.endpoints.has(key)) {
      deltas.push(`ENDPOINT_REMOVED: Endpoint ${epA.method} ${epA.path} was removed in provider version`);
    }
  }

  // Check schema property breaking changes
  for (const [schemaName, schemaA] of contractA.schemas.entries()) {
    const schemaB = contractB.schemas.get(schemaName);
    if (!schemaB) {
      deltas.push(`SCHEMA_REMOVED: Schema '${schemaName}' was removed in provider version`);
      continue;
    }

    for (const [propName, propA] of schemaA.properties.entries()) {
      const propB = schemaB.properties.get(propName);
      if (!propB) {
        deltas.push(`FIELD_REMOVED: Property '${propName}' in schema '${schemaName}' was removed`);
        continue;
      }

      if (propA.type && propB.type && propA.type !== propB.type) {
        deltas.push(`FIELD_TYPE_CHANGED: Property '${propName}' in schema '${schemaName}' changed type from '${propA.type}' to '${propB.type}'`);
      }

      if (!propA.required && propB.required) {
        deltas.push(`FIELD_REQUIREDNESS_CHANGED: Property '${propName}' in schema '${schemaName}' became required in provider version`);
      }

      if (propA.enumValues && propB.enumValues) {
        const removedEnums = propA.enumValues.filter((v) => !propB.enumValues!.includes(v));
        if (removedEnums.length > 0) {
          deltas.push(`ENUM_VALUE_REMOVED: Enum values [${removedEnums.join(', ')}] removed from property '${propName}' in schema '${schemaName}'`);
        }
      }
    }
  }

  return deltas;
}

/**
 * Calculates Cross-Project Contract Interoperability Matrix & Topology Compatibility
 */
export async function calculateSystemContractMatrix(
  userId: string,
  role: 'user' | 'admin',
  projectId: string,
  maxDepthQuery?: number,
): Promise<SystemContractMatrixResponseDTO> {
  validateObjectId(projectId, 'Invalid root project ID', 'PROJECT_NOT_FOUND');

  const rootObjId = new Types.ObjectId(projectId);
  const rootProject = await Project.findOne({ _id: rootObjId, isArchived: false });
  if (!rootProject) {
    throw new AppError('Project not found', 404, 'PROJECT_NOT_FOUND');
  }

  const hasAccess = await checkUserProjectReadAccess(userId, role, projectId);
  if (!hasAccess) {
    throw new AppError('Access denied to project', 403, 'FORBIDDEN');
  }

  const evaluatedAt = new Date().toISOString();
  const MAX_AUTHORIZED_PROJECTS = 50;
  const MAX_TOPOLOGY_EDGES = 100;
  const MAX_CONTRACT_RELATIONSHIPS = 200;
  const MAX_TRAVERSAL_DEPTH = Math.min(Math.max(maxDepthQuery || 3, 1), 3);

  let isTruncated = false;

  // STAGE 1: Bounded Subgraph Traversal with Strict Phase 14 ACL Pruning
  const visitedProjectIds = new Set<string>([rootObjId.toString()]);
  const queue: Array<{ id: string; depth: number }> = [{ id: rootObjId.toString(), depth: 1 }];
  const authorizedProjectIds = new Set<string>([rootObjId.toString()]);
  const projectNameMap = new Map<string, string>();
  projectNameMap.set(rootObjId.toString(), rootProject.name);

  let processedEdgeCount = 0;

  while (queue.length > 0 && authorizedProjectIds.size < MAX_AUTHORIZED_PROJECTS) {
    const current = queue.shift()!;
    if (current.depth > MAX_TRAVERSAL_DEPTH) continue;

    const currentObjId = new Types.ObjectId(current.id);

    const topologyLinks = await ProjectTopologyLink.find({
      $or: [{ sourceProjectId: currentObjId }, { targetProjectId: currentObjId }],
    }).populate<{ sourceProjectId: InstanceType<typeof Project>; targetProjectId: InstanceType<typeof Project> }>([
      { path: 'sourceProjectId', select: '_id name isArchived ownerId' },
      { path: 'targetProjectId', select: '_id name isArchived ownerId' },
    ]);

    for (const link of topologyLinks) {
      if (processedEdgeCount >= MAX_TOPOLOGY_EDGES) {
        isTruncated = true;
        break;
      }
      processedEdgeCount++;

      if (!link.sourceProjectId || !link.targetProjectId) continue;
      if (link.sourceProjectId.isArchived || link.targetProjectId.isArchived) continue;

      const srcId = link.sourceProjectId._id.toString();
      const tgtId = link.targetProjectId._id.toString();

      // STRICT PRIVACY RULE: Check caller authorization for BOTH sides before traversing
      const canReadSrc = await checkUserProjectReadAccess(userId, role, srcId);
      const canReadTgt = await checkUserProjectReadAccess(userId, role, tgtId);

      if (!canReadSrc || !canReadTgt) {
        continue;
      }

      if (!authorizedProjectIds.has(srcId) && authorizedProjectIds.size < MAX_AUTHORIZED_PROJECTS) {
        authorizedProjectIds.add(srcId);
        projectNameMap.set(srcId, link.sourceProjectId.name);
      } else if (!authorizedProjectIds.has(srcId)) {
        isTruncated = true;
      }

      if (!authorizedProjectIds.has(tgtId) && authorizedProjectIds.size < MAX_AUTHORIZED_PROJECTS) {
        authorizedProjectIds.add(tgtId);
        projectNameMap.set(tgtId, link.targetProjectId.name);
      } else if (!authorizedProjectIds.has(tgtId)) {
        isTruncated = true;
      }

      const neighborId = srcId === current.id ? tgtId : srcId;
      if (!visitedProjectIds.has(neighborId) && current.depth < MAX_TRAVERSAL_DEPTH) {
        visitedProjectIds.add(neighborId);
        queue.push({ id: neighborId, depth: current.depth + 1 });
      }
    }
  }

  // STAGE 2: Bulk Queries for All Authorized Resources
  const authProjectObjIds = Array.from(authorizedProjectIds).map((id) => new Types.ObjectId(id));

  // Fetch all authorized project docs
  const projectsList = await Project.find({
    _id: { $in: authProjectObjIds },
    isArchived: false,
  }).select('_id name').lean();

  // Populate names for all authorized projects
  for (const p of projectsList) {
    projectNameMap.set(p._id.toString(), p.name);
  }

  // Sort project headers strictly by _id ascending
  const sortedProjects = projectsList.sort((a, b) => a._id.toString().localeCompare(b._id.toString()));
  const projectHeaders = sortedProjects.map((p) => ({
    projectId: p._id.toString(),
    name: p.name,
  }));

  // Fetch documents in authorized projects
  const documentsList = await Document.find({
    projectId: { $in: authProjectObjIds },
    isDeleted: false,
  }).select('_id title projectId').lean();

  const docMap = new Map<string, { _id: string; title: string; projectId: string }>();
  const projectDocIdsMap = new Map<string, string[]>();

  for (const doc of documentsList) {
    const docIdStr = doc._id.toString();
    const projIdStr = (doc.projectId as any).toString();

    docMap.set(docIdStr, { _id: docIdStr, title: doc.title, projectId: projIdStr });
    if (!projectDocIdsMap.has(projIdStr)) {
      projectDocIdsMap.set(projIdStr, []);
    }
    projectDocIdsMap.get(projIdStr)!.push(docIdStr);
  }

  const allAuthDocObjIds = Array.from(docMap.keys()).map((id) => new Types.ObjectId(id));

  // Fetch all cross-project DEPENDS_ON document relationships between authorized projects
  const relationshipsList = await DocumentRelationship.find({
    sourceDocumentId: { $in: allAuthDocObjIds },
    targetDocumentId: { $in: allAuthDocObjIds },
    type: 'DEPENDS_ON',
  }).limit(MAX_CONTRACT_RELATIONSHIPS).lean();

  if (relationshipsList.length >= MAX_CONTRACT_RELATIONSHIPS) {
    isTruncated = true;
  }

  // Fetch active baselines for authorized projects
  const baselinesList = await DocumentationBaseline.find({
    projectId: { $in: authProjectObjIds },
    isActive: true,
    isArchived: false,
  }).lean();

  const activeBaselineByProject = new Map<string, any>();
  for (const bl of baselinesList) {
    activeBaselineByProject.set(bl.projectId.toString(), bl);
  }

  // Collect version IDs needed for contract comparison
  const versionIdsToFetch = new Set<string>();

  for (const rel of relationshipsList) {
    if ((rel as any).targetVersionId) {
      versionIdsToFetch.add((rel as any).targetVersionId.toString());
    }
  }

  for (const bl of baselinesList) {
    for (const snap of bl.documentSnapshots) {
      const verId = (snap as any).documentVersionId || (snap as any).versionId;
      if (verId) {
        versionIdsToFetch.add(verId.toString());
      }
    }
  }

  // Fetch all versions for authorized documents to guarantee fallback lookup by (documentId, versionNumber)
  const allDocVersions = await DocumentVersion.find({
    documentId: { $in: allAuthDocObjIds },
  }).select('_id documentId versionNumber checksum content').lean();

  const versionMap = new Map<string, any>();
  const versionByDocAndNum = new Map<string, any>();

  for (const ver of allDocVersions) {
    versionMap.set(ver._id.toString(), ver);
    versionByDocAndNum.set(`${ver.documentId.toString()}_v${ver.versionNumber}`, ver);
  }

  // STAGE 3: Relationship Indexing
  // Key: `${consumerProjId}->${providerProjId}` -> Array of relationships
  const directionalRelMap = new Map<string, any[]>();

  for (const rel of relationshipsList) {
    const srcDoc = docMap.get(rel.sourceDocumentId.toString());
    const tgtDoc = docMap.get(rel.targetDocumentId.toString());

    if (!srcDoc || !tgtDoc) continue;
    const consumerProjId = srcDoc.projectId;
    const providerProjId = tgtDoc.projectId;

    if (consumerProjId === providerProjId) continue; // Skip same-project relationships for cross-project matrix

    const key = `${consumerProjId}->${providerProjId}`;
    if (!directionalRelMap.has(key)) {
      directionalRelMap.set(key, []);
    }
    directionalRelMap.get(key)!.push({ rel, srcDoc, tgtDoc });
  }

  // STAGE 4: Construct N x N Matrix Grid with 6-Tier Precedence Evaluation
  const N = sortedProjects.length;
  const matrix: MatrixCellDTO[][] = [];
  const criticalIncompatibilities: CriticalIncompatibilityItemDTO[] = [];

  let applicableContractCellCount = 0;
  let alignedCellCount = 0;
  let misalignedCellCount = 0;
  let breakingDeltaCellCount = 0;

  for (let i = 0; i < N; i++) {
    const rowProj = sortedProjects[i]!;
    const rowId = rowProj._id.toString();
    const rowName = rowProj.name;
    const rowCells: MatrixCellDTO[] = [];

    for (let j = 0; j < N; j++) {
      const colProj = sortedProjects[j]!;
      const colId = colProj._id.toString();
      const colName = colProj.name;

      if (i === j) {
        rowCells.push({
          rowProjectId: rowId,
          rowProjectName: rowName,
          colProjectId: colId,
          colProjectName: colName,
          relationshipType: 'NONE',
          interoperabilityState: 'NOT_APPLICABLE',
          precedenceTier: 7,
          contractCount: 0,
          alignedContractCount: 0,
          misalignedContractCount: 0,
          breakingDeltaCount: 0,
          activeProviderBaselineVersion: null,
          referencedConsumerBaselineVersion: null,
          indeterminacyReason: null,
          remediationAction: null,
        });
        continue;
      }

      // Check directional contracts
      const consumerRelKey = `${rowId}->${colId}`;
      const providerRelKey = `${colId}->${rowId}`;

      const consumerRels = directionalRelMap.get(consumerRelKey) || [];
      const providerRels = directionalRelMap.get(providerRelKey) || [];

      let relationshipType: MatrixCellRelationshipType = 'NONE';
      if (consumerRels.length > 0 && providerRels.length > 0) {
        relationshipType = 'MUTUAL';
      } else if (consumerRels.length > 0) {
        relationshipType = 'CONSUMER_TO_PROVIDER';
      } else if (providerRels.length > 0) {
        relationshipType = 'PROVIDER_TO_CONSUMER';
      }

      // Evaluate cell interoperability state via 6-tier precedence
      if (consumerRels.length === 0) {
        rowCells.push({
          rowProjectId: rowId,
          rowProjectName: rowName,
          colProjectId: colId,
          colProjectName: colName,
          relationshipType,
          interoperabilityState: 'NO_RELEVANT_CONTRACT_DEPENDENCY',
          precedenceTier: 1,
          contractCount: 0,
          alignedContractCount: 0,
          misalignedContractCount: 0,
          breakingDeltaCount: 0,
          activeProviderBaselineVersion: null,
          referencedConsumerBaselineVersion: null,
          indeterminacyReason: 'No cross-project contract dependency exists between authorized projects',
          remediationAction: null,
        });
        continue;
      }

      // Consumer -> Provider relationship exists
      applicableContractCellCount++;
      const contractCount = consumerRels.length;

      const providerBaseline = activeBaselineByProject.get(colId);
      const consumerBaseline = activeBaselineByProject.get(rowId);

      const activeProviderBaselineVer = providerBaseline ? providerBaseline.versionTag || providerBaseline.name : null;

      let hasMissingContract = false;
      let hasUnsupportedContract = false;
      let cellBreakingDeltas = 0;
      let cellMisalignedCount = 0;
      let cellAlignedCount = 0;
      let refConsumerVer: string | null = null;

      for (const { rel, tgtDoc } of consumerRels) {
        const providerDocId = tgtDoc._id;

        // Determine Provider Anchor: Provider active baseline snapshot for target doc
        const providerSnap = providerBaseline?.documentSnapshots?.find(
          (s: any) => s.documentId.toString() === providerDocId,
        );

        if (!providerBaseline || !providerSnap) {
          hasMissingContract = true;
          criticalIncompatibilities.push({
            consumerProjectId: rowId,
            consumerProjectName: rowName,
            providerProjectId: colId,
            providerProjectName: colName,
            documentId: providerDocId,
            documentTitle: tgtDoc.title,
            issueType: 'MISSING_PROVIDER_CONTRACT',
            description: `Provider project '${colName}' does not have an active baseline snapshot for contract document '${tgtDoc.title}'`,
            remediationText: `Create an active baseline in provider project '${colName}' including contract document '${tgtDoc.title}'`,
          });
          continue;
        }

        // Determine Consumer Anchor: Target snapshot in Consumer baseline or relationship reference
        const consumerTargetSnap = consumerBaseline?.targetDocumentSnapshots?.find(
          (s: any) => s.documentId.toString() === providerDocId,
        );

        if (consumerTargetSnap) {
          refConsumerVer = consumerTargetSnap.versionTag || `v${consumerTargetSnap.versionNumber}`;
        } else if (rel.targetVersionNumber) {
          refConsumerVer = `v${rel.targetVersionNumber}`;
        } else if (consumerBaseline) {
          refConsumerVer = consumerBaseline.versionTag || consumerBaseline.name;
        }

        // Fetch version contents for comparison anchors
        const providerVerId = providerSnap?.documentVersionId?.toString() || providerSnap?.versionId?.toString() || rel.targetVersionId?.toString();
        let providerVerDoc = providerVerId ? versionMap.get(providerVerId) : null;
        if (!providerVerDoc && providerSnap?.versionNumber) {
          providerVerDoc = versionByDocAndNum.get(`${providerDocId}_v${providerSnap.versionNumber}`);
        }
        if (!providerVerDoc) {
          providerVerDoc = versionByDocAndNum.get(`${providerDocId}_v1`);
        }

        if (!providerVerDoc || !providerVerDoc.content) {
          hasMissingContract = true;
          criticalIncompatibilities.push({
            consumerProjectId: rowId,
            consumerProjectName: rowName,
            providerProjectId: colId,
            providerProjectName: colName,
            documentId: providerDocId,
            documentTitle: tgtDoc.title,
            issueType: 'MISSING_PROVIDER_CONTRACT',
            description: `Authoritative contract document '${tgtDoc.title}' version content is missing in provider project '${colName}'`,
            remediationText: `Create an active baseline and version snapshot for document '${tgtDoc.title}' in provider project '${colName}'`,
          });
          continue;
        }

        // Parse canonical contract content
        const providerCanonical = parseAndCanonicalizeContract(providerVerDoc.content);
        if (!providerCanonical) {
          hasUnsupportedContract = true;
          criticalIncompatibilities.push({
            consumerProjectId: rowId,
            consumerProjectName: rowName,
            providerProjectId: colId,
            providerProjectName: colName,
            documentId: providerDocId,
            documentTitle: tgtDoc.title,
            issueType: 'UNSUPPORTED_CONTRACT_STRUCTURE',
            description: `Contract document '${tgtDoc.title}' contains prose/markdown which cannot be parsed as a structured OpenAPI schema`,
            remediationText: `Convert document '${tgtDoc.title}' in provider project '${colName}' into valid OpenAPI 3.0/3.1 JSON or YAML format`,
          });
          continue;
        }

        // Fetch Consumer Anchor version content if different from provider active version
        const consumerVerId = consumerTargetSnap?.documentVersionId?.toString() || consumerTargetSnap?.versionId?.toString();
        let consumerVerDoc = consumerVerId ? versionMap.get(consumerVerId) : null;
        if (!consumerVerDoc && consumerTargetSnap?.versionNumber) {
          consumerVerDoc = versionByDocAndNum.get(`${providerDocId}_v${consumerTargetSnap.versionNumber}`);
        }
        if (!consumerVerDoc && rel.targetVersionId) {
          consumerVerDoc = versionMap.get(rel.targetVersionId.toString());
        }
        if (!consumerVerDoc && providerVerDoc && providerVerDoc.versionNumber > 1) {
          consumerVerDoc = versionByDocAndNum.get(`${providerDocId}_v1`);
        }
        if (!consumerVerDoc) {
          consumerVerDoc = providerVerDoc;
        }

        // Determine baseline version tag / checksum matching
        const providerChecksum = providerSnap?.checksum || providerVerDoc?.checksum;
        const consumerChecksum = consumerTargetSnap?.checksum || rel.targetDocumentChecksum || consumerVerDoc?.checksum;

        const isChecksumMatch = Boolean(providerChecksum && consumerChecksum && providerChecksum === consumerChecksum);

        const consumerCanonical = parseAndCanonicalizeContract(consumerVerDoc.content) || providerCanonical;
        const breakingDeltas = detectBreakingContractDeltas(consumerCanonical, providerCanonical);

        const isVersionMismatch = Boolean(
          activeProviderBaselineVer &&
          refConsumerVer &&
          activeProviderBaselineVer !== refConsumerVer
        );

        if (breakingDeltas.length > 0) {
          cellBreakingDeltas++;
          criticalIncompatibilities.push({
            consumerProjectId: rowId,
            consumerProjectName: rowName,
            providerProjectId: colId,
            providerProjectName: colName,
            documentId: providerDocId,
            documentTitle: tgtDoc.title,
            issueType: 'BREAKING_SCHEMA_DELTA',
            description: `Detected ${breakingDeltas.length} breaking schema changes in provider contract: ${breakingDeltas[0]}`,
            remediationText: `Update downstream consumer project '${rowName}' to accommodate breaking contract changes or revert breaking provider edits`,
          });
        } else if (!isChecksumMatch || isVersionMismatch || (providerSnap && consumerTargetSnap && providerSnap.versionTag !== consumerTargetSnap.versionTag)) {
          cellMisalignedCount++;
          criticalIncompatibilities.push({
            consumerProjectId: rowId,
            consumerProjectName: rowName,
            providerProjectId: colId,
            providerProjectName: colName,
            documentId: providerDocId,
            documentTitle: tgtDoc.title,
            issueType: 'STRUCTURAL_BASELINE_MISALIGNMENT',
            description: `Provider project '${colName}' active baseline '${activeProviderBaselineVer || 'active'}' diverges from consumer reference '${refConsumerVer || 'referenced'}'`,
            remediationText: `Re-baseline consumer project '${rowName}' against active provider baseline '${activeProviderBaselineVer || 'active'}'`,
          });
        } else {
          cellAlignedCount++;
        }
      }

      // Apply 6-Tier Precedence Hierarchy for Final Cell State
      let cellState: MatrixCellInteroperabilityState;
      let precedenceTier: number;
      let indeterminacyReason: string | null = null;
      let remediationAction: string | null = null;

      if (hasMissingContract) {
        cellState = 'MISSING_AUTHORITATIVE_CONTRACT';
        precedenceTier = 2;
        indeterminacyReason = 'Authoritative contract document version or content is missing in provider project';
        remediationAction = `Create an active baseline and version snapshot for target contract documents in provider project '${colName}'`;
      } else if (hasUnsupportedContract) {
        cellState = 'UNSUPPORTED_CONTRACT';
        precedenceTier = 3;
        indeterminacyReason = 'Provider contract document content is non-OpenAPI prose text which cannot be parsed as a structured schema';
        remediationAction = `Convert provider contract documents in '${colName}' into valid OpenAPI 3.0/3.1 JSON or YAML format`;
      } else if (cellBreakingDeltas > 0) {
        cellState = 'BREAKING_CONTRACT_DELTA';
        precedenceTier = 4;
        breakingDeltaCellCount++;
        remediationAction = `Review and resolve ${cellBreakingDeltas} breaking contract deltas between consumer '${rowName}' and provider '${colName}'`;
      } else if (cellMisalignedCount > 0) {
        cellState = 'STRUCTURALLY_MISALIGNED';
        precedenceTier = 5;
        misalignedCellCount++;
        remediationAction = `Re-baseline consumer project '${rowName}' against active provider baseline '${activeProviderBaselineVer || 'active'}'`;
      } else {
        cellState = 'ALIGNED';
        precedenceTier = 6;
        alignedCellCount++;
        if (!refConsumerVer) {
          refConsumerVer = activeProviderBaselineVer;
        }
      }

      rowCells.push({
        rowProjectId: rowId,
        rowProjectName: rowName,
        colProjectId: colId,
        colProjectName: colName,
        relationshipType,
        interoperabilityState: cellState,
        precedenceTier,
        contractCount,
        alignedContractCount: cellAlignedCount,
        misalignedContractCount: cellMisalignedCount,
        breakingDeltaCount: cellBreakingDeltas,
        activeProviderBaselineVersion: activeProviderBaselineVer,
        referencedConsumerBaselineVersion: refConsumerVer,
        indeterminacyReason,
        remediationAction,
      });
    }

    matrix.push(rowCells);
  }

  // Calculate System Interoperability Index (0-100%)
  const interoperabilityIndex = applicableContractCellCount > 0
    ? Math.round((alignedCellCount / applicableContractCellCount) * 100)
    : 100;

  let overallStatus: SystemContractMatrixResponseDTO['overallStatus'];

  if (applicableContractCellCount === 0) {
    overallStatus = 'NO_CONTRACTS';
  } else if (breakingDeltaCellCount > 0) {
    overallStatus = 'BREAKING_DELTAS_DETECTED';
  } else if (misalignedCellCount > 0) {
    overallStatus = 'PARTIAL_MISALIGNMENT';
  } else {
    overallStatus = 'FULLY_ALIGNED';
  }

  // Sort critical incompatibilities deterministically
  criticalIncompatibilities.sort((a, b) => {
    const c1 = a.consumerProjectId.localeCompare(b.consumerProjectId);
    if (c1 !== 0) return c1;
    const c2 = a.providerProjectId.localeCompare(b.providerProjectId);
    if (c2 !== 0) return c2;
    return a.documentId.localeCompare(b.documentId);
  });

  return {
    evaluationTimestamp: evaluatedAt,
    rootProjectId: projectId,
    rootProjectName: rootProject.name,
    authorizedProjectCount: sortedProjects.length,
    matrixDimensions: `${sortedProjects.length}x${sortedProjects.length}`,
    interoperabilityIndex,
    overallStatus,
    isTruncated,
    projectHeaders,
    matrix,
    criticalIncompatibilities,
  };
}
