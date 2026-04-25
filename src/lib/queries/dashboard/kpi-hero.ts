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
import { dashboardRpcsEnabled } from './_feature-flag';

const EMPTY_METRIC: KpiMetric = { value: 0, previous: null, deltaPct: null, exception: false };

const EMPTY_HERO: KpiHero = {
  revenueMtd: EMPTY_METRIC,
  pipeline: EMPTY_METRIC,
  activeProjects: EMPTY_METRIC,
  profitMargin: EMPTY_METRIC,
  cashOverdue: EMPTY_METRIC,
  atRiskCount: EMPTY_METRIC,
};

export async function getKpiHero(): Promise<KpiHero> {
  if (dashboardRpcsEnabled()) {
    return getKpiHeroViaRpc();
  }
  return getKpiHeroLegacy();
}

// ---------------------------------------------------------------------
// RPC path — single round-trip via get_dashboard_kpi (migration 00045)
// ---------------------------------------------------------------------

type DashboardKpiPayload = {
  revenue_current: number;
  revenue_prev: number;
  revenue_daily: { date: string; value: number }[];
  pipeline_value: number;
  active_count: number;
  profit_margin_current: number | null;
  profit_margin_prev: number | null;
  cash_overdue: number;
};

async function getKpiHeroViaRpc(): Promise<KpiHero> {
  try {
    const supabase = await createClient();
    const today = todayIso();
    const thresholds = await getDashboardThresholds();

    const { data: kpiData, error: kpiErr } = await supabase.rpc('get_dashboard_kpi', {
      p_today: today,
    });

    if (kpiErr || !kpiData) return getKpiHeroLegacy();

    const payload = kpiData as DashboardKpiPayload;

    const revenueValue = Number(payload.revenue_current ?? 0);
    const revenuePrevValue = Number(payload.revenue_prev ?? 0);
    const revenueSparkline = buildDailySparkline(
      (payload.revenue_daily ?? []).map((r) => ({ date: r.date, value: Number(r.value) })),
      30,
    );

    const revenueMtd: KpiMetric = {
      value: revenueValue,
      previous: revenuePrevValue,
      deltaPct: calcDeltaPct(revenueValue, revenuePrevValue),
      sparkline: revenueSparkline,
      exception: false,
    };

    const pipeline: KpiMetric = {
      value: Number(payload.pipeline_value ?? 0),
      previous: null,
      deltaPct: null,
      exception: false,
    };

    const activeCount = Number(payload.active_count ?? 0);
    const activeProjects: KpiMetric = {
      value: activeCount,
      previous: null,
      deltaPct: null,
      exception: activeCount > thresholds.active_projects_warn_above,
    };

    const profitMarginValue = payload.profit_margin_current;
    const profitMarginPrevValue = payload.profit_margin_prev;

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

    const cashValue = Number(payload.cash_overdue ?? 0);
    const cashOverdue: KpiMetric = {
      value: cashValue,
      previous: null,
      deltaPct: null,
      exception: cashValue > 0,
    };

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
    return EMPTY_HERO;
  }
}

// ---------------------------------------------------------------------
// Legacy path — 8 parallel supabase queries (kept as fallback)
// ---------------------------------------------------------------------

async function getKpiHeroLegacy(): Promise<KpiHero> {
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

    const activeCount = activeProjectsRow.count ?? 0;
    const activeProjects: KpiMetric = {
      value: activeCount,
      previous: null,
      deltaPct: null,
      exception: activeCount > thresholds.active_projects_warn_above,
    };

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
    return EMPTY_HERO;
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
