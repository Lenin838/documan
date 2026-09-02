/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Types } from 'mongoose';

import { Project } from '../projects/project.model.js';
import { Document } from '../documents/document.model.js';
import { ProjectApiSpec } from './project-api-spec.model.js';
import { ProjectApiEndpoint } from './project-api-endpoint.model.js';
import { DocumentEndpointLink } from './document-endpoint-link.model.js';
import { parseOpenApiSpecification } from './openapi-parser.service.js';
import {
  importProjectApiSpec,
  getProjectApiSpec,
  deleteProjectApiSpec,
  linkDocumentApiEndpoint,
  unlinkDocumentApiEndpoint,
  getDocumentApiEndpoints,
} from './api-spec.service.js';
import * as auditService from '../documents/document-audit.service.js';

vi.mock('../documents/document-audit.service.js', () => ({
  createDocumentAudit: vi.fn().mockResolvedValue({}),
}));

describe('Phase 7: OpenAPI Document Context & Endpoint Association MVP', () => {
  const OWNER_ID = new Types.ObjectId().toString();
  const MEMBER_ID = new Types.ObjectId().toString();
  const PROJECT_ID = new Types.ObjectId().toString();
  const DOCUMENT_ID = new Types.ObjectId().toString();
  const SPEC_ID = new Types.ObjectId().toString();
  const ENDPOINT_ID_1 = new Types.ObjectId().toString();
  const ENDPOINT_ID_2 = new Types.ObjectId().toString();

  const mockProject = {
    _id: new Types.ObjectId(PROJECT_ID),
    name: 'Payment Service Project',
    ownerId: new Types.ObjectId(OWNER_ID),
    isArchived: false,
  };

  const mockDocument = {
    _id: new Types.ObjectId(DOCUMENT_ID),
    title: 'Payment Integration ADR',
    ownerId: new Types.ObjectId(OWNER_ID),
    projectId: new Types.ObjectId(PROJECT_ID),
    isDeleted: false,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('OpenAPI Parser Security & Validation', () => {
    it('1. should parse valid OpenAPI 3.0 JSON specification', () => {
      const jsonSpec = JSON.stringify({
        openapi: '3.0.3',
        info: { title: 'Payments API', version: '1.0.0' },
        paths: {
          '/api/v1/payments': {
            post: { summary: 'Create payment', operationId: 'createPayment', tags: ['Payments'] },
          },
        },
      });

      const parsed = parseOpenApiSpecification(jsonSpec);
      expect(parsed.title).toBe('Payments API');
      expect(parsed.version).toBe('1.0.0');
      expect(parsed.openApiVersion).toBe('3.0.3');
      expect(parsed.format).toBe('JSON');
      expect(parsed.endpoints).toHaveLength(1);
      expect(parsed.endpoints[0]).toEqual({
        method: 'POST',
        path: '/api/v1/payments',
        summary: 'Create payment',
        operationId: 'createPayment',
        tags: ['Payments'],
        isDeprecated: false,
      });
    });

    it('2. should parse valid OpenAPI 3.1 YAML specification', () => {
      const yamlSpec = `
openapi: "3.1.0"
info:
  title: "Orders API"
  version: "2.0.0"
paths:
  /orders/{id}:
    get:
      summary: "Get order by ID"
      operationId: "getOrder"
      deprecated: true
`;

      const parsed = parseOpenApiSpecification(yamlSpec);
      expect(parsed.title).toBe('Orders API');
      expect(parsed.version).toBe('2.0.0');
      expect(parsed.format).toBe('YAML');
      expect(parsed.endpoints).toHaveLength(1);
      expect(parsed.endpoints[0]?.method).toBe('GET');
      expect(parsed.endpoints[0]?.path).toBe('/orders/{id}');
      expect(parsed.endpoints[0]?.isDeprecated).toBe(true);
    });

    it('3. should reject malformed specification JSON/YAML', () => {
      expect(() => parseOpenApiSpecification('{ malformed json')).toThrow();
    });

    it('4. should reject unsupported OpenAPI versions (e.g. Swagger 2.0)', () => {
      const swagger2Spec = JSON.stringify({
        swagger: '2.0',
        info: { title: 'Old API', version: '1.0' },
      });
      expect(() => parseOpenApiSpecification(swagger2Spec)).toThrow(/Documan requires OpenAPI 3.0.x or 3.1.x/);
    });

    it('5. should reject oversized specifications (>2MB)', () => {
      const largeContent = 'a'.repeat(2 * 1024 * 1024 + 10);
      expect(() => parseOpenApiSpecification(largeContent)).toThrow(/exceeds maximum limit of 2MB/);
    });

    it('6. should reject YAML specifications with excessive alias references (Billion Laughs protection)', () => {
      const maliciousYaml = `
openapi: "3.0.0"
info:
  title: "Attack API"
  version: "1.0"
paths:
  /test:
    get:
      summary: *alias1 *alias2 *alias3 *alias4 *alias5 *alias6 *alias7 *alias8 *alias9 *alias10 *alias11
`;
      expect(() => parseOpenApiSpecification(maliciousYaml)).toThrow(/maximum allowed alias references/);
    });
  });

  describe('Project API Specification Services & Authorization', () => {
    const validSpecJson = JSON.stringify({
      openapi: '3.0.1',
      info: { title: 'Checkout API', version: '1.1.0' },
      paths: {
        '/checkout': { post: { summary: 'Process checkout' } },
        '/orders': { get: { summary: 'List orders' } },
      },
    });

    it('7. should allow Project Owner to import OpenAPI spec', async () => {
      vi.spyOn(Project, 'findOne').mockResolvedValue(mockProject as any);
      vi.spyOn(ProjectApiSpec, 'findOne').mockResolvedValue(null);

      const mockNewSpec = {
        _id: new Types.ObjectId(SPEC_ID),
        title: 'Checkout API',
        version: '1.1.0',
        format: 'JSON',
        openApiVersion: '3.0.1',
        createdAt: new Date(),
      };
      vi.spyOn(ProjectApiSpec, 'create').mockResolvedValue(mockNewSpec as any);
      vi.spyOn(ProjectApiEndpoint, 'create').mockImplementation(((data: any) =>
        Promise.resolve({ _id: new Types.ObjectId(), ...data })) as any);

      const res = await importProjectApiSpec(OWNER_ID, 'user', PROJECT_ID, validSpecJson);

      expect(res.spec.title).toBe('Checkout API');
      expect(res.endpointsCount).toBe(2);
      expect(auditService.createDocumentAudit).toHaveBeenCalledWith(
        PROJECT_ID,
        OWNER_ID,
        'STATUS_CHANGE',
        expect.objectContaining({ action: 'API_SPEC_IMPORT' }),
      );
    });

    it('8. should reject non-owner/non-admin users from importing API spec with 403 Forbidden', async () => {
      vi.spyOn(Project, 'findOne').mockResolvedValue(mockProject as any);

      await expect(
        importProjectApiSpec(MEMBER_ID, 'user', PROJECT_ID, validSpecJson),
      ).rejects.toThrow(/Project Owner or Admin authority/);
    });

    it('9. should fetch active API spec and parsed endpoint registry', async () => {
      vi.spyOn(Project, 'findOne').mockResolvedValue(mockProject as any);
      const mockSpec = {
        _id: new Types.ObjectId(SPEC_ID),
        title: 'Checkout API',
        version: '1.1.0',
        format: 'JSON',
        openApiVersion: '3.0.1',
        createdAt: new Date(),
      };
      vi.spyOn(ProjectApiSpec, 'findOne').mockResolvedValue(mockSpec as any);

      const mockEndpoints = [
        { _id: new Types.ObjectId(ENDPOINT_ID_1), method: 'POST', path: '/checkout', tags: [], isDeprecated: false },
        { _id: new Types.ObjectId(ENDPOINT_ID_2), method: 'GET', path: '/orders', tags: [], isDeprecated: false },
      ];

      vi.spyOn(ProjectApiEndpoint, 'find').mockReturnValue({
        sort: vi.fn().mockResolvedValue(mockEndpoints),
      } as any);

      const res = await getProjectApiSpec(OWNER_ID, 'user', PROJECT_ID);

      expect(res.spec?.title).toBe('Checkout API');
      expect(res.endpoints).toHaveLength(2);
      expect(res.endpoints[0]?.path).toBe('/checkout');
    });

    it('10. should allow Project Owner to delete API spec and mark document links ORPHANED', async () => {
      vi.spyOn(Project, 'findOne').mockResolvedValue(mockProject as any);
      const mockSpec = {
        _id: new Types.ObjectId(SPEC_ID),
        title: 'Checkout API',
        isActive: true,
        save: vi.fn().mockResolvedValue(true),
      };
      vi.spyOn(ProjectApiSpec, 'findOne').mockResolvedValue(mockSpec as any);
      vi.spyOn(ProjectApiEndpoint, 'find').mockReturnValue({
        select: vi.fn().mockResolvedValue([{ _id: new Types.ObjectId(ENDPOINT_ID_1) }]),
      } as any);
      vi.spyOn(DocumentEndpointLink, 'updateMany').mockResolvedValue({ acknowledged: true } as any);

      const res = await deleteProjectApiSpec(OWNER_ID, 'user', PROJECT_ID, SPEC_ID);

      expect(res.deleted).toBe(true);
      expect(mockSpec.isActive).toBe(false);
      expect(DocumentEndpointLink.updateMany).toHaveBeenCalledWith(
        { endpointId: { $in: [expect.anything()] }, status: 'LINKED' },
        { status: 'ORPHANED', orphanedReason: 'API Specification deleted' },
      );
    });
  });

  describe('Document ↔ Endpoint Associations & IDOR Protection', () => {
    it('11. should link API endpoint to document when user has EDIT access', async () => {
      vi.spyOn(Document, 'findOne').mockResolvedValue(mockDocument as any);
      const mockEndpoint = {
        _id: new Types.ObjectId(ENDPOINT_ID_1),
        projectId: new Types.ObjectId(PROJECT_ID),
        method: 'POST',
        path: '/payments',
        summary: 'Create payment',
        isDeprecated: false,
      };
      vi.spyOn(ProjectApiEndpoint, 'findById').mockResolvedValue(mockEndpoint as any);

      const mockLink = {
        _id: new Types.ObjectId(),
        documentId: new Types.ObjectId(DOCUMENT_ID),
        endpointId: new Types.ObjectId(ENDPOINT_ID_1),
        status: 'LINKED',
      };
      vi.spyOn(DocumentEndpointLink, 'findOneAndUpdate').mockResolvedValue(mockLink as any);

      const res = await linkDocumentApiEndpoint(OWNER_ID, 'user', DOCUMENT_ID, ENDPOINT_ID_1);

      expect(res.status).toBe('LINKED');
      expect(res.path).toBe('/payments');
      expect(auditService.createDocumentAudit).toHaveBeenCalledWith(
        DOCUMENT_ID,
        OWNER_ID,
        'STATUS_CHANGE',
        expect.objectContaining({ action: 'DOCUMENT_ENDPOINT_LINK' }),
      );
    });

    it('12. should reject cross-project endpoint linking (IDOR Protection)', async () => {
      vi.spyOn(Document, 'findOne').mockResolvedValue(mockDocument as any); // Document belongs to PROJECT_ID
      const otherProjectId = new Types.ObjectId().toString();
      const mockEndpointOtherProject = {
        _id: new Types.ObjectId(ENDPOINT_ID_1),
        projectId: new Types.ObjectId(otherProjectId), // Different Project ID!
        method: 'POST',
        path: '/other-route',
      };
      vi.spyOn(ProjectApiEndpoint, 'findById').mockResolvedValue(mockEndpointOtherProject as any);

      await expect(
        linkDocumentApiEndpoint(OWNER_ID, 'user', DOCUMENT_ID, ENDPOINT_ID_1),
      ).rejects.toThrow('Forbidden: Cannot link endpoint from a different project');
    });

    it('13. should unlink API endpoint from document', async () => {
      vi.spyOn(Document, 'findOne').mockResolvedValue(mockDocument as any);
      vi.spyOn(DocumentEndpointLink, 'deleteOne').mockResolvedValue({ acknowledged: true, deletedCount: 1 } as any);

      const res = await unlinkDocumentApiEndpoint(OWNER_ID, 'user', DOCUMENT_ID, ENDPOINT_ID_1);

      expect(res.unlinked).toBe(true);
      expect(auditService.createDocumentAudit).toHaveBeenCalledWith(
        DOCUMENT_ID,
        OWNER_ID,
        'STATUS_CHANGE',
        expect.objectContaining({ action: 'DOCUMENT_ENDPOINT_UNLINK' }),
      );
    });

    it('14. should handle spec re-import: unchanged endpoint remains LINKED, removed endpoint becomes ORPHANED', async () => {
      vi.spyOn(Project, 'findOne').mockResolvedValue(mockProject as any);

      const oldActiveSpec = {
        _id: new Types.ObjectId(SPEC_ID),
        isActive: true,
        save: vi.fn().mockResolvedValue(true),
      };
      vi.spyOn(ProjectApiSpec, 'findOne').mockResolvedValue(oldActiveSpec as any);

      const oldInvoiceEp = { _id: new Types.ObjectId(ENDPOINT_ID_1), method: 'GET', path: '/invoices' };
      const oldReceiptEp = { _id: new Types.ObjectId(ENDPOINT_ID_2), method: 'GET', path: '/receipts' };
      vi.spyOn(ProjectApiEndpoint, 'find').mockResolvedValue([oldInvoiceEp, oldReceiptEp] as any);

      vi.spyOn(ProjectApiSpec, 'create').mockResolvedValue({
        _id: new Types.ObjectId(),
        title: 'Billing API v2',
        version: '2.0',
        format: 'JSON',
        openApiVersion: '3.0.0',
        createdAt: new Date(),
      } as any);

      vi.spyOn(ProjectApiEndpoint, 'create').mockImplementation(((data: any) =>
        Promise.resolve({ _id: new Types.ObjectId(), ...data })) as any);
      vi.spyOn(DocumentEndpointLink, 'updateMany').mockResolvedValue({ acknowledged: true } as any);

      // Re-import spec where /invoices remains, /receipts is REMOVED
      const specV2 = JSON.stringify({
        openapi: '3.0.0',
        info: { title: 'Billing API v2', version: '2.0' },
        paths: {
          '/invoices': { get: { summary: 'List invoices v2' } },
        },
      });

      const res = await importProjectApiSpec(OWNER_ID, 'user', PROJECT_ID, specV2);

      expect(res.endpointsCount).toBe(1);
      // Verify DocumentEndpointLink.updateMany was called to mark removed route (/receipts) as ORPHANED
      expect(DocumentEndpointLink.updateMany).toHaveBeenCalledWith(
        { endpointId: oldReceiptEp._id, status: 'LINKED' },
        { status: 'ORPHANED', orphanedReason: 'Endpoint removed in spec re-import' },
      );
    });

    it('15. should list document endpoints with status and deprecation indicators', async () => {
      vi.spyOn(Document, 'findOne').mockResolvedValue(mockDocument as any);
      const mockLinks = [
        { _id: new Types.ObjectId(), endpointId: new Types.ObjectId(ENDPOINT_ID_1), status: 'LINKED', orphanedReason: null },
        { _id: new Types.ObjectId(), endpointId: new Types.ObjectId(ENDPOINT_ID_2), status: 'ORPHANED', orphanedReason: 'Endpoint removed in spec re-import' },
      ];
      vi.spyOn(DocumentEndpointLink, 'find').mockResolvedValue(mockLinks as any);

      const mockEndpoints = [
        { _id: new Types.ObjectId(ENDPOINT_ID_1), method: 'POST', path: '/payments', summary: 'Create payment', isDeprecated: true },
        { _id: new Types.ObjectId(ENDPOINT_ID_2), method: 'GET', path: '/receipts', summary: 'Receipts', isDeprecated: false },
      ];
      vi.spyOn(ProjectApiEndpoint, 'find').mockResolvedValue(mockEndpoints as any);

      const res = await getDocumentApiEndpoints(OWNER_ID, 'user', DOCUMENT_ID);

      expect(res).toHaveLength(2);
      expect(res[0]?.path).toBe('/payments');
      expect(res[0]?.status).toBe('LINKED');
      expect(res[0]?.isDeprecated).toBe(true);
      expect(res[1]?.status).toBe('ORPHANED');
      expect(res[1]?.orphanedReason).toBe('Endpoint removed in spec re-import');
    });
  });
});
