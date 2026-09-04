import mongoose, { Types } from 'mongoose';

import { Document } from '../documents/document.model.js';
import { DocumentRelationship } from '../documents/document-relationship.model.js';
import { DocumentEndpointLink } from '../api-specs/document-endpoint-link.model.js';

export type VerificationMethod =
  | 'EVIDENCE_RENEWAL'
  | 'API_ALIGNMENT'
  | 'TECHNICAL_REVIEW'
  | 'CONTENT_AUDIT';

export interface ImpactedDocumentIntelligence {
  targetDocumentId: Types.ObjectId;
  targetTitle: string;
  targetOwnerId: Types.ObjectId;
  relationshipType: string;
  impactPath: string[];
  verificationMethod: VerificationMethod;
  applicableMethods: VerificationMethod[];
  impactExplanations: string[];
  evidenceReferenceId?: Types.ObjectId;
}

export interface ChangeIntelligenceResult {
  triggerDocumentId: Types.ObjectId;
  triggerTitle: string;
  triggerVersion: string;
  projectId: Types.ObjectId;
  impactedDocuments: ImpactedDocumentIntelligence[];
}

export async function getChangeIntelligenceForVersion(
  projectId: string | Types.ObjectId,
  triggerDocumentId: string | Types.ObjectId,
  triggerVersion: string,
): Promise<ChangeIntelligenceResult> {
  const projObjId = new Types.ObjectId(projectId.toString());
  const triggerObjId = new Types.ObjectId(triggerDocumentId.toString());

  const triggerDoc = await Document.findOne({
    _id: triggerObjId,
    projectId: projObjId,
    isDeleted: false,
  }).select('_id title ownerId version');

  if (!triggerDoc) {
    throw new Error('Trigger document not found in project');
  }

  const impactedMap = new Map<
    string,
    {
      targetDoc: InstanceType<typeof Document>;
      relationshipType: string;
      impactPath: string[];
    }
  >();

  const visited = new Set<string>([triggerObjId.toString()]);
  const queue: Array<{ docId: string; path: string[] }> = [
    { docId: triggerObjId.toString(), path: [triggerDoc.title] },
  ];

  while (queue.length > 0) {
    const current = queue.shift()!;

    const rels = await DocumentRelationship.find({
      $or: [
        { targetDocumentId: new Types.ObjectId(current.docId) },
        { sourceDocumentId: new Types.ObjectId(current.docId) },
      ],
    }).populate<{ sourceDocumentId: InstanceType<typeof Document>; targetDocumentId: InstanceType<typeof Document> }>([
      { path: 'sourceDocumentId', select: '_id title ownerId isDeleted projectId' },
      { path: 'targetDocumentId', select: '_id title ownerId isDeleted projectId' },
    ]);

    for (const rel of rels) {
      if (!rel.sourceDocumentId || !rel.targetDocumentId) continue;

      let downstreamDoc: InstanceType<typeof Document> | null = null;

      if (rel.type === 'DEPENDS_ON') {
        if (rel.targetDocumentId._id.toString() === current.docId) {
          downstreamDoc = rel.sourceDocumentId;
        }
      } else {
        if (rel.sourceDocumentId._id.toString() === current.docId) {
          downstreamDoc = rel.targetDocumentId;
        } else if (rel.targetDocumentId._id.toString() === current.docId) {
          downstreamDoc = rel.sourceDocumentId;
        }
      }

      if (!downstreamDoc || downstreamDoc.isDeleted) continue;
      if (downstreamDoc.projectId?.toString() !== projObjId.toString()) continue;

      const downstreamId = downstreamDoc._id.toString();
      if (visited.has(downstreamId)) continue;

      visited.add(downstreamId);
      const newPath = [...current.path, downstreamDoc.title];

      impactedMap.set(downstreamId, {
        targetDoc: downstreamDoc,
        relationshipType: rel.type,
        impactPath: newPath,
      });

      if (newPath.length <= 3) {
        queue.push({ docId: downstreamId, path: newPath });
      }
    }
  }

  const EvidenceModel = mongoose.models['EvidenceItem'];

  const impactedDocuments: ImpactedDocumentIntelligence[] = [];

  for (const [, item] of impactedMap.entries()) {
    const { targetDoc, relationshipType, impactPath } = item;
    const applicableMethods: VerificationMethod[] = [];
    const explanations: string[] = [];
    let evidenceRefId: Types.ObjectId | undefined = undefined;

    if (EvidenceModel) {
      const evidence = await (EvidenceModel as unknown as {
        findOne: (filter: Record<string, unknown>) => { sort: (opts: Record<string, number>) => Promise<{ _id: Types.ObjectId } | null> };
      }).findOne({
        documentId: targetDoc._id,
      }).sort({ createdAt: -1 });

      if (evidence) {
        applicableMethods.push('EVIDENCE_RENEWAL');
        evidenceRefId = (evidence as { _id: Types.ObjectId })._id;
        explanations.push(
          `Document has existing empirical evidence that requires renewal following upstream changes to ${triggerDoc.title} (v${triggerVersion}).`,
        );
      }
    }

    const hasApiLink = await DocumentEndpointLink.exists({
      documentId: targetDoc._id,
    });
    if (hasApiLink) {
      applicableMethods.push('API_ALIGNMENT');
      explanations.push(
        `Document references API endpoints that must be aligned with upstream changes in ${triggerDoc.title}.`,
      );
    }

    if (impactPath.length > 2 || relationshipType === 'DEPENDS_ON') {
      applicableMethods.push('TECHNICAL_REVIEW');
      explanations.push(
        `Upstream document ${triggerDoc.title} (v${triggerVersion}) was modified along impact path [${impactPath.join(' -> ')}]. Technical review required.`,
      );
    }

    applicableMethods.push('CONTENT_AUDIT');
    if (explanations.length === 0) {
      explanations.push(
        `Upstream document ${triggerDoc.title} updated to v${triggerVersion} via ${relationshipType} relationship. Content audit required.`,
      );
    }

    let verificationMethod: VerificationMethod = 'CONTENT_AUDIT';
    if (applicableMethods.includes('EVIDENCE_RENEWAL')) {
      verificationMethod = 'EVIDENCE_RENEWAL';
    } else if (applicableMethods.includes('API_ALIGNMENT')) {
      verificationMethod = 'API_ALIGNMENT';
    } else if (applicableMethods.includes('TECHNICAL_REVIEW')) {
      verificationMethod = 'TECHNICAL_REVIEW';
    }

    const docIntel: ImpactedDocumentIntelligence = {
      targetDocumentId: targetDoc._id as Types.ObjectId,
      targetTitle: targetDoc.title,
      targetOwnerId: targetDoc.ownerId as Types.ObjectId,
      relationshipType,
      impactPath,
      verificationMethod,
      applicableMethods,
      impactExplanations: explanations,
      ...(evidenceRefId ? { evidenceReferenceId: evidenceRefId } : {}),
    };

    impactedDocuments.push(docIntel);
  }

  return {
    triggerDocumentId: triggerDoc._id as Types.ObjectId,
    triggerTitle: triggerDoc.title,
    triggerVersion,
    projectId: projObjId,
    impactedDocuments,
  };
}
