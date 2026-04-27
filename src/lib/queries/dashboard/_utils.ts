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

// All dashboard date helpers operate in Europe/Athens. The DMS users
// experience the calendar in Athens local time, so "today", "this month",
// and "30 days ago" must match what the user sees in /admin/calendar
// rather than UTC. Without this, near midnight (Athens) the dashboard
// reads the previous/next day, and around month boundaries the KPI
// "revenue MTD" leaks into the wrong month.
const ATHENS_TZ = 'Europe/Athens';

function athensIso(date: Date): string {
  // 'en-CA' produces YYYY-MM-DD when combined with timeZone formatting.
  return date.toLocaleDateString('en-CA', { timeZone: ATHENS_TZ });
}

export function todayIso(): string {
  return athensIso(new Date());
}

export function daysAgoIso(days: number): string {
  return athensIso(new Date(Date.now() - days * 86_400_000));
}

export function daysAheadIso(days: number): string {
  return athensIso(new Date(Date.now() + days * 86_400_000));
}

export function startOfMonthIso(): string {
  // YYYY-MM-01 of the current Athens month.
  return `${athensIso(new Date()).slice(0, 7)}-01`;
}

export function startOfPreviousMonthIso(): string {
  const [year, month] = athensIso(new Date()).split('-').map(Number);
  let prevYear = year;
  let prevMonth = month - 1;
  if (prevMonth === 0) {
    prevMonth = 12;
    prevYear -= 1;
  }
  return `${prevYear}-${String(prevMonth).padStart(2, '0')}-01`;
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
  for (let i = days - 1; i >= 0; i--) {
    const key = i === 0 ? todayIso() : daysAgoIso(i);
    result.push(map.get(key) ?? 0);
  }
  return result;
}
