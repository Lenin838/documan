import { describe, it, expect } from 'vitest';
import { isPrivateOrRestrictedIp, validateWebhookUrl } from './ssrf-agent.js';

describe('SSRF Protection Agent & IP Validation', () => {
  describe('isPrivateOrRestrictedIp', () => {
    it('should reject loopback addresses', () => {
      expect(isPrivateOrRestrictedIp('127.0.0.1')).toBe(true);
      expect(isPrivateOrRestrictedIp('127.0.0.254')).toBe(true);
      expect(isPrivateOrRestrictedIp('::1')).toBe(true);
      expect(isPrivateOrRestrictedIp('0:0:0:0:0:0:0:1')).toBe(true);
    });

    it('should reject RFC 1918 private IPv4 ranges', () => {
      expect(isPrivateOrRestrictedIp('10.0.0.1')).toBe(true);
      expect(isPrivateOrRestrictedIp('10.255.255.255')).toBe(true);
      expect(isPrivateOrRestrictedIp('172.16.0.1')).toBe(true);
      expect(isPrivateOrRestrictedIp('172.31.255.255')).toBe(true);
      expect(isPrivateOrRestrictedIp('192.168.1.1')).toBe(true);
    });

    it('should reject link-local and cloud metadata addresses', () => {
      expect(isPrivateOrRestrictedIp('169.254.169.254')).toBe(true);
      expect(isPrivateOrRestrictedIp('169.254.0.1')).toBe(true);
      expect(isPrivateOrRestrictedIp('fe80::1')).toBe(true);
    });

    it('should reject CGNAT and reserved ranges', () => {
      expect(isPrivateOrRestrictedIp('100.64.0.1')).toBe(true);
      expect(isPrivateOrRestrictedIp('0.0.0.0')).toBe(true);
      expect(isPrivateOrRestrictedIp('224.0.0.1')).toBe(true);
    });

    it('should accept valid public IPv4 addresses', () => {
      expect(isPrivateOrRestrictedIp('8.8.8.8')).toBe(false);
      expect(isPrivateOrRestrictedIp('1.1.1.1')).toBe(false);
      expect(isPrivateOrRestrictedIp('203.0.113.1')).toBe(false);
    });
  });

  describe('validateWebhookUrl', () => {
    it('should reject non-HTTPS URLs', async () => {
      await expect(validateWebhookUrl('http://example.com/webhook')).rejects.toThrow(
        'Webhook URL must use HTTPS protocol',
      );
    });

    it('should reject HTTP localhost URLs', async () => {
      await expect(validateWebhookUrl('http://localhost:8080/wh')).rejects.toThrow();
    });

    it('should reject HTTPS direct IP loopback URLs', async () => {
      await expect(validateWebhookUrl('https://127.0.0.1/wh')).rejects.toThrow(
        'SSRF Blocked',
      );
    });

    it('should reject HTTPS direct IP cloud metadata URLs', async () => {
      await expect(validateWebhookUrl('https://169.254.169.254/latest/meta-data/')).rejects.toThrow(
        'SSRF Blocked',
      );
    });

    it('should accept valid public HTTPS URLs', async () => {
      const resolved = await validateWebhookUrl('https://dns.google/dns-query');
      expect(resolved).toBeDefined();
    });
  });
});
