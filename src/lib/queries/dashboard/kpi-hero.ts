'use server';

import { createClient } from '@/lib/supabase/server';
import type { KpiHero, KpiMetric } from '@/types/dashboard';
import {
  buildDailySparkline,
  calcDeltaPct,
  daysAgoIso,
  getDashboardThresholds,
  startOfMonthIso,
  startOfPreviousMonthIso,
  todayIso,
} from './_utils';

const EMPTY_METRIC: KpiMetric = { value: 0, previous: null, deltaPct: null, exception: false };

export async function getKpiHero(): Promise<KpiHero> {
  try {
    const supabase = await createClient();
    const thresholds = await getDashboardThresholds();
    const today = todayIso();
    const monthStart = startOfMonthIso();
    const prevMonthStart = startOfPreviousMonthIso();

    const [
      revenueCurrent,
      revenuePrev,
      revenueDaily,
      pipelineLeads,
      activeProjectsRow,
      profitMarginCurrent,
      profitMarginPrev,
      cashOverdueRow,
    ] = await Promise.all([
      supabase.from('invoices').select('total').eq('status', 'paid').gte('paid_at', monthStart),
      supabase
        .from('invoices')
        .select('total')
        .eq('status', 'paid')
        .gte('paid_at', prevMonthStart)
        .lt('paid_at', monthStart),
      supabase
        .from('invoices')
        .select('paid_at, total')
        .eq('status', 'paid')
        .gte('paid_at', daysAgoIso(30))
        .order('paid_at', { ascending: true }),
      supabase
        .from('leads')
        .select('deal_value, probability')
        .in('stage', ['new', 'contacted', 'qualified', 'proposal', 'negotiation']),
      supabase
        .from('projects')
        .select('id', { count: 'exact', head: true })
        .not('status', 'in', '(delivered,archived)'),
      supabase.rpc('get_profit_margin_window', {
        p_from: daysAgoIso(30),
        p_to: today,
      }),
      supabase.rpc('get_profit_margin_window', {
        p_from: daysAgoIso(60),
        p_to: daysAgoIso(30),
      }),
      supabase
        .from('invoices')
        .select('total')
        .or(`status.eq.overdue,and(status.in.(sent,viewed),due_date.lt.${today})`),
    ]);

    // Revenue MTD
    const revenueValue = (revenueCurrent.data ?? []).reduce(
      (sum: number, r: { total: number | null }) => sum + (r.total ?? 0),
      0,
    );
    const revenuePrevValue = (revenuePrev.data ?? []).reduce(
      (sum: number, r: { total: number | null }) => sum + (r.total ?? 0),
      0,
    );

    const dailyBuckets: Record<string, number> = {};
    (revenueDaily.data ?? []).forEach((r: { paid_at: string | null; total: number | null }) => {
      if (!r.paid_at) return;
      const day = r.paid_at.split('T')[0];
      dailyBuckets[day] = (dailyBuckets[day] ?? 0) + (r.total ?? 0);
    });
    const revenueSparkline = buildDailySparkline(
      Object.entries(dailyBuckets).map(([date, value]) => ({ date, value })),
      30,
    );

    const revenueMtd: KpiMetric = {
      value: revenueValue,
      previous: revenuePrevValue,
      deltaPct: calcDeltaPct(revenueValue, revenuePrevValue),
      sparkline: revenueSparkline,
      exception: false,
    };

    // Pipeline (weighted)
    const pipelineValue = (pipelineLeads.data ?? []).reduce(
      (sum: number, l: { deal_value: number | null; probability: number | null }) =>
        sum + (l.deal_value ?? 0) * ((l.probability ?? 0) / 100),
      0,
    );
    const pipeline: KpiMetric = {
      value: pipelineValue,
      previous: null,
      deltaPct: null,
      exception: false,
    };

    // Active projects
    const activeCount = activeProjectsRow.count ?? 0;
    const activeProjects: KpiMetric = {
      value: activeCount,
      previous: null,
      deltaPct: null,
      exception: activeCount > thresholds.active_projects_warn_above,
    };

    // Profit margin (rolling 30d)
    const profitMarginValue = readRpcMargin(profitMarginCurrent.data);
    const profitMarginPrevValue = readRpcMargin(profitMarginPrev.data);

    const { data: settingsRow } = await supabase
      .from('cost_settings')
      .select('default_margin')
      .eq('id', 1)
      .maybeSingle();
    const target = Number(settingsRow?.default_margin ?? 0.6);

    const profitMargin: KpiMetric = {
      value: profitMarginValue ?? 0,
      previous: profitMarginPrevValue,
      deltaPct: calcDeltaPct(profitMarginValue ?? 0, profitMarginPrevValue),
      exception: profitMarginValue != null && profitMarginValue < target,
    };

    // Cash overdue
    const cashValue = (cashOverdueRow.data ?? []).reduce(
      (sum: number, r: { total: number | null }) => sum + (r.total ?? 0),
      0,
    );
    const cashOverdue: KpiMetric = {
      value: cashValue,
      previous: null,
      deltaPct: null,
      exception: cashValue > 0,
    };

    // At-risk count via getRiskItems (lazy import to avoid circular)
    const { getRiskItems } = await import('./risk');
    const risks = await getRiskItems();
    const atRiskCount: KpiMetric = {
      value: risks.length,
      previous: null,
      deltaPct: null,
      exception: risks.length > 0,
    };

    return { revenueMtd, pipeline, activeProjects, profitMargin, cashOverdue, atRiskCount };
  } catch {
    return {
      revenueMtd: EMPTY_METRIC,
      pipeline: EMPTY_METRIC,
      activeProjects: EMPTY_METRIC,
      profitMargin: EMPTY_METRIC,
      cashOverdue: EMPTY_METRIC,
      atRiskCount: EMPTY_METRIC,
    };
  }
}

function readRpcMargin(data: unknown): number | null {
  if (data == null) return null;
  if (typeof data === 'number') return data;
  if (Array.isArray(data) && data.length > 0) {
    const first = data[0] as { margin?: number };
    if (typeof first.margin === 'number') return first.margin;
  }
  return null;
}
