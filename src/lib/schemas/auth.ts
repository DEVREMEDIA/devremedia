import { z } from 'zod';

/**
 * Login schema validation
 */
export const loginSchema = z.object({
  email: z.string().email('Invalid email address').max(255, 'Email must be at most 255 characters'),
  password: z
    .string()
    .min(6, 'Password must be at least 6 characters')
    .max(128, 'Password must be at most 128 characters'),
});

export type LoginInput = z.infer<typeof loginSchema>;

/**
 * Signup schema validation
 */
export const signupSchema = z.object({
  email: z.string().email('Invalid email address').max(255, 'Email must be at most 255 characters'),
  password: z
    .string()
    .min(6, 'Password must be at least 6 characters')
    .max(128, 'Password must be at most 128 characters'),
  display_name: z
    .string()
    .min(1, 'Display name is required')
    .max(255, 'Display name must be at most 255 characters'),
});

export type SignupInput = z.infer<typeof signupSchema>;

/**
 * Confirmation schema validation.
 *
 * The invitee only sets a password on first sign-in — their name / company / email
 * were entered by the admin and are shown read-only. No profile fields are collected.
 */
export const confirmationSchema = z
  .object({
    password: z
      .string()
      .min(6, 'Password must be at least 6 characters')
      .max(128, 'Password must be at most 128 characters'),
    confirmPassword: z
      .string()
      .min(6, 'Password must be at least 6 characters')
      .max(128, 'Password must be at most 128 characters'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

export type ConfirmationInput = z.input<typeof confirmationSchema>;

/**
 * Forgot password schema validation
 */
export const forgotPasswordSchema = z.object({
  email: z.string().email('Invalid email address').max(255, 'Email must be at most 255 characters'),
});

export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;

/**
 * Update password schema validation
 */
export const updatePasswordSchema = z
  .object({
    password: z
      .string()
      .min(6, 'Password must be at least 6 characters')
      .max(128, 'Password must be at most 128 characters'),
    confirmPassword: z
      .string()
      .min(6, 'Password must be at least 6 characters')
      .max(128, 'Password must be at most 128 characters'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

export type UpdatePasswordInput = z.infer<typeof updatePasswordSchema>;
