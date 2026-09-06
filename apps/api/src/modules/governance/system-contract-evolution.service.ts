/* eslint-disable @typescript-eslint/no-explicit-any */
import { Types } from 'mongoose';

import { AppError } from '../../errors/app-error.js';
import { ProjectTopologyLink } from '../projects/project-topology.model.js';
import { checkUserProjectReadAccess } from '../projects/project-topology.service.js';
import { Document } from '../documents/document.model.js';
import { DocumentRelationship } from '../documents/document-relationship.model.js';
import { DocumentVersion } from '../documents/document-version.model.js';
import { DocumentationBaseline } from './documentation-baseline.model.js';
import { SystemGovernanceWaiver } from './system-governance-waiver.model.js';
import { parseOpenApiSpecification, type ParsedOpenApiSpec } from '../api-specs/openapi-parser.service.js';
import type {
  ContractEvolutionDeltaResponseDTO,
  ContractDeltaItemDTO,
  TopologicalBlastRadiusDTO,
  ContractEvolutionImpactItemDTO,
} from './system-contract-evolution.types.js';

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

/**
 * Internal interface representing a canonical endpoint contract
 */
interface CanonicalEndpoint {
  method: string;
  path: string;
  isDeprecated: boolean;
  operationId?: string | undefined;
  summary?: string | undefined;
}

/**
 * Internal canonical contract representation derived from a document version content
 */
interface CanonicalContract {
  endpoints: Map<string, CanonicalEndpoint>; // Key: `METHOD:PATH`
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
    // If OpenAPI parsing fails, check if content is a valid raw JSON Schema
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
 * Calculates cross-project contract evolution deltas between two baseline snapshots
 */
export async function calculateContractEvolutionDelta(
  userId: string,
  role: 'user' | 'admin',
  providerProjectId: string,
  providerDocumentId: string,
  baselineIdA: string,
  baselineIdB: string,
): Promise<ContractEvolutionDeltaResponseDTO> {
  validateObjectId(providerProjectId, 'Invalid provider project ID', 'PROJECT_NOT_FOUND');
  validateObjectId(providerDocumentId, 'Invalid provider document ID', 'DOCUMENT_NOT_FOUND');

  // Authorize provider project read access via Phase 14 ACL
  const hasProviderAccess = await checkUserProjectReadAccess(userId, role, providerProjectId);
  if (!hasProviderAccess) {
    throw new AppError('Access denied to provider project', 403, 'FORBIDDEN');
  }

  // Look up Provider Baseline A
  const baselineA = await DocumentationBaseline.findOne({
    $or: [
      { _id: Types.ObjectId.isValid(baselineIdA) ? new Types.ObjectId(baselineIdA) : null },
      { versionTag: baselineIdA },
      { name: baselineIdA },
    ],
    projectId: new Types.ObjectId(providerProjectId),
    isArchived: false,
  }).lean();

  // Look up Provider Baseline B
  const baselineB = await DocumentationBaseline.findOne({
    $or: [
      { _id: Types.ObjectId.isValid(baselineIdB) ? new Types.ObjectId(baselineIdB) : null },
      { versionTag: baselineIdB },
      { name: baselineIdB },
    ],
    projectId: new Types.ObjectId(providerProjectId),
    isArchived: false,
  }).lean();

  if (!baselineA || !baselineB) {
    return {
      providerProjectId,
      analysisStatus: 'INDETERMINATE_HISTORICAL_EVIDENCE',
      unsupportedReason: !baselineA
        ? `Provider Baseline A '${baselineIdA}' snapshot not found or is archived`
        : `Provider Baseline B '${baselineIdB}' snapshot not found or is archived`,
      contractDeltas: [],
      blastRadius: {
        affectedProjectsCount: 0,
        reachableProjectsCount: 0,
        projectBlastRadiusRatio: null,
        affectedDocumentsCount: 0,
        reachableDocumentsCount: 0,
        documentBlastRadiusRatio: null,
        maximumDependencyDepth: 0,
        isTruncated: false,
      },
      dependencyOrderedImpactSequence: [],
    };
  }

  // Find document snapshot in Baseline A
  const snapA = baselineA.documentSnapshots.find(
    (s) => s.documentId.toString() === providerDocumentId,
  );

  // Find document snapshot in Baseline B
  const snapB = baselineB.documentSnapshots.find(
    (s) => s.documentId.toString() === providerDocumentId,
  );

  if (!snapA || !snapB) {
    return {
      providerProjectId,
      providerBaselineA: {
        baselineId: baselineA._id.toString(),
        version: baselineA.versionTag || baselineA.name,
        createdAt: baselineA.createdAt.toISOString(),
      },
      providerBaselineB: {
        baselineId: baselineB._id.toString(),
        version: baselineB.versionTag || baselineB.name,
        createdAt: baselineB.createdAt.toISOString(),
      },
      analysisStatus: 'INDETERMINATE_HISTORICAL_EVIDENCE',
      unsupportedReason: !snapA
        ? `Provider document ${providerDocumentId} is not bound to Baseline A (${baselineA.versionTag || baselineA.name})`
        : `Provider document ${providerDocumentId} is not bound to Baseline B (${baselineB.versionTag || baselineB.name})`,
      contractDeltas: [],
      blastRadius: {
        affectedProjectsCount: 0,
        reachableProjectsCount: 0,
        projectBlastRadiusRatio: null,
        affectedDocumentsCount: 0,
        reachableDocumentsCount: 0,
        documentBlastRadiusRatio: null,
        maximumDependencyDepth: 0,
        isTruncated: false,
      },
      dependencyOrderedImpactSequence: [],
    };
  }

  // Fetch DocumentVersion records corresponding to snapshots
  const versionA = await DocumentVersion.findOne({
    documentId: new Types.ObjectId(providerDocumentId),
    versionNumber: snapA.versionNumber,
  }).lean();

  const versionB = await DocumentVersion.findOne({
    documentId: new Types.ObjectId(providerDocumentId),
    versionNumber: snapB.versionNumber,
  }).lean();

  if (!versionA || !versionB || !versionA.content || !versionB.content) {
    return {
      providerProjectId,
      providerBaselineA: {
        baselineId: baselineA._id.toString(),
        version: baselineA.versionTag || baselineA.name,
        createdAt: baselineA.createdAt.toISOString(),
      },
      providerBaselineB: {
        baselineId: baselineB._id.toString(),
        version: baselineB.versionTag || baselineB.name,
        createdAt: baselineB.createdAt.toISOString(),
      },
      analysisStatus: 'INDETERMINATE_HISTORICAL_EVIDENCE',
      unsupportedReason: 'Document version content is missing or unreadable in storage',
      contractDeltas: [],
      blastRadius: {
        affectedProjectsCount: 0,
        reachableProjectsCount: 0,
        projectBlastRadiusRatio: null,
        affectedDocumentsCount: 0,
        reachableDocumentsCount: 0,
        documentBlastRadiusRatio: null,
        maximumDependencyDepth: 0,
        isTruncated: false,
      },
      dependencyOrderedImpactSequence: [],
    };
  }

  // Parse and Canonicalize contract representations
  const contractA = parseAndCanonicalizeContract(versionA.content);
  const contractB = parseAndCanonicalizeContract(versionB.content);

  if (!contractA || !contractB) {
    return {
      providerProjectId,
      providerBaselineA: {
        baselineId: baselineA._id.toString(),
        version: baselineA.versionTag || baselineA.name,
        createdAt: baselineA.createdAt.toISOString(),
      },
      providerBaselineB: {
        baselineId: baselineB._id.toString(),
        version: baselineB.versionTag || baselineB.name,
        createdAt: baselineB.createdAt.toISOString(),
      },
      analysisStatus: 'UNSUPPORTED_CONTRACT_STRUCTURE',
      unsupportedReason:
        'Baseline document content contains unstructured prose markdown text without a machine-readable OpenAPI or JSON Schema contract definition',
      contractDeltas: [],
      blastRadius: {
        affectedProjectsCount: 0,
        reachableProjectsCount: 0,
        projectBlastRadiusRatio: null,
        affectedDocumentsCount: 0,
        reachableDocumentsCount: 0,
        documentBlastRadiusRatio: null,
        maximumDependencyDepth: 0,
        isTruncated: false,
      },
      dependencyOrderedImpactSequence: [],
    };
  }

  // Perform Deterministic Structural Diffing
  const contractDeltas: ContractDeltaItemDTO[] = [];

  // 1. ENDPOINT_REMOVED & ENDPOINT_DEPRECATED
  for (const [keyA, epA] of contractA.endpoints.entries()) {
    const epB = contractB.endpoints.get(keyA);
    if (!epB) {
      contractDeltas.push({
        deltaCode: 'ENDPOINT_REMOVED',
        riskTier: 'BREAKING',
        method: epA.method,
        path: epA.path,
        previousValue: `${epA.method} ${epA.path}`,
        description: `Endpoint ${epA.method} ${epA.path} was removed in Baseline B`,
      });
    } else if (!epA.isDeprecated && epB.isDeprecated) {
      contractDeltas.push({
        deltaCode: 'ENDPOINT_DEPRECATED',
        riskTier: 'WARNING',
        method: epA.method,
        path: epA.path,
        previousValue: 'isDeprecated: false',
        newValue: 'isDeprecated: true',
        description: `Endpoint ${epA.method} ${epA.path} was marked deprecated in Baseline B`,
      });
    }
  }

  // 2. ENDPOINT_ADDED
  for (const [keyB, epB] of contractB.endpoints.entries()) {
    if (!contractA.endpoints.has(keyB)) {
      contractDeltas.push({
        deltaCode: 'ENDPOINT_ADDED',
        riskTier: 'NON_BREAKING',
        method: epB.method,
        path: epB.path,
        newValue: `${epB.method} ${epB.path}`,
        description: `Endpoint ${epB.method} ${epB.path} was added in Baseline B`,
      });
    }
  }

  // 3. Schema Property Deltas
  for (const [schemaNameA, schemaA] of contractA.schemas.entries()) {
    const schemaB = contractB.schemas.get(schemaNameA);
    if (!schemaB) continue;

    for (const [propNameA, propA] of schemaA.properties.entries()) {
      const propB = schemaB.properties.get(propNameA);
      const fieldPath = `${schemaNameA}.${propNameA}`;

      if (!propB) {
        contractDeltas.push({
          deltaCode: 'FIELD_REMOVED',
          riskTier: 'BREAKING',
          fieldPath,
          previousValue: propA.type || 'property',
          description: `Schema property '${fieldPath}' was removed in Baseline B`,
        });
      } else {
        // FIELD_TYPE_CHANGED
        if (propA.type && propB.type && propA.type !== propB.type) {
          contractDeltas.push({
            deltaCode: 'FIELD_TYPE_CHANGED',
            riskTier: 'BREAKING',
            fieldPath,
            previousValue: propA.type,
            newValue: propB.type,
            description: `Schema property '${fieldPath}' data type changed from '${propA.type}' to '${propB.type}'`,
          });
        }

        // FIELD_REQUIREDNESS_CHANGED
        if (!propA.required && propB.required) {
          contractDeltas.push({
            deltaCode: 'FIELD_REQUIREDNESS_CHANGED',
            riskTier: 'BREAKING',
            fieldPath,
            previousValue: 'optional',
            newValue: 'required',
            description: `Optional schema property '${fieldPath}' became required in Baseline B`,
          });
        }

        // ENUM_VALUE_REMOVED
        if (propA.enumValues && propB.enumValues) {
          for (const enumValA of propA.enumValues) {
            if (!propB.enumValues.includes(enumValA)) {
              contractDeltas.push({
                deltaCode: 'ENUM_VALUE_REMOVED',
                riskTier: 'BREAKING',
                fieldPath,
                previousValue: enumValA,
                description: `Enum value '${enumValA}' in property '${fieldPath}' was removed in Baseline B`,
              });
            }
          }
        }
      }
    }
  }

  // Sort deltas deterministically
  const riskPriority: Record<string, number> = { BREAKING: 3, WARNING: 2, NON_BREAKING: 1 };
  contractDeltas.sort((a, b) => {
    const diffRisk = (riskPriority[b.riskTier] || 0) - (riskPriority[a.riskTier] || 0);
    if (diffRisk !== 0) return diffRisk;

    const diffCode = a.deltaCode.localeCompare(b.deltaCode);
    if (diffCode !== 0) return diffCode;

    const keyA = `${a.method || ''}:${a.path || ''}:${a.fieldPath || ''}`;
    const keyB = `${b.method || ''}:${b.path || ''}:${b.fieldPath || ''}`;
    return keyA.localeCompare(keyB);
  });

  // Calculate Topology Blast Radius & Consumer Discovery (Phase 14 & Phase 7.3 composition)
  const MAX_DEPTH = 3;
  const MAX_NODES = 50;
  const MAX_CONSUMER_DOCUMENTS = 100;

  const visitedProjectIds = new Set<string>([providerProjectId]);
  const queue: Array<{ id: string; depth: number }> = [{ id: providerProjectId, depth: 1 }];
  const reachableProjectIds = new Set<string>();
  const affectedProjectIds = new Set<string>();

  const impactSequence: ContractEvolutionImpactItemDTO[] = [];
  let totalReachableDocumentsCount = 0;
  let isTruncated = false;

  // Find direct consumer relationships pointing to provider document
  const consumerRels = await DocumentRelationship.find({
    targetDocumentId: new Types.ObjectId(providerDocumentId),
    type: 'DEPENDS_ON',
  }).lean();

  const consumerDocIds = consumerRels.map((r) => r.sourceDocumentId);
  const consumerDocs = await Document.find({
    _id: { $in: consumerDocIds },
    isDeleted: false,
  }).lean();

  const docMap = new Map<string, any>();
  for (const d of consumerDocs) {
    docMap.set(d._id.toString(), d);
  }

  // Topology Graph Traversal
  while (queue.length > 0 && reachableProjectIds.size < MAX_NODES) {
    const current = queue.shift()!;
    if (current.depth > MAX_DEPTH) {
      isTruncated = true;
      continue;
    }

    const currentObjId = new Types.ObjectId(current.id);

    // Find outgoing topology links (where source is consumer, target is current provider)
    const links = await ProjectTopologyLink.find({
      targetProjectId: currentObjId,
    }).populate<{ sourceProjectId: any }>('sourceProjectId', '_id name isArchived');

    for (const link of links) {
      if (!link.sourceProjectId || link.sourceProjectId.isArchived) continue;

      const consumerProjId = link.sourceProjectId._id.toString();

      // Check Phase 14 ACL access
      const canReadConsumer = await checkUserProjectReadAccess(userId, role, consumerProjId);
      if (!canReadConsumer) continue;

      reachableProjectIds.add(consumerProjId);

      // Check consumer documents in this project
      for (const rel of consumerRels) {
        const cDoc = docMap.get(rel.sourceDocumentId.toString());
        if (!cDoc || !cDoc.projectId || cDoc.projectId.toString() !== consumerProjId) continue;

        affectedProjectIds.add(consumerProjId);
        totalReachableDocumentsCount++;

        if (impactSequence.length < MAX_CONSUMER_DOCUMENTS) {
          // Check active waivers in Phase 20
          const activeWaivers = await SystemGovernanceWaiver.find({
            rootProjectId: new Types.ObjectId(consumerProjId),
            targetProviderProjectId: new Types.ObjectId(providerProjectId),
            blockerType: 'CONTRACT_MISALIGNED',
            scopeState: 'ACTIVE',
            isRevoked: false,
          }).lean();

          const isWaived = activeWaivers.some((w) => {
            if (w.expiresAt && w.expiresAt <= new Date()) return false;
            return true;
          });

          impactSequence.push({
            depth: current.depth,
            consumerProjectId: consumerProjId,
            consumerProjectName: link.sourceProjectId.name,
            consumerDocumentId: cDoc._id.toString(),
            consumerDocumentTitle: cDoc.title,
            consumerReferencedVersion: snapA.versionNumber,
            impactCategory: current.depth === 1 ? 'DIRECT_BREAKING_CONTRACT' : 'TRANSITIVE_DEPENDENCY_DRIFT',
            implications: {
              alignmentConsequence: 'MISALIGNED',
              governanceConsequence: isWaived ? 'PASSED_WITH_WAIVER' : 'BLOCKED',
              assuranceConsequence: 'STALE',
              implicatedVerificationCategories: ['CONTRACT_COMPLIANCE', 'DEPENDENCY_FRESHNESS'],
            },
          });
        } else {
          isTruncated = true;
        }
      }

      if (!visitedProjectIds.has(consumerProjId) && current.depth < MAX_DEPTH) {
        visitedProjectIds.add(consumerProjId);
        queue.push({ id: consumerProjId, depth: current.depth + 1 });
      }
    }
  }

  // Sort impact sequence deterministically
  impactSequence.sort((a, b) => {
    if (a.depth !== b.depth) return a.depth - b.depth;
    const diffProj = a.consumerProjectId.localeCompare(b.consumerProjectId);
    if (diffProj !== 0) return diffProj;
    return a.consumerDocumentId.localeCompare(b.consumerDocumentId);
  });

  const reachableProjectsCount = reachableProjectIds.size;
  const affectedProjectsCount = affectedProjectIds.size;
  const affectedDocumentsCount = impactSequence.length;

  const projectBlastRadiusRatio =
    reachableProjectsCount > 0 ? Number((affectedProjectsCount / reachableProjectsCount).toFixed(4)) : null;
  const documentBlastRadiusRatio =
    totalReachableDocumentsCount > 0 ? Number((affectedDocumentsCount / totalReachableDocumentsCount).toFixed(4)) : null;

  const blastRadius: TopologicalBlastRadiusDTO = {
    affectedProjectsCount,
    reachableProjectsCount,
    projectBlastRadiusRatio,
    affectedDocumentsCount,
    reachableDocumentsCount: totalReachableDocumentsCount,
    documentBlastRadiusRatio,
    maximumDependencyDepth: MAX_DEPTH,
    isTruncated,
    truncationReason: isTruncated ? 'Impact sequence or topology depth exceeded MAX boundaries' : null,
  };

  return {
    providerProjectId,
    providerBaselineA: {
      baselineId: baselineA._id.toString(),
      version: baselineA.versionTag || baselineA.name,
      createdAt: baselineA.createdAt.toISOString(),
    },
    providerBaselineB: {
      baselineId: baselineB._id.toString(),
      version: baselineB.versionTag || baselineB.name,
      createdAt: baselineB.createdAt.toISOString(),
    },
    analysisStatus: 'COMPLETE',
    contractDeltas,
    blastRadius,
    dependencyOrderedImpactSequence: impactSequence,
  };
}
