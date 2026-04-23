'use server';

import { createClient } from '@/lib/supabase/server';
import { proposalPackageSchema, updateProposalPackageSchema } from '@/lib/schemas/proposal';
import type { ActionResult, ProposalPackage, ProposalPackageWithPrice } from '@/types/index';
import { revalidatePath } from 'next/cache';

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
    return { supabase, error: 'Forbidden' as const, user: null };
  }
  return { supabase, error: null, user };
}

function normaliseInclusions(raw: unknown): string[] {
  if (Array.isArray(raw)) return raw.filter((x): x is string => typeof x === 'string');
  return [];
}

function shape(row: Record<string, unknown>): ProposalPackage {
  return {
    id: String(row.id),
    name: String(row.name),
    video_count: row.video_count == null ? null : Number(row.video_count),
    shooting_days: row.shooting_days == null ? null : Number(row.shooting_days),
    shooting_hours: Number(row.shooting_hours ?? 0),
    editing_hours: Number(row.editing_hours ?? 0),
    price_mode: (row.price_mode as ProposalPackage['price_mode']) ?? 'manual',
    manual_price: row.manual_price == null ? null : Number(row.manual_price),
    description: (row.description as string | null) ?? null,
    inclusions: normaliseInclusions(row.inclusions),
    sort_order: Number(row.sort_order ?? 0),
    active: Boolean(row.active),
    created_at: String(row.created_at),
    updated_at: String(row.updated_at),
  };
}

/**
 * Fetch packages WITH computed price and cost, based on the current cost
 * model. For `manual` packages the price is `manual_price`; for `auto` it
 * is `(total_hours × cost/hour × (1 + default_margin))`.
 */
export async function getProposalPackages(opts?: {
  include_inactive?: boolean;
}): Promise<ActionResult<ProposalPackageWithPrice[]>> {
  try {
    const { supabase, error: authErr } = await requireAdmin();
    if (authErr) return { data: null, error: authErr };

    let query = supabase
      .from('proposal_packages')
      .select('*')
      .order('sort_order', { ascending: true });
    if (!opts?.include_inactive) query = query.eq('active', true);

    const [pkgsRes, settingsRes, itemsRes] = await Promise.all([
      query,
      supabase
        .from('cost_settings')
        .select('expected_monthly_hours, default_margin')
        .eq('id', 1)
        .single(),
      supabase.from('cost_items').select('monthly_cost').eq('active', true),
    ]);

    if (pkgsRes.error) return { data: null, error: pkgsRes.error.message };

    const totalMonthly = (itemsRes.data ?? []).reduce((s, r) => s + Number(r.monthly_cost || 0), 0);
    const hours = Number(settingsRes.data?.expected_monthly_hours ?? 352);
    const margin = Number(settingsRes.data?.default_margin ?? 0.6);
    const costPerHour = hours > 0 ? totalMonthly / hours : 0;

    const data: ProposalPackageWithPrice[] = (pkgsRes.data ?? []).map((row) => {
      const p = shape(row as Record<string, unknown>);
      const totalHours = p.shooting_hours + p.editing_hours;
      const cost = totalHours * costPerHour;
      const price = p.price_mode === 'manual' ? Number(p.manual_price ?? 0) : cost * (1 + margin);
      return {
        ...p,
        computed_cost: Math.round(cost * 100) / 100,
        computed_price: Math.round(price * 100) / 100,
      };
    });

    return { data, error: null };
  } catch (err) {
    return {
      data: null,
      error: err instanceof Error ? err.message : 'Failed to fetch packages',
    };
  }
}

export async function createProposalPackage(
  input: unknown,
): Promise<ActionResult<ProposalPackage>> {
  try {
    const validated = proposalPackageSchema.parse(input);
    const { supabase, error: authErr } = await requireAdmin();
    if (authErr) return { data: null, error: authErr };

    const { data, error } = await supabase
      .from('proposal_packages')
      .insert(validated)
      .select('*')
      .single();

    if (error) return { data: null, error: error.message };

    revalidatePath('/admin/proposal-packages');
    revalidatePath('/admin/proposals');
    return { data: shape(data as Record<string, unknown>), error: null };
  } catch (err) {
    return {
      data: null,
      error: err instanceof Error ? err.message : 'Failed to create package',
    };
  }
}

export async function updateProposalPackage(
  id: string,
  input: unknown,
): Promise<ActionResult<ProposalPackage>> {
  try {
    const validated = updateProposalPackageSchema.parse(input);
    const { supabase, error: authErr } = await requireAdmin();
    if (authErr) return { data: null, error: authErr };

    const { data, error } = await supabase
      .from('proposal_packages')
      .update(validated)
      .eq('id', id)
      .select('*')
      .single();

    if (error) return { data: null, error: error.message };

    revalidatePath('/admin/proposal-packages');
    revalidatePath('/admin/proposals');
    return { data: shape(data as Record<string, unknown>), error: null };
  } catch (err) {
    return {
      data: null,
      error: err instanceof Error ? err.message : 'Failed to update package',
    };
  }
}

export async function deleteProposalPackage(id: string): Promise<ActionResult<void>> {
  try {
    const { supabase, error: authErr } = await requireAdmin();
    if (authErr) return { data: null, error: authErr };

    const { error } = await supabase.from('proposal_packages').delete().eq('id', id);
    if (error) return { data: null, error: error.message };

    revalidatePath('/admin/proposal-packages');
    revalidatePath('/admin/proposals');
    return { data: undefined, error: null };
  } catch (err) {
    return {
      data: null,
      error: err instanceof Error ? err.message : 'Failed to delete package',
    };
  }
}
