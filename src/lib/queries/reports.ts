'use server';

import { createClient } from '@/lib/supabase/server';
import type { ProjectType, ExpenseCategory } from '@/lib/constants';

export type DateRange = {
  from: string;
  to: string;
};

export type MonthlyRevenue = {
  month: string;
  revenue: number; // Τζίρος — issued invoices by issue_date
  collections: number; // Εισπράξεις — paid invoices by paid_at
};

export type PaymentMethodBreakdown = {
  method: string;
  amount: number;
  count: number;
};

export type ProjectTypeBreakdown = {
  type: ProjectType;
  count: number;
};

export type ClientRevenue = {
  client_id: string;
  client_name: string;
  total_revenue: number; // Τζίρος — issued invoices by issue_date
  total_collections: number; // Εισπράξεις — paid invoices by paid_at
  project_count: number;
};

export type ExpenseCategoryBreakdown = {
  category: ExpenseCategory;
  amount: number;
  count: number;
};

export async function getMonthlyRevenue(dateRange?: DateRange): Promise<MonthlyRevenue[]> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.rpc('get_monthly_revenue', {
      p_from: dateRange?.from ?? null,
      p_to: dateRange?.to ?? null,
    });
    if (error || !data) return [];
    return data as MonthlyRevenue[];
  } catch {
    return [];
  }
}

export async function getPaymentMethodBreakdown(
  dateRange?: DateRange,
): Promise<PaymentMethodBreakdown[]> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.rpc('get_payment_method_breakdown', {
      p_from: dateRange?.from ?? null,
      p_to: dateRange?.to ?? null,
    });
    if (error || !data) return [];
    return data as PaymentMethodBreakdown[];
  } catch {
    return [];
  }
}

export async function getProjectTypeBreakdown(
  dateRange?: DateRange,
): Promise<ProjectTypeBreakdown[]> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.rpc('get_project_type_breakdown', {
      p_from: dateRange?.from ?? null,
      p_to: dateRange?.to ?? null,
    });
    if (error || !data) return [];
    return data as ProjectTypeBreakdown[];
  } catch {
    return [];
  }
}

export async function getTopClientsByRevenue(
  limit: number = 10,
  dateRange?: DateRange,
): Promise<ClientRevenue[]> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.rpc('get_top_clients_by_revenue', {
      p_limit: limit,
      p_from: dateRange?.from ?? null,
      p_to: dateRange?.to ?? null,
    });
    if (error || !data) return [];
    return data as ClientRevenue[];
  } catch {
    return [];
  }
}

export async function getExpensesByCategory(
  dateRange?: DateRange,
): Promise<ExpenseCategoryBreakdown[]> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.rpc('get_expenses_by_category', {
      p_from: dateRange?.from ?? null,
      p_to: dateRange?.to ?? null,
    });
    if (error || !data) return [];
    return data as ExpenseCategoryBreakdown[];
  } catch {
    return [];
  }
}

export async function getProfitMargin(
  dateRange?: DateRange,
): Promise<{ revenue: number; expenses: number; profit: number; margin: number }> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.rpc('get_profit_margin', {
      p_from: dateRange?.from ?? null,
      p_to: dateRange?.to ?? null,
    });
    if (error || !data) return { revenue: 0, expenses: 0, profit: 0, margin: 0 };
    return data as { revenue: number; expenses: number; profit: number; margin: number };
  } catch {
    return { revenue: 0, expenses: 0, profit: 0, margin: 0 };
  }
}

export async function getAverageProjectDuration(): Promise<number> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('projects')
      .select('start_date, deadline')
      .eq('status', 'delivered')
      .not('start_date', 'is', null)
      .not('deadline', 'is', null);

    if (error || !data || data.length === 0) return 0;

    const durations = data.map((project) => {
      const start = new Date(project.start_date!);
      const end = new Date(project.deadline!);
      return Math.floor((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    });

    return Math.round(durations.reduce((sum, d) => sum + d, 0) / durations.length);
  } catch {
    return 0;
  }
}
