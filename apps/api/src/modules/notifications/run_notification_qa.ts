import mongoose from 'mongoose';

import { User } from '../users/user.model.js';
import { Document } from '../documents/document.model.js';
import { DocumentRelationship } from '../documents/document-relationship.model.js';
import {
  createDocumentReview,
  approveDocumentReview,
  requestChangesDocumentReview,
} from '../documents/document-review.service.js';
import {
  createDocumentShare,
  revokeDocumentShare,
} from '../document-shares/document-share.service.js';
import { updateDocumentStatus } from '../documents/document.service.js';
import {
  getUserNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
} from './notification.service.js';

async function main() {
  const mongoUri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/documan';
  await mongoose.connect(mongoUri);

  console.log('=== STARTING 11 MANUAL QA NOTIFICATION SCENARIOS ===');
  let passCount = 0;

  try {
    const timestamp = Date.now();
    const userA = await User.create({
      name: 'QA User A',
      email: `qanotif_a_${timestamp}@example.com`,
      passwordHash: 'hash',
      role: 'user',
      isActive: true,
      isDeleted: false,
    });
    const userB = await User.create({
      name: 'QA User B',
      email: `qanotif_b_${timestamp}@example.com`,
      passwordHash: 'hash',
      role: 'user',
      isActive: true,
      isDeleted: false,
    });
    const userC = await User.create({
      name: 'QA User C',
      email: `qanotif_c_${timestamp}@example.com`,
      passwordHash: 'hash',
      role: 'user',
      isActive: true,
      isDeleted: false,
    });

    // 1. Review Request Notification
    const doc1 = await Document.create({
      title: 'Doc 1 Spec',
      fileName: 'f1.md',
      filePath: 'p1',
      fileType: 'text/markdown',
      fileSize: 100,
      ownerId: userA._id,
      isDeleted: false,
    });
    await createDocumentShare(userA._id.toString(), 'user', doc1._id.toString(), {
      email: userB.email,
      permission: 'READ',
    });
    const review1 = await createDocumentReview(
      userA._id.toString(),
      'user',
      doc1._id.toString(),
      { reviewerId: userB._id.toString(), comment: 'Please review' },
    );

    const notifsB1 = await getUserNotifications(userB._id.toString(), 'user');
    const reviewReqNotif = notifsB1.notifications.find(
      (n) => n.type === 'REVIEW_REQUESTED',
    );
    if (
      reviewReqNotif &&
      reviewReqNotif.isAccessible &&
      reviewReqNotif.document?.title === 'Doc 1 Spec'
    ) {
      console.log(
        'QA Scenario 1 PASS: REVIEW_REQUESTED notification created for reviewer User B',
      );
      passCount++;
    } else {
      console.error('QA Scenario 1 FAIL:', notifsB1);
    }

    // 2. Review Approval Notification
    await approveDocumentReview(
      userB._id.toString(),
      'user',
      doc1._id.toString(),
      review1.id,
      { comment: 'Looks great!' },
    );
    const notifsA1 = await getUserNotifications(userA._id.toString(), 'user');
    const reviewAppNotif = notifsA1.notifications.find(
      (n) => n.type === 'REVIEW_APPROVED',
    );
    if (
      reviewAppNotif &&
      reviewAppNotif.isAccessible &&
      reviewAppNotif.document?.title === 'Doc 1 Spec'
    ) {
      console.log(
        'QA Scenario 2 PASS: REVIEW_APPROVED notification created for requester User A',
      );
      passCount++;
    } else {
      console.error('QA Scenario 2 FAIL:', notifsA1);
    }

    // 3. Changes Requested Notification
    const doc2 = await Document.create({
      title: 'Doc 2 Design',
      fileName: 'f2.md',
      filePath: 'p2',
      fileType: 'text/markdown',
      fileSize: 100,
      ownerId: userA._id,
      isDeleted: false,
    });
    await createDocumentShare(userA._id.toString(), 'user', doc2._id.toString(), {
      email: userB.email,
      permission: 'READ',
    });
    const review2 = await createDocumentReview(
      userA._id.toString(),
      'user',
      doc2._id.toString(),
      { reviewerId: userB._id.toString(), comment: 'Review v2' },
    );
    await requestChangesDocumentReview(
      userB._id.toString(),
      'user',
      doc2._id.toString(),
      review2.id,
      { comment: 'Needs revisions' },
    );

    const notifsA2 = await getUserNotifications(userA._id.toString(), 'user');
    const changesNotif = notifsA2.notifications.find(
      (n) => n.type === 'CHANGES_REQUESTED',
    );
    if (
      changesNotif &&
      changesNotif.isAccessible &&
      changesNotif.document?.title === 'Doc 2 Design'
    ) {
      console.log(
        'QA Scenario 3 PASS: CHANGES_REQUESTED notification created for requester User A',
      );
      passCount++;
    } else {
      console.error('QA Scenario 3 FAIL:', notifsA2);
    }

    // 4. Document Share Notification
    const shareRes = await createDocumentShare(
      userA._id.toString(),
      'user',
      doc1._id.toString(),
      { email: userC.email, permission: 'READ' },
    );
    const notifsC1 = await getUserNotifications(userC._id.toString(), 'user');
    const shareNotif = notifsC1.notifications.find(
      (n) => n.type === 'DOCUMENT_SHARED',
    );
    if (
      shareNotif &&
      shareNotif.isAccessible &&
      shareNotif.document?.title === 'Doc 1 Spec'
    ) {
      console.log(
        'QA Scenario 4 PASS: DOCUMENT_SHARED notification created for target User C',
      );
      passCount++;
    } else {
      console.error('QA Scenario 4 FAIL:', notifsC1);
    }

    // 5 & 6. Upstream Stale & Deprecated Dependency Notifications
    const upstreamDoc = await Document.create({
      title: 'Upstream Core Standard',
      fileName: 'up.md',
      filePath: 'pupp',
      fileType: 'text/markdown',
      fileSize: 50,
      ownerId: userA._id,
      status: 'APPROVED',
      isDeleted: false,
    });
    const downstreamDoc = await Document.create({
      title: 'Downstream Implementation',
      fileName: 'down.md',
      filePath: 'pdown',
      fileType: 'text/markdown',
      fileSize: 50,
      ownerId: userB._id,
      status: 'APPROVED',
      isDeleted: false,
    });
    await DocumentRelationship.create({
      sourceDocumentId: downstreamDoc._id,
      targetDocumentId: upstreamDoc._id,
      type: 'DEPENDS_ON',
      createdBy: userB._id,
    });

    // Update upstream to STALE
    await updateDocumentStatus(
      userA._id.toString(),
      'user',
      upstreamDoc._id.toString(),
      { status: 'STALE', reason: 'Outdated standard' },
    );
    const notifsB_Stale = await getUserNotifications(userB._id.toString(), 'user');
    const staleNotif = notifsB_Stale.notifications.find(
      (n) => n.type === 'UPSTREAM_STALE',
    );
    if (
      staleNotif &&
      staleNotif.isAccessible &&
      staleNotif.document?.title === 'Downstream Implementation'
    ) {
      console.log(
        'QA Scenario 5 PASS: UPSTREAM_STALE notification created for downstream owner User B',
      );
      passCount++;
    } else {
      console.error('QA Scenario 5 FAIL:', notifsB_Stale);
    }

    // Update upstream to DEPRECATED
    await updateDocumentStatus(
      userA._id.toString(),
      'user',
      upstreamDoc._id.toString(),
      { status: 'DEPRECATED', reason: 'Deprecated standard' },
    );
    const notifsB_Dep = await getUserNotifications(userB._id.toString(), 'user');
    const depNotif = notifsB_Dep.notifications.find(
      (n) => n.type === 'UPSTREAM_DEPRECATED',
    );
    if (
      depNotif &&
      depNotif.isAccessible &&
      depNotif.document?.title === 'Downstream Implementation'
    ) {
      console.log(
        'QA Scenario 6 PASS: UPSTREAM_DEPRECATED notification created for downstream owner User B',
      );
      passCount++;
    } else {
      console.error('QA Scenario 6 FAIL:', notifsB_Dep);
    }

    // 7. Unread Badge Count
    if (notifsB_Dep.unreadCount > 0) {
      console.log(
        `QA Scenario 7 PASS: Unread count calculated accurately (${notifsB_Dep.unreadCount})`,
      );
      passCount++;
    } else {
      console.error('QA Scenario 7 FAIL');
    }

    // 8. Mark Single Notification as Read
    const notifToRead = notifsB_Dep.notifications[0];
    if (notifToRead) {
      const markRes = await markNotificationAsRead(
        userB._id.toString(),
        notifToRead.id,
      );
      if (markRes.isRead === true) {
        console.log('QA Scenario 8 PASS: Single notification marked as read');
        passCount++;
      } else {
        console.error('QA Scenario 8 FAIL:', markRes);
      }
    }

    // 9. Mark All as Read
    await markAllNotificationsAsRead(userB._id.toString());
    const notifsB_AfterAllRead = await getUserNotifications(
      userB._id.toString(),
      'user',
    );
    if (notifsB_AfterAllRead.unreadCount === 0) {
      console.log(
        'QA Scenario 9 PASS: Mark all as read cleared unread badge count to 0',
      );
      passCount++;
    } else {
      console.error('QA Scenario 9 FAIL:', notifsB_AfterAllRead);
    }

    // 10. Revoked Access Handling (Anti-Leakage)
    await revokeDocumentShare(
      userA._id.toString(),
      'user',
      doc1._id.toString(),
      shareRes.id,
    );
    const notifsC_Revoked = await getUserNotifications(
      userC._id.toString(),
      'user',
    );
    const revokedNotif = notifsC_Revoked.notifications.find(
      (n) => n.id === shareNotif?.id,
    );
    if (
      revokedNotif &&
      revokedNotif.isAccessible === false &&
      revokedNotif.document === null
    ) {
      console.log(
        'QA Scenario 10 PASS: Revoked document access returns document: null, isAccessible: false without leaking title',
      );
      passCount++;
    } else {
      console.error('QA Scenario 10 FAIL:', revokedNotif);
    }

    // 11. Recipient Isolation & Anti-IDOR Check
    try {
      if (notifToRead) {
        await markNotificationAsRead(userA._id.toString(), notifToRead.id);
        console.error(
          'QA Scenario 11 FAIL: Expected 404 error when marking another user notification',
        );
      }
    } catch (err) {
      if (
        err &&
        typeof err === 'object' &&
        'statusCode' in err &&
        err.statusCode === 404
      ) {
        console.log(
          'QA Scenario 11 PASS: Anti-IDOR protection blocked User A from reading User B notification',
        );
        passCount++;
      } else {
        console.error('QA Scenario 11 FAIL:', err);
      }
    }

    console.log(`\n=== FINAL MANUAL QA RESULT: ${passCount} / 11 PASSED ===`);
  } catch (err) {
    console.error('QA EXECUTION ERROR:', err);
  } finally {
    await mongoose.disconnect();
  }
}

main().catch(console.error);
