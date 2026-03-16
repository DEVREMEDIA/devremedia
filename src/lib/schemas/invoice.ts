import { z } from 'zod';
import { INVOICE_STATUSES, DEFAULT_TAX_RATE, DEFAULT_CURRENCY } from '@/lib/constants';

/**
 * Line item schema for invoice items
 */
export const lineItemSchema = z.object({
  description: z
    .string()
    .min(1, 'Description is required')
    .max(500, 'Description must be at most 500 characters'),
  quantity: z.number().min(0.01, 'Quantity must be at least 0.01'),
  unit_price: z.number().min(0, 'Unit price must be positive'),
});

export type LineItem = z.infer<typeof lineItemSchema>;

/**
 * Create invoice schema validation
 */
export const createInvoiceSchema = z.object({
  client_id: z.string().uuid('Invalid client ID'),
  project_id: z.string().uuid('Invalid project ID').optional(),
  issue_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (YYYY-MM-DD)'),
  due_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (YYYY-MM-DD)'),
  line_items: z.array(lineItemSchema).min(1, 'At least one line item is required'),
  notes: z.string().max(2000, 'Notes must be at most 2000 characters').optional(),
  tax_rate: z.number().default(DEFAULT_TAX_RATE),
  currency: z.string().max(10, 'Currency must be at most 10 characters').default(DEFAULT_CURRENCY),
});

export type CreateInvoiceInput = z.infer<typeof createInvoiceSchema>;

/**
 * Update invoice schema validation (all fields optional)
 */
export const updateInvoiceSchema = createInvoiceSchema.partial();

export type UpdateInvoiceInput = z.infer<typeof updateInvoiceSchema>;

/**
 * Invoice response schema (includes database fields)
 */
export const invoiceResponseSchema = createInvoiceSchema.extend({
  id: z.string().uuid(),
  invoice_number: z.string(),
  status: z.enum(INVOICE_STATUSES),
  subtotal: z.number(),
  tax_amount: z.number(),
  total: z.number(),
  created_by: z.string().uuid(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});

export type InvoiceResponse = z.infer<typeof invoiceResponseSchema>;
