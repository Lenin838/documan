import { describe, expect, it } from 'vitest';

import {
  adminUpdateUserSchema,
  adminUsersQuerySchema,
  changePasswordSchema,
  createUserSchema,
  updateUserSchema,
  updateUserStatusSchema,
  userIdParamsSchema,
} from './user.schema.js';

describe('createUserSchema', () => {
  it('should accept valid user data', () => {
    const result = createUserSchema.safeParse({
      name: 'Lenin Joseph',
      email: 'LENIN@EXAMPLE.COM',
      password: 'password123',
    });

    expect(result.success).toBe(true);

    if (result.success) {
      expect(result.data).toEqual({
        name: 'Lenin Joseph',
        email: 'lenin@example.com',
        password: 'password123',
      });
    }
  });

  it('should trim the name and email', () => {
    const result = createUserSchema.safeParse({
      name: '  Lenin Joseph  ',
      email: '  TEST@EXAMPLE.COM  ',
      password: 'password123',
    });

    expect(result.success).toBe(true);

    if (result.success) {
      expect(result.data.name).toBe('Lenin Joseph');
      expect(result.data.email).toBe('test@example.com');
    }
  });

  it('should reject a name shorter than 2 characters', () => {
    const result = createUserSchema.safeParse({
      name: 'L',
      email: 'test@example.com',
      password: 'password123',
    });

    expect(result.success).toBe(false);

    if (!result.success) {
      expect(result.error.issues[0]?.message).toBe(
        'Name must be at least 2 characters',
      );
    }
  });

  it('should reject an invalid email', () => {
    const result = createUserSchema.safeParse({
      name: 'Lenin',
      email: 'invalid-email',
      password: 'password123',
    });

    expect(result.success).toBe(false);

    if (!result.success) {
      expect(result.error.issues[0]?.message).toBe(
        'Invalid email address',
      );
    }
  });

  it('should reject a password shorter than 8 characters', () => {
    const result = createUserSchema.safeParse({
      name: 'Lenin',
      email: 'test@example.com',
      password: '1234567',
    });

    expect(result.success).toBe(false);

    if (!result.success) {
      expect(result.error.issues[0]?.message).toBe(
        'Password must be at least 8 characters',
      );
    }
  });

  it('should reject a password longer than 100 characters', () => {
    const result = createUserSchema.safeParse({
      name: 'Lenin',
      email: 'test@example.com',
      password: 'a'.repeat(101),
    });

    expect(result.success).toBe(false);
  });
});

describe('updateUserSchema', () => {
  it('should accept a valid name', () => {
    const result = updateUserSchema.safeParse({
      name: 'Updated Name',
    });

    expect(result.success).toBe(true);
  });

  it('should reject an invalid name', () => {
    const result = updateUserSchema.safeParse({
      name: 'A',
    });

    expect(result.success).toBe(false);

    if (!result.success) {
      expect(result.error.issues[0]?.message).toBe(
        'Name must be at least 2 characters',
      );
    }
  });

  it('should reject unknown fields', () => {
    const result = updateUserSchema.safeParse({
      name: 'Updated Name',
      email: 'test@example.com',
    });

    expect(result.success).toBe(false);
  });

  it('should trim the name', () => {
    const result = updateUserSchema.safeParse({
      name: '  Updated Name  ',
    });

    expect(result.success).toBe(true);

    if (result.success) {
      expect(result.data.name).toBe('Updated Name');
    }
  });
});

describe('changePasswordSchema', () => {
  it('should accept different valid passwords', () => {
    const result = changePasswordSchema.safeParse({
      currentPassword: 'oldpassword',
      newPassword: 'newpassword',
    });

    expect(result.success).toBe(true);
  });

  it('should reject when current and new passwords are identical', () => {
    const result = changePasswordSchema.safeParse({
      currentPassword: 'samepassword',
      newPassword: 'samepassword',
    });

    expect(result.success).toBe(false);

    if (!result.success) {
      expect(result.error.issues[0]?.message).toBe(
        'New password must be different from current password',
      );

      expect(result.error.issues[0]?.path).toEqual([
        'newPassword',
      ]);
    }
  });

  it('should reject a short current password', () => {
    const result = changePasswordSchema.safeParse({
      currentPassword: '1234567',
      newPassword: 'newpassword',
    });

    expect(result.success).toBe(false);
  });

  it('should reject a short new password', () => {
    const result = changePasswordSchema.safeParse({
      currentPassword: 'oldpassword',
      newPassword: '1234567',
    });

    expect(result.success).toBe(false);
  });
});

describe('adminUsersQuerySchema', () => {
  it('should apply default page and limit', () => {
    const result = adminUsersQuerySchema.safeParse({});

    expect(result.success).toBe(true);

    if (result.success) {
      expect(result.data).toEqual({
        page: 1,
        limit: 10,
      });
    }
  });

  it('should coerce page and limit to numbers', () => {
    const result = adminUsersQuerySchema.safeParse({
      page: '2',
      limit: '25',
    });

    expect(result.success).toBe(true);

    if (result.success) {
      expect(result.data.page).toBe(2);
      expect(result.data.limit).toBe(25);
    }
  });

  it('should accept valid roles', () => {
    const userResult = adminUsersQuerySchema.safeParse({
      role: 'user',
    });

    const adminResult = adminUsersQuerySchema.safeParse({
      role: 'admin',
    });

    expect(userResult.success).toBe(true);
    expect(adminResult.success).toBe(true);
  });

  it('should reject an invalid role', () => {
    const result = adminUsersQuerySchema.safeParse({
      role: 'manager',
    });

    expect(result.success).toBe(false);
  });

  it('should transform isActive string to boolean', () => {
    const activeResult = adminUsersQuerySchema.safeParse({
      isActive: 'true',
    });

    const inactiveResult = adminUsersQuerySchema.safeParse({
      isActive: 'false',
    });

    expect(activeResult.success).toBe(true);
    expect(inactiveResult.success).toBe(true);

    if (
      activeResult.success &&
      inactiveResult.success
    ) {
      expect(activeResult.data.isActive).toBe(true);
      expect(inactiveResult.data.isActive).toBe(false);
    }
  });

  it('should reject an invalid isActive value', () => {
    const result = adminUsersQuerySchema.safeParse({
      isActive: 'yes',
    });

    expect(result.success).toBe(false);
  });

  it('should reject page less than 1', () => {
    const result = adminUsersQuerySchema.safeParse({
      page: '0',
    });

    expect(result.success).toBe(false);
  });

  it('should reject limit greater than 100', () => {
    const result = adminUsersQuerySchema.safeParse({
      limit: '101',
    });

    expect(result.success).toBe(false);
  });

  it('should accept a valid search term', () => {
    const result = adminUsersQuerySchema.safeParse({
      search: 'Lenin',
    });

    expect(result.success).toBe(true);
  });

  it('should reject an empty search term', () => {
    const result = adminUsersQuerySchema.safeParse({
      search: '   ',
    });

    expect(result.success).toBe(false);
  });
});

describe('userIdParamsSchema', () => {
  it('should accept a valid MongoDB ObjectId', () => {
    const result = userIdParamsSchema.safeParse({
      id: '507f1f77bcf86cd799439011',
    });

    expect(result.success).toBe(true);
  });

  it('should reject an invalid user ID', () => {
    const result = userIdParamsSchema.safeParse({
      id: 'invalid-id',
    });

    expect(result.success).toBe(false);

    if (!result.success) {
      expect(result.error.issues[0]?.message).toBe(
        'Invalid user ID',
      );
    }
  });

  it('should reject an ObjectId with incorrect length', () => {
    const result = userIdParamsSchema.safeParse({
      id: '507f1f77bcf86cd79943901',
    });

    expect(result.success).toBe(false);
  });
});

describe('adminUpdateUserSchema', () => {
  it('should accept a valid name update', () => {
    const result = adminUpdateUserSchema.safeParse({
      name: 'Updated Name',
    });

    expect(result.success).toBe(true);
  });

  it('should accept a valid email update', () => {
    const result = adminUpdateUserSchema.safeParse({
      email: 'ADMIN@EXAMPLE.COM',
    });

    expect(result.success).toBe(true);

    if (result.success) {
      expect(result.data.email).toBe(
        'admin@example.com',
      );
    }
  });

  it('should accept a valid role update', () => {
    const result = adminUpdateUserSchema.safeParse({
      role: 'admin',
    });

    expect(result.success).toBe(true);
  });

  it('should accept multiple fields', () => {
    const result = adminUpdateUserSchema.safeParse({
      name: 'Updated Name',
      email: 'updated@example.com',
      role: 'user',
    });

    expect(result.success).toBe(true);
  });

  it('should reject an empty update object', () => {
    const result = adminUpdateUserSchema.safeParse({});

    expect(result.success).toBe(false);

    if (!result.success) {
      expect(result.error.issues[0]?.message).toBe(
        'At least one field must be provided',
      );
    }
  });

  it('should reject unknown fields', () => {
    const result = adminUpdateUserSchema.safeParse({
      name: 'Updated Name',
      password: 'password123',
    });

    expect(result.success).toBe(false);
  });

  it('should reject an invalid role', () => {
    const result = adminUpdateUserSchema.safeParse({
      role: 'manager',
    });

    expect(result.success).toBe(false);
  });

  it('should reject an invalid email', () => {
    const result = adminUpdateUserSchema.safeParse({
      email: 'invalid-email',
    });

    expect(result.success).toBe(false);
  });
});

describe('updateUserStatusSchema', () => {
  it('should accept an active status', () => {
    const result = updateUserStatusSchema.safeParse({
      isActive: true,
    });

    expect(result.success).toBe(true);
  });

  it('should accept an inactive status', () => {
    const result = updateUserStatusSchema.safeParse({
      isActive: false,
    });

    expect(result.success).toBe(true);
  });

  it('should reject a non-boolean status', () => {
    const result = updateUserStatusSchema.safeParse({
      isActive: 'true',
    });

    expect(result.success).toBe(false);
  });

  it('should reject unknown fields', () => {
    const result = updateUserStatusSchema.safeParse({
      isActive: true,
      role: 'admin',
    });

    expect(result.success).toBe(false);
  });
});