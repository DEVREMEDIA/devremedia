/* eslint-disable @typescript-eslint/no-explicit-any */
'use server';

import { createClient } from '@/lib/supabase/server';
import type { RiskItem } from '@/types/dashboard';
import { ageDays, daysAgoIso, daysAheadIso, getDashboardThresholds, todayIso } from './_utils';

export async function getRiskItems(): Promise<RiskItem[]> {
  try {
    const supabase = await createClient();
    const t = await getDashboardThresholds();
    const today = todayIso();

    const [overdueInv, staleLeads, staleDeliv, unsigned, deadlineRisk, filmingNoCrew] =
      await Promise.all([
        supabase
          .from('invoices')
          .select('id, invoice_number, total, due_date, client:clients(contact_name)')
          .or(`status.eq.overdue,and(status.in.(sent,viewed),due_date.lt.${today})`),
        supabase
          .from('leads')
          .select('id, contact_name, company_name, stage, last_contacted_at, created_at')
          .in('stage', ['contacted', 'qualified', 'proposal', 'negotiation']),
        supabase
          .from('deliverables')
          .select('id, title, project_id, created_at, project:projects(title)')
          .eq('status', 'pending_review')
          .lt('created_at', daysAgoIso(t.stale_deliverable_days)),
        supabase
          .from('contracts')
          .select('id, title, sent_at, client:clients(contact_name)')
          .in('status', ['sent', 'viewed'])
          .lt('sent_at', daysAgoIso(t.stale_contract_days)),
        supabase
          .from('projects')
          .select('id, title, deadline, status')
          .gte('deadline', today)
          .lte('deadline', daysAheadIso(t.deadline_risk_days))
          .not('status', 'in', '(review,delivered,archived)'),
        supabase
          .from('calendar_events')
          .select('id, title, start_date')
          .eq('event_type', 'filming')
          .is('assigned_to', null)
          .gte('start_date', today),
      ]);

    const items: RiskItem[] = [];

    (overdueInv.data ?? []).forEach((row: any) => {
      const client = Array.isArray(row.client) ? row.client[0] : row.client;
      items.push({
        id: `overdue-${row.id}`,
        type: 'overdue_invoice',
        severity: 1,
        title: `Invoice ${row.invoice_number}`,
        subtitle: `${client?.contact_name ?? '—'} · €${Number(row.total ?? 0).toFixed(2)}`,
        ageDays: row.due_date ? ageDays(row.due_date) : 0,
        href: `/admin/invoices/${row.id}`,
      });
    });

    (staleLeads.data ?? []).forEach((row: any) => {
      const lastTouch = row.last_contacted_at ?? row.created_at;
      const age = ageDays(lastTouch);
      if (age < t.stale_lead_days) return;
      items.push({
        id: `stale-lead-${row.id}`,
        type: 'stale_lead',
        severity: 3,
        title: row.contact_name ?? row.company_name ?? 'Lead',
        subtitle: `${row.stage} · no activity ${age}d`,
        ageDays: age,
        href: `/admin/leads/${row.id}`,
      });
    });

    (staleDeliv.data ?? []).forEach((row: any) => {
      const project = Array.isArray(row.project) ? row.project[0] : row.project;
      items.push({
        id: `stale-deliv-${row.id}`,
        type: 'stale_deliverable',
        severity: 2,
        title: row.title,
        subtitle: project?.title ?? undefined,
        ageDays: ageDays(row.created_at),
        href: `/admin/projects/${row.project_id}`,
      });
    });

    (unsigned.data ?? []).forEach((row: any) => {
      const client = Array.isArray(row.client) ? row.client[0] : row.client;
      items.push({
        id: `unsigned-${row.id}`,
        type: 'unsigned_contract',
        severity: 2,
        title: row.title,
        subtitle: client?.contact_name ?? undefined,
        ageDays: row.sent_at ? ageDays(row.sent_at) : 0,
        href: `/admin/contracts/${row.id}`,
      });
    });

    (deadlineRisk.data ?? []).forEach((row: any) => {
      const days = ageDays(row.deadline);
      const remaining = -days;
      items.push({
        id: `deadline-${row.id}`,
        type: 'deadline_risk',
        severity: 2,
        title: row.title,
        subtitle: `${row.status} · deadline in ${Math.abs(remaining)}d`,
        ageDays: 0,
        href: `/admin/projects/${row.id}`,
      });
    });

    (filmingNoCrew.data ?? []).forEach((row: any) => {
      items.push({
        id: `nocrew-${row.id}`,
        type: 'filming_no_crew',
        severity: 2,
        title: row.title,
        subtitle: 'No crew assigned',
        ageDays: 0,
        href: '/admin/calendar',
      });
    });

    items.sort((a, b) => a.severity - b.severity || b.ageDays - a.ageDays);
    return items;
  } catch {
    return [];
  }
}
