import { z } from 'zod';
import { CONTRACT_STATUSES } from '@/lib/constants';

/**
 * Create contract schema — structured form fields only.
 * Title and content are auto-generated server-side.
 */
export const createContractSchema = z.object({
  project_id: z.string().uuid('Invalid project ID').optional().nullable(),
  client_id: z.string().uuid('Invalid client ID'),
  service_type: z.string().min(1, 'Service type is required').max(255),
  agreed_amount: z.number().positive('Amount must be a positive number'),
  payment_method: z.enum(['bank_transfer', 'cash', 'card', 'installments']),
  expires_at: z.string().date('Invalid date format').optional(),
  scope_description: z.string().optional(),
  special_terms: z.string().optional(),
});

export type CreateContractInput = z.infer<typeof createContractSchema>;

/**
 * Update contract schema (limited fields)
 */
export const updateContractSchema = z.object({
  title: z.string().min(1, 'Title is required').max(255).optional(),
  content: z.string().min(1, 'Content is required').max(50000).optional(),
  expires_at: z.string().date('Invalid date format').optional(),
});

export type UpdateContractInput = z.infer<typeof updateContractSchema>;

/**
 * Contract response schema (includes database fields)
 */
export const contractResponseSchema = z.object({
  id: z.string().uuid(),
  project_id: z.string().uuid().optional().nullable(),
  client_id: z.string().uuid(),
  title: z.string(),
  content: z.string(),
  template_id: z.string().uuid().optional().nullable(),
  status: z.enum(CONTRACT_STATUSES),
  service_type: z.string().optional().nullable(),
  agreed_amount: z.number().optional().nullable(),
  payment_method: z.string().optional().nullable(),
  signed_at: z.string().datetime().optional().nullable(),
  signature_image: z.string().optional().nullable(),
  file_path: z.string().optional().nullable(),
  expires_at: z.string().optional().nullable(),
  created_by: z.string().uuid(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime().optional(),
});

export type ContractResponse = z.infer<typeof contractResponseSchema>;

/**
 * Upload signed PDF schema validation
 */
export const uploadSignedSchema = z.object({
  file: z
    .instanceof(File)
    .refine((f) => f.type === 'application/pdf', 'Only PDF files are accepted')
    .refine((f) => f.size <= 10 * 1024 * 1024, 'File too large (max 10 MB)'),
});

export type UploadSignedInput = z.infer<typeof uploadSignedSchema>;
