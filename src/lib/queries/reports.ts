'use server';

import { createClient } from '@/lib/supabase/server';
import type { ProjectType, ExpenseCategory } from '@/lib/constants';
import { REVENUE_STATUSES, bucketMonthlyFinance, sumFinance } from '@/lib/finance';
import type { FinanceInvoice } from '@/lib/finance';

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
    let query = supabase
      .from('invoices')
      .select('total, status, issue_date, paid_at')
      .in('status', [...REVENUE_STATUSES]);

    if (dateRange) {
      // An invoice contributes to Revenue (issue_date) and/or Collections (paid_at),
      // so include any invoice issued OR paid within the range.
      query = query.or(
        `and(issue_date.gte.${dateRange.from},issue_date.lte.${dateRange.to}),` +
          `and(paid_at.gte.${dateRange.from},paid_at.lte.${dateRange.to})`,
      );
    }

    const { data, error } = await query;

    if (error || !data) return [];

    const monthly = bucketMonthlyFinance(data);

    if (!dateRange) return monthly;

    // Drop months that fall outside the range (an invoice paid in-range but issued
    // out-of-range, or vice versa, can produce a stray bucket).
    const fromMonth = dateRange.from.substring(0, 7);
    const toMonth = dateRange.to.substring(0, 7);
    return monthly.filter((m) => m.month >= fromMonth && m.month <= toMonth);
  } catch {
    return [];
  }
}

export async function getPaymentMethodBreakdown(
  dateRange?: DateRange,
): Promise<PaymentMethodBreakdown[]> {
  try {
    const supabase = await createClient();
    let query = supabase.from('invoices').select('total, metadata').eq('status', 'paid');

    if (dateRange) {
      query = query.gte('paid_at', dateRange.from).lte('paid_at', dateRange.to);
    }

    const { data, error } = await query;

    if (error || !data) return [];

    // Group by payment method (from metadata)
    const methodData: Record<string, { amount: number; count: number }> = {};
    data.forEach((invoice) => {
      const metadata = invoice.metadata as Record<string, unknown> | undefined;
      const method = (metadata?.payment_method as string) || 'Other';
      if (!methodData[method]) {
        methodData[method] = { amount: 0, count: 0 };
      }
      methodData[method].amount += invoice.total || 0;
      methodData[method].count += 1;
    });

    return Object.entries(methodData).map(([method, data]) => ({
      method,
      amount: data.amount,
      count: data.count,
    }));
  } catch {
    return [];
  }
}

export async function getProjectTypeBreakdown(
  dateRange?: DateRange,
): Promise<ProjectTypeBreakdown[]> {
  try {
    const supabase = await createClient();
    let query = supabase.from('projects').select('project_type').neq('status', 'archived');

    if (dateRange) {
      query = query.gte('created_at', dateRange.from).lte('created_at', dateRange.to);
    }

    const { data, error } = await query;

    if (error || !data) return [];

    // Count by type
    const typeCounts: Record<string, number> = {};
    data.forEach((project) => {
      typeCounts[project.project_type] = (typeCounts[project.project_type] || 0) + 1;
    });

    return Object.entries(typeCounts).map(([type, count]) => ({
      type: type as ProjectType,
      count,
    }));
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
    let query = supabase
      .from('invoices')
      .select(
        'client_id, total, status, issue_date, paid_at, client:clients(company_name, contact_name)',
      )
      .in('status', [...REVENUE_STATUSES]);

    if (dateRange) {
      query = query.or(
        `and(issue_date.gte.${dateRange.from},issue_date.lte.${dateRange.to}),` +
          `and(paid_at.gte.${dateRange.from},paid_at.lte.${dateRange.to})`,
      );
    }

    const { data, error } = await query;

    if (error || !data) return [];

    // Group invoices by client, then total each group via the shared helper.
    const grouped: Record<string, { name: string; invoices: FinanceInvoice[] }> = {};
    data.forEach((invoice) => {
      const clientId = invoice.client_id;
      const client = invoice.client as { company_name?: string; contact_name?: string } | undefined;
      if (!grouped[clientId]) {
        const clientName = client?.company_name || client?.contact_name || 'Unknown';
        grouped[clientId] = { name: clientName, invoices: [] };
      }
      grouped[clientId].invoices.push(invoice);
    });

    return Object.entries(grouped)
      .map(([client_id, { name, invoices }]) => {
        const { revenue, collections } = sumFinance(invoices);
        return {
          client_id,
          client_name: name,
          total_revenue: revenue,
          total_collections: collections,
          project_count: invoices.length,
        };
      })
      .sort((a, b) => b.total_revenue - a.total_revenue)
      .slice(0, limit);
  } catch {
    return [];
  }
}

export async function getExpensesByCategory(
  dateRange?: DateRange,
): Promise<ExpenseCategoryBreakdown[]> {
  try {
    const supabase = await createClient();
    let query = supabase.from('expenses').select('category, amount');

    if (dateRange) {
      query = query.gte('date', dateRange.from).lte('date', dateRange.to);
    }

    const { data, error } = await query;

    if (error || !data) return [];

    // Group by category
    const categoryData: Record<string, { amount: number; count: number }> = {};
    data.forEach((expense) => {
      const category = expense.category;
      if (!categoryData[category]) {
        categoryData[category] = { amount: 0, count: 0 };
      }
      categoryData[category].amount += expense.amount || 0;
      categoryData[category].count += 1;
    });

    return Object.entries(categoryData).map(([category, data]) => ({
      category: category as ExpenseCategory,
      amount: data.amount,
      count: data.count,
    }));
  } catch {
    return [];
  }
}

export async function getProfitMargin(
  dateRange?: DateRange,
): Promise<{ revenue: number; expenses: number; profit: number; margin: number }> {
  try {
    const supabase = await createClient();

    // Profit margin pairs accrual with accrual: Revenue (Τζίρος, issued by issue_date)
    // against expenses of the same period.
    let revenueQuery = supabase
      .from('invoices')
      .select('total, status, issue_date, paid_at')
      .in('status', [...REVENUE_STATUSES]);

    if (dateRange) {
      revenueQuery = revenueQuery.gte('issue_date', dateRange.from).lte('issue_date', dateRange.to);
    }

    let expenseQuery = supabase.from('expenses').select('amount');

    if (dateRange) {
      expenseQuery = expenseQuery.gte('date', dateRange.from).lte('date', dateRange.to);
    }

    const [{ data: revenueData }, { data: expenseData }] = await Promise.all([
      revenueQuery,
      expenseQuery,
    ]);

    const { revenue } = sumFinance(revenueData ?? []);
    const expenses = expenseData?.reduce((sum, exp) => sum + (exp.amount || 0), 0) || 0;

    const profit = revenue - expenses;
    const margin = revenue > 0 ? (profit / revenue) * 100 : 0;

    return { revenue, expenses, profit, margin };
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
