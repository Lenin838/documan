import { beforeEach, describe, expect, it, vi } from 'vitest';

describe('env configuration', () => {
  beforeEach(() => {
    vi.resetModules();

    process.env = {
      ...process.env,
      NODE_ENV: 'test',
      MONGO_URI: 'mongodb://localhost:27017/documan',
      JWT_SECRET:
        'abcdefghijklmnopqrstuvwxyz123456',
    };

    delete process.env.PORT;
    delete process.env.CORS_ORIGIN;
    delete process.env.LOG_LEVEL;
    delete process.env.JWT_EXPIRES_IN;
    delete process.env.REFRESH_TOKEN_EXPIRES_IN_DAYS;
  });

  it('should load required environment variables', async () => {
    const { env } = await import('./env.js');

    expect(env.NODE_ENV).toBe('test');
    expect(env.MONGO_URI).toBe(
      'mongodb://localhost:27017/documan',
    );
    expect(env.JWT_SECRET).toBe(
      'abcdefghijklmnopqrstuvwxyz123456',
    );
  });

  it('should use default values', async () => {
    const { env } = await import('./env.js');

    expect(env.PORT).toBe(4000);
    expect(env.CORS_ORIGIN).toBe(
      'http://localhost:5173',
    );
    expect(env.LOG_LEVEL).toBe('info');
    expect(env.JWT_EXPIRES_IN).toBe('15m');
    expect(env.REFRESH_TOKEN_EXPIRES_IN_DAYS).toBe(7);
  });

  it('should coerce PORT to a number', async () => {
    process.env.PORT = '5000';

    const { env } = await import('./env.js');

    expect(env.PORT).toBe(5000);
    expect(typeof env.PORT).toBe('number');
  });

  it('should coerce REFRESH_TOKEN_EXPIRES_IN_DAYS to a number', async () => {
    process.env.REFRESH_TOKEN_EXPIRES_IN_DAYS = '30';

    const { env } = await import('./env.js');

    expect(env.REFRESH_TOKEN_EXPIRES_IN_DAYS).toBe(30);
    expect(
      typeof env.REFRESH_TOKEN_EXPIRES_IN_DAYS,
    ).toBe('number');
  });

  it('should accept valid NODE_ENV values', async () => {
    for (const nodeEnv of [
      'development',
      'test',
      'production',
    ]) {
      vi.resetModules();

      process.env.NODE_ENV = nodeEnv;

      const { env } = await import('./env.js');

      expect(env.NODE_ENV).toBe(nodeEnv);
    }
  });

  it('should accept valid LOG_LEVEL values', async () => {
    for (const logLevel of [
      'fatal',
      'error',
      'warn',
      'info',
      'debug',
      'trace',
      'silent',
    ]) {
      vi.resetModules();

      process.env.LOG_LEVEL = logLevel;

      const { env } = await import('./env.js');

      expect(env.LOG_LEVEL).toBe(logLevel);
    }
  });

  it('should use a custom CORS origin', async () => {
    process.env.CORS_ORIGIN = 'https://example.com';

    const { env } = await import('./env.js');

    expect(env.CORS_ORIGIN).toBe(
      'https://example.com',
    );
  });

  it('should use a custom JWT expiration value', async () => {
    process.env.JWT_EXPIRES_IN = '1h';

    const { env } = await import('./env.js');

    expect(env.JWT_EXPIRES_IN).toBe('1h');
  });

  it('should reject an invalid CORS origin', async () => {
    process.env.CORS_ORIGIN = 'not-a-url';

    await expect(import('./env.js')).rejects.toThrow();
  });

  it('should reject an invalid NODE_ENV', async () => {
    process.env.NODE_ENV = 'invalid';

    await expect(import('./env.js')).rejects.toThrow();
  });

  it('should reject an invalid LOG_LEVEL', async () => {
    process.env.LOG_LEVEL = 'invalid';

    await expect(import('./env.js')).rejects.toThrow();
  });

  it('should reject a missing MONGO_URI', async () => {
    delete process.env.MONGO_URI;

    await expect(import('./env.js')).rejects.toThrow();
  });

  it('should reject a short JWT_SECRET', async () => {
    process.env.JWT_SECRET = 'short-secret';

    await expect(import('./env.js')).rejects.toThrow();
  });

  it('should reject a non-positive PORT', async () => {
    process.env.PORT = '0';

    await expect(import('./env.js')).rejects.toThrow();
  });

  it('should reject a non-positive refresh token expiration', async () => {
    process.env.REFRESH_TOKEN_EXPIRES_IN_DAYS = '0';

    await expect(import('./env.js')).rejects.toThrow();
  });
});