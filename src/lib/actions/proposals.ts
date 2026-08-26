'use server';

import { requireAdmin } from '@/lib/auth-helpers';
import { proposalSchema, updateProposalSchema } from '@/lib/schemas/proposal';
import type {
  ActionResult,
  Proposal,
  ProposalSelectedPackage,
  ProposalStatus,
  ProposalWithRelations,
} from '@/types/index';
import { revalidatePath } from 'next/cache';

function normaliseSelected(raw: unknown): ProposalSelectedPackage[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((x): ProposalSelectedPackage | null => {
      if (typeof x !== 'object' || x === null) return null;
      const o = x as Record<string, unknown>;
      if (typeof o.package_id !== 'string') return null;
      return {
        package_id: o.package_id,
        price_override: o.price_override == null ? null : Number(o.price_override),
        label_override: typeof o.label_override === 'string' ? o.label_override : null,
      };
    })
    .filter((x): x is ProposalSelectedPackage => x !== null);
}

function shape(row: Record<string, unknown>): Proposal {
  return {
    id: String(row.id),
    lead_id: (row.lead_id as string | null) ?? null,
    client_id: (row.client_id as string | null) ?? null,
    status: (row.status as ProposalStatus) ?? 'draft',
    client_name: String(row.client_name ?? ''),
    competitive_advantage: (row.competitive_advantage as string | null) ?? null,
    client_need: (row.client_need as string | null) ?? null,
    selected_packages: normaliseSelected(row.selected_packages),
    include_discount: Boolean(row.include_discount),
    valid_until: (row.valid_until as string | null) ?? null,
    pdf_path: (row.pdf_path as string | null) ?? null,
    notes: (row.notes as string | null) ?? null,
    locale: ((row.locale as string) === 'en' ? 'en' : 'el') as 'el' | 'en',
    sent_at: (row.sent_at as string | null) ?? null,
    responded_at: (row.responded_at as string | null) ?? null,
    created_by: (row.created_by as string | null) ?? null,
    created_at: String(row.created_at),
    updated_at: String(row.updated_at),
  };
}

const SELECT_WITH_RELATIONS = `
  *,
  lead:leads(id, company_name, contact_name),
  client:clients(id, company_name, contact_name)
`;

function shapeWithRel(row: Record<string, unknown>): ProposalWithRelations {
  const base = shape(row);
  const lead = row.lead as
    | { id: string; company_name: string | null; contact_name: string | null }
    | { id: string; company_name: string | null; contact_name: string | null }[]
    | null;
  const client = row.client as
    | { id: string; company_name: string | null; contact_name: string | null }
    | { id: string; company_name: string | null; contact_name: string | null }[]
    | null;
  return {
    ...base,
    lead: Array.isArray(lead) ? (lead[0] ?? null) : lead,
    client: Array.isArray(client) ? (client[0] ?? null) : client,
  };
}

// ---------------------------------------------------------------------
// Read
// ---------------------------------------------------------------------

export async function getProposals(filters?: {
  status?: ProposalStatus;
  lead_id?: string;
  client_id?: string;
}): Promise<ActionResult<ProposalWithRelations[]>> {
  try {
    const { supabase, error: authErr } = await requireAdmin();
    if (authErr) return { data: null, error: authErr };

    let query = supabase
      .from('proposals')
      .select(SELECT_WITH_RELATIONS)
      .order('created_at', { ascending: false });

    if (filters?.status) query = query.eq('status', filters.status);
    if (filters?.lead_id) query = query.eq('lead_id', filters.lead_id);
    if (filters?.client_id) query = query.eq('client_id', filters.client_id);

    const { data, error } = await query;
    if (error) return { data: null, error: error.message };
    return {
      data: (data ?? []).map((r) => shapeWithRel(r as Record<string, unknown>)),
      error: null,
    };
  } catch (err) {
    return {
      data: null,
      error: err instanceof Error ? err.message : 'Failed to fetch proposals',
    };
  }
}

export async function getProposal(id: string): Promise<ActionResult<ProposalWithRelations>> {
  try {
    const { supabase, error: authErr } = await requireAdmin();
    if (authErr) return { data: null, error: authErr };

    const { data, error } = await supabase
      .from('proposals')
      .select(SELECT_WITH_RELATIONS)
      .eq('id', id)
      .single();
    if (error) return { data: null, error: error.message };
    return { data: shapeWithRel(data as Record<string, unknown>), error: null };
  } catch (err) {
    return {
      data: null,
      error: err instanceof Error ? err.message : 'Failed to fetch proposal',
    };
  }
}

// ---------------------------------------------------------------------
// Mutations
// ---------------------------------------------------------------------

export async function createProposal(input: unknown): Promise<ActionResult<Proposal>> {
  try {
    const validated = proposalSchema.parse(input);
    const { supabase, user, error: authErr } = await requireAdmin();
    if (authErr || !user) return { data: null, error: authErr ?? 'Unauthorized' };

    const { data, error } = await supabase
      .from('proposals')
      .insert({ ...validated, created_by: user.id })
      .select('*')
      .single();

    if (error) return { data: null, error: error.message };
    revalidatePath('/admin/clients');
    return { data: shape(data as Record<string, unknown>), error: null };
  } catch (err) {
    return {
      data: null,
      error: err instanceof Error ? err.message : 'Failed to create proposal',
    };
  }
}

export async function updateProposal(id: string, input: unknown): Promise<ActionResult<Proposal>> {
  try {
    const validated = updateProposalSchema.parse(input);
    const { supabase, error: authErr } = await requireAdmin();
    if (authErr) return { data: null, error: authErr };

    const { data, error } = await supabase
      .from('proposals')
      .update(validated)
      .eq('id', id)
      .select('*')
      .single();

    if (error) return { data: null, error: error.message };
    revalidatePath('/admin/clients');
    revalidatePath(`/admin/proposals/${id}`);
    return { data: shape(data as Record<string, unknown>), error: null };
  } catch (err) {
    return {
      data: null,
      error: err instanceof Error ? err.message : 'Failed to update proposal',
    };
  }
}

export async function deleteProposal(id: string): Promise<ActionResult<void>> {
  try {
    const { supabase, error: authErr } = await requireAdmin();
    if (authErr) return { data: null, error: authErr };
    const { error } = await supabase.from('proposals').delete().eq('id', id);
    if (error) return { data: null, error: error.message };
    revalidatePath('/admin/clients');
    return { data: undefined, error: null };
  } catch (err) {
    return {
      data: null,
      error: err instanceof Error ? err.message : 'Failed to delete proposal',
    };
  }
}

export async function markProposalSent(id: string): Promise<ActionResult<Proposal>> {
  try {
    const { supabase, error: authErr } = await requireAdmin();
    if (authErr) return { data: null, error: authErr };
    const { data, error } = await supabase
      .from('proposals')
      .update({ status: 'sent', sent_at: new Date().toISOString() })
      .eq('id', id)
      .select('*')
      .single();
    if (error) return { data: null, error: error.message };
    revalidatePath('/admin/clients');
    revalidatePath(`/admin/proposals/${id}`);
    return { data: shape(data as Record<string, unknown>), error: null };
  } catch (err) {
    return {
      data: null,
      error: err instanceof Error ? err.message : 'Failed',
    };
  }
}

export async function setProposalResponse(
  id: string,
  outcome: 'accepted' | 'rejected',
): Promise<ActionResult<Proposal>> {
  try {
    const { supabase, error: authErr } = await requireAdmin();
    if (authErr) return { data: null, error: authErr };
    const { data, error } = await supabase
      .from('proposals')
      .update({ status: outcome, responded_at: new Date().toISOString() })
      .eq('id', id)
      .select('*')
      .single();
    if (error) return { data: null, error: error.message };
    revalidatePath('/admin/clients');
    revalidatePath(`/admin/proposals/${id}`);
    return { data: shape(data as Record<string, unknown>), error: null };
  } catch (err) {
    return {
      data: null,
      error: err instanceof Error ? err.message : 'Failed',
    };
  }
}
