import { AppError } from '../../errors/app-error.js';
import type { HttpMethod } from './project-api-endpoint.model.js';

export interface ParsedEndpoint {
  method: HttpMethod;
  path: string;
  summary?: string;
  operationId?: string;
  tags: string[];
  isDeprecated: boolean;
}

export interface ParsedOpenApiSpec {
  title: string;
  version: string;
  openApiVersion: string;
  format: 'JSON' | 'YAML';
  endpoints: ParsedEndpoint[];
}

const HTTP_METHODS: HttpMethod[] = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'];

export function parseOpenApiSpecification(content: string): ParsedOpenApiSpec {
  if (!content || typeof content !== 'string') {
    throw new AppError('Specification content is empty or invalid', 400, 'INVALID_OPENAPI_SPEC');
  }

  // 2MB size limit
  if (Buffer.byteLength(content, 'utf8') > 2 * 1024 * 1024) {
    throw new AppError(
      'Specification file size exceeds maximum limit of 2MB',
      400,
      'SPEC_TOO_LARGE',
    );
  }

  const trimmed = content.trim();
  let parsedDoc: Record<string, any>;
  let format: 'JSON' | 'YAML' = 'JSON';

  if (trimmed.startsWith('{')) {
    format = 'JSON';
    try {
      parsedDoc = JSON.parse(trimmed);
    } catch {
      throw new AppError('Malformed JSON specification file', 400, 'INVALID_OPENAPI_SPEC');
    }
  } else {
    format = 'YAML';
    // YAML alias limit protection: check for excessive anchor/alias references (*alias, &anchor)
    const aliasMatches = (trimmed.match(/\*[a-zA-Z0-9_-]+/g) || []).length;
    if (aliasMatches > 10) {
      throw new AppError(
        'YAML specification exceeds maximum allowed alias references limit',
        400,
        'MALICIOUS_YAML_DETECTED',
      );
    }

    try {
      parsedDoc = parseSimpleYaml(trimmed);
    } catch (err: any) {
      throw new AppError(
        `Malformed YAML specification file: ${err.message || 'Parse failed'}`,
        400,
        'INVALID_OPENAPI_SPEC',
      );
    }
  }

  // Validate OpenAPI version (must be 3.0.x or 3.1.x)
  const openApiVersion = parsedDoc.openapi || parsedDoc.swagger;
  if (!openApiVersion || typeof openApiVersion !== 'string' || !openApiVersion.startsWith('3.')) {
    throw new AppError(
      `Unsupported specification version '${openApiVersion || 'unknown'}'. Documan requires OpenAPI 3.0.x or 3.1.x`,
      400,
      'UNSUPPORTED_OPENAPI_VERSION',
    );
  }

  const info = parsedDoc.info || {};
  const title = (info.title && typeof info.title === 'string') ? info.title.trim() : 'Untitled API Specification';
  const version = (info.version && typeof info.version === 'string') ? info.version.trim() : '1.0.0';

  const pathsObj = parsedDoc.paths || {};
  const endpoints: ParsedEndpoint[] = [];

  for (const [pathKey, pathItem] of Object.entries(pathsObj)) {
    if (!pathKey.startsWith('/') || !pathItem || typeof pathItem !== 'object') {
      continue;
    }

    for (const [methodKey, operationObj] of Object.entries(pathItem)) {
      const upperMethod = methodKey.toUpperCase() as HttpMethod;
      if (!HTTP_METHODS.includes(upperMethod) || !operationObj || typeof operationObj !== 'object') {
        continue;
      }

      const op = operationObj as Record<string, any>;
      const summary = typeof op.summary === 'string' ? op.summary.trim() : undefined;
      const operationId = typeof op.operationId === 'string' ? op.operationId.trim() : undefined;
      const tags = Array.isArray(op.tags) ? op.tags.filter((t) => typeof t === 'string') : [];
      const isDeprecated = Boolean(op.deprecated);

      const endpointObj: ParsedEndpoint = {
        method: upperMethod,
        path: pathKey.trim(),
        tags,
        isDeprecated,
      };

      if (summary !== undefined) {
        endpointObj.summary = summary;
      }
      if (operationId !== undefined) {
        endpointObj.operationId = operationId;
      }

      endpoints.push(endpointObj);
    }
  }

  return {
    title,
    version,
    openApiVersion,
    format,
    endpoints,
  };
}

/**
 * Safe JSON/YAML fallback parser for OpenAPI 3.0/3.1 documents
 */
function parseSimpleYaml(yamlStr: string): Record<string, any> {
  const result: Record<string, any> = {};
  const lines = yamlStr.split('\n');

  let currentSection = '';
  let currentPath = '';
  let currentMethod = '';

  for (let line of lines) {
    line = line.replace(/#.*$/, '').trimEnd();
    if (!line.trim()) continue;

    const indent = line.search(/\S/);
    const trimmed = line.trim();

    if (indent === 0) {
      if (trimmed.startsWith('openapi:')) {
        result.openapi = trimmed.substring(8).trim().replace(/^["']|["']$/g, '');
      } else if (trimmed.startsWith('swagger:')) {
        result.swagger = trimmed.substring(8).trim().replace(/^["']|["']$/g, '');
      } else if (trimmed.startsWith('info:')) {
        currentSection = 'info';
        result.info = result.info || {};
      } else if (trimmed.startsWith('paths:')) {
        currentSection = 'paths';
        result.paths = result.paths || {};
      } else {
        currentSection = '';
      }
      continue;
    }

    if (currentSection === 'info') {
      if (trimmed.startsWith('title:')) {
        result.info.title = trimmed.substring(6).trim().replace(/^["']|["']$/g, '');
      } else if (trimmed.startsWith('version:')) {
        result.info.version = trimmed.substring(8).trim().replace(/^["']|["']$/g, '');
      }
    } else if (currentSection === 'paths') {
      if (indent === 2 && trimmed.endsWith(':') && trimmed.startsWith('/')) {
        currentPath = trimmed.slice(0, -1).trim();
        result.paths[currentPath] = result.paths[currentPath] || {};
      } else if (indent === 4 && trimmed.endsWith(':') && currentPath) {
        const potentialMethod = trimmed.slice(0, -1).toUpperCase() as HttpMethod;
        if (HTTP_METHODS.includes(potentialMethod)) {
          currentMethod = potentialMethod;
          result.paths[currentPath][currentMethod.toLowerCase()] = result.paths[currentPath][currentMethod.toLowerCase()] || {};
        }
      } else if (indent >= 6 && currentPath && currentMethod) {
        const targetOp = result.paths[currentPath][currentMethod.toLowerCase()];
        if (trimmed.startsWith('summary:')) {
          targetOp.summary = trimmed.substring(8).trim().replace(/^["']|["']$/g, '');
        } else if (trimmed.startsWith('operationId:')) {
          targetOp.operationId = trimmed.substring(12).trim().replace(/^["']|["']$/g, '');
        } else if (trimmed.startsWith('deprecated:')) {
          targetOp.deprecated = trimmed.substring(11).trim().toLowerCase() === 'true';
        }
      }
    }
  }

  return result;
}
