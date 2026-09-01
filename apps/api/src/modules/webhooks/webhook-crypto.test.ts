import { describe, it, expect } from 'vitest';
import {
  generateWebhookSecret,
  maskWebhookSecret,
  encryptSecret,
  decryptSecret,
  computeHmacSignature,
  verifyHmacSignature,
} from './webhook-crypto.utils.js';

describe('Webhook Crypto & Signing Utilities', () => {
  it('should generate a secret with doc_whsec_ prefix', () => {
    const secret = generateWebhookSecret();
    expect(secret.startsWith('doc_whsec_')).toBe(true);
    expect(secret.length).toBeGreaterThan(30);
  });

  it('should mask secrets without exposing full string', () => {
    const secret = 'doc_whsec_1234567890abcdef1234567890abcdef';
    const masked = maskWebhookSecret(secret);
    expect(masked.startsWith('doc_whsec_')).toBe(true);
    expect(masked.endsWith('cdef')).toBe(true);
    expect(masked).toContain('...');
    expect(masked).not.toBe(secret);
  });

  it('should encrypt and decrypt secret using AES-256-GCM', () => {
    const plaintext = generateWebhookSecret();
    const encrypted = encryptSecret(plaintext);

    expect(encrypted).not.toBe(plaintext);
    expect(encrypted.split(':').length).toBe(3);

    const decrypted = decryptSecret(encrypted);
    expect(decrypted).toBe(plaintext);
  });

  it('should compute and verify HMAC-SHA256 signatures', () => {
    const secret = 'doc_whsec_testsecret12345';
    const timestamp = 1788253800;
    const body = JSON.stringify({ eventId: 'evt_123', eventType: 'REVIEW_REQUESTED' });

    const signature = computeHmacSignature(secret, timestamp, body);
    expect(signature.startsWith(`t=${timestamp},v1=`)).toBe(true);

    const isValid = verifyHmacSignature(secret, timestamp, body, signature);
    expect(isValid).toBe(true);

    const isInvalid = verifyHmacSignature(secret, timestamp, body, 't=1788253800,v1=tampered');
    expect(isInvalid).toBe(false);
  });
});
