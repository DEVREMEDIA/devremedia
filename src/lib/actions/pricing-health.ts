'use server';

import { requireAdmin } from '@/lib/auth-helpers';
import type {
  ActionResult,
  PricingHealthStatus,
  PricingHealthSummary,
  ProjectPricingAnalysis,
} from '@/types/index';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';

function classify(args: {
  total_cost: number;
  min_price: number;
  max_price: number;
  quoted_price: number | null;
  total_hours: number;
}): PricingHealthStatus {
  if (args.total_hours <= 0 || args.quoted_price == null) return 'unpriced';
  if (args.quoted_price < args.total_cost) return 'loss';
  if (args.quoted_price < args.min_price) return 'underpriced';
  if (args.quoted_price > args.max_price) return 'premium';
  return 'healthy';
}

function round2(n: number) {
  return Math.round(n * 100) / 100;
}

// ---------------------------------------------------------------------
// Analysis — one or many projects
// ---------------------------------------------------------------------

export async function getPricingHealth(): Promise<ActionResult<PricingHealthSummary>> {
  try {
    const { supabase, error: authErr } = await requireAdmin();
    if (authErr) return { data: null, error: authErr };

    const [projectsRes, settingsRes] = await Promise.all([
      supabase
        .from('projects')
        .select(
          `id, title, status, shooting_hours, editing_hours,
           cost_per_hour_snapshot, quoted_price, budget,
           client:clients(id, company_name, contact_name)`,
        )
        .order('created_at', { ascending: false }),
      supabase
        .from('cost_settings')
        .select(
          'price_min_multiplier, price_target_multiplier, price_max_multiplier, expected_monthly_hours',
        )
        .eq('id', 1)
        .single(),
    ]);

    if (projectsRes.error) return { data: null, error: projectsRes.error.message };
    if (settingsRes.error) return { data: null, error: settingsRes.error.message };

    // Live cost/hour (for projects without snapshot)
    const { data: items } = await supabase
      .from('cost_items')
      .select('monthly_cost')
      .eq('active', true);

    const totalMonthly = (items ?? []).reduce((sum, r) => sum + Number(r.monthly_cost || 0), 0);
    const expectedHours = Number(settingsRes.data.expected_monthly_hours) || 0;
    const liveCostPerHour = expectedHours > 0 ? totalMonthly / expectedHours : 0;
    const mnMult = Number(settingsRes.data.price_min_multiplier);
    const tgMult = Number(settingsRes.data.price_target_multiplier);
    const mxMult = Number(settingsRes.data.price_max_multiplier);

    const rows = (projectsRes.data ?? []) as unknown as {
      id: string;
      title: string;
      status: ProjectPricingAnalysis['project_status'];
      shooting_hours: number | null;
      editing_hours: number | null;
      cost_per_hour_snapshot: number | null;
      quoted_price: number | null;
      budget: number | null;
      client:
        | { id: string; company_name: string | null; contact_name: string | null }
        | { id: string; company_name: string | null; contact_name: string | null }[]
        | null;
    }[];

    const projects: ProjectPricingAnalysis[] = rows.map((r) => {
      const shooting = Number(r.shooting_hours ?? 0);
      const editing = Number(r.editing_hours ?? 0);
      const total_hours = shooting + editing;
      const cost_per_hour = Number(r.cost_per_hour_snapshot ?? liveCostPerHour);
      const total_cost = total_hours * cost_per_hour;
      const min_price = total_cost * mnMult;
      const target_price = total_cost * tgMult;
      const max_price = total_cost * mxMult;
      // quoted_price fallback → budget (legacy projects)
      const quoted_price =
        r.quoted_price != null
          ? Number(r.quoted_price)
          : r.budget != null
            ? Number(r.budget)
            : null;

      const status = classify({
        total_cost,
        min_price,
        max_price,
        quoted_price,
        total_hours,
      });

      const client = Array.isArray(r.client) ? r.client[0] : r.client;
      const client_name = client
        ? client.company_name?.trim() || client.contact_name || null
        : null;

      return {
        project_id: r.id,
        client_id: client?.id ?? null,
        client_name,
        project_title: r.title,
        project_status: r.status,
        shooting_hours: r.shooting_hours,
        editing_hours: r.editing_hours,
        total_hours: round2(total_hours),
        cost_per_hour: round2(cost_per_hour),
        has_snapshot: r.cost_per_hour_snapshot != null,
        total_cost: round2(total_cost),
        min_price: round2(min_price),
        target_price: round2(target_price),
        max_price: round2(max_price),
        quoted_price: quoted_price != null ? round2(quoted_price) : null,
        delta_vs_target: quoted_price != null ? round2(quoted_price - target_price) : null,
        profit_loss: quoted_price != null ? round2(quoted_price - total_cost) : null,
        status,
      };
    });

    const by_status: Record<PricingHealthStatus, number> = {
      loss: 0,
      underpriced: 0,
      healthy: 0,
      premium: 0,
      unpriced: 0,
    };
    let total_quoted = 0;
    let total_cost = 0;
    let total_profit = 0;
    let total_left_on_table = 0;

    for (const p of projects) {
      by_status[p.status] += 1;
      if (p.status !== 'unpriced') {
        total_cost += p.total_cost;
        if (p.quoted_price != null) total_quoted += p.quoted_price;
        if (p.profit_loss != null) total_profit += p.profit_loss;
        if ((p.status === 'underpriced' || p.status === 'loss') && p.quoted_price != null) {
          total_left_on_table += Math.max(0, p.target_price - p.quoted_price);
        }
      }
    }

    return {
      data: {
        total_projects: projects.length,
        analysed: projects.length - by_status.unpriced,
        by_status,
        total_quoted: round2(total_quoted),
        total_cost: round2(total_cost),
        total_profit: round2(total_profit),
        total_left_on_table: round2(total_left_on_table),
        projects,
      },
      error: null,
    };
  } catch (err) {
    return {
      data: null,
      error: err instanceof Error ? err.message : 'Failed to compute pricing health',
    };
  }
}

export async function getProjectPricing(
  projectId: string,
): Promise<ActionResult<ProjectPricingAnalysis | null>> {
  try {
    const all = await getPricingHealth();
    if (all.error || !all.data) {
      return { data: null, error: all.error ?? 'No data' };
    }
    const found = all.data.projects.find((p) => p.project_id === projectId) ?? null;
    return { data: found, error: null };
  } catch (err) {
    return {
      data: null,
      error: err instanceof Error ? err.message : 'Failed to fetch project pricing',
    };
  }
}

// ---------------------------------------------------------------------
// Mutation — update hours + quoted_price on a project
// (freezes cost_per_hour_snapshot the first time hours are set)
// ---------------------------------------------------------------------

const updateProjectPricingSchema = z.object({
  shooting_hours: z.number().min(0).max(10_000).nullable(),
  editing_hours: z.number().min(0).max(10_000).nullable(),
  quoted_price: z.number().min(0).max(10_000_000).nullable(),
  freeze_snapshot: z.boolean().default(true),
});

export async function updateProjectPricing(
  projectId: string,
  input: unknown,
): Promise<ActionResult<ProjectPricingAnalysis | null>> {
  try {
    const validated = updateProjectPricingSchema.parse(input);
    const { supabase, user, error: authErr } = await requireAdmin();
    if (authErr || !user) return { data: null, error: authErr ?? 'Unauthorized' };

    // Read current project to decide on snapshot
    const { data: current, error: curErr } = await supabase
      .from('projects')
      .select('cost_per_hour_snapshot')
      .eq('id', projectId)
      .single();
    if (curErr) return { data: null, error: curErr.message };

    const update: Record<string, unknown> = {
      shooting_hours: validated.shooting_hours,
      editing_hours: validated.editing_hours,
      quoted_price: validated.quoted_price,
    };

    // Only freeze the first time (or if explicitly requested and none set)
    if (validated.freeze_snapshot && current.cost_per_hour_snapshot == null) {
      const [itemsRes, settingsRes] = await Promise.all([
        supabase.from('cost_items').select('monthly_cost').eq('active', true),
        supabase.from('cost_settings').select('expected_monthly_hours').eq('id', 1).single(),
      ]);
      const totalMonthly = (itemsRes.data ?? []).reduce(
        (s, r) => s + Number(r.monthly_cost || 0),
        0,
      );
      const hours = Number(settingsRes.data?.expected_monthly_hours) || 0;
      if (hours > 0) {
        update.cost_per_hour_snapshot = round2(totalMonthly / hours);
      }
    }

    const { error: updErr } = await supabase.from('projects').update(update).eq('id', projectId);
    if (updErr) return { data: null, error: updErr.message };

    revalidatePath('/admin/pricing-health');
    revalidatePath(`/admin/projects/${projectId}`);

    return await getProjectPricing(projectId);
  } catch (err) {
    return {
      data: null,
      error: err instanceof Error ? err.message : 'Failed to update project pricing',
    };
  }
}

// Manually re-freeze / clear the snapshot (admin action)
export async function resetProjectPricingSnapshot(projectId: string): Promise<ActionResult<void>> {
  try {
    const { supabase, error: authErr } = await requireAdmin();
    if (authErr) return { data: null, error: authErr };

    const { error } = await supabase
      .from('projects')
      .update({ cost_per_hour_snapshot: null })
      .eq('id', projectId);
    if (error) return { data: null, error: error.message };

    revalidatePath('/admin/pricing-health');
    revalidatePath(`/admin/projects/${projectId}`);
    return { data: undefined, error: null };
  } catch (err) {
    return {
      data: null,
      error: err instanceof Error ? err.message : 'Failed to reset snapshot',
    };
  }
}
