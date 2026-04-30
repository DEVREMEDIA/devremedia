'use server';

import { createClient } from '@/lib/supabase/server';
import type { SalesFunnel, RevenueForecast, FunnelStage } from '@/types/dashboard';
import { todayIso } from './_utils';

type FunnelPayload = {
  filming_requests: number;
  leads_open: number;
  proposals_sent: number;
  won: number;
  active_projects: number;
};

function buildFunnel(payload: FunnelPayload): SalesFunnel {
  const stages: FunnelStage[] = [
    { key: 'filming_requests', count: Number(payload.filming_requests ?? 0) },
    { key: 'leads_open', count: Number(payload.leads_open ?? 0) },
    { key: 'proposals_sent', count: Number(payload.proposals_sent ?? 0) },
    { key: 'won', count: Number(payload.won ?? 0) },
    { key: 'active_projects', count: Number(payload.active_projects ?? 0) },
  ];
  const conversions = stages.slice(0, -1).map((from, i) => {
    const to = stages[i + 1];
    const ratePct = from.count === 0 ? 0 : Math.min(100, (to.count / from.count) * 100);
    return { fromKey: from.key, toKey: to.key, ratePct };
  });
  return { stages, conversions };
}

export async function getSalesFunnel(): Promise<SalesFunnel> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.rpc('get_sales_funnel');
    if (error || !data) return { stages: [], conversions: [] };
    return buildFunnel(data as FunnelPayload);
  } catch {
    return { stages: [], conversions: [] };
  }
}

type ForecastPayload = {
  confirmed: number;
  likely: number;
  pipeline: number;
};

export async function getRevenueForecast(): Promise<RevenueForecast> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.rpc('get_revenue_forecast', { p_today: todayIso() });
    if (error || !data) return { confirmed: 0, likely: 0, pipeline: 0, expectedTotal90d: 0 };
    const payload = data as ForecastPayload;
    const confirmed = Number(payload.confirmed ?? 0);
    const likely = Number(payload.likely ?? 0);
    const pipeline = Number(payload.pipeline ?? 0);
    return { confirmed, likely, pipeline, expectedTotal90d: confirmed + likely };
  } catch {
    return { confirmed: 0, likely: 0, pipeline: 0, expectedTotal90d: 0 };
  }
}
