'use server';

import { createClient } from '@/lib/supabase/server';
import { createInvoiceSchema, updateInvoiceSchema, type LineItem } from '@/lib/schemas/invoice';
import type { ActionResult, Invoice, InvoiceWithRelations } from '@/types/index';
import type { InvoiceStatus } from '@/lib/constants';
import { revalidatePath } from 'next/cache';
import { syncEntityToGoogle } from '@/lib/google-sync-helper';
import { countBulkOutcome } from '@/lib/bulk-result';
import { getGoogleColorId } from '@/lib/google-calendar';
import { applyStatusChange } from '@/lib/apply-status-change';

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
        'id, project_id, client_id, invoice_number, issue_date, due_date, status, subtotal, tax_amount, total, currency, line_items, notes, tax_rate, sent_at, viewed_at, paid_at, created_by, created_at, updated_at, file_path, client:clients(id, contact_name, company_name, email, phone, address, vat_number, avatar_url, notes, status, user_id, created_at, updated_at), project:projects(id, title, client_id, description, project_type, status, priority, budget, deadline, start_date, created_at, updated_at)',
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
        'id, project_id, client_id, invoice_number, issue_date, due_date, status, subtotal, tax_amount, total, currency, line_items, notes, tax_rate, sent_at, viewed_at, paid_at, created_by, created_at, updated_at, file_path, client:clients(id, contact_name, company_name, email, phone, address, vat_number, avatar_url, notes, status, user_id, created_at, updated_at), project:projects(id, title, client_id, description, project_type, status, priority, budget, deadline, start_date, created_at, updated_at)',
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
        'id, project_id, client_id, invoice_number, issue_date, due_date, status, subtotal, tax_amount, total, currency, line_items, notes, tax_rate, sent_at, viewed_at, paid_at, created_by, created_at, updated_at, file_path, client:clients(id, contact_name, company_name, email, phone, address, vat_number, avatar_url, notes, status, user_id, created_at, updated_at), project:projects(id, title, client_id, description, project_type, status, priority, budget, deadline, start_date, created_at, updated_at)',
      )
      .single();

    if (error) return { data: null, error: error.message };

    revalidatePath('/admin/invoices');
    revalidatePath('/client/invoices');
    revalidatePath('/client/dashboard');
    if (data.due_date) {
      await syncEntityToGoogle({
        entityType: 'invoice',
        entityId: data.id,
        operation: 'create',
        eventData: {
          title: `Invoice Due: ${data.invoice_number}`,
          startDate: data.due_date,
          allDay: true,
          colorId: getGoogleColorId('invoice'),
        },
      });
    }
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
        'id, project_id, client_id, invoice_number, issue_date, due_date, status, subtotal, tax_amount, total, currency, line_items, notes, tax_rate, sent_at, viewed_at, paid_at, created_by, created_at, updated_at, file_path, client:clients(id, contact_name, company_name, email, phone, address, vat_number, avatar_url, notes, status, user_id, created_at, updated_at), project:projects(id, title, client_id, description, project_type, status, priority, budget, deadline, start_date, created_at, updated_at)',
      )
      .single();

    if (error) return { data: null, error: error.message };

    revalidatePath('/admin/invoices');
    revalidatePath(`/admin/invoices/${id}`);
    revalidatePath('/client/invoices');
    revalidatePath('/client/dashboard');
    if (data.due_date) {
      await syncEntityToGoogle({
        entityType: 'invoice',
        entityId: data.id,
        operation: 'update',
        eventData: {
          title: `Invoice Due: ${data.invoice_number}`,
          startDate: data.due_date,
          allDay: true,
          colorId: getGoogleColorId('invoice'),
        },
      });
    }
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
        'id, project_id, client_id, invoice_number, issue_date, due_date, status, subtotal, tax_amount, total, currency, line_items, notes, tax_rate, sent_at, viewed_at, paid_at, file_path, created_by, created_at, updated_at',
      )
      .single();

    if (error) return { data: null, error: error.message };

    await applyStatusChange({
      entity: 'invoice',
      status,
      ctx: {
        entityId: id,
        clientId: data.client_id,
        invoiceNumber: data.invoice_number,
        total: data.total,
        currency: data.currency,
        dueDate: data.due_date,
      },
    });

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

    // Fetch file_path before deleting
    const { data: invoice } = await supabase
      .from('invoices')
      .select('file_path')
      .eq('id', id)
      .single();

    // Clean up Storage file if exists
    if (invoice?.file_path) {
      await supabase.storage.from('invoices').remove([invoice.file_path]);
    }

    const { error } = await supabase.from('invoices').delete().eq('id', id);

    if (error) return { data: null, error: error.message };

    revalidatePath('/admin/invoices');
    revalidatePath('/client/invoices');
    revalidatePath('/client/dashboard');
    await syncEntityToGoogle({
      entityType: 'invoice',
      entityId: id,
      operation: 'delete',
    });
    return { data: undefined, error: null };
  } catch (err: unknown) {
    return { data: null, error: err instanceof Error ? err.message : 'Failed to delete invoice' };
  }
}

export async function bulkUpdateInvoiceStatus(
  ids: string[],
  status: InvoiceStatus,
): Promise<ActionResult<{ succeeded: number; failed: number }>> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { data: null, error: 'Unauthorized' };

    const updateData: Record<string, unknown> = { status };
    const nowIso = new Date().toISOString();
    if (status === 'sent') updateData.sent_at = nowIso;
    if (status === 'paid') updateData.paid_at = nowIso;

    const { data, error } = await supabase
      .from('invoices')
      .update(updateData)
      .in('id', ids)
      .select('id, client_id, invoice_number, total, currency, due_date');

    if (error) return { data: null, error: error.message };

    const affected = data ?? [];
    const { succeeded, failed } = countBulkOutcome(
      ids,
      affected.map((inv) => inv.id),
    );

    // Route each affected invoice through the orchestrator (Option A: side-effects
    // preserved in aggregate, one fewer copy). Note: this also revalidates each
    // invoice's detail path — a harmless cache-only superset vs. the old 3-path set.
    for (const inv of affected) {
      await applyStatusChange({
        entity: 'invoice',
        status,
        ctx: {
          entityId: inv.id,
          clientId: inv.client_id,
          invoiceNumber: inv.invoice_number,
          total: inv.total,
          currency: inv.currency,
          dueDate: inv.due_date,
        },
      });
    }

    return { data: { succeeded, failed }, error: null };
  } catch (err: unknown) {
    return {
      data: null,
      error: err instanceof Error ? err.message : 'Failed to bulk update invoices',
    };
  }
}

export async function bulkDeleteInvoices(
  ids: string[],
): Promise<ActionResult<{ succeeded: number; failed: number }>> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { data: null, error: 'Unauthorized' };

    // Fetch file_paths for Storage cleanup (one round-trip).
    const { data: rows } = await supabase.from('invoices').select('id, file_path').in('id', ids);

    const filePaths = (rows ?? []).map((r) => r.file_path).filter((p): p is string => Boolean(p));
    if (filePaths.length > 0) {
      await supabase.storage.from('invoices').remove(filePaths);
    }

    const { data: deleted, error } = await supabase
      .from('invoices')
      .delete()
      .in('id', ids)
      .select('id');

    if (error) return { data: null, error: error.message };

    const deletedIds = (deleted ?? []).map((r) => r.id);
    const { succeeded, failed } = countBulkOutcome(ids, deletedIds);

    revalidatePath('/admin/invoices');
    revalidatePath('/client/invoices');
    revalidatePath('/client/dashboard');

    for (const id of deletedIds) {
      await syncEntityToGoogle({ entityType: 'invoice', entityId: id, operation: 'delete' });
    }

    return { data: { succeeded, failed }, error: null };
  } catch (err: unknown) {
    return {
      data: null,
      error: err instanceof Error ? err.message : 'Failed to bulk delete invoices',
    };
  }
}
