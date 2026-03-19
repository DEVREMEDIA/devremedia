import { z } from 'zod';

/**
 * Message attachment schema
 */
export const attachmentSchema = z.object({
  file_path: z.string().max(2048, 'File path must be at most 2048 characters'),
  file_name: z.string().max(255, 'File name must be at most 255 characters'),
  file_type: z.string().max(255, 'File type must be at most 255 characters'),
  file_size: z.number().max(104857600, 'File size must be at most 100MB'),
});

export type Attachment = z.infer<typeof attachmentSchema>;

/**
 * Create message schema validation
 */
export const createMessageSchema = z.object({
  project_id: z.string().uuid('Invalid project ID'),
  content: z
    .string()
    .min(1, 'Content is required')
    .max(10000, 'Content must be at most 10000 characters'),
  attachments: z.array(attachmentSchema).optional(),
  channel: z.enum(['client', 'team']).default('client'),
});

export type CreateMessageInput = z.infer<typeof createMessageSchema>;

/**
 * Message response schema (includes database fields)
 */
export const messageResponseSchema = createMessageSchema.extend({
  id: z.string().uuid(),
  sender_id: z.string().uuid(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});

export type MessageResponse = z.infer<typeof messageResponseSchema>;
