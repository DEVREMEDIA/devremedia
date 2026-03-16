import { z } from 'zod';
import { EXPENSE_CATEGORIES } from '@/lib/constants';

/**
 * Create expense schema validation
 */
export const createExpenseSchema = z.object({
  project_id: z.string().uuid('Invalid project ID').optional(),
  category: z.enum(EXPENSE_CATEGORIES),
  description: z.string().max(1000, 'Description must be at most 1000 characters').optional(),
  amount: z.number().min(0.01, 'Amount must be at least 0.01'),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (YYYY-MM-DD)'),
  receipt_path: z.string().max(2048, 'Receipt path must be at most 2048 characters').optional(),
});

export type CreateExpenseInput = z.infer<typeof createExpenseSchema>;

/**
 * Update expense schema validation (all fields optional)
 */
export const updateExpenseSchema = createExpenseSchema.partial();

export type UpdateExpenseInput = z.infer<typeof updateExpenseSchema>;

/**
 * Expense response schema (includes database fields)
 */
export const expenseResponseSchema = createExpenseSchema.extend({
  id: z.string().uuid(),
  created_by: z.string().uuid(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});

export type ExpenseResponse = z.infer<typeof expenseResponseSchema>;
