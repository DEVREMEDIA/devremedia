'use server';

import { createClient } from '@/lib/supabase/server';
import { LEAD_STAGES } from '@/lib/constants';

export async function getLeadsByStage() {
  try {
    const supabase = await createClient();
    const results = await Promise.all(
      LEAD_STAGES.map(async (stage) => {
        const { count } = await supabase
          .from('leads')
          .select('id', { count: 'exact', head: true })
          .eq('stage', stage);
        return [stage, count ?? 0] as const;
      }),
    );

    const counts: Record<string, number> = {};
    for (const [stage, count] of results) {
      if (count > 0) counts[stage] = count;
    }
    return counts;
  } catch {
    return {};
  }
}

export async function getConversionRate(dateFrom?: string, dateTo?: string) {
  try {
    const supabase = await createClient();
    let query = supabase.from('leads').select('stage').in('stage', ['won', 'lost']);

    if (dateFrom) query = query.gte('created_at', dateFrom);
    if (dateTo) query = query.lte('created_at', dateTo);

    const { data, error } = await query;
    if (error || !data || data.length === 0) return 0;

    const won = data.filter((l) => l.stage === 'won').length;
    return Math.round((won / data.length) * 100);
  } catch {
    return 0;
  }
}

export async function getPipelineForecast() {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('leads')
      .select('stage, deal_value, probability')
      .not('stage', 'in', '("won","lost")');

    if (error || !data) return [];

    const stageMap: Record<string, { total: number; weighted: number; count: number }> = {};
    for (const lead of data) {
      if (!stageMap[lead.stage]) {
        stageMap[lead.stage] = { total: 0, weighted: 0, count: 0 };
      }
      const val = lead.deal_value ?? 0;
      stageMap[lead.stage].total += val;
      stageMap[lead.stage].weighted += val * ((lead.probability ?? 0) / 100);
      stageMap[lead.stage].count++;
    }

    return Object.entries(stageMap).map(([stage, data]) => ({
      stage,
      ...data,
    }));
  } catch {
    return [];
  }
}

export async function getLeadsBySalesman() {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('leads')
      .select(
        'assigned_to, stage, deal_value, assigned_user:user_profiles!leads_assigned_to_user_profiles_fkey(display_name)',
      );

    if (error || !data) return [];

    const salesmanMap: Record<
      string,
      {
        name: string;
        total_leads: number;
        won: number;
        lost: number;
        active: number;
        total_value: number;
      }
    > = {};

    for (const lead of data) {
      const id = lead.assigned_to;
      const assignedUser = lead.assigned_user as { display_name?: string } | undefined;
      if (!salesmanMap[id]) {
        salesmanMap[id] = {
          name: assignedUser?.display_name || 'Unknown',
          total_leads: 0,
          won: 0,
          lost: 0,
          active: 0,
          total_value: 0,
        };
      }
      salesmanMap[id].total_leads++;
      if (lead.stage === 'won') salesmanMap[id].won++;
      else if (lead.stage === 'lost') salesmanMap[id].lost++;
      else salesmanMap[id].active++;
      salesmanMap[id].total_value += lead.deal_value ?? 0;
    }

    return Object.entries(salesmanMap).map(([id, data]) => ({ id, ...data }));
  } catch {
    return [];
  }
}

export async function getLeadsBySource() {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.from('leads').select('source, stage');

    if (error || !data) return [];

    const sourceMap: Record<string, { total: number; won: number }> = {};
    for (const lead of data) {
      if (!sourceMap[lead.source]) {
        sourceMap[lead.source] = { total: 0, won: 0 };
      }
      sourceMap[lead.source].total++;
      if (lead.stage === 'won') sourceMap[lead.source].won++;
    }

    return Object.entries(sourceMap).map(([source, data]) => ({
      source,
      ...data,
      conversion_rate: data.total > 0 ? Math.round((data.won / data.total) * 100) : 0,
    }));
  } catch {
    return [];
  }
}
