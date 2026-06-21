import { z } from 'zod';

// ---------------------------------------------------------------------
// Package
// ---------------------------------------------------------------------

export const proposalPackageSchema = z.object({
  name: z.string().trim().min(1, 'Υποχρεωτικό').max(120),
  video_count: z.number().int().min(0).max(1000).nullable().optional(),
  shooting_days: z.number().int().min(0).max(365).nullable().optional(),
  allowance_count: z.number().int().min(0).max(1000).nullable().optional(),
  allowance_unit: z.enum(['days', 'slots', 'hours']).default('days'),
  shooting_hours: z.number().min(0).max(10_000),
  editing_hours: z.number().min(0).max(10_000),
  price_mode: z.enum(['manual', 'auto']).default('manual'),
  manual_price: z.number().min(0).max(10_000_000).nullable().optional(),
  description: z.string().trim().max(1000).nullable().optional(),
  inclusions: z.array(z.string().trim().min(1).max(200)).default([]),
  sort_order: z.number().int().min(0).max(10_000).default(0),
  active: z.boolean().default(true),
});
export type ProposalPackageInput = z.input<typeof proposalPackageSchema>;
export type ProposalPackageOutput = z.output<typeof proposalPackageSchema>;

export const updateProposalPackageSchema = proposalPackageSchema.partial();
export type UpdateProposalPackageInput = z.input<typeof updateProposalPackageSchema>;

// ---------------------------------------------------------------------
// Proposal
// ---------------------------------------------------------------------

export const proposalSelectedPackageSchema = z.object({
  package_id: z.string().uuid(),
  price_override: z.number().min(0).max(10_000_000).nullable().optional(),
  label_override: z.string().trim().max(120).nullable().optional(),
});

export const proposalSchema = z.object({
  lead_id: z.string().uuid().nullable().optional(),
  client_id: z.string().uuid().nullable().optional(),
  status: z.enum(['draft', 'sent', 'accepted', 'rejected', 'expired']).default('draft'),
  client_name: z.string().trim().min(1, 'Υποχρεωτικό').max(200),
  competitive_advantage: z.string().trim().max(2000).nullable().optional(),
  client_need: z.string().trim().max(2000).nullable().optional(),
  selected_packages: z.array(proposalSelectedPackageSchema).default([]),
  include_discount: z.boolean().default(false),
  valid_until: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .nullable()
    .optional(),
  notes: z.string().trim().max(5000).nullable().optional(),
  locale: z.enum(['el', 'en']).default('el'),
});
export type ProposalInput = z.input<typeof proposalSchema>;
export type ProposalOutput = z.output<typeof proposalSchema>;

export const updateProposalSchema = proposalSchema.partial();
export type UpdateProposalInput = z.input<typeof updateProposalSchema>;
