import { describe, expect, it } from 'vitest';

import {
  generateRefreshToken,
  hashRefreshToken,
} from './refresh-token.js';

describe('refresh token utilities', () => {
  it('should generate a refresh token', () => {
    const token = generateRefreshToken();

    expect(token).toBeTypeOf('string');
    expect(token.length).toBe(64);
  });

  it('should generate different refresh tokens', () => {
    const tokenA = generateRefreshToken();
    const tokenB = generateRefreshToken();

    expect(tokenA).not.toBe(tokenB);
  });

  it('should hash a refresh token consistently', () => {
    const token = generateRefreshToken();

    const hashA = hashRefreshToken(token);
    const hashB = hashRefreshToken(token);

    expect(hashA).toBe(hashB);
  });

  it('should produce different hashes for different tokens', () => {
    const tokenA = generateRefreshToken();
    const tokenB = generateRefreshToken();

    expect(hashRefreshToken(tokenA)).not.toBe(
      hashRefreshToken(tokenB),
    );
  });
});