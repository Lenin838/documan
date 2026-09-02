import mongoose from 'mongoose';
import { Document } from '../modules/documents/document.model.js';
import { ensureDocumentVersionBaseline } from '../modules/documents/document-version.service.js';
import { connectDatabase } from '../config/database.js';

export async function migrateDocumentVersionBaselines() {
  console.log('Starting Phase 7.4 Document Version Baseline Migration...');

  await connectDatabase();

  const documents = await Document.find({ isDeleted: false });
  console.log(`Found ${documents.length} active documents to check for baseline version snapshots.`);

  let migratedCount = 0;
  for (const doc of documents) {
    if (!doc.version) {
      doc.version = 1;
      await doc.save();
    }

    await ensureDocumentVersionBaseline(doc);
    migratedCount++;
  }

  console.log(`✅ Baseline migration completed successfully for ${migratedCount} documents.`);
  await mongoose.disconnect();
}

if (process.argv[1]?.endsWith('migrate-document-version-baselines.ts')) {
  migrateDocumentVersionBaselines().catch((err) => {
    console.error('Migration failed:', err);
    process.exit(1);
  });
}
