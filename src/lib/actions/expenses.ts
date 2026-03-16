'use server';

import { createClient } from '@/lib/supabase/server';
import { createExpenseSchema, updateExpenseSchema } from '@/lib/schemas/expense';
import type { ActionResult, Expense } from '@/types/index';
import type { ExpenseCategory } from '@/lib/constants';
import { revalidatePath } from 'next/cache';

interface ExpenseFilters {
  project_id?: string;
  category?: ExpenseCategory | ExpenseCategory[];
  date_from?: string;
  date_to?: string;
}

export async function getExpenses(filters?: ExpenseFilters): Promise<ActionResult<Expense[]>> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { data: null, error: 'Unauthorized' };
    let query = supabase
      .from('expenses')
      .select('id, project_id, category, description, amount, date, receipt_path, created_at')
      .order('date', { ascending: false });

    if (filters?.project_id) {
      query = query.eq('project_id', filters.project_id);
    }
    if (filters?.category) {
      if (Array.isArray(filters.category)) {
        query = query.in('category', filters.category);
      } else {
        query = query.eq('category', filters.category);
      }
    }
    if (filters?.date_from) {
      query = query.gte('date', filters.date_from);
    }
    if (filters?.date_to) {
      query = query.lte('date', filters.date_to);
    }

    const { data, error } = await query;
    if (error) return { data: null, error: error.message };
    return { data, error: null };
  } catch (err: unknown) {
    return { data: null, error: err instanceof Error ? err.message : 'Failed to fetch expenses' };
  }
}

export async function getExpense(id: string): Promise<ActionResult<Expense>> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { data: null, error: 'Unauthorized' };
    const { data, error } = await supabase
      .from('expenses')
      .select('id, project_id, category, description, amount, date, receipt_path, created_at')
      .eq('id', id)
      .single();

    if (error) return { data: null, error: error.message };
    return { data, error: null };
  } catch (err: unknown) {
    return { data: null, error: err instanceof Error ? err.message : 'Failed to fetch expense' };
  }
}

export async function createExpense(input: unknown): Promise<ActionResult<Expense>> {
  try {
    const validated = createExpenseSchema.parse(input);
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { data: null, error: 'User not authenticated' };

    const { data, error } = await supabase
      .from('expenses')
      .insert({
        ...validated,
        created_by: user.id,
      })
      .select('id, project_id, category, description, amount, date, receipt_path, created_at')
      .single();

    if (error) return { data: null, error: error.message };

    revalidatePath('/admin/expenses');
    if (validated.project_id) {
      revalidatePath(`/admin/projects/${validated.project_id}`);
    }
    return { data, error: null };
  } catch (error) {
    if (error instanceof Error) {
      return { data: null, error: error.message };
    }
    return { data: null, error: 'Failed to create expense' };
  }
}

export async function updateExpense(id: string, input: unknown): Promise<ActionResult<Expense>> {
  try {
    const validated = updateExpenseSchema.parse(input);
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { data: null, error: 'Unauthorized' };
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('id', user.id)
      .single();
    if (!profile || !['super_admin', 'admin'].includes(profile.role)) {
      return { data: null, error: 'Forbidden: admin access required' };
    }

    const { data, error } = await supabase
      .from('expenses')
      .update(validated)
      .eq('id', id)
      .select('id, project_id, category, description, amount, date, receipt_path, created_at')
      .single();

    if (error) return { data: null, error: error.message };

    revalidatePath('/admin/expenses');
    if (data?.project_id) {
      revalidatePath(`/admin/projects/${data.project_id}`);
    }
    return { data, error: null };
  } catch (error) {
    if (error instanceof Error) {
      return { data: null, error: error.message };
    }
    return { data: null, error: 'Failed to update expense' };
  }
}

export async function deleteExpense(id: string): Promise<ActionResult<void>> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { data: null, error: 'Unauthorized' };
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('id', user.id)
      .single();
    if (!profile || !['super_admin', 'admin'].includes(profile.role)) {
      return { data: null, error: 'Forbidden: admin access required' };
    }

    const { data: expense } = await supabase
      .from('expenses')
      .select('project_id')
      .eq('id', id)
      .single();

    const { error } = await supabase.from('expenses').delete().eq('id', id);

    if (error) return { data: null, error: error.message };

    revalidatePath('/admin/expenses');
    if (expense?.project_id) {
      revalidatePath(`/admin/projects/${expense.project_id}`);
    }
    return { data: undefined, error: null };
  } catch (err: unknown) {
    return { data: null, error: err instanceof Error ? err.message : 'Failed to delete expense' };
  }
}
