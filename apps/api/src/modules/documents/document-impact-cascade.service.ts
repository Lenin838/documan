import mongoose, { Types } from 'mongoose';

import { Document, type DocumentDocument } from './document.model.js';
import { DocumentRelationship } from './document-relationship.model.js';
import { createDocumentAudit } from './document-audit.service.js';
import { Project } from '../projects/project.model.js';
import { createVerificationPlanInternal } from '../governance/verification-plan.service.js';
import { createWorkRequestInternal } from '../governance/work-request.service.js';
import {
  createNotificationInternal,
  safeNotify,
} from '../notifications/notification.service.js';
import {
  dispatchWebhookEvent,
  safeDispatchWebhook,
} from '../webhooks/webhook-delivery.service.js';

export interface ProcessImpactOptions {
  upstreamDocId: string;
  changeType: 'STALE' | 'DEPRECATED' | 'FILE_REPLACED';
}

const MAX_DEPTH = 3;
const MAX_NODES = 50;

export async function processUpstreamDocumentImpact({
  upstreamDocId,
  changeType,
}: ProcessImpactOptions): Promise<{ impactedCount: number }> {
  if (!Types.ObjectId.isValid(upstreamDocId)) {
    return { impactedCount: 0 };
  }

  // Guard for unconnected Mongoose state during isolated unit tests
  if (mongoose.connection.readyState === 0) {
    return { impactedCount: 0 };
  }

  const upstreamDoc = await Document.findById(upstreamDocId).select(
    '_id projectId ownerId title isDeleted version',
  );

  if (!upstreamDoc || upstreamDoc.isDeleted) {
    return { impactedCount: 0 };
  }

  const upstreamVersionNumber = upstreamDoc.version || 1;

  let currentLevelDocIds: string[] = [upstreamDoc._id.toString()];
  const visitedSet = new Set<string>([upstreamDoc._id.toString()]);
  const impactedDocIdsSet = new Set<string>();
  const impactedDocsList: DocumentDocument[] = [];

  // Bounded Downstream Traversal across projects (targetDocumentId <- sourceDocumentId)
  for (let depth = 1; depth <= MAX_DEPTH; depth++) {
    if (
      currentLevelDocIds.length === 0 ||
      impactedDocsList.length >= MAX_NODES
    ) {
      break;
    }

    const currentLevelObjIds = currentLevelDocIds.map(
      (id) => new Types.ObjectId(id),
    );

    const relationships = await DocumentRelationship.find({
      targetDocumentId: { $in: currentLevelObjIds },
      type: 'DEPENDS_ON',
    }).populate<{
      sourceDocumentId: DocumentDocument & { _id: Types.ObjectId };
    }>({
      path: 'sourceDocumentId',
      select: '_id title status isDeleted ownerId projectId impactVerification',
    });

    const activeRels = relationships.filter(
      (rel) =>
        rel.sourceDocumentId &&
        !rel.sourceDocumentId.isDeleted &&
        rel.sourceDocumentId.projectId,
    );

    if (activeRels.length === 0) {
      break;
    }

    const nextLevelDocIds: string[] = [];

    for (const rel of activeRels) {
      const sourceIdStr = rel.sourceDocumentId._id.toString();

      if (visitedSet.has(sourceIdStr)) {
        continue;
      }

      // Verify target project is not archived
      const proj = await Project.findOne({ _id: rel.sourceDocumentId.projectId, isArchived: false });
      if (!proj) continue;

      visitedSet.add(sourceIdStr);
      nextLevelDocIds.push(sourceIdStr);

      if (!impactedDocIdsSet.has(sourceIdStr)) {
        impactedDocIdsSet.add(sourceIdStr);
        impactedDocsList.push(rel.sourceDocumentId);
      }

      if (impactedDocsList.length >= MAX_NODES) {
        break;
      }
    }

    currentLevelDocIds = nextLevelDocIds;
  }

  // Fetch full document instances to guarantee proper Mongoose model methods
  const targetDocObjIds = Array.from(impactedDocIdsSet).map((id) => new Types.ObjectId(id));
  const fullImpactedDocs = await Document.find({ _id: { $in: targetDocObjIds }, isDeleted: false });

  // Flag active impact sources on downstream documents
  for (const downstreamDoc of fullImpactedDocs) {
    const existingImpacts =
      downstreamDoc.impactVerification?.activeImpactSources || [];

    const existingIndex = existingImpacts.findIndex(
      (s) =>
        s.upstreamDocumentId.toString() === upstreamDoc._id.toString() &&
        s.changeType === changeType,
    );

    let isDuplicateAlert = false;

    if (existingIndex >= 0) {
      // Impact already active: update timestamp & version but suppress duplicate notification & webhook
      existingImpacts[existingIndex]!.flaggedAt = new Date();
      existingImpacts[existingIndex]!.upstreamVersionNumber = upstreamVersionNumber;
      isDuplicateAlert = true;
    } else {
      // New active impact source
      existingImpacts.push({
        upstreamDocumentId: upstreamDoc._id,
        upstreamVersionNumber,
        changeType,
        flaggedAt: new Date(),
      });
    }

    downstreamDoc.impactVerification = {
      needsVerification: true,
      activeImpactSources: existingImpacts,
      lastVerifiedAt: downstreamDoc.impactVerification?.lastVerifiedAt || null,
      lastVerifiedBy: downstreamDoc.impactVerification?.lastVerifiedBy || null,
      resolutionNote: downstreamDoc.impactVerification?.resolutionNote || null,
    };

    // Auto-mark STALE if downstream project governance allows
    if (downstreamDoc.projectId) {
      const proj = await Project.findById(downstreamDoc.projectId);
      if (proj && proj.governanceSettings?.isGovernanceEnabled && proj.governanceSettings?.autoMarkStaleOnUpstreamChange) {
        if (downstreamDoc.status === 'APPROVED') {
          downstreamDoc.status = 'STALE';
        }
      }
    }

    await downstreamDoc.save();

    // Auto-dispatch Phase 11 VerificationPlan and Phase 13 WorkRequest for downstream project
    if (downstreamDoc.projectId) {
      try {
        await createVerificationPlanInternal(
          downstreamDoc.projectId,
          upstreamDoc._id,
          `v${upstreamVersionNumber}`,
          upstreamDoc.ownerId,
        );
      } catch {
        // Idempotent or safe non-blocking handling
      }

      try {
        await createWorkRequestInternal({
          projectId: downstreamDoc.projectId,
          documentId: downstreamDoc._id,
          title: `Remediate upstream contract change in ${upstreamDoc.title}`,
          reason: `Upstream document ${upstreamDoc.title} (v${upstreamVersionNumber}) underwent ${changeType}. Technical verification required.`,
          source: 'CHANGE_IMPACT',
          createdByUserId: upstreamDoc.ownerId,
          targetVersionNumber: downstreamDoc.version,
          originatingContext: {
            impactSourceDocumentId: upstreamDoc._id,
            upstreamVersionNumber,
            changeType,
          },
        });
      } catch {
        // Idempotent or safe non-blocking handling
      }
    }

    // System audit event
    await createDocumentAudit(
      downstreamDoc._id.toString(),
      upstreamDoc.ownerId.toString(),
      'DOCUMENT_IMPACT_FLAGGED',
      {
        upstreamDocumentId: upstreamDoc._id.toString(),
        upstreamDocumentTitle: upstreamDoc.title,
        changeType,
        triggerSource: 'AUTOMATED_GOVERNANCE',
      },
    );

    // Dispatch non-blocking notification and webhook ONLY if not a duplicate active alert
    if (!isDuplicateAlert) {
      const downstreamOwnerId = downstreamDoc.ownerId;
      const downstreamId = downstreamDoc._id;
      const actorId = upstreamDoc.ownerId;

      await safeNotify(async () => {
        await createNotificationInternal({
          recipientUserId: downstreamOwnerId,
          documentId: downstreamId,
          type: 'UPSTREAM_DOCUMENT_CHANGED',
          actorUserId: actorId,
        });
      });

      if (downstreamDoc.projectId) {
        const userDoc = await mongoose.model('User').findById(actorId).select('name email');
        await safeDispatchWebhook(async () => {
          await dispatchWebhookEvent({
            projectId: downstreamDoc.projectId!,
            eventType: 'UPSTREAM_DOCUMENT_CHANGED',
            document: { id: downstreamDoc._id.toString(), title: downstreamDoc.title },
            actor: userDoc ? { id: userDoc._id.toString(), name: userDoc.name, email: userDoc.email } : null,
            data: {
              upstreamDocumentId: upstreamDoc._id.toString(),
              upstreamDocumentTitle: upstreamDoc.title,
              changeType,
            },
          });
        });
      }
    }
  }

  return { impactedCount: fullImpactedDocs.length };
}
