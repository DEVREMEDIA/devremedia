import { z } from 'zod';

export const createKbArticleSchema = z.object({
  category_id: z.string().uuid('Invalid category ID'),
  title: z.string().min(1, 'Title is required').max(255),
  slug: z
    .string()
    .min(1, 'Slug is required')
    .max(255)
    .regex(/^[a-z0-9-]+$/, 'Slug must be lowercase alphanumeric with hyphens'),
  content: z.string().default(''),
  summary: z.string().max(500).optional().nullable(),
  video_urls: z.array(z.string().min(1)).default([]),
  published: z.boolean().default(false),
  sort_order: z.coerce.number().int().default(0),
});

export type CreateKbArticleInput = z.input<typeof createKbArticleSchema>;

export const updateKbArticleSchema = z.object({
  category_id: z.string().uuid().optional(),
  title: z.string().min(1).max(255).optional(),
  slug: z
    .string()
    .min(1)
    .max(255)
    .regex(/^[a-z0-9-]+$/)
    .optional(),
  content: z.string().optional(),
  summary: z.string().max(500).optional().nullable(),
  video_urls: z.array(z.string().min(1)).optional(),
  published: z.boolean().optional(),
  sort_order: z.coerce.number().int().optional(),
});

export type UpdateKbArticleInput = z.input<typeof updateKbArticleSchema>;
