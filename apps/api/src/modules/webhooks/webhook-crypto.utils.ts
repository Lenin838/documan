import crypto from 'node:crypto';

const ALGORITHM = 'aes-256-gcm';

function getEncryptionKey(): Buffer {
  const secret = process.env.JWT_SECRET || 'default-documan-dev-secret-key-32b';
  return crypto.createHash('sha256').update(secret).digest();
}

export function generateWebhookSecret(): string {
  return `doc_whsec_${crypto.randomBytes(24).toString('hex')}`;
}

export function maskWebhookSecret(secret: string): string {
  if (secret.length <= 16) return 'doc_whsec_****';
  return `${secret.slice(0, 12)}...${secret.slice(-4)}`;
}

export function encryptSecret(plaintext: string): string {
  const iv = crypto.randomBytes(12);
  const key = getEncryptionKey();
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  let encrypted = cipher.update(plaintext, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag().toString('hex');

  return `${iv.toString('hex')}:${authTag}:${encrypted}`;
}

export function decryptSecret(encryptedCombined: string): string {
  const parts = encryptedCombined.split(':');
  if (parts.length !== 3) {
    throw new Error('Invalid encrypted secret format');
  }
  const [ivHex, authTagHex, encryptedText] = parts;
  const key = getEncryptionKey();
  const iv = Buffer.from(ivHex!, 'hex');
  const authTag = Buffer.from(authTagHex!, 'hex');
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(encryptedText!, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

export function computeHmacSignature(secret: string, timestamp: number, body: string): string {
  const canonicalString = `t.${timestamp}.b.${body}`;
  const hmac = crypto.createHmac('sha256', secret).update(canonicalString, 'utf8').digest('hex');
  return `t=${timestamp},v1=${hmac}`;
}

export function verifyHmacSignature(
  secret: string,
  timestamp: number,
  body: string,
  expectedSignatureHeader: string,
): boolean {
  const computed = computeHmacSignature(secret, timestamp, body);
  try {
    return crypto.timingSafeEqual(Buffer.from(computed), Buffer.from(expectedSignatureHeader));
  } catch {
    return false;
  }
}
