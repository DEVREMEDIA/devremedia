'use server';

import { createClient } from '@/lib/supabase/server';
import type { BusinessVelocity, VelocityCounter } from '@/types/dashboard';

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

export async function getBusinessVelocity(periodDays = 7): Promise<BusinessVelocity> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.rpc('get_business_velocity', {
      p_period_days: periodDays,
    });
    if (error || !data) return EMPTY_VELOCITY;
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
    return EMPTY_VELOCITY;
  }
}
