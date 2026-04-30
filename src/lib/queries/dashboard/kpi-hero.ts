'use server';

import { createClient } from '@/lib/supabase/server';
import type { KpiHero, KpiMetric } from '@/types/dashboard';
import { buildDailySparkline, calcDeltaPct, getDashboardSettings, todayIso } from './_utils';

const EMPTY_METRIC: KpiMetric = { value: 0, previous: null, deltaPct: null, exception: false };

const EMPTY_HERO: KpiHero = {
  revenueMtd: EMPTY_METRIC,
  pipeline: EMPTY_METRIC,
  activeProjects: EMPTY_METRIC,
  profitMargin: EMPTY_METRIC,
  cashOverdue: EMPTY_METRIC,
  atRiskCount: EMPTY_METRIC,
};

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

export async function getKpiHero(): Promise<KpiHero> {
  try {
    const supabase = await createClient();
    const today = todayIso();
    const { thresholds, defaultMargin } = await getDashboardSettings();

    const { data: kpiData, error: kpiErr } = await supabase.rpc('get_dashboard_kpi', {
      p_today: today,
    });

    if (kpiErr || !kpiData) return EMPTY_HERO;

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

    const profitMargin: KpiMetric = {
      value: profitMarginValue ?? 0,
      previous: profitMarginPrevValue,
      deltaPct: calcDeltaPct(profitMarginValue ?? 0, profitMarginPrevValue),
      exception: profitMarginValue != null && profitMarginValue < defaultMargin,
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
