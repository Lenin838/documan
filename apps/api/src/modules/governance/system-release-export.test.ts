import { describe, it, expect } from 'vitest';
import {
  canonicalizeExportPayload,
  computeExportBundleDigest,
} from './system-release-export.service.js';

describe('system-release-export.service', () => {
  describe('canonicalizeExportPayload', () => {
    it('should sort object keys recursively in alphabetical order', () => {
      const objA = { z: 1, a: 2, m: { b: 3, a: 4 } };
      const objB = { a: 2, m: { a: 4, b: 3 }, z: 1 };

      const canonA = canonicalizeExportPayload(objA);
      const canonB = canonicalizeExportPayload(objB);

      expect(canonA).toBe(canonB);
      expect(canonA).toBe('{"a":2,"m":{"a":4,"b":3},"z":1}');
    });

    it('should omit undefined keys and keys starting with $ or _doc', () => {
      const obj = {
        name: 'Test',
        $internal: 'ignore',
        _doc: { raw: true },
        emptyVal: undefined,
        active: true,
      };

      const canon = canonicalizeExportPayload(obj);
      expect(canon).toBe('{"active":true,"name":"Test"}');
    });

    it('should preserve null values and arrays', () => {
      const obj = { list: [3, 1, 2], status: null };
      const canon = canonicalizeExportPayload(obj);
      expect(canon).toBe('{"list":[3,1,2],"status":null}');
    });
  });

  describe('computeExportBundleDigest', () => {
    it('should produce identical SHA-256 digest for objects with different key orders', () => {
      const payload1 = {
        exportSchemaVersion: '1.0',
        exportMetadata: { generatedAt: '2026-09-13T20:00:00.000Z', generatedByUserId: 'user1' },
        releaseCertificate: { releaseTag: 'v1.0.0', certificateHash: 'abc123hash' },
      };

      const payload2 = {
        releaseCertificate: { certificateHash: 'abc123hash', releaseTag: 'v1.0.0' },
        exportSchemaVersion: '1.0',
        exportMetadata: { generatedByUserId: 'user1', generatedAt: '2026-09-13T20:00:00.000Z' },
      };

      const digest1 = computeExportBundleDigest(payload1);
      const digest2 = computeExportBundleDigest(payload2);

      expect(digest1).toBe(digest2);
      expect(digest1).toMatch(/^[a-f0-9]{64}$/);
    });

    it('should change digest when any payload property is modified', () => {
      const basePayload = {
        exportSchemaVersion: '1.0',
        releaseCertificate: { releaseTag: 'v1.0.0' },
      };

      const modifiedPayload = {
        exportSchemaVersion: '1.0',
        releaseCertificate: { releaseTag: 'v1.0.1' },
      };

      const baseDigest = computeExportBundleDigest(basePayload);
      const modDigest = computeExportBundleDigest(modifiedPayload);

      expect(baseDigest).not.toBe(modDigest);
    });

    it('should exclude exportBundleDigest field from hash calculation', () => {
      const payloadWithout = {
        exportSchemaVersion: '1.0',
        exportMetadata: { generatedAt: '2026-09-13T20:00:00.000Z' },
      };

      const payloadWith = {
        ...payloadWithout,
        exportMetadata: {
          ...payloadWithout.exportMetadata,
          exportBundleDigest: 'existing_digest_value_should_be_ignored',
        },
      };

      const digestWithout = computeExportBundleDigest(payloadWithout);
      const digestWith = computeExportBundleDigest(payloadWith);

      expect(digestWithout).toBe(digestWith);
    });
  });
});
