import { Schema, model, Types } from 'mongoose';

export type DeliveryStatus = 'PENDING' | 'DELIVERING' | 'SUCCESS' | 'FAILED';

export interface WebhookDeliveryDocument {
  webhookId: Types.ObjectId;
  projectId: Types.ObjectId;
  eventId: string;
  eventType: string;
  attemptNumber: number;
  status: DeliveryStatus;
  httpStatus?: number;
  requestDurationMs?: number;
  errorMessage?: string;
  nextAttemptAt?: Date;
  attemptedAt?: Date;
  createdAt: Date;
}

const webhookDeliverySchema = new Schema<WebhookDeliveryDocument>(
  {
    webhookId: {
      type: Schema.Types.ObjectId,
      ref: 'Webhook',
      required: true,
      index: true,
    },
    projectId: {
      type: Schema.Types.ObjectId,
      ref: 'Project',
      required: true,
      index: true,
    },
    eventId: {
      type: String,
      required: true,
      index: true,
    },
    eventType: {
      type: String,
      required: true,
    },
    attemptNumber: {
      type: Number,
      default: 1,
    },
    status: {
      type: String,
      enum: ['PENDING', 'DELIVERING', 'SUCCESS', 'FAILED'],
      default: 'PENDING',
      index: true,
    },
    httpStatus: {
      type: Number,
    },
    requestDurationMs: {
      type: Number,
    },
    errorMessage: {
      type: String,
    },
    nextAttemptAt: {
      type: Date,
      index: true,
    },
    attemptedAt: {
      type: Date,
    },
  },
  {
    timestamps: {
      createdAt: true,
      updatedAt: false,
    },
  },
);

webhookDeliverySchema.index({ webhookId: 1, createdAt: -1 });
webhookDeliverySchema.index({ status: 1, nextAttemptAt: 1 });
// 14-day TTL auto-cleanup index (14 days = 1209600 seconds)
webhookDeliverySchema.index({ createdAt: 1 }, { expireAfterSeconds: 1209600 });

export const WebhookDelivery = model<WebhookDeliveryDocument>('WebhookDelivery', webhookDeliverySchema);
