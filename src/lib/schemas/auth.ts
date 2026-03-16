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
 * Onboarding schema validation
 */
export const onboardingSchema = z
  .object({
    display_name: z
      .string()
      .min(1, 'Display name is required')
      .max(255, 'Display name must be at most 255 characters'),
    password: z
      .string()
      .min(6, 'Password must be at least 6 characters')
      .max(128, 'Password must be at most 128 characters'),
    confirmPassword: z
      .string()
      .min(6, 'Password must be at least 6 characters')
      .max(128, 'Password must be at most 128 characters'),
    company_name: z.string().max(255, 'Company name must be at most 255 characters').optional(),
    phone: z.string().max(50, 'Phone must be at most 50 characters').optional(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

export type OnboardingInput = z.input<typeof onboardingSchema>;

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
