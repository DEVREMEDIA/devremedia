import { z } from 'zod';
import { SHOT_TYPES } from '@/lib/constants';

/**
 * Equipment item schema for filming prep
 */
export const equipmentItemSchema = z.object({
  name: z.string().min(1, 'Name is required').max(255, 'Name must be at most 255 characters'),
  quantity: z.number().min(1, 'Quantity must be at least 1').default(1),
  checked: z.boolean().default(false),
  notes: z.string().max(500, 'Notes must be at most 500 characters').optional(),
});

export type EquipmentItem = z.infer<typeof equipmentItemSchema>;

/**
 * Update equipment list schema validation
 */
export const updateEquipmentListSchema = z.object({
  items: z.array(equipmentItemSchema),
});

export type UpdateEquipmentListInput = z.infer<typeof updateEquipmentListSchema>;

/**
 * Shot schema for shot list
 */
export const shotSchema = z.object({
  number: z.number(),
  description: z.string().max(500, 'Description must be at most 500 characters'),
  shot_type: z.enum(SHOT_TYPES),
  location: z.string().max(255, 'Location must be at most 255 characters').optional(),
  duration_est: z.string().max(50, 'Duration estimate must be at most 50 characters').optional(),
  notes: z.string().max(500, 'Notes must be at most 500 characters').optional(),
  completed: z.boolean().default(false),
});

export type Shot = z.infer<typeof shotSchema>;

/**
 * Update shot list schema validation
 */
export const updateShotListSchema = z.object({
  shots: z.array(shotSchema),
});

export type UpdateShotListInput = z.infer<typeof updateShotListSchema>;

/**
 * Concept note attachment schema
 */
export const conceptNoteAttachmentSchema = z.object({
  file_path: z.string().max(2048, 'File path must be at most 2048 characters'),
  file_name: z.string().max(255, 'File name must be at most 255 characters'),
  file_type: z.string().max(255, 'File type must be at most 255 characters'),
  file_size: z.number(),
});

export type ConceptNoteAttachment = z.infer<typeof conceptNoteAttachmentSchema>;

/**
 * Create concept note schema validation
 */
export const createConceptNoteSchema = z.object({
  title: z.string().min(1, 'Title is required').max(255, 'Title must be at most 255 characters'),
  content: z.string().max(50000, 'Content must be at most 50000 characters').optional(),
  project_id: z.string().uuid('Invalid project ID'),
  attachments: z.array(conceptNoteAttachmentSchema).optional(),
});

export type CreateConceptNoteInput = z.infer<typeof createConceptNoteSchema>;

/**
 * Update concept note schema validation
 */
export const updateConceptNoteSchema = z.object({
  title: z
    .string()
    .min(1, 'Title is required')
    .max(255, 'Title must be at most 255 characters')
    .optional(),
  content: z.string().max(50000, 'Content must be at most 50000 characters').optional(),
});

export type UpdateConceptNoteInput = z.infer<typeof updateConceptNoteSchema>;

/**
 * Concept note response schema (includes database fields)
 */
export const conceptNoteResponseSchema = createConceptNoteSchema.extend({
  id: z.string().uuid(),
  created_by: z.string().uuid(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});

export type ConceptNoteResponse = z.infer<typeof conceptNoteResponseSchema>;
