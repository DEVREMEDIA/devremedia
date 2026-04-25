/* eslint-disable @typescript-eslint/no-explicit-any */
'use server';

import { createClient } from '@/lib/supabase/server';
import type { CostHealth, ProjectProfitability, ProjectProfitabilityRow } from '@/types/dashboard';
import { daysAgoIso } from './_utils';

export async function getCostModelHealth(): Promise<CostHealth> {
  try {
    const supabase = await createClient();

    const [items, settings, perCategory, recentProjects] = await Promise.all([
      supabase.from('cost_items').select('monthly_cost, category_id, active').eq('active', true),
      supabase
        .from('cost_settings')
        .select('expected_monthly_hours, default_margin')
        .eq('id', 1)
        .maybeSingle(),
      supabase
        .from('cost_items')
        .select('monthly_cost, category:cost_categories!inner(name)')
        .eq('active', true),
      supabase
        .from('projects')
        .select('quoted_price, shooting_hours, editing_hours, cost_per_hour_snapshot')
        .gte('created_at', daysAgoIso(90))
        .not('quoted_price', 'is', null)
        .not('status', 'eq', 'archived'),
    ]);

    const totalMonthlyCost = (items.data ?? []).reduce(
      (s: number, r: { monthly_cost: number | null }) => s + Number(r.monthly_cost ?? 0),
      0,
    );
    const expectedMonthlyHours = Number(settings.data?.expected_monthly_hours ?? 352);
    const targetMargin = Number(settings.data?.default_margin ?? 0.6);
    const costPerHour = expectedMonthlyHours > 0 ? totalMonthlyCost / expectedMonthlyHours : 0;

    const categoryMap = new Map<string, number>();
    (perCategory.data ?? []).forEach(
      (row: {
        monthly_cost: number | null;
        category: { name: string } | { name: string }[] | null;
      }) => {
        const cat = Array.isArray(row.category) ? row.category[0] : row.category;
        if (!cat?.name) return;
        categoryMap.set(cat.name, (categoryMap.get(cat.name) ?? 0) + Number(row.monthly_cost ?? 0));
      },
    );
    const categories = Array.from(categoryMap.entries())
      .map(([name, total]) => ({ name, total }))
      .sort((a, b) => b.total - a.total);

    let avgMargin: number | null = null;
    const projectMargins: number[] = [];
    (recentProjects.data ?? []).forEach((p: any) => {
      const quoted = Number(p.quoted_price ?? 0);
      const cost =
        (Number(p.shooting_hours ?? 0) + Number(p.editing_hours ?? 0)) *
        Number(p.cost_per_hour_snapshot ?? 0);
      if (quoted > 0) {
        projectMargins.push((quoted - cost) / quoted);
      }
    });
    if (projectMargins.length > 0) {
      avgMargin = projectMargins.reduce((a, b) => a + b, 0) / projectMargins.length;
    }

    return {
      totalMonthlyCost,
      costPerHour,
      expectedMonthlyHours,
      categories,
      avgProjectMargin90d: avgMargin,
      targetMargin,
      marginOnTarget: avgMargin != null ? avgMargin >= targetMargin : false,
    };
  } catch {
    return {
      totalMonthlyCost: 0,
      costPerHour: 0,
      expectedMonthlyHours: 352,
      categories: [],
      avgProjectMargin90d: null,
      targetMargin: 0.6,
      marginOnTarget: false,
    };
  }
}

export async function getProjectProfitability(): Promise<ProjectProfitability> {
  try {
    const supabase = await createClient();
    const { data } = await supabase
      .from('projects')
      .select(
        'id, title, quoted_price, shooting_hours, editing_hours, cost_per_hour_snapshot, ' +
          'client:clients(contact_name)',
      )
      .gte('created_at', daysAgoIso(90))
      .not('quoted_price', 'is', null)
      .not('status', 'eq', 'archived');

    const rows: ProjectProfitabilityRow[] = (data ?? [])
      .map((p: any) => {
        const quoted = Number(p.quoted_price ?? 0);
        const cost =
          (Number(p.shooting_hours ?? 0) + Number(p.editing_hours ?? 0)) *
          Number(p.cost_per_hour_snapshot ?? 0);
        const marginAmount = quoted - cost;
        const marginPct = quoted > 0 ? marginAmount / quoted : 0;
        const client = Array.isArray(p.client) ? p.client[0] : p.client;
        return {
          projectId: p.id,
          title: p.title,
          clientName: client?.contact_name ?? null,
          quotedPrice: quoted,
          cost,
          marginAmount,
          marginPct,
        };
      })
      .filter((r: ProjectProfitabilityRow) => r.quotedPrice > 0);

    const sorted = [...rows].sort((a, b) => b.marginPct - a.marginPct);
    return {
      topProfitable: sorted.slice(0, 5),
      topUnprofitable: sorted.slice(-5).reverse(),
    };
  } catch {
    return { topProfitable: [], topUnprofitable: [] };
  }
}
