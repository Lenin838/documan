import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Types } from 'mongoose';

import { WebhookDelivery } from './webhook-delivery.model.js';
import { Webhook } from './webhook.model.js';
import { processSingleDeliveryAttempt } from './webhook-delivery.service.js';

vi.mock('./ssrf-agent.js', () => ({
  validateWebhookUrl: vi.fn().mockResolvedValue('93.184.216.34'),
  createSsrfSafeHttpsAgent: vi.fn().mockReturnValue({}),
}));

vi.mock('./webhook-crypto.utils.js', () => ({
  decryptSecret: vi.fn().mockReturnValue('doc_whsec_testsecret'),
  computeHmacSignature: vi.fn().mockReturnValue('t=123,v1=abc'),
}));

describe('Webhook Delivery Engine & Circuit Breaker', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should mark delivery as FAILED if webhook is disabled or deleted', async () => {
    const deliveryId = new Types.ObjectId();
    const webhookId = new Types.ObjectId();
    const projectId = new Types.ObjectId();

    const mockSave = vi.fn().mockResolvedValue(true);
    vi.spyOn(WebhookDelivery, 'findOneAndUpdate').mockResolvedValue({
      _id: deliveryId,
      webhookId,
      projectId,
      eventId: 'evt_1',
      eventType: 'REVIEW_REQUESTED',
      attemptNumber: 1,
      status: 'DELIVERING',
      save: mockSave,
    } as unknown as InstanceType<typeof WebhookDelivery>);

    vi.spyOn(Webhook, 'findById').mockResolvedValue(null);

    await processSingleDeliveryAttempt(deliveryId.toString(), {
      eventId: 'evt_1',
      eventType: 'REVIEW_REQUESTED',
      timestamp: new Date().toISOString(),
      projectId: projectId.toString(),
    });

    expect(mockSave).toHaveBeenCalled();
  });
});
