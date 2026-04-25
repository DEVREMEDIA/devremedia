'use server';

import { createClient } from '@/lib/supabase/server';
import type { SalesFunnel, RevenueForecast, FunnelStage } from '@/types/dashboard';
import { daysAgoIso, daysAheadIso, todayIso } from './_utils';

export async function getSalesFunnel(): Promise<SalesFunnel> {
  try {
    const supabase = await createClient();

    const [filmingReq, leadsOpen, proposalsSent, wonRecent, activeProjects] = await Promise.all([
      supabase
        .from('filming_requests')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'pending'),
      supabase
        .from('leads')
        .select('id', { count: 'exact', head: true })
        .in('stage', ['new', 'contacted', 'qualified', 'proposal', 'negotiation']),
      supabase.from('proposals').select('id', { count: 'exact', head: true }).eq('status', 'sent'),
      supabase
        .from('leads')
        .select('id', { count: 'exact', head: true })
        .eq('stage', 'won')
        .gte('updated_at', daysAgoIso(30)),
      supabase
        .from('projects')
        .select('id', { count: 'exact', head: true })
        .not('status', 'in', '(delivered,archived)'),
    ]);

    const stages: FunnelStage[] = [
      { key: 'filming_requests', count: filmingReq.count ?? 0 },
      { key: 'leads_open', count: leadsOpen.count ?? 0 },
      { key: 'proposals_sent', count: proposalsSent.count ?? 0 },
      { key: 'won', count: wonRecent.count ?? 0 },
      { key: 'active_projects', count: activeProjects.count ?? 0 },
    ];

    const conversions = stages.slice(0, -1).map((from, i) => {
      const to = stages[i + 1];
      const ratePct = from.count === 0 ? 0 : Math.min(100, (to.count / from.count) * 100);
      return { fromKey: from.key, toKey: to.key, ratePct };
    });

    return { stages, conversions };
  } catch {
    return { stages: [], conversions: [] };
  }
}

export async function getRevenueForecast(): Promise<RevenueForecast> {
  try {
    const supabase = await createClient();
    const today = todayIso();
    const in30 = daysAheadIso(30);
    const in90 = daysAheadIso(90);

    const [confirmedRows, likelyRows, pipelineRows] = await Promise.all([
      supabase
        .from('invoices')
        .select('total')
        .in('status', ['sent', 'viewed'])
        .gte('due_date', today)
        .lte('due_date', in30),
      supabase
        .from('leads')
        .select('deal_value, probability')
        .in('stage', ['proposal', 'negotiation'])
        .gte('expected_close_date', in30)
        .lte('expected_close_date', in90),
      supabase
        .from('leads')
        .select('deal_value')
        .in('stage', ['new', 'contacted', 'qualified', 'proposal', 'negotiation']),
    ]);

    const confirmed = (confirmedRows.data ?? []).reduce(
      (s: number, r: { total: number | null }) => s + (r.total ?? 0),
      0,
    );
    const likely = (likelyRows.data ?? []).reduce(
      (s: number, r: { deal_value: number | null; probability: number | null }) =>
        s + (r.deal_value ?? 0) * ((r.probability ?? 0) / 100),
      0,
    );
    const pipeline = (pipelineRows.data ?? []).reduce(
      (s: number, r: { deal_value: number | null }) => s + (r.deal_value ?? 0),
      0,
    );

    return { confirmed, likely, pipeline, expectedTotal90d: confirmed + likely };
  } catch {
    return { confirmed: 0, likely: 0, pipeline: 0, expectedTotal90d: 0 };
  }
}
