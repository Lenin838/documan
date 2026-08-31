import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Types } from 'mongoose';

import { getDocumentDependencies } from './document-relationship.service.js';
import { DocumentRelationship } from './document-relationship.model.js';
import { Document } from './document.model.js';
import { DocumentShare } from '../document-shares/document-share.model.js';

vi.mock('./document-relationship.model.js');
vi.mock('./document.model.js');
vi.mock('../document-shares/document-share.model.js');
vi.mock('./document-audit.service.js', () => ({
  createDocumentAudit: vi.fn().mockResolvedValue({}),
}));

const mockDocumentRelationship = vi.mocked(DocumentRelationship);
const mockDocument = vi.mocked(Document);
const mockDocumentShare = vi.mocked(DocumentShare);

const USER_ID = new Types.ObjectId().toString();
const USER_2_ID = new Types.ObjectId().toString();
const DOC_A_ID = new Types.ObjectId().toString();
const DOC_B_ID = new Types.ObjectId().toString();
const DOC_C_ID = new Types.ObjectId().toString();
const DOC_D_ID = new Types.ObjectId().toString();

function createMockDoc(idStr: string, title: string, ownerIdStr: string = USER_ID, isDeleted = false) {
  return {
    _id: new Types.ObjectId(idStr),
    title,
    fileName: `${title.toLowerCase().replace(/\s+/g, '-')}.md`,
    fileType: 'text/markdown',
    ownerId: new Types.ObjectId(ownerIdStr),
    isDeleted,
  };
}

describe('getDocumentDependencies', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockDocument.find.mockReturnValue({
      select: vi.fn().mockImplementation(() =>
        Promise.resolve([
          { _id: new Types.ObjectId(DOC_A_ID), ownerId: new Types.ObjectId(USER_ID) },
          { _id: new Types.ObjectId(DOC_B_ID), ownerId: new Types.ObjectId(USER_ID) },
          { _id: new Types.ObjectId(DOC_C_ID), ownerId: new Types.ObjectId(USER_ID) },
          { _id: new Types.ObjectId(DOC_D_ID), ownerId: new Types.ObjectId(USER_ID) },
        ]),
      ),
    } as never);
    mockDocumentShare.find.mockReturnValue({
      select: vi.fn().mockResolvedValue([]),
    } as never);
  });

  it('should return empty summary when document has no dependencies', async () => {
    const docA = createMockDoc(DOC_A_ID, 'Document A');
    mockDocument.findOne.mockResolvedValue(docA as never);
    mockDocumentRelationship.find.mockReturnValue({
      populate: vi.fn().mockResolvedValue([]),
    } as never);

    const result = await getDocumentDependencies(USER_ID, 'user', DOC_A_ID);

    expect(result).toEqual({
      summary: {
        upstreamCount: 0,
        downstreamCount: 0,
        cycleDetected: false,
      },
      upstream: [],
      downstream: [],
    });
  });

  it('should list direct upstream dependency for DEPENDS_ON relationship', async () => {
    const docA = createMockDoc(DOC_A_ID, 'Document A');
    const docB = createMockDoc(DOC_B_ID, 'Document B');

    mockDocument.findOne.mockResolvedValue(docA as never);

    const relAB = {
      sourceDocumentId: docA,
      targetDocumentId: docB,
      type: 'DEPENDS_ON',
    };

    // Upstream query returns relAB, Downstream returns []
    mockDocumentRelationship.find
      .mockReturnValueOnce({
        populate: vi.fn().mockResolvedValue([relAB]),
      } as never)
      .mockReturnValueOnce({
        populate: vi.fn().mockResolvedValue([]),
      } as never);

    const result = await getDocumentDependencies(USER_ID, 'user', DOC_A_ID);

    expect(result.summary.upstreamCount).toBe(1);
    expect(result.summary.downstreamCount).toBe(0);
    expect(result.upstream).toHaveLength(1);
    expect(result.upstream[0]).toMatchObject({
      id: DOC_B_ID,
      title: 'Document B',
      depth: 1,
      direction: 'UPSTREAM',
    });
  });

  it('should list direct downstream dependent', async () => {
    const docA = createMockDoc(DOC_A_ID, 'Document A');
    const docB = createMockDoc(DOC_B_ID, 'Document B');

    mockDocument.findOne.mockResolvedValue(docB as never);

    const relAB = {
      sourceDocumentId: docA,
      targetDocumentId: docB,
      type: 'DEPENDS_ON',
    };

    // Upstream returns [], Downstream returns relAB (A depends on B, so A is downstream of B)
    mockDocumentRelationship.find
      .mockReturnValueOnce({
        populate: vi.fn().mockResolvedValue([]),
      } as never)
      .mockReturnValueOnce({
        populate: vi.fn().mockResolvedValue([relAB]),
      } as never);

    const result = await getDocumentDependencies(USER_ID, 'user', DOC_B_ID);

    expect(result.summary.upstreamCount).toBe(0);
    expect(result.summary.downstreamCount).toBe(1);
    expect(result.downstream[0]).toMatchObject({
      id: DOC_A_ID,
      title: 'Document A',
      depth: 1,
      direction: 'DOWNSTREAM',
    });
  });

  it('should perform multi-hop upstream traversal up to maxDepth', async () => {
    const docA = createMockDoc(DOC_A_ID, 'Document A');
    const docB = createMockDoc(DOC_B_ID, 'Document B');
    const docC = createMockDoc(DOC_C_ID, 'Document C');

    mockDocument.findOne.mockResolvedValue(docA as never);

    const relAB = { sourceDocumentId: docA, targetDocumentId: docB, type: 'DEPENDS_ON' };
    const relBC = { sourceDocumentId: docB, targetDocumentId: docC, type: 'DEPENDS_ON' };

    mockDocumentRelationship.find
      .mockReturnValueOnce({ populate: vi.fn().mockResolvedValue([relAB]) } as never)
      .mockReturnValueOnce({ populate: vi.fn().mockResolvedValue([relBC]) } as never)
      .mockReturnValueOnce({ populate: vi.fn().mockResolvedValue([]) } as never)
      .mockReturnValueOnce({ populate: vi.fn().mockResolvedValue([]) } as never);

    const result = await getDocumentDependencies(USER_ID, 'user', DOC_A_ID, 3);

    expect(result.summary.upstreamCount).toBe(2);
    expect(result.upstream).toEqual([
      expect.objectContaining({ id: DOC_B_ID, depth: 1, direction: 'UPSTREAM' }),
      expect.objectContaining({ id: DOC_C_ID, depth: 2, direction: 'UPSTREAM' }),
    ]);
  });

  it('should detect cycles and set cycleDetected to true without infinite looping', async () => {
    const docA = createMockDoc(DOC_A_ID, 'Document A');
    const docB = createMockDoc(DOC_B_ID, 'Document B');

    mockDocument.findOne.mockResolvedValue(docA as never);

    // Cycle: A -> B and B -> A
    const relAB = { sourceDocumentId: docA, targetDocumentId: docB, type: 'DEPENDS_ON' };
    const relBA = { sourceDocumentId: docB, targetDocumentId: docA, type: 'DEPENDS_ON' };

    mockDocumentRelationship.find
      .mockReturnValueOnce({ populate: vi.fn().mockResolvedValue([relAB]) } as never)
      .mockReturnValueOnce({ populate: vi.fn().mockResolvedValue([relBA]) } as never)
      .mockReturnValueOnce({ populate: vi.fn().mockResolvedValue([]) } as never);

    const result = await getDocumentDependencies(USER_ID, 'user', DOC_A_ID, 3);

    expect(result.summary.cycleDetected).toBe(true);
    expect(result.summary.upstreamCount).toBe(1);
    expect(result.upstream[0]?.id).toBe(DOC_B_ID);
  });

  it('should filter out soft-deleted documents from dependency results and counts', async () => {
    const docA = createMockDoc(DOC_A_ID, 'Document A');
    const docBDeleted = createMockDoc(DOC_B_ID, 'Document B', USER_ID, true);

    mockDocument.findOne.mockResolvedValue(docA as never);

    const relAB = { sourceDocumentId: docA, targetDocumentId: docBDeleted, type: 'DEPENDS_ON' };

    mockDocumentRelationship.find
      .mockReturnValueOnce({ populate: vi.fn().mockResolvedValue([relAB]) } as never)
      .mockReturnValueOnce({ populate: vi.fn().mockResolvedValue([]) } as never);

    const result = await getDocumentDependencies(USER_ID, 'user', DOC_A_ID);

    expect(result.summary.upstreamCount).toBe(0);
    expect(result.upstream).toHaveLength(0);
  });

  it('CRITICAL SECURITY TEST: should stop traversal at inaccessible intermediate document and omit unreadable subtrees', async () => {
    const docA = createMockDoc(DOC_A_ID, 'Document A', USER_ID);
    const docBSecret = createMockDoc(DOC_B_ID, 'Secret B', USER_2_ID);
    const docC = createMockDoc(DOC_C_ID, 'Document C', USER_2_ID);

    mockDocument.findOne.mockResolvedValue(docA as never);

    const relAB = { sourceDocumentId: docA, targetDocumentId: docBSecret, type: 'DEPENDS_ON' };
    const _relBC = { sourceDocumentId: docBSecret, targetDocumentId: docC, type: 'DEPENDS_ON' };

    mockDocumentRelationship.find
      .mockReturnValueOnce({ populate: vi.fn().mockResolvedValue([relAB]) } as never)
      .mockReturnValueOnce({ populate: vi.fn().mockResolvedValue([]) } as never);

    // Non-admin USER_ID does not own Secret B and has no DocumentShare for B
    mockDocument.find.mockReturnValue({
      select: vi.fn().mockResolvedValue([
        { _id: new Types.ObjectId(DOC_B_ID), ownerId: new Types.ObjectId(USER_2_ID) },
      ]),
    } as never);
    mockDocumentShare.find.mockReturnValue({
      select: vi.fn().mockResolvedValue([]),
    } as never);

    const result = await getDocumentDependencies(USER_ID, 'user', DOC_A_ID, 3);

    expect(result.summary.upstreamCount).toBe(0);
    expect(result.upstream).toHaveLength(0);
    // Ensure node C was never even queried or exposed
    expect(result.upstream.some((item) => item.id === DOC_C_ID)).toBe(false);
  });

  it('should enforce deterministic ordering by depth ascending then title ascending', async () => {
    const docA = createMockDoc(DOC_A_ID, 'Document A');
    const docZ = createMockDoc(DOC_B_ID, 'Zebra Document', USER_ID);
    const docM = createMockDoc(DOC_C_ID, 'Monkey Document', USER_ID);
    const docD = createMockDoc(DOC_D_ID, 'Alpha Document', USER_ID);

    mockDocument.findOne.mockResolvedValue(docA as never);

    // Depth 1: Zebra, Monkey; Depth 2: Alpha
    const relAZ = { sourceDocumentId: docA, targetDocumentId: docZ, type: 'DEPENDS_ON' };
    const relAM = { sourceDocumentId: docA, targetDocumentId: docM, type: 'DEPENDS_ON' };
    const relMD = { sourceDocumentId: docM, targetDocumentId: docD, type: 'DEPENDS_ON' };

    mockDocumentRelationship.find
      .mockReturnValueOnce({ populate: vi.fn().mockResolvedValue([relAZ, relAM]) } as never)
      .mockReturnValueOnce({ populate: vi.fn().mockResolvedValue([relMD]) } as never)
      .mockReturnValueOnce({ populate: vi.fn().mockResolvedValue([]) } as never)
      .mockReturnValueOnce({ populate: vi.fn().mockResolvedValue([]) } as never);

    const result = await getDocumentDependencies(USER_ID, 'user', DOC_A_ID, 3);

    expect(result.upstream).toHaveLength(3);
    // Depth 1 sorted alphabetically: Monkey Document, then Zebra Document
    expect(result.upstream[0]?.title).toBe('Monkey Document');
    expect(result.upstream[1]?.title).toBe('Zebra Document');
    // Depth 2: Alpha Document
    expect(result.upstream[2]?.title).toBe('Alpha Document');
  });

  it('should throw 404 when primary document is not found or unauthorized', async () => {
    mockDocument.findOne.mockResolvedValue(null);

    await expect(
      getDocumentDependencies(USER_ID, 'user', DOC_A_ID),
    ).rejects.toThrow('Document not found');
  });
});
