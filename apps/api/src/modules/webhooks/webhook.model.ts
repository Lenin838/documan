import { Schema, model, Types } from 'mongoose';

export interface WebhookDocument {
  projectId: Types.ObjectId;
  url: string;
  description?: string;
  secretEncrypted: string;
  previousSecretEncrypted?: string;
  previousSecretExpiresAt?: Date;
  events: string[];
  isEnabled: boolean;
  consecutiveFailures: number;
  createdBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const webhookSchema = new Schema<WebhookDocument>(
  {
    projectId: {
      type: Schema.Types.ObjectId,
      ref: 'Project',
      required: true,
      index: true,
    },
    url: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    secretEncrypted: {
      type: String,
      required: true,
    },
    previousSecretEncrypted: {
      type: String,
    },
    previousSecretExpiresAt: {
      type: Date,
    },
    events: {
      type: [String],
      default: ['*'],
    },
    isEnabled: {
      type: Boolean,
      default: true,
      index: true,
    },
    consecutiveFailures: {
      type: Number,
      default: 0,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  {
    timestamps: true,
  },
);

webhookSchema.index({ projectId: 1, isEnabled: 1 });
webhookSchema.index({ projectId: 1, createdAt: -1 });

export const Webhook = model<WebhookDocument>('Webhook', webhookSchema);
