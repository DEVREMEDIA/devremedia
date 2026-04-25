'use server';

import { createClient } from '@/lib/supabase/server';
import type { DashboardThresholdsOutput } from '@/lib/schemas/cost-model';

const DEFAULT_THRESHOLDS: DashboardThresholdsOutput = {
  stale_lead_days: 14,
  stale_deliverable_days: 7,
  stale_contract_days: 14,
  deadline_risk_days: 7,
  active_projects_warn_above: 50,
};

export async function getDashboardThresholds(): Promise<DashboardThresholdsOutput> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('cost_settings')
      .select('dashboard_thresholds')
      .eq('id', 1)
      .maybeSingle();

    if (error || !data?.dashboard_thresholds) return DEFAULT_THRESHOLDS;
    return {
      ...DEFAULT_THRESHOLDS,
      ...(data.dashboard_thresholds as Partial<DashboardThresholdsOutput>),
    };
  } catch {
    return DEFAULT_THRESHOLDS;
  }
}

export async function todayIso(): Promise<string> {
  return new Date().toISOString().split('T')[0];
}

export async function daysAgoIso(days: number): Promise<string> {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - days);
  return d.toISOString().split('T')[0];
}

export async function daysAheadIso(days: number): Promise<string> {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().split('T')[0];
}

export async function startOfMonthIso(): Promise<string> {
  const d = new Date();
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1)).toISOString().split('T')[0];
}

export async function startOfPreviousMonthIso(): Promise<string> {
  const d = new Date();
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() - 1, 1)).toISOString().split('T')[0];
}

export async function calcDeltaPct(
  current: number,
  previous: number | null,
): Promise<number | null> {
  if (previous == null || previous === 0) return null;
  return ((current - previous) / previous) * 100;
}

export async function ageDays(fromIso: string): Promise<number> {
  const ms = Date.now() - new Date(fromIso).getTime();
  return Math.max(0, Math.floor(ms / 86_400_000));
}

export async function buildDailySparkline(
  rows: { date: string; value: number }[],
  days: number,
): Promise<number[]> {
  const map = new Map(rows.map((r) => [r.date, r.value]));
  const result: number[] = [];
  const today = new Date();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setUTCDate(d.getUTCDate() - i);
    const key = d.toISOString().split('T')[0];
    result.push(map.get(key) ?? 0);
  }
  return result;
}
