'use server';

import { createClient } from '@/lib/supabase/server';
import {
  costCategorySchema,
  updateCostCategorySchema,
  costItemSchema,
  updateCostItemSchema,
  updateCostSettingsSchema,
} from '@/lib/schemas/cost-model';
import type {
  ActionResult,
  CostCategory,
  CostItem,
  CostItemWithCategory,
  CostSettings,
  CostSummary,
} from '@/types/index';
import { revalidatePath } from 'next/cache';

// ---------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------

async function requireAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { supabase, error: 'Unauthorized' as const, user: null };

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (!profile || !['super_admin', 'admin'].includes(profile.role)) {
    return { supabase, error: 'Forbidden: admin access required' as const, user: null };
  }
  return { supabase, error: null, user };
}

function revalidateCostModel() {
  revalidatePath('/admin/cost-model');
  revalidatePath('/admin/pricing-health');
}

// ---------------------------------------------------------------------
// Categories
// ---------------------------------------------------------------------

export async function getCostCategories(): Promise<ActionResult<CostCategory[]>> {
  try {
    const { supabase, error: authErr } = await requireAdmin();
    if (authErr) return { data: null, error: authErr };

    const { data, error } = await supabase
      .from('cost_categories')
      .select('id, name, sort_order, active, created_at, updated_at')
      .order('sort_order', { ascending: true })
      .order('name', { ascending: true });

    if (error) return { data: null, error: error.message };
    return { data: data ?? [], error: null };
  } catch (err) {
    return {
      data: null,
      error: err instanceof Error ? err.message : 'Failed to fetch categories',
    };
  }
}

export async function createCostCategory(input: unknown): Promise<ActionResult<CostCategory>> {
  try {
    const validated = costCategorySchema.parse(input);
    const { supabase, error: authErr } = await requireAdmin();
    if (authErr) return { data: null, error: authErr };

    const { data, error } = await supabase
      .from('cost_categories')
      .insert(validated)
      .select('id, name, sort_order, active, created_at, updated_at')
      .single();

    if (error) return { data: null, error: error.message };
    revalidateCostModel();
    return { data, error: null };
  } catch (err) {
    return {
      data: null,
      error: err instanceof Error ? err.message : 'Failed to create category',
    };
  }
}

export async function updateCostCategory(
  id: string,
  input: unknown,
): Promise<ActionResult<CostCategory>> {
  try {
    const validated = updateCostCategorySchema.parse(input);
    const { supabase, error: authErr } = await requireAdmin();
    if (authErr) return { data: null, error: authErr };

    const { data, error } = await supabase
      .from('cost_categories')
      .update(validated)
      .eq('id', id)
      .select('id, name, sort_order, active, created_at, updated_at')
      .single();

    if (error) return { data: null, error: error.message };
    revalidateCostModel();
    return { data, error: null };
  } catch (err) {
    return {
      data: null,
      error: err instanceof Error ? err.message : 'Failed to update category',
    };
  }
}

export async function deleteCostCategory(id: string): Promise<ActionResult<void>> {
  try {
    const { supabase, error: authErr } = await requireAdmin();
    if (authErr) return { data: null, error: authErr };

    // Block delete if items still reference this category
    const { count } = await supabase
      .from('cost_items')
      .select('id', { count: 'exact', head: true })
      .eq('category_id', id);

    if ((count ?? 0) > 0) {
      return {
        data: null,
        error: 'Η κατηγορία περιέχει γραμμές κόστους. Μετακινήστε ή διαγράψτε τις πρώτα.',
      };
    }

    const { error } = await supabase.from('cost_categories').delete().eq('id', id);
    if (error) return { data: null, error: error.message };
    revalidateCostModel();
    return { data: undefined, error: null };
  } catch (err) {
    return {
      data: null,
      error: err instanceof Error ? err.message : 'Failed to delete category',
    };
  }
}

// ---------------------------------------------------------------------
// Items
// ---------------------------------------------------------------------

export async function getCostItems(opts?: {
  category_id?: string;
  include_inactive?: boolean;
}): Promise<ActionResult<CostItemWithCategory[]>> {
  try {
    const { supabase, error: authErr } = await requireAdmin();
    if (authErr) return { data: null, error: authErr };

    let query = supabase
      .from('cost_items')
      .select(
        `id, category_id, subcategory, description, monthly_cost, comments,
         sort_order, active, created_at, updated_at, created_by, updated_by,
         category:cost_categories!inner(id, name, sort_order)`,
      )
      .order('sort_order', { ascending: true });

    if (opts?.category_id) query = query.eq('category_id', opts.category_id);
    if (!opts?.include_inactive) query = query.eq('active', true);

    const { data, error } = await query;
    if (error) return { data: null, error: error.message };

    // supabase typegen can represent the joined `category` as an array — normalise.
    const normalised = (data ?? []).map((row: unknown) => {
      const r = row as CostItemWithCategory & {
        category: CostItemWithCategory['category'] | CostItemWithCategory['category'][];
      };
      return {
        ...r,
        category: Array.isArray(r.category) ? r.category[0] : r.category,
      } as CostItemWithCategory;
    });

    return { data: normalised, error: null };
  } catch (err) {
    return {
      data: null,
      error: err instanceof Error ? err.message : 'Failed to fetch items',
    };
  }
}

export async function createCostItem(input: unknown): Promise<ActionResult<CostItem>> {
  try {
    const validated = costItemSchema.parse(input);
    const { supabase, user, error: authErr } = await requireAdmin();
    if (authErr || !user) return { data: null, error: authErr ?? 'Unauthorized' };

    const { data, error } = await supabase
      .from('cost_items')
      .insert({ ...validated, created_by: user.id, updated_by: user.id })
      .select(
        'id, category_id, subcategory, description, monthly_cost, comments, sort_order, active, created_at, updated_at, created_by, updated_by',
      )
      .single();

    if (error) return { data: null, error: error.message };
    revalidateCostModel();
    return { data, error: null };
  } catch (err) {
    return {
      data: null,
      error: err instanceof Error ? err.message : 'Failed to create item',
    };
  }
}

export async function updateCostItem(id: string, input: unknown): Promise<ActionResult<CostItem>> {
  try {
    const validated = updateCostItemSchema.parse(input);
    const { supabase, user, error: authErr } = await requireAdmin();
    if (authErr || !user) return { data: null, error: authErr ?? 'Unauthorized' };

    const { data, error } = await supabase
      .from('cost_items')
      .update({ ...validated, updated_by: user.id })
      .eq('id', id)
      .select(
        'id, category_id, subcategory, description, monthly_cost, comments, sort_order, active, created_at, updated_at, created_by, updated_by',
      )
      .single();

    if (error) return { data: null, error: error.message };
    revalidateCostModel();
    return { data, error: null };
  } catch (err) {
    return {
      data: null,
      error: err instanceof Error ? err.message : 'Failed to update item',
    };
  }
}

export async function deleteCostItem(id: string): Promise<ActionResult<void>> {
  try {
    const { supabase, error: authErr } = await requireAdmin();
    if (authErr) return { data: null, error: authErr };

    const { error } = await supabase.from('cost_items').delete().eq('id', id);
    if (error) return { data: null, error: error.message };
    revalidateCostModel();
    return { data: undefined, error: null };
  } catch (err) {
    return {
      data: null,
      error: err instanceof Error ? err.message : 'Failed to delete item',
    };
  }
}

// ---------------------------------------------------------------------
// Settings (singleton)
// ---------------------------------------------------------------------

export async function getCostSettings(): Promise<ActionResult<CostSettings>> {
  try {
    const { supabase, error: authErr } = await requireAdmin();
    if (authErr) return { data: null, error: authErr };

    const { data, error } = await supabase.from('cost_settings').select('*').eq('id', 1).single();

    if (error) return { data: null, error: error.message };
    return { data, error: null };
  } catch (err) {
    return {
      data: null,
      error: err instanceof Error ? err.message : 'Failed to fetch settings',
    };
  }
}

export async function updateCostSettings(input: unknown): Promise<ActionResult<CostSettings>> {
  try {
    const validated = updateCostSettingsSchema.parse(input);
    const { supabase, user, error: authErr } = await requireAdmin();
    if (authErr || !user) return { data: null, error: authErr ?? 'Unauthorized' };

    const { data, error } = await supabase
      .from('cost_settings')
      .update({ ...validated, updated_by: user.id })
      .eq('id', 1)
      .select('*')
      .single();

    if (error) return { data: null, error: error.message };
    revalidateCostModel();
    return { data, error: null };
  } catch (err) {
    return {
      data: null,
      error: err instanceof Error ? err.message : 'Failed to update settings',
    };
  }
}

// ---------------------------------------------------------------------
// Derived summary — total, cost/hour, breakdown by category
// ---------------------------------------------------------------------

export async function getCostSummary(): Promise<ActionResult<CostSummary>> {
  try {
    const { supabase, error: authErr } = await requireAdmin();
    if (authErr) return { data: null, error: authErr };

    const [itemsRes, settingsRes] = await Promise.all([
      supabase
        .from('cost_items')
        .select(
          `monthly_cost, active,
           category:cost_categories!inner(id, name, sort_order)`,
        )
        .eq('active', true),
      supabase.from('cost_settings').select('expected_monthly_hours').eq('id', 1).single(),
    ]);

    if (itemsRes.error) return { data: null, error: itemsRes.error.message };
    if (settingsRes.error) return { data: null, error: settingsRes.error.message };

    const rows = (itemsRes.data ?? []) as unknown as {
      monthly_cost: number;
      category:
        | { id: string; name: string; sort_order: number }
        | { id: string; name: string; sort_order: number }[];
    }[];

    const byCatMap = new Map<string, { id: string; name: string; total: number; sort: number }>();
    let total = 0;

    for (const row of rows) {
      const cat = Array.isArray(row.category) ? row.category[0] : row.category;
      if (!cat) continue;
      total += Number(row.monthly_cost) || 0;
      const prev = byCatMap.get(cat.id) ?? {
        id: cat.id,
        name: cat.name,
        total: 0,
        sort: cat.sort_order,
      };
      prev.total += Number(row.monthly_cost) || 0;
      byCatMap.set(cat.id, prev);
    }

    const hours = Number(settingsRes.data.expected_monthly_hours) || 0;
    const costPerHour = hours > 0 ? total / hours : 0;

    const by_category = Array.from(byCatMap.values())
      .sort((a, b) => a.sort - b.sort)
      .map((c) => ({
        category_id: c.id,
        category_name: c.name,
        total: Math.round(c.total * 100) / 100,
        percent: total > 0 ? Math.round((c.total / total) * 10_000) / 100 : 0,
      }));

    return {
      data: {
        total_monthly_cost: Math.round(total * 100) / 100,
        expected_monthly_hours: hours,
        cost_per_hour: Math.round(costPerHour * 100) / 100,
        by_category,
      },
      error: null,
    };
  } catch (err) {
    return {
      data: null,
      error: err instanceof Error ? err.message : 'Failed to compute summary',
    };
  }
}
