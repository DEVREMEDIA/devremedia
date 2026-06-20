import { z } from 'zod';
import { FILMING_REQUEST_STATUSES, PROJECT_TYPES } from '@/lib/constants';

/**
 * Preferred date schema for filming requests
 */
export const preferredDateSchema = z.object({
  date: z.string().max(50, 'Date must be at most 50 characters'),
  time_slot: z.string().max(100, 'Time slot must be at most 100 characters'),
});

export type PreferredDate = z.infer<typeof preferredDateSchema>;

/**
 * Create filming request schema validation
 */
export const createFilmingRequestSchema = z.object({
  title: z.string().min(1, 'Title is required').max(255, 'Title must be at most 255 characters'),
  description: z.string().max(5000, 'Description must be at most 5000 characters').optional(),
  preferred_dates: z.array(preferredDateSchema).optional(),
  location: z.string().max(500, 'Location must be at most 500 characters').optional(),
  project_type: z.enum(PROJECT_TYPES).optional(),
  selected_package: z.string().max(100, 'Package ID must be at most 100 characters').optional(),
  budget_range: z.string().max(100, 'Budget range must be at most 100 characters').optional(),
  reference_links: z
    .array(z.string().url('Invalid URL').max(2048, 'URL must be at most 2048 characters'))
    .max(20, 'At most 20 reference links allowed')
    .optional(),
});

export type CreateFilmingRequestInput = z.infer<typeof createFilmingRequestSchema>;

/**
 * Review filming request schema validation
 */
export const reviewFilmingRequestSchema = z.object({
  status: z.enum(['reviewed', 'accepted', 'declined']),
  admin_notes: z.string().max(5000, 'Admin notes must be at most 5000 characters').optional(),
});

export type ReviewFilmingRequestInput = z.infer<typeof reviewFilmingRequestSchema>;

/**
 * Filming request response schema (includes database fields)
 */
export const filmingRequestResponseSchema = createFilmingRequestSchema.extend({
  id: z.string().uuid(),
  status: z.enum(FILMING_REQUEST_STATUSES),
  client_id: z.string().uuid(),
  admin_notes: z.string().optional(),
  reviewed_by: z.string().uuid().optional(),
  reviewed_at: z.string().datetime().optional(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});

export type FilmingRequestResponse = z.infer<typeof filmingRequestResponseSchema>;

/**
 * Public booking form schema (no auth required)
 */
export const publicBookingSchema = z.object({
  contact_name: z.string().min(1, 'Name is required').max(255),
  contact_email: z.string().email('Invalid email').max(255),
  contact_phone: z.string().max(50).optional().or(z.literal('')),
  contact_company: z.string().max(255).optional().or(z.literal('')),
  title: z.string().min(1, 'Title is required').max(255),
  description: z.string().max(5000).optional().or(z.literal('')),
  project_type: z.enum(PROJECT_TYPES).optional(),
  selected_package: z.string().max(100).optional().or(z.literal('')),
  budget_range: z.string().max(100).optional().or(z.literal('')),
  location: z.string().max(500).optional().or(z.literal('')),
  preferred_dates: z.array(preferredDateSchema).optional(),
});

export type PublicBookingInput = z.infer<typeof publicBookingSchema>;
