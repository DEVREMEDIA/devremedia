import { cache } from 'react';
import { createClient } from '@/lib/supabase/server';
import type { DashboardThresholdsOutput } from '@/lib/schemas/cost-model';

const DEFAULT_THRESHOLDS: DashboardThresholdsOutput = {
  stale_lead_days: 14,
  stale_deliverable_days: 7,
  stale_contract_days: 14,
  deadline_risk_days: 7,
  active_projects_warn_above: 50,
};

const DEFAULT_MARGIN = 0.6;

type DashboardSettings = {
  thresholds: DashboardThresholdsOutput;
  defaultMargin: number;
};

export const getDashboardSettings = cache(async (): Promise<DashboardSettings> => {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('cost_settings')
      .select('dashboard_thresholds, default_margin')
      .eq('id', 1)
      .maybeSingle();

    if (error || !data) {
      return { thresholds: DEFAULT_THRESHOLDS, defaultMargin: DEFAULT_MARGIN };
    }
    return {
      thresholds: {
        ...DEFAULT_THRESHOLDS,
        ...((data.dashboard_thresholds as Partial<DashboardThresholdsOutput>) ?? {}),
      },
      defaultMargin: Number(data.default_margin ?? DEFAULT_MARGIN),
    };
  } catch {
    return { thresholds: DEFAULT_THRESHOLDS, defaultMargin: DEFAULT_MARGIN };
  }
});

export async function getDashboardThresholds(): Promise<DashboardThresholdsOutput> {
  const { thresholds } = await getDashboardSettings();
  return thresholds;
}

export function todayIso(): string {
  return new Date().toISOString().split('T')[0];
}

export function daysAgoIso(days: number): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - days);
  return d.toISOString().split('T')[0];
}

export function daysAheadIso(days: number): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().split('T')[0];
}

export function startOfMonthIso(): string {
  const d = new Date();
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1)).toISOString().split('T')[0];
}

export function startOfPreviousMonthIso(): string {
  const d = new Date();
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() - 1, 1)).toISOString().split('T')[0];
}

export function calcDeltaPct(current: number, previous: number | null): number | null {
  if (previous == null || previous === 0) return null;
  return ((current - previous) / previous) * 100;
}

export function ageDays(fromIso: string): number {
  const ms = Date.now() - new Date(fromIso).getTime();
  return Math.max(0, Math.floor(ms / 86_400_000));
}

export function buildDailySparkline(
  rows: { date: string; value: number }[],
  days: number,
): number[] {
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
