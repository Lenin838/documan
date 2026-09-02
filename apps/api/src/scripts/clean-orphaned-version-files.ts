import fs from 'node:fs';
import path from 'node:path';
import mongoose from 'mongoose';
import { DocumentVersion } from '../modules/documents/document-version.model.js';
import { connectDatabase } from '../config/database.js';

export async function cleanOrphanedVersionFiles() {
  console.log('Starting Phase 7.4 Orphaned Version File Cleanup...');

  await connectDatabase();

  const versionsDir = path.resolve(process.cwd(), 'uploads', 'documents', 'versions');

  if (!fs.existsSync(versionsDir)) {
    console.log('Versions directory does not exist. Nothing to clean.');
    await mongoose.disconnect();
    return;
  }

  const files = await fs.promises.readdir(versionsDir);
  const now = Date.now();
  const maxAgeMs = 24 * 60 * 60 * 1000; // 24 hours

  let cleanedCount = 0;

  for (const file of files) {
    const filePath = path.join(versionsDir, file);
    const stat = await fs.promises.stat(filePath);

    if (now - stat.mtimeMs < maxAgeMs) {
      continue; // Skip files created/modified in the last 24h
    }

    const versionDoc = await DocumentVersion.findOne({ filePath });
    if (!versionDoc) {
      console.log(`Removing orphaned version file: ${file}`);
      await fs.promises.unlink(filePath).catch(() => {});
      cleanedCount++;
    }
  }

  console.log(`✅ Orphan cleanup completed. Cleaned ${cleanedCount} orphaned files.`);
  await mongoose.disconnect();
}

if (process.argv[1]?.endsWith('clean-orphaned-version-files.ts')) {
  cleanOrphanedVersionFiles().catch((err) => {
    console.error('Orphan cleanup failed:', err);
    process.exit(1);
  });
}
