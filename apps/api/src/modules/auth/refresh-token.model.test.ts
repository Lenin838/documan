import { Types } from 'mongoose';
import { describe, expect, it } from 'vitest';

import { RefreshToken } from './refresh-token.model.js';

describe('RefreshToken model', () => {
  it('should have the correct model name', () => {
    expect(RefreshToken.modelName).toBe('RefreshToken');
  });

  it('should define the expected schema paths', () => {
    const paths = RefreshToken.schema.paths;

    expect(paths).toHaveProperty('userId');
    expect(paths).toHaveProperty('tokenHash');
    expect(paths).toHaveProperty('familyId');
    expect(paths).toHaveProperty('expiresAt');
    expect(paths).toHaveProperty('revokedAt');
    expect(paths).toHaveProperty('createdAt');
    expect(paths).toHaveProperty('updatedAt');
  });

  it('should require userId', () => {
    const path = RefreshToken.schema.path('userId');

    expect(path.isRequired).toBe(true);
  });

  it('should configure userId as an ObjectId referencing User', () => {
    const path = RefreshToken.schema.path('userId');

    expect(path.instance).toBe('ObjectId');
    expect(path.options.ref).toBe('User');
  });

  it('should index userId', () => {
    const path = RefreshToken.schema.path('userId');

    expect(path.options.index).toBe(true);
  });

  it('should require tokenHash', () => {
    const path = RefreshToken.schema.path('tokenHash');

    expect(path.isRequired).toBe(true);
  });

  it('should make tokenHash unique', () => {
    const path = RefreshToken.schema.path('tokenHash');

    expect(path.options.unique).toBe(true);
  });

  it('should require familyId', () => {
    const path = RefreshToken.schema.path('familyId');

    expect(path.isRequired).toBe(true);
  });

  it('should index familyId', () => {
    const path = RefreshToken.schema.path('familyId');

    expect(path.options.index).toBe(true);
  });

  it('should require expiresAt', () => {
    const path = RefreshToken.schema.path('expiresAt');

    expect(path.isRequired).toBe(true);
  });

  it('should define expiresAt as a Date', () => {
    const path = RefreshToken.schema.path('expiresAt');

    expect(path.instance).toBe('Date');
  });

  it('should index expiresAt', () => {
    const path = RefreshToken.schema.path('expiresAt');

    expect(path.options.index).toBe(true);
  });

  it('should default revokedAt to null', () => {
    const token = new RefreshToken({
      userId: new Types.ObjectId(),
      tokenHash: 'hash',
      familyId: 'family-1',
      expiresAt: new Date(),
    });

    expect(token.revokedAt).toBeNull();
  });

  it('should allow revokedAt to contain a Date', () => {
    const revokedAt = new Date();

    const token = new RefreshToken({
      userId: new Types.ObjectId(),
      tokenHash: 'hash',
      familyId: 'family-1',
      expiresAt: new Date(),
      revokedAt,
    });

    expect(token.revokedAt).toEqual(revokedAt);
  });

  it('should enable timestamps', () => {
    expect(RefreshToken.schema.options.timestamps).toBe(true);
  });

  it('should define createdAt and updatedAt paths', () => {
    expect(
      RefreshToken.schema.path('createdAt'),
    ).toBeDefined();

    expect(
      RefreshToken.schema.path('updatedAt'),
    ).toBeDefined();
  });

  it('should validate when all required fields are provided', async () => {
    const token = new RefreshToken({
      userId: new Types.ObjectId(),
      tokenHash: 'hash',
      familyId: 'family-1',
      expiresAt: new Date(),
    });

    await expect(token.validate()).resolves.toBeUndefined();
  });

  it('should fail validation when userId is missing', async () => {
    const token = new RefreshToken({
      tokenHash: 'hash',
      familyId: 'family-1',
      expiresAt: new Date(),
    });

    await expect(token.validate()).rejects.toThrow();
  });

  it('should fail validation when tokenHash is missing', async () => {
    const token = new RefreshToken({
      userId: new Types.ObjectId(),
      familyId: 'family-1',
      expiresAt: new Date(),
    });

    await expect(token.validate()).rejects.toThrow();
  });

  it('should fail validation when familyId is missing', async () => {
    const token = new RefreshToken({
      userId: new Types.ObjectId(),
      tokenHash: 'hash',
      expiresAt: new Date(),
    });

    await expect(token.validate()).rejects.toThrow();
  });

  it('should fail validation when expiresAt is missing', async () => {
    const token = new RefreshToken({
      userId: new Types.ObjectId(),
      tokenHash: 'hash',
      familyId: 'family-1',
    });

    await expect(token.validate()).rejects.toThrow();
  });
});