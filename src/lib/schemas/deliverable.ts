import { z } from 'zod';
import { DELIVERABLE_STATUSES } from '@/lib/constants';

/**
 * Create deliverable schema validation
 */
export const createDeliverableSchema = z.object({
  title: z.string().min(1, 'Title is required').max(255, 'Title must be at most 255 characters'),
  description: z.string().max(2000, 'Description must be at most 2000 characters').optional(),
  project_id: z.string().uuid('Invalid project ID'),
  file_path: z
    .string()
    .min(1, 'File path is required')
    .max(2048, 'File path must be at most 2048 characters'),
  file_size: z.number().optional(),
  file_type: z.string().max(255, 'File type must be at most 255 characters').optional(),
});

export type CreateDeliverableInput = z.infer<typeof createDeliverableSchema>;

/**
 * Update deliverable schema validation (limited fields)
 */
export const updateDeliverableSchema = z.object({
  title: z
    .string()
    .min(1, 'Title is required')
    .max(255, 'Title must be at most 255 characters')
    .optional(),
  description: z.string().max(2000, 'Description must be at most 2000 characters').optional(),
  status: z.enum(DELIVERABLE_STATUSES).optional(),
  file_path: z.string().min(1).max(2048, 'File path must be at most 2048 characters').optional(),
  file_type: z.string().max(255, 'File type must be at most 255 characters').optional(),
});

export type UpdateDeliverableInput = z.infer<typeof updateDeliverableSchema>;

/**
 * Deliverable response schema (includes database fields)
 */
export const deliverableResponseSchema = createDeliverableSchema.extend({
  id: z.string().uuid(),
  version: z.number(),
  status: z.enum(DELIVERABLE_STATUSES),
  uploaded_by: z.string().uuid(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});

export type DeliverableResponse = z.infer<typeof deliverableResponseSchema>;

/**
 * Create annotation schema validation
 */
export const createAnnotationSchema = z.object({
  deliverable_id: z.string().uuid('Invalid deliverable ID'),
  timestamp_seconds: z.number().min(0, 'Timestamp must be positive').nullable().default(null),
  content: z
    .string()
    .min(1, 'Content is required')
    .max(2000, 'Content must be at most 2000 characters'),
});

export type CreateAnnotationInput = z.infer<typeof createAnnotationSchema>;

/**
 * Annotation response schema (includes database fields)
 */
export const annotationResponseSchema = createAnnotationSchema.extend({
  id: z.string().uuid(),
  created_by: z.string().uuid(),
  created_at: z.string().datetime(),
});

export type AnnotationResponse = z.infer<typeof annotationResponseSchema>;
