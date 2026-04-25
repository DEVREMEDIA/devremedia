'use server';

import { createClient } from '@/lib/supabase/server';
import type { BusinessVelocity, VelocityCounter } from '@/types/dashboard';
import { daysAgoIso } from './_utils';

const EMPTY: VelocityCounter = { count: 0, deltaVsPrevious: 0 };

export async function getBusinessVelocity(periodDays = 7): Promise<BusinessVelocity> {
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

    const counter = (now: number, prev: number, sum?: number): VelocityCounter => ({
      count: now,
      sum,
      deltaVsPrevious: now - prev,
    });

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
    return {
      projectsCreated: EMPTY,
      projectsDelivered: EMPTY,
      invoicesPaid: EMPTY,
      contractsSigned: EMPTY,
      proposalsSent: EMPTY,
    };
  }
}
