import mongoose, { Types } from 'mongoose';

import { Project } from '../projects/project.model.js';
import { Document } from '../documents/document.model.js';
import { DocumentEndpointLink } from './document-endpoint-link.model.js';
import { createDocumentAudit } from '../documents/document-audit.service.js';
import { createNotificationInternal, safeNotify } from '../notifications/notification.service.js';
import { dispatchWebhookEvent, safeDispatchWebhook } from '../webhooks/webhook-delivery.service.js';

export interface NewlyOrphanedLinkInfo {
  linkId: Types.ObjectId | string;
  documentId: Types.ObjectId | string;
  endpointId: Types.ObjectId | string;
}

export interface NewlyDeprecatedEndpointInfo {
  endpointId: Types.ObjectId | string;
  method: string;
  path: string;
}

export interface ApiDriftTransitionDelta {
  projectId: Types.ObjectId | string;
  newlyOrphanedLinks: NewlyOrphanedLinkInfo[];
  newlyDeprecatedEndpoints: NewlyDeprecatedEndpointInfo[];
}

export async function processApiEndpointDrift(delta: ApiDriftTransitionDelta): Promise<void> {
  const { projectId, newlyOrphanedLinks, newlyDeprecatedEndpoints } = delta;
  if (!projectId) return;

  // Skip execution when Mongoose is unconnected (e.g. unit tests without live DB)
  if (mongoose.connection.readyState === 0) {
    return;
  }

  const projObjId = new Types.ObjectId(projectId.toString());
  const project = await Project.findOne({ _id: projObjId, isArchived: false });
  if (!project) return;

  const isGovernanceEnabled = project.governanceSettings?.isGovernanceEnabled ?? true;
  const autoMarkStale = project.governanceSettings?.autoMarkStaleOnUpstreamChange ?? true;

  // Track processed document IDs per reconciliation run to avoid duplicate side effects
  const processedOrphanedDocIds = new Set<string>();

  // 1. Process newly ORPHANED links (LINKED -> ORPHANED transitions)
  for (const orphanInfo of newlyOrphanedLinks) {
    const docObjId = new Types.ObjectId(orphanInfo.documentId.toString());
    const docStrId = docObjId.toString();

    if (processedOrphanedDocIds.has(docStrId)) continue;
    processedOrphanedDocIds.add(docStrId);

    const doc = await Document.findOne({ _id: docObjId, isDeleted: false });
    if (!doc) continue;

    // Check project isolation
    if (!doc.projectId || doc.projectId.toString() !== projObjId.toString()) continue;

    // Evaluate governance staleness transition for APPROVED documents
    if (isGovernanceEnabled && autoMarkStale && doc.status === 'APPROVED') {
      doc.status = 'STALE';
      await doc.save();

      const reason = 'Linked API endpoint removed in specification re-import';

      // Audit trail
      await createDocumentAudit(doc._id.toString(), doc.ownerId.toString(), 'STATUS_CHANGE', {
        previousStatus: 'APPROVED',
        newStatus: 'STALE',
        transitionType: 'AUTOMATIC',
        triggerSource: 'AUTOMATED_GOVERNANCE',
        reason,
      }).catch(() => {
        // Ignore audit errors
      });

      // In-App Notification to Document Owner
      await safeNotify(async () => {
        await createNotificationInternal({
          recipientUserId: doc.ownerId,
          documentId: doc._id,
          type: 'UPSTREAM_STALE',
        });
      });

      // Outbound Webhook Dispatch
      await safeDispatchWebhook(async () => {
        await dispatchWebhookEvent({
          projectId: projObjId,
          eventType: 'UPSTREAM_STALE',
          document: { id: doc._id.toString(), title: doc.title },
          actor: null,
          data: { status: 'STALE', reason },
        });
      });
    }
  }

  // Track processed document IDs for deprecated endpoint notifications
  const processedDeprecatedDocIds = new Set<string>();

  // 2. Process newly DEPRECATED endpoints (isDeprecated false -> true transitions)
  for (const depInfo of newlyDeprecatedEndpoints) {
    const epObjId = new Types.ObjectId(depInfo.endpointId.toString());

    // Find active links to this endpoint
    const links = await DocumentEndpointLink.find({
      projectId: projObjId,
      endpointId: epObjId,
      status: 'LINKED',
    });

    for (const link of links) {
      const docStrId = link.documentId.toString();
      if (processedDeprecatedDocIds.has(docStrId)) continue;
      processedDeprecatedDocIds.add(docStrId);

      const doc = await Document.findOne({ _id: link.documentId, isDeleted: false });
      if (!doc) continue;

      // Document lifecycle status remains UNCHANGED (APPROVED stays APPROVED)
      const reason = `Linked API endpoint ${depInfo.method} ${depInfo.path} marked as deprecated`;

      // In-App Notification to Document Owner
      await safeNotify(async () => {
        await createNotificationInternal({
          recipientUserId: doc.ownerId,
          documentId: doc._id,
          type: 'UPSTREAM_DEPRECATED',
        });
      });

      // Outbound Webhook Dispatch
      await safeDispatchWebhook(async () => {
        await dispatchWebhookEvent({
          projectId: projObjId,
          eventType: 'UPSTREAM_DEPRECATED',
          document: { id: doc._id.toString(), title: doc.title },
          actor: null,
          data: { status: doc.status, isDeprecated: true, reason },
        });
      });
    }
  }
}
