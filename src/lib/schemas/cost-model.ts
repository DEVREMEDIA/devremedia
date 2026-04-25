import { z } from 'zod';

/**
 * Cost Model — Zod schemas
 * All values are user-editable; these schemas just enforce shape & bounds.
 */

// ---------------------------------------------------------------------
// Category
// ---------------------------------------------------------------------

export const costCategorySchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'Το όνομα είναι υποχρεωτικό')
    .max(100, 'Μέγιστο μήκος 100 χαρακτήρες'),
  sort_order: z.number().int().min(0).max(10_000).default(0),
  active: z.boolean().default(true),
});
export type CostCategoryInput = z.input<typeof costCategorySchema>;
export type CostCategoryOutput = z.output<typeof costCategorySchema>;

export const updateCostCategorySchema = costCategorySchema.partial();
export type UpdateCostCategoryInput = z.input<typeof updateCostCategorySchema>;

// ---------------------------------------------------------------------
// Item
// ---------------------------------------------------------------------

export const costItemSchema = z.object({
  category_id: z.string().uuid('Μη έγκυρη κατηγορία'),
  subcategory: z.string().trim().max(100, 'Μέγιστο μήκος 100 χαρακτήρες').nullable().optional(),
  description: z.string().trim().max(200, 'Μέγιστο μήκος 200 χαρακτήρες').nullable().optional(),
  monthly_cost: z
    .number()
    .min(0, 'Το κόστος δεν μπορεί να είναι αρνητικό')
    .max(1_000_000, 'Υπερβολικά μεγάλη τιμή'),
  comments: z.string().trim().max(500, 'Μέγιστο μήκος 500 χαρακτήρες').nullable().optional(),
  sort_order: z.number().int().min(0).max(10_000).default(0),
  active: z.boolean().default(true),
});
export type CostItemInput = z.input<typeof costItemSchema>;
export type CostItemOutput = z.output<typeof costItemSchema>;

export const updateCostItemSchema = costItemSchema.partial();
export type UpdateCostItemInput = z.input<typeof updateCostItemSchema>;

// ---------------------------------------------------------------------
// Breakdown row — children of a cost_item
// ---------------------------------------------------------------------

export const costItemBreakdownSchema = z.object({
  cost_item_id: z.string().uuid('Μη έγκυρο item'),
  name: z
    .string()
    .trim()
    .min(1, 'Το όνομα είναι υποχρεωτικό')
    .max(100, 'Μέγιστο μήκος 100 χαρακτήρες'),
  monthly_cost: z
    .number()
    .min(0, 'Το κόστος δεν μπορεί να είναι αρνητικό')
    .max(1_000_000, 'Υπερβολικά μεγάλη τιμή'),
  sort_order: z.number().int().min(0).max(10_000).default(0),
  active: z.boolean().default(true),
});
export type CostItemBreakdownInput = z.input<typeof costItemBreakdownSchema>;
export type CostItemBreakdownOutput = z.output<typeof costItemBreakdownSchema>;

export const updateCostItemBreakdownSchema = costItemBreakdownSchema
  .omit({ cost_item_id: true })
  .partial();
export type UpdateCostItemBreakdownInput = z.input<typeof updateCostItemBreakdownSchema>;

// ---------------------------------------------------------------------
// Dashboard thresholds (sub-object inside cost_settings.dashboard_thresholds)
// ---------------------------------------------------------------------

export const dashboardThresholdsSchema = z.object({
  stale_lead_days: z
    .number()
    .int()
    .min(1, 'Πρέπει να είναι τουλάχιστον 1 μέρα')
    .max(365, 'Μέγιστο 365 μέρες')
    .default(14),
  stale_deliverable_days: z.number().int().min(1).max(365).default(7),
  stale_contract_days: z.number().int().min(1).max(365).default(14),
  deadline_risk_days: z.number().int().min(1).max(365).default(7),
  active_projects_warn_above: z.number().int().min(1).max(10_000).default(50),
});
export type DashboardThresholdsInput = z.input<typeof dashboardThresholdsSchema>;
export type DashboardThresholdsOutput = z.output<typeof dashboardThresholdsSchema>;

// ---------------------------------------------------------------------
// Settings (singleton)
// ---------------------------------------------------------------------

export const costSettingsSchema = z.object({
  expected_monthly_hours: z
    .number()
    .min(1, 'Πρέπει να είναι τουλάχιστον 1 ώρα')
    .max(10_000, 'Υπερβολικά μεγάλη τιμή'),
  default_margin: z
    .number()
    .min(0, 'Το περιθώριο δεν μπορεί να είναι αρνητικό')
    .max(10, 'Μέγιστο 1000%'),
  price_min_multiplier: z.number().min(1, 'Το minimum πρέπει να είναι ≥ 1').max(10),
  price_target_multiplier: z.number().min(1).max(10),
  price_max_multiplier: z.number().min(1).max(10),
  discount_first_months: z.number().int().min(0).max(36),
  discount_first_percent: z.number().min(0).max(1, 'Έκπτωση 0-100%'),
  vat_percent: z.number().min(0).max(1, 'ΦΠΑ 0-100%'),
  deposit_percent: z.number().min(0).max(1, 'Προκαταβολή 0-100%'),
  dashboard_thresholds: dashboardThresholdsSchema.optional(),
});
export type CostSettingsInput = z.input<typeof costSettingsSchema>;
export type CostSettingsOutput = z.output<typeof costSettingsSchema>;

export const updateCostSettingsSchema = costSettingsSchema.partial().refine(
  (v) => {
    const mn = v.price_min_multiplier;
    const tg = v.price_target_multiplier;
    const mx = v.price_max_multiplier;
    if (mn == null || tg == null || mx == null) return true;
    return mn <= tg && tg <= mx;
  },
  { message: 'Απαιτείται min ≤ target ≤ max' },
);
export type UpdateCostSettingsInput = z.input<typeof updateCostSettingsSchema>;
