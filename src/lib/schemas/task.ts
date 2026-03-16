import { z } from 'zod';
import { TASK_STATUSES, PRIORITIES } from '@/lib/constants';

/**
 * Create task schema validation
 */
export const createTaskSchema = z.object({
  title: z.string().min(1, 'Title is required').max(255, 'Title must be at most 255 characters'),
  description: z.string().max(5000, 'Description must be at most 5000 characters').optional(),
  project_id: z.string().uuid('Invalid project ID'),
  assigned_to: z.string().uuid('Invalid user ID').optional(),
  status: z.enum(TASK_STATUSES).default('todo'),
  priority: z.enum(PRIORITIES).default('medium'),
  due_date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (YYYY-MM-DD)')
    .optional(),
  sort_order: z.number().optional(),
});

export type CreateTaskInput = z.infer<typeof createTaskSchema>;

/**
 * Update task schema validation (all fields optional)
 */
export const updateTaskSchema = createTaskSchema.partial();

export type UpdateTaskInput = z.infer<typeof updateTaskSchema>;

/**
 * Task response schema (includes database fields)
 */
export const taskResponseSchema = createTaskSchema.extend({
  id: z.string().uuid(),
  created_by: z.string().uuid(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});

export type TaskResponse = z.infer<typeof taskResponseSchema>;
