'use server';

import { createClient } from '@/lib/supabase/server';
import type { BusinessVelocity, VelocityCounter } from '@/types/dashboard';
import { daysAgoIso } from './_utils';
import { dashboardRpcsEnabled } from './_feature-flag';

const EMPTY: VelocityCounter = { count: 0, deltaVsPrevious: 0 };
const EMPTY_VELOCITY: BusinessVelocity = {
  projectsCreated: EMPTY,
  projectsDelivered: EMPTY,
  invoicesPaid: EMPTY,
  contractsSigned: EMPTY,
  proposalsSent: EMPTY,
};

const counter = (now: number, prev: number, sum?: number): VelocityCounter => ({
  count: now,
  sum,
  deltaVsPrevious: now - prev,
});

export async function getBusinessVelocity(periodDays = 7): Promise<BusinessVelocity> {
  if (dashboardRpcsEnabled()) {
    const rpc = await getBusinessVelocityViaRpc(periodDays);
    if (rpc) return rpc;
  }
  return getBusinessVelocityLegacy(periodDays);
}

type VelocityPayload = {
  projects_created_now: number;
  projects_created_prev: number;
  projects_delivered_now: number;
  projects_delivered_prev: number;
  invoices_paid_now_count: number;
  invoices_paid_prev_count: number;
  invoices_paid_now_sum: number;
  contracts_signed_now: number;
  contracts_signed_prev: number;
  proposals_sent_now: number;
  proposals_sent_prev: number;
};

async function getBusinessVelocityViaRpc(periodDays: number): Promise<BusinessVelocity | null> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.rpc('get_business_velocity', {
      p_period_days: periodDays,
    });
    if (error || !data) return null;
    const p = data as VelocityPayload;
    return {
      projectsCreated: counter(Number(p.projects_created_now), Number(p.projects_created_prev)),
      projectsDelivered: counter(
        Number(p.projects_delivered_now),
        Number(p.projects_delivered_prev),
      ),
      invoicesPaid: counter(
        Number(p.invoices_paid_now_count),
        Number(p.invoices_paid_prev_count),
        Number(p.invoices_paid_now_sum),
      ),
      contractsSigned: counter(Number(p.contracts_signed_now), Number(p.contracts_signed_prev)),
      proposalsSent: counter(Number(p.proposals_sent_now), Number(p.proposals_sent_prev)),
    };
  } catch {
    return null;
  }
}

async function getBusinessVelocityLegacy(periodDays: number): Promise<BusinessVelocity> {
  try {
    const supabase = await createClient();
    const currentFrom = daysAgoIso(periodDays);
    const previousFrom = daysAgoIso(periodDays * 2);

    const [
      pCreatedNow,
      pCreatedPrev,
      pDeliveredNow,
      pDeliveredPrev,
      iPaidNow,
      iPaidPrev,
      cSignedNow,
      cSignedPrev,
      prSentNow,
      prSentPrev,
    ] = await Promise.all([
      supabase
        .from('projects')
        .select('id', { count: 'exact', head: true })
        .gte('created_at', currentFrom),
      supabase
        .from('projects')
        .select('id', { count: 'exact', head: true })
        .gte('created_at', previousFrom)
        .lt('created_at', currentFrom),
      supabase
        .from('projects')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'delivered')
        .gte('updated_at', currentFrom),
      supabase
        .from('projects')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'delivered')
        .gte('updated_at', previousFrom)
        .lt('updated_at', currentFrom),
      supabase.from('invoices').select('total').eq('status', 'paid').gte('paid_at', currentFrom),
      supabase
        .from('invoices')
        .select('total')
        .eq('status', 'paid')
        .gte('paid_at', previousFrom)
        .lt('paid_at', currentFrom),
      supabase
        .from('contracts')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'signed')
        .gte('signed_at', currentFrom),
      supabase
        .from('contracts')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'signed')
        .gte('signed_at', previousFrom)
        .lt('signed_at', currentFrom),
      supabase
        .from('proposals')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'sent')
        .gte('sent_at', currentFrom),
      supabase
        .from('proposals')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'sent')
        .gte('sent_at', previousFrom)
        .lt('sent_at', currentFrom),
    ]);

    const invoicesPaidNowSum = (iPaidNow.data ?? []).reduce(
      (s: number, r: { total: number | null }) => s + Number(r.total ?? 0),
      0,
    );

    return {
      projectsCreated: counter(pCreatedNow.count ?? 0, pCreatedPrev.count ?? 0),
      projectsDelivered: counter(pDeliveredNow.count ?? 0, pDeliveredPrev.count ?? 0),
      invoicesPaid: counter(
        iPaidNow.data?.length ?? 0,
        iPaidPrev.data?.length ?? 0,
        invoicesPaidNowSum,
      ),
      contractsSigned: counter(cSignedNow.count ?? 0, cSignedPrev.count ?? 0),
      proposalsSent: counter(prSentNow.count ?? 0, prSentPrev.count ?? 0),
    };
  } catch {
    return EMPTY_VELOCITY;
  }
}
