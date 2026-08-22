import { describe, expect, it } from 'vitest';

import { loginSchema } from './auth.schema.js';

describe('loginSchema', () => {
  it('should accept valid login credentials', () => {
    const result = loginSchema.safeParse({
      email: 'user@example.com',
      password: 'password123',
    });

    expect(result.success).toBe(true);

    if (result.success) {
      expect(result.data).toEqual({
        email: 'user@example.com',
        password: 'password123',
      });
    }
  });

  it('should trim the email', () => {
    const result = loginSchema.safeParse({
      email: '  user@example.com  ',
      password: 'password123',
    });

    expect(result.success).toBe(true);

    if (result.success) {
      expect(result.data.email).toBe(
        'user@example.com',
      );
    }
  });

  it('should reject an invalid email', () => {
    const result = loginSchema.safeParse({
      email: 'invalid-email',
      password: 'password123',
    });

    expect(result.success).toBe(false);

    if (!result.success) {
      expect(result.error.issues).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            path: ['email'],
            message: 'Invalid email address',
          }),
        ]),
      );
    }
  });

  it('should reject a password shorter than 8 characters', () => {
    const result = loginSchema.safeParse({
      email: 'user@example.com',
      password: 'short',
    });

    expect(result.success).toBe(false);

    if (!result.success) {
      expect(result.error.issues).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            path: ['password'],
            message:
              'Password must be at least 8 characters',
          }),
        ]),
      );
    }
  });

  it('should reject a missing email', () => {
    const result = loginSchema.safeParse({
      password: 'password123',
    });

    expect(result.success).toBe(false);

    if (!result.success) {
      expect(result.error.issues).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            path: ['email'],
          }),
        ]),
      );
    }
  });

  it('should reject a missing password', () => {
    const result = loginSchema.safeParse({
      email: 'user@example.com',
    });

    expect(result.success).toBe(false);

    if (!result.success) {
      expect(result.error.issues).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            path: ['password'],
          }),
        ]),
      );
    }
  });

  it('should reject a non-string email', () => {
    const result = loginSchema.safeParse({
      email: 12345,
      password: 'password123',
    });

    expect(result.success).toBe(false);
  });

  it('should reject a non-string password', () => {
    const result = loginSchema.safeParse({
      email: 'user@example.com',
      password: 12345678,
    });

    expect(result.success).toBe(false);
  });

  it('should reject an empty email', () => {
    const result = loginSchema.safeParse({
      email: '',
      password: 'password123',
    });

    expect(result.success).toBe(false);
  });

  it('should reject an empty password', () => {
    const result = loginSchema.safeParse({
      email: 'user@example.com',
      password: '',
    });

    expect(result.success).toBe(false);
  });

  it('should accept a password with exactly 8 characters', () => {
    const result = loginSchema.safeParse({
      email: 'user@example.com',
      password: '12345678',
    });

    expect(result.success).toBe(true);
  });
});