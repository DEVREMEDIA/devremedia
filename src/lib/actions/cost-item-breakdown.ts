'use server';

import { requireAdmin } from '@/lib/auth-helpers';
import { costItemBreakdownSchema, updateCostItemBreakdownSchema } from '@/lib/schemas/cost-model';
import type { ActionResult, CostItemBreakdown } from '@/types/index';
import { revalidatePath } from 'next/cache';

function revalidateCostModel() {
  revalidatePath('/admin/finance');
  revalidatePath('/admin/finance');
}

const COLS =
  'id, cost_item_id, name, monthly_cost, sort_order, active, created_at, updated_at, created_by, updated_by';

export async function getCostItemBreakdowns(opts?: {
  cost_item_id?: string;
  include_inactive?: boolean;
}): Promise<ActionResult<CostItemBreakdown[]>> {
  try {
    const { supabase, error: authErr } = await requireAdmin();
    if (authErr) return { data: null, error: authErr };

    let query = supabase
      .from('cost_item_breakdown')
      .select(COLS)
      .order('sort_order', { ascending: true })
      .order('name', { ascending: true });

    if (opts?.cost_item_id) query = query.eq('cost_item_id', opts.cost_item_id);
    if (!opts?.include_inactive) query = query.eq('active', true);

    const { data, error } = await query;
    if (error) return { data: null, error: error.message };
    return { data: data ?? [], error: null };
  } catch (err) {
    return {
      data: null,
      error: err instanceof Error ? err.message : 'Failed to fetch breakdowns',
    };
  }
}

export async function createCostItemBreakdown(
  input: unknown,
): Promise<ActionResult<CostItemBreakdown>> {
  try {
    const validated = costItemBreakdownSchema.parse(input);
    const { supabase, user, error: authErr } = await requireAdmin();
    if (authErr || !user) return { data: null, error: authErr ?? 'Unauthorized' };

    const { data, error } = await supabase
      .from('cost_item_breakdown')
      .insert({ ...validated, created_by: user.id, updated_by: user.id })
      .select(COLS)
      .single();

    if (error) return { data: null, error: error.message };
    revalidateCostModel();
    return { data, error: null };
  } catch (err) {
    return {
      data: null,
      error: err instanceof Error ? err.message : 'Failed to create breakdown row',
    };
  }
}

export async function updateCostItemBreakdown(
  id: string,
  input: unknown,
): Promise<ActionResult<CostItemBreakdown>> {
  try {
    const validated = updateCostItemBreakdownSchema.parse(input);
    const { supabase, user, error: authErr } = await requireAdmin();
    if (authErr || !user) return { data: null, error: authErr ?? 'Unauthorized' };

    const { data, error } = await supabase
      .from('cost_item_breakdown')
      .update({ ...validated, updated_by: user.id })
      .eq('id', id)
      .select(COLS)
      .single();

    if (error) return { data: null, error: error.message };
    revalidateCostModel();
    return { data, error: null };
  } catch (err) {
    return {
      data: null,
      error: err instanceof Error ? err.message : 'Failed to update breakdown row',
    };
  }
}

export async function deleteCostItemBreakdown(id: string): Promise<ActionResult<void>> {
  try {
    const { supabase, error: authErr } = await requireAdmin();
    if (authErr) return { data: null, error: authErr };

    const { error } = await supabase.from('cost_item_breakdown').delete().eq('id', id);
    if (error) return { data: null, error: error.message };
    revalidateCostModel();
    return { data: undefined, error: null };
  } catch (err) {
    return {
      data: null,
      error: err instanceof Error ? err.message : 'Failed to delete breakdown row',
    };
  }
}
