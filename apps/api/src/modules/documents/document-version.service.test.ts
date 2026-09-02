/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Types } from 'mongoose';
import fs from 'node:fs';

import {
  createVersionSnapshot,
  reserveNextVersionNumber,
  compareDocumentVersions,
  isTextFileType,
  sanitizeFileName,
  ensureDocumentVersionBaseline,
} from './document-version.service.js';
import { DocumentVersion } from './document-version.model.js';
import { Document } from './document.model.js';

describe('Phase 7.4 — Document Versioning & Snapshot History Engine', () => {
  const mockProjectId = new Types.ObjectId();
  const mockOwnerId = new Types.ObjectId();
  const mockDocId = new Types.ObjectId();

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('1. File Utility & MIME Classification', () => {
    it('sanitizes unsafe filenames with path traversal protection', () => {
      expect(sanitizeFileName('../../etc/passwd')).toBe('passwd');
      expect(sanitizeFileName('architecture spec v2.1.md')).toBe('architecture_spec_v2.1.md');
    });

    it('correctly identifies text vs binary MIME types', () => {
      expect(isTextFileType('text/markdown', 'doc.md')).toBe(true);
      expect(isTextFileType('application/json', 'spec.json')).toBe(true);
      expect(isTextFileType('text/plain', 'notes.txt')).toBe(true);
      expect(isTextFileType('application/pdf', 'design.pdf')).toBe(false);
      expect(isTextFileType('image/png', 'diagram.png')).toBe(false);
    });
  });

  describe('2. Snapshot Creation & Version Reservation', () => {
    it('atomically reserves next version number using optimistic update', async () => {
      vi.spyOn(Document, 'findOneAndUpdate').mockResolvedValue({
        _id: mockDocId,
        version: 2,
      } as any);

      const res = await reserveNextVersionNumber(mockDocId.toString(), 1);
      expect(res.version).toBe(2);
    });

    it('rejects concurrent edits with 409 Conflict when optimistic reservation fails', async () => {
      vi.spyOn(Document, 'findOneAndUpdate').mockResolvedValue(null);

      await expect(reserveNextVersionNumber(mockDocId.toString(), 1)).rejects.toThrow(
        'Concurrent document update detected',
      );
    });

    it('executes saga cleanup when DocumentVersion DB insertion fails', async () => {
      vi.spyOn(fs.promises, 'copyFile').mockResolvedValue(undefined);
      const unlinkSpy = vi.spyOn(fs.promises, 'unlink').mockResolvedValue(undefined);
      vi.spyOn(DocumentVersion, 'create').mockRejectedValue(new Error('DB write error'));

      const mockDoc = {
        _id: mockDocId,
        projectId: mockProjectId,
        version: 1,
      } as any;

      await expect(
        createVersionSnapshot({
          document: mockDoc,
          sourceFilePath: '/tmp/test.md',
          fileName: 'test.md',
          fileType: 'text/markdown',
          fileSize: 100,
          versionNumber: 1,
          createdById: mockOwnerId,
        }),
      ).rejects.toThrow();

      expect(unlinkSpy).toHaveBeenCalled();
    });
  });

  describe('3. Text Diffing & Comparison Engine', () => {
    it('returns diffSupported=false for binary file comparisons', async () => {
      const v1 = {
        _id: new Types.ObjectId(),
        versionNumber: 1,
        fileType: 'application/pdf',
        fileName: 'arch.pdf',
        fileSize: 500,
        filePath: '/tmp/v1.pdf',
      };
      const v2 = {
        _id: new Types.ObjectId(),
        versionNumber: 2,
        fileType: 'application/pdf',
        fileName: 'arch.pdf',
        fileSize: 600,
        filePath: '/tmp/v2.pdf',
      };

      vi.spyOn(DocumentVersion, 'findOne').mockImplementation((query: any) => {
        if (query._id.toString() === v1._id.toString()) return { populate: () => v1 } as any;
        return { populate: () => v2 } as any;
      });

      const result = await compareDocumentVersions(
        mockDocId.toString(),
        mockProjectId.toString(),
        v1._id.toString(),
        v2._id.toString(),
      );

      expect(result.diffSupported).toBe(false);
      expect(result.reason).toContain('Binary file format');
      expect(result.sizeDeltaBytes).toBe(100);
    });

    it('returns zero diff when comparing identical version to itself', async () => {
      const v1 = {
        _id: new Types.ObjectId(),
        versionNumber: 1,
        fileType: 'text/markdown',
        fileName: 'spec.md',
        fileSize: 200,
        filePath: '/tmp/v1.md',
      };

      vi.spyOn(DocumentVersion, 'findOne').mockReturnValue({ populate: () => v1 } as any);

      const result = await compareDocumentVersions(
        mockDocId.toString(),
        mockProjectId.toString(),
        v1._id.toString(),
        v1._id.toString(),
      );

      expect(result.diffSupported).toBe(true);
      expect(result.sizeDeltaBytes).toBe(0);
      expect(result.textDiff).toBe('');
      expect(result.summary).toEqual({ additions: 0, deletions: 0 });
    });

    it('generates text diff with additions and deletions for text formats', async () => {
      const v1 = {
        _id: new Types.ObjectId(),
        versionNumber: 1,
        fileType: 'text/markdown',
        fileName: 'spec.md',
        fileSize: 20,
        filePath: '/tmp/v1.md',
      };
      const v2 = {
        _id: new Types.ObjectId(),
        versionNumber: 2,
        fileType: 'text/markdown',
        fileName: 'spec.md',
        fileSize: 30,
        filePath: '/tmp/v2.md',
      };

      vi.spyOn(DocumentVersion, 'findOne').mockImplementation((query: any) => {
        if (query._id.toString() === v1._id.toString()) return { populate: () => v1 } as any;
        return { populate: () => v2 } as any;
      });

      vi.spyOn(fs.promises, 'readFile').mockImplementation((path: any) => {
        if (path === '/tmp/v1.md') return Promise.resolve('Line 1\nLine 2');
        return Promise.resolve('Line 1\nLine 2 Updated\nLine 3');
      });

      const result = await compareDocumentVersions(
        mockDocId.toString(),
        mockProjectId.toString(),
        v1._id.toString(),
        v2._id.toString(),
      );

      expect(result.diffSupported).toBe(true);
      expect(result.summary.additions).toBeGreaterThan(0);
      expect(result.textDiff).toContain('+Line 2 Updated');
    });
  });

  describe('4. Legacy Baseline Migration', () => {
    it('creates baseline v1 for legacy document when no v1 snapshot exists', async () => {
      vi.spyOn(DocumentVersion, 'findOne').mockResolvedValue(null);
      vi.spyOn(fs, 'existsSync').mockReturnValue(true);
      vi.spyOn(fs.promises, 'copyFile').mockResolvedValue(undefined);
      const createSpy = vi.spyOn(DocumentVersion, 'create').mockResolvedValue({} as any);

      const legacyDoc = {
        _id: mockDocId,
        projectId: mockProjectId,
        fileName: 'legacy.md',
        filePath: '/tmp/legacy.md',
        fileType: 'text/markdown',
        fileSize: 150,
        ownerId: mockOwnerId,
        createdAt: new Date(),
      } as any;

      await ensureDocumentVersionBaseline(legacyDoc);

      expect(createSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          versionNumber: 1,
          changeSummary: 'Baseline version snapshot created during Phase 7.4 migration',
        }),
      );
    });
  });
});
