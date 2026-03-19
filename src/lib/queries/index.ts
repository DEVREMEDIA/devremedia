'use server';

import { createClient } from '@/lib/supabase/server';
import type { ProjectStatus } from '@/lib/constants';
import type { ActivityLog, ProjectWithClient } from '@/types';

export async function getClientCount(): Promise<number> {
  try {
    const supabase = await createClient();
    const { count, error } = await supabase
      .from('clients')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'active');

    if (error) return 0;
    return count || 0;
  } catch {
    return 0;
  }
}

export async function getProjectCount(status?: ProjectStatus): Promise<number> {
  try {
    const supabase = await createClient();
    let query = supabase.from('projects').select('*', { count: 'exact', head: true });

    if (status) {
      query = query.eq('status', status);
    } else {
      query = query.neq('status', 'archived');
    }

    const { count, error } = await query;

    if (error) return 0;
    return count || 0;
  } catch {
    return 0;
  }
}

export async function getPendingInvoiceCount(): Promise<number> {
  try {
    const supabase = await createClient();
    const { count, error } = await supabase
      .from('invoices')
      .select('*', { count: 'exact', head: true })
      .in('status', ['sent', 'viewed', 'overdue']);

    if (error) return 0;
    return count || 0;
  } catch {
    return 0;
  }
}

export async function getUnreadMessageCount(userId: string): Promise<number> {
  try {
    const supabase = await createClient();
    const { count, error } = await supabase
      .from('messages')
      .select('*', { count: 'exact', head: true })
      .not('read_by', 'cs', JSON.stringify([userId]))
      .neq('sender_id', userId);

    if (error) return 0;
    return count || 0;
  } catch {
    return 0;
  }
}

export async function getTotalRevenue(year?: number): Promise<number> {
  try {
    const supabase = await createClient();
    let query = supabase.from('invoices').select('total').eq('status', 'paid');

    if (year) {
      const startDate = `${year}-01-01`;
      const endDate = `${year}-12-31`;
      query = query.gte('paid_at', startDate).lte('paid_at', endDate);
    }

    const { data, error } = await query;

    if (error || !data) return 0;
    return data.reduce((sum, invoice) => sum + (invoice.total || 0), 0);
  } catch {
    return 0;
  }
}

export async function getTotalExpenses(projectId?: string): Promise<number> {
  try {
    const supabase = await createClient();
    let query = supabase.from('expenses').select('amount');

    if (projectId) {
      query = query.eq('project_id', projectId);
    }

    const { data, error } = await query;

    if (error || !data) return 0;
    return data.reduce((sum, expense) => sum + (expense.amount || 0), 0);
  } catch {
    return 0;
  }
}

export async function getRecentActivity(limit: number = 10): Promise<ActivityLog[]> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('activity_logs')
      .select('*, user:user_profiles(*)')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error || !data) return [];
    return data as ActivityLog[];
  } catch {
    return [];
  }
}

export async function getUpcomingDeadlines(limit: number = 5): Promise<ProjectWithClient[]> {
  try {
    const supabase = await createClient();
    const today = new Date().toISOString().split('T')[0];

    const { data, error } = await supabase
      .from('projects')
      .select('*, client:clients(*)')
      .gte('deadline', today)
      .neq('status', 'archived')
      .neq('status', 'delivered')
      .order('deadline', { ascending: true })
      .limit(limit);

    if (error || !data) return [];
    return data as ProjectWithClient[];
  } catch {
    return [];
  }
}

export async function getProjectsByStatus(): Promise<Record<ProjectStatus, number>> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('projects')
      .select('status')
      .neq('status', 'archived');

    if (error || !data) {
      return {
        briefing: 0,
        pre_production: 0,
        filming: 0,
        editing: 0,
        review: 0,
        revisions: 0,
        delivered: 0,
        archived: 0,
      };
    }

    const counts: Record<string, number> = {};
    data.forEach((project) => {
      counts[project.status] = (counts[project.status] || 0) + 1;
    });

    return {
      briefing: counts.briefing || 0,
      pre_production: counts.pre_production || 0,
      filming: counts.filming || 0,
      editing: counts.editing || 0,
      review: counts.review || 0,
      revisions: counts.revisions || 0,
      delivered: counts.delivered || 0,
      archived: counts.archived || 0,
    };
  } catch {
    return {
      briefing: 0,
      pre_production: 0,
      filming: 0,
      editing: 0,
      review: 0,
      revisions: 0,
      delivered: 0,
      archived: 0,
    };
  }
}
