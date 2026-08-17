import { z } from 'zod';

export const createUserSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, 'Name must be at least 2 characters')
    .max(100, 'Name must not exceed 100 characters'),

  email: z
    .string()
    .trim()
    .email('Invalid email address')
    .transform((value) => value.toLowerCase()),

  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(100, 'Password must not exceed 100 characters'),
});

export type CreateUserInput = z.infer<typeof createUserSchema>;

export const updateUserSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(2, 'Name must be at least 2 characters')
      .max(100, 'Name must not exceed 100 characters'),
  })
  .strict();

export type UpdateUserInput = z.infer<typeof updateUserSchema>;

export const changePasswordSchema = z
  .object({
    currentPassword: z
      .string()
      .min(8, 'Current password must be at least 8 characters')
      .max(100, 'Current password must not exceed 100 characters'),

    newPassword: z
      .string()
      .min(8, 'New password must be at least 8 characters')
      .max(100, 'New password must not exceed 100 characters'),
  })
  .refine(
    (data) => data.currentPassword !== data.newPassword,
    {
      message: 'New password must be different from current password',
      path: ['newPassword'],
    },
  );

export type ChangePasswordInput = z.infer<
  typeof changePasswordSchema
>;

export const userIdParamsSchema = z.object({
  id: z.string().regex(
    /^[0-9a-fA-F]{24}$/,
    'Invalid user ID',
  ),
});

export type UserIdParams = z.infer<typeof userIdParamsSchema>;

export const adminUpdateUserSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(2, 'Name must be at least 2 characters')
      .max(100, 'Name must not exceed 100 characters')
      .optional(),

    email: z
      .string()
      .trim()
      .email('Invalid email address')
      .transform((value) => value.toLowerCase())
      .optional(),

    role: z
      .enum(['user', 'admin'])
      .optional(),
  })
  .strict()
  .refine(
    (data) => Object.keys(data).length > 0,
    {
      message: 'At least one field must be provided',
    },
  );

export type AdminUpdateUserInput = z.infer<
  typeof adminUpdateUserSchema
>;

export const updateUserStatusSchema = z
  .object({
    isActive: z.boolean(),
  })
  .strict();

export type UpdateUserStatusInput = z.infer<
  typeof updateUserStatusSchema
>;