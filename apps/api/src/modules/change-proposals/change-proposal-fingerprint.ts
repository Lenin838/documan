/* eslint-disable @typescript-eslint/no-explicit-any */
import crypto from 'crypto';
import { Types } from 'mongoose';
import { Document } from '../documents/document.model.js';
import { DocumentVersion } from '../documents/document-version.model.js';
import { DocumentRelationship } from '../documents/document-relationship.model.js';
import { DocumentationBaseline } from '../governance/documentation-baseline.model.js';
import { ProjectTopologyLink } from '../projects/project-topology.model.js';

export async function computeSimulationStateFingerprint(
  targetDocumentId: string | Types.ObjectId,
  projectId: string | Types.ObjectId,
): Promise<string> {
  const docObjId = new Types.ObjectId(targetDocumentId.toString());
  const projObjId = new Types.ObjectId(projectId.toString());

  const doc = await Document.findOne({ _id: docObjId, isDeleted: false });
  if (!doc) {
    return 'INVALID_DOCUMENT';
  }

  // 1. Target Document tuple
  const latestVersionDoc = (await DocumentVersion.findOne({ documentId: docObjId })
    .sort({ versionNumber: -1 })
    .select('checksum versionNumber')) as any;
  const docVersion = doc.version || 1;
  const docChecksum = latestVersionDoc?.checksum || doc.filePath || 'NO_CHECKSUM';
  const docUpdatedAt = doc.updatedAt ? doc.updatedAt.getTime() : 0;
  const docTuple = `DOC:${doc._id.toString()}:${doc.title}:${docVersion}:${doc.status}:${docUpdatedAt}:${docChecksum}`;

  // 2. Active Baseline tuple
  const activeBaseline = (await DocumentationBaseline.findOne({
    projectId: projObjId,
    isActive: true,
  })) as any;
  let baselineTuple = 'BASELINE:NONE';
  if (activeBaseline) {
    const bChecksum = activeBaseline.snapshot?.documents?.[docObjId.toString()]?.contentChecksum || 'NONE';
    baselineTuple = `BASELINE:${activeBaseline._id.toString()}:${bChecksum}`;
  }

  // 3. Connected Relationships tuples (sorted lexicographically)
  const rels = await DocumentRelationship.find({
    $or: [{ sourceDocumentId: docObjId }, { targetDocumentId: docObjId }],
  }).select('sourceDocumentId targetDocumentId type');

  const relTuples = rels
    .map(
      (r) =>
        `REL:${r.sourceDocumentId.toString()}:${r.targetDocumentId.toString()}:${r.type}`,
    )
    .sort();

  // 4. Connected Topology Links tuples (sorted lexicographically)
  const topoLinks = await ProjectTopologyLink.find({
    $or: [{ sourceProjectId: projObjId }, { targetProjectId: projObjId }],
  }).select('sourceProjectId targetProjectId type');

  const topoTuples = topoLinks
    .map(
      (t) =>
        `TOPOLOGY:${t.sourceProjectId.toString()}:${t.targetProjectId.toString()}:${t.type}`,
    )
    .sort();

  // Canonical serialization: newline-separated
  const canonicalSerialized = [docTuple, baselineTuple, ...relTuples, ...topoTuples].join('\n');

  return crypto.createHash('sha256').update(canonicalSerialized, 'utf8').digest('hex');
}
