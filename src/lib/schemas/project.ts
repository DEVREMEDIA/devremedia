import { z } from 'zod';
import { PROJECT_TYPES, PROJECT_STATUSES, PRIORITIES } from '@/lib/constants';

/**
 * Create project schema validation
 */
export const createProjectSchema = z.object({
  title: z.string().min(1, 'Title is required').max(255, 'Title must be at most 255 characters'),
  description: z.string().max(5000, 'Description must be at most 5000 characters').optional(),
  client_id: z.string().uuid('Invalid client ID'),
  project_type: z.enum(PROJECT_TYPES),
  status: z.enum(PROJECT_STATUSES).default('briefing'),
  priority: z.enum(PRIORITIES).default('medium'),
  start_date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (YYYY-MM-DD)')
    .optional(),
  deadline: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (YYYY-MM-DD)')
    .optional(),
  budget: z.number().min(0, 'Budget must be positive').optional(),
  assigned_to: z.string().uuid('Invalid user ID').nullable().optional(),
  filming_date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (YYYY-MM-DD)')
    .nullable()
    .optional(),
  filming_time: z.string().max(255, 'Time must be at most 255 characters').nullable().optional(),
  location: z.string().max(500, 'Location must be at most 500 characters').nullable().optional(),
});

export type CreateProjectInput = z.infer<typeof createProjectSchema>;

/**
 * Update project schema validation (all fields optional)
 */
export const updateProjectSchema = createProjectSchema.partial();

export type UpdateProjectInput = z.infer<typeof updateProjectSchema>;

/**
 * Project response schema (includes database fields)
 */
export const projectResponseSchema = createProjectSchema.extend({
  id: z.string().uuid(),
  created_by: z.string().uuid(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});

export type ProjectResponse = z.infer<typeof projectResponseSchema>;
