import mongoose from "mongoose";
import { connectDatabase, disconnectDatabase } from "../config/database.js";
import { logger } from "../config/logger.js";

// Import all models to ensure schemas are registered with Mongoose
import "../modules/users/user.model.js";
import "../modules/documents/document.model.js";
import "../modules/documents/document-version.model.js";
import "../modules/documents/document-audit.model.js";
import "../modules/documents/document-reference.model.js";
import "../modules/documents/document-relationship.model.js";
import "../modules/documents/document-review.model.js";
import "../modules/folders/folder.model.js";
import "../modules/projects/project.model.js";
import "../modules/projects/project-topology.model.js";
import "../modules/notifications/notification.model.js";
import "../modules/webhooks/webhook.model.js";
import "../modules/webhooks/webhook-delivery.model.js";
import "../modules/api-specs/project-api-spec.model.js";
import "../modules/api-specs/project-api-endpoint.model.js";
import "../modules/api-specs/document-endpoint-link.model.js";
import "../modules/governance/documentation-baseline.model.js";
import "../modules/governance/documentation-work-request.model.js";
import "../modules/governance/system-governance-waiver.model.js";
import "../modules/governance/verification-plan.model.js";
import "../modules/governance/verification-task.model.js";
import "../modules/governance/system-release-certificate.model.js";
import "../modules/change-proposals/change-proposal.model.js";
import "../modules/change-packages/change-package.model.js";
import "../modules/change-packages/change-package-attestation.model.js";
import "../modules/auth/refresh-token.model.js";
import "../modules/document-shares/document-share.model.js";

export async function syncDatabaseIndexes(): Promise<void> {
  logger.info("Starting database index synchronization...");
  await connectDatabase();

  const modelNames = mongoose.modelNames();
  logger.info(
    { count: modelNames.length, models: modelNames },
    "Registered Mongoose models",
  );

  for (const modelName of modelNames) {
    try {
      const model = mongoose.model(modelName);
      await model.syncIndexes();
      logger.info(
        { model: modelName },
        "Successfully synchronized indexes for model",
      );
    } catch (err) {
      logger.error(
        { model: modelName, error: err },
        "Failed to synchronize indexes for model",
      );
      throw err;
    }
  }

  logger.info("Database index synchronization completed successfully.");
  await disconnectDatabase();
}

if (
  import.meta.url === `file://${process.argv[1]}` ||
  process.argv[1]?.endsWith("sync-indexes.ts")
) {
  syncDatabaseIndexes()
    .then(() => {
      process.exit(0);
    })
    .catch((err) => {
      logger.error({ error: err }, "Index sync script failed");
      process.exit(1);
    });
}
