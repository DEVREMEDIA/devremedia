'use server';

import { createClient } from '@/lib/supabase/server';
import { createInvoiceSchema, updateInvoiceSchema, type LineItem } from '@/lib/schemas/invoice';
import type { ActionResult, Invoice, InvoiceWithRelations } from '@/types/index';
import type { InvoiceStatus } from '@/lib/constants';
import { revalidatePath } from 'next/cache';

interface InvoiceFilters {
  status?: InvoiceStatus | InvoiceStatus[];
  client_id?: string;
  project_id?: string;
  issue_date_from?: string;
  issue_date_to?: string;
}

export async function getInvoices(
  filters?: InvoiceFilters,
): Promise<ActionResult<InvoiceWithRelations[]>> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { data: null, error: 'Unauthorized' };
    let query = supabase
      .from('invoices')
      .select(
        'id, project_id, client_id, invoice_number, issue_date, due_date, status, subtotal, tax_amount, total, currency, line_items, notes, terms, tax_rate, sent_at, viewed_at, paid_at, created_by, created_at, updated_at, client:clients(id, contact_name, company_name, email, phone, address, vat_number, avatar_url, notes, status, user_id, created_at, updated_at), project:projects(id, title, client_id, description, project_type, status, priority, budget, deadline, start_date, created_at, updated_at)',
      )
      .order('created_at', { ascending: false });

    if (filters?.status) {
      if (Array.isArray(filters.status)) {
        query = query.in('status', filters.status);
      } else {
        query = query.eq('status', filters.status);
      }
    }
    if (filters?.client_id) {
      query = query.eq('client_id', filters.client_id);
    }
    if (filters?.project_id) {
      query = query.eq('project_id', filters.project_id);
    }
    if (filters?.issue_date_from) {
      query = query.gte('issue_date', filters.issue_date_from);
    }
    if (filters?.issue_date_to) {
      query = query.lte('issue_date', filters.issue_date_to);
    }

    const { data, error } = await query;
    if (error) return { data: null, error: error.message };
    return { data: data as unknown as InvoiceWithRelations[], error: null };
  } catch (err: unknown) {
    return { data: null, error: err instanceof Error ? err.message : 'Failed to fetch invoices' };
  }
}

export async function getInvoice(id: string): Promise<ActionResult<InvoiceWithRelations>> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { data: null, error: 'Unauthorized' };
    const { data, error } = await supabase
      .from('invoices')
      .select(
        'id, project_id, client_id, invoice_number, issue_date, due_date, status, subtotal, tax_amount, total, currency, line_items, notes, terms, tax_rate, sent_at, viewed_at, paid_at, created_by, created_at, updated_at, client:clients(id, contact_name, company_name, email, phone, address, vat_number, avatar_url, notes, status, user_id, created_at, updated_at), project:projects(id, title, client_id, description, project_type, status, priority, budget, deadline, start_date, created_at, updated_at)',
      )
      .eq('id', id)
      .single();

    if (error) return { data: null, error: error.message };
    return { data: data as unknown as InvoiceWithRelations, error: null };
  } catch (err: unknown) {
    return { data: null, error: err instanceof Error ? err.message : 'Failed to fetch invoice' };
  }
}

export async function getNextInvoiceNumber(): Promise<string> {
  try {
    const supabase = await createClient();
    const currentYear = new Date().getFullYear();

    const { data } = await supabase
      .from('invoices')
      .select('invoice_number')
      .like('invoice_number', `DMS-${currentYear}-%`)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (!data) {
      return `DMS-${currentYear}-001`;
    }

    const lastNumber = parseInt(data.invoice_number.split('-')[2] || '0', 10);
    const nextNumber = (lastNumber + 1).toString().padStart(3, '0');
    return `DMS-${currentYear}-${nextNumber}`;
  } catch {
    const currentYear = new Date().getFullYear();
    return `DMS-${currentYear}-001`;
  }
}

export async function createInvoice(input: unknown): Promise<ActionResult<InvoiceWithRelations>> {
  try {
    const validated = createInvoiceSchema.parse(input);
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { data: null, error: 'User not authenticated' };

    const invoiceNumber = await getNextInvoiceNumber();

    const subtotal = validated.line_items.reduce(
      (sum: number, item: LineItem) => sum + item.quantity * item.unit_price,
      0,
    );
    const taxAmount = subtotal * (validated.tax_rate / 100);
    const total = subtotal + taxAmount;

    const { data, error } = await supabase
      .from('invoices')
      .insert({
        ...validated,
        invoice_number: invoiceNumber,
        subtotal,
        tax_amount: taxAmount,
        total,
        status: 'draft',
        created_by: user.id,
      })
      .select(
        'id, project_id, client_id, invoice_number, issue_date, due_date, status, subtotal, tax_amount, total, currency, line_items, notes, terms, tax_rate, sent_at, viewed_at, paid_at, created_by, created_at, updated_at, client:clients(id, contact_name, company_name, email, phone, address, vat_number, avatar_url, notes, status, user_id, created_at, updated_at), project:projects(id, title, client_id, description, project_type, status, priority, budget, deadline, start_date, created_at, updated_at)',
      )
      .single();

    if (error) return { data: null, error: error.message };

    revalidatePath('/admin/invoices');
    revalidatePath('/client/invoices');
    revalidatePath('/client/dashboard');
    return { data: data as unknown as InvoiceWithRelations, error: null };
  } catch (err: unknown) {
    if (err instanceof Error) {
      return { data: null, error: err.message };
    }
    return { data: null, error: 'Failed to create invoice' };
  }
}

export async function updateInvoice(
  id: string,
  input: unknown,
): Promise<ActionResult<InvoiceWithRelations>> {
  try {
    const validated = updateInvoiceSchema.parse(input);
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { data: null, error: 'Unauthorized' };

    let updateData: Record<string, unknown> = { ...validated };

    if (validated.line_items) {
      const subtotal = validated.line_items.reduce(
        (sum: number, item: LineItem) => sum + item.quantity * item.unit_price,
        0,
      );
      const taxRate = validated.tax_rate ?? 24;
      const taxAmount = subtotal * (taxRate / 100);
      const total = subtotal + taxAmount;

      updateData = {
        ...updateData,
        subtotal,
        tax_amount: taxAmount,
        total,
      };
    }

    const { data, error } = await supabase
      .from('invoices')
      .update(updateData)
      .eq('id', id)
      .select(
        'id, project_id, client_id, invoice_number, issue_date, due_date, status, subtotal, tax_amount, total, currency, line_items, notes, terms, tax_rate, sent_at, viewed_at, paid_at, created_by, created_at, updated_at, client:clients(id, contact_name, company_name, email, phone, address, vat_number, avatar_url, notes, status, user_id, created_at, updated_at), project:projects(id, title, client_id, description, project_type, status, priority, budget, deadline, start_date, created_at, updated_at)',
      )
      .single();

    if (error) return { data: null, error: error.message };

    revalidatePath('/admin/invoices');
    revalidatePath(`/admin/invoices/${id}`);
    revalidatePath('/client/invoices');
    revalidatePath('/client/dashboard');
    return { data: data as unknown as InvoiceWithRelations, error: null };
  } catch (err: unknown) {
    if (err instanceof Error) {
      return { data: null, error: err.message };
    }
    return { data: null, error: 'Failed to update invoice' };
  }
}

export async function updateInvoiceStatus(
  id: string,
  status: InvoiceStatus,
): Promise<ActionResult<Invoice>> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { data: null, error: 'Unauthorized' };

    const updateData: Record<string, unknown> = { status };

    if (status === 'sent' && !updateData.sent_at) {
      updateData.sent_at = new Date().toISOString();
    }
    if (status === 'paid' && !updateData.paid_at) {
      updateData.paid_at = new Date().toISOString();
    }

    const { data, error } = await supabase
      .from('invoices')
      .update(updateData)
      .eq('id', id)
      .select(
        'id, project_id, client_id, invoice_number, issue_date, due_date, status, subtotal, tax_amount, total, currency, line_items, notes, terms, tax_rate, sent_at, viewed_at, paid_at, created_by, created_at, updated_at',
      )
      .single();

    if (error) return { data: null, error: error.message };

    revalidatePath('/admin/invoices');
    revalidatePath(`/admin/invoices/${id}`);
    revalidatePath('/client/invoices');
    revalidatePath('/client/dashboard');
    return { data, error: null };
  } catch (err: unknown) {
    return {
      data: null,
      error: err instanceof Error ? err.message : 'Failed to update invoice status',
    };
  }
}

export async function deleteInvoice(id: string): Promise<ActionResult<void>> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { data: null, error: 'Unauthorized' };
    const { error } = await supabase.from('invoices').delete().eq('id', id);

    if (error) return { data: null, error: error.message };

    revalidatePath('/admin/invoices');
    return { data: undefined, error: null };
  } catch (err: unknown) {
    return { data: null, error: err instanceof Error ? err.message : 'Failed to delete invoice' };
  }
}
