'use server';

import { createClient } from '@/lib/supabase/server';
import { createLeadSchema, updateLeadSchema } from '@/lib/schemas/lead';
import type { ActionResult, LeadFilters, Lead, Client } from '@/types';
import { LEAD_STAGES } from '@/lib/constants';
import { revalidatePath } from 'next/cache';
import { escapePostgrestFilter } from '@/lib/utils';

export async function getLeads(filters?: LeadFilters): Promise<ActionResult<Lead[]>> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { data: null, error: 'Unauthorized' };
    let query = supabase
      .from('leads')
      .select(
        'id, contact_name, email, phone, company_name, source, stage, deal_value, probability, notes, assigned_to, lost_reason, expected_close_date, last_contacted_at, converted_to_client_id, converted_at, created_at, updated_at, assigned_user:user_profiles!leads_assigned_to_user_profiles_fkey(display_name)',
      )
      .order('created_at', { ascending: false });

    if (filters?.stage) {
      const stages = Array.isArray(filters.stage) ? filters.stage : [filters.stage];
      query = query.in('stage', stages);
    }
    if (filters?.source) {
      const sources = Array.isArray(filters.source) ? filters.source : [filters.source];
      query = query.in('source', sources);
    }
    if (filters?.assigned_to) {
      query = query.eq('assigned_to', filters.assigned_to);
    }
    if (filters?.search) {
      const s = escapePostgrestFilter(filters.search);
      query = query.or(`contact_name.ilike.%${s}%,email.ilike.%${s}%,company_name.ilike.%${s}%`);
    }
    if (filters?.expected_close_from) {
      query = query.gte('expected_close_date', filters.expected_close_from);
    }
    if (filters?.expected_close_to) {
      query = query.lte('expected_close_date', filters.expected_close_to);
    }

    const { data, error } = await query;
    if (error) return { data: null, error: error.message };
    return { data: data ?? [], error: null };
  } catch {
    return { data: null, error: 'Failed to fetch leads' };
  }
}

export async function getLeadsByAssignee(userId: string): Promise<ActionResult<Lead[]>> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { data: null, error: 'Unauthorized' };
    const { data, error } = await supabase
      .from('leads')
      .select(
        'id, contact_name, email, phone, company_name, source, stage, deal_value, probability, notes, assigned_to, lost_reason, expected_close_date, last_contacted_at, converted_to_client_id, converted_at, created_at, updated_at',
      )
      .eq('assigned_to', userId)
      .order('updated_at', { ascending: false });

    if (error) return { data: null, error: error.message };
    return { data: data ?? [], error: null };
  } catch {
    return { data: null, error: 'Failed to fetch leads' };
  }
}

export async function getLead(id: string): Promise<ActionResult<Lead>> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { data: null, error: 'Unauthorized' };
    const { data, error } = await supabase
      .from('leads')
      .select(
        'id, contact_name, email, phone, company_name, source, stage, deal_value, probability, notes, assigned_to, lost_reason, expected_close_date, last_contacted_at, converted_to_client_id, converted_at, created_at, updated_at, assigned_user:user_profiles!leads_assigned_to_user_profiles_fkey(display_name), converted_client:clients!leads_converted_to_client_id_fkey(contact_name, company_name)',
      )
      .eq('id', id)
      .single();

    if (error) return { data: null, error: error.message };
    return { data, error: null };
  } catch {
    return { data: null, error: 'Failed to fetch lead' };
  }
}

export async function createLead(input: unknown): Promise<ActionResult<Lead>> {
  try {
    const validated = createLeadSchema.parse(input);
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { data: null, error: 'Unauthorized' };

    const { data, error } = await supabase
      .from('leads')
      .insert({
        ...validated,
        assigned_to: validated.assigned_to || user.id,
      })
      .select(
        'id, contact_name, email, phone, company_name, source, stage, deal_value, probability, notes, assigned_to, lost_reason, expected_close_date, last_contacted_at, converted_to_client_id, converted_at, created_at, updated_at',
      )
      .single();

    if (error) return { data: null, error: error.message };

    revalidatePath('/salesman/leads');
    revalidatePath('/admin/leads');
    return { data, error: null };
  } catch (error) {
    if (error instanceof Error) return { data: null, error: error.message };
    return { data: null, error: 'Failed to create lead' };
  }
}

export async function updateLead(id: string, input: unknown): Promise<ActionResult<Lead>> {
  try {
    const validated = updateLeadSchema.parse(input);
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { data: null, error: 'Unauthorized' };

    const { data, error } = await supabase
      .from('leads')
      .update({ ...validated, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select(
        'id, contact_name, email, phone, company_name, source, stage, deal_value, probability, notes, assigned_to, lost_reason, expected_close_date, last_contacted_at, converted_to_client_id, converted_at, created_at, updated_at',
      )
      .single();

    if (error) return { data: null, error: error.message };

    revalidatePath('/salesman/leads');
    revalidatePath('/admin/leads');
    revalidatePath(`/salesman/leads/${id}`);
    revalidatePath(`/admin/leads/${id}`);
    return { data, error: null };
  } catch (error) {
    if (error instanceof Error) return { data: null, error: error.message };
    return { data: null, error: 'Failed to update lead' };
  }
}

export async function updateLeadStage(id: string, stage: string): Promise<ActionResult<Lead>> {
  try {
    if (!LEAD_STAGES.includes(stage as (typeof LEAD_STAGES)[number])) {
      return { data: null, error: `Invalid stage: ${stage}` };
    }
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { data: null, error: 'Unauthorized' };

    const { data, error } = await supabase
      .from('leads')
      .update({ stage, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select(
        'id, contact_name, email, phone, company_name, source, stage, deal_value, probability, notes, assigned_to, lost_reason, expected_close_date, last_contacted_at, converted_to_client_id, converted_at, created_at, updated_at',
      )
      .single();

    if (error) return { data: null, error: error.message };

    // Log stage change activity
    await supabase.from('lead_activities').insert({
      lead_id: id,
      user_id: user.id,
      activity_type: 'stage_change',
      title: `Stage changed to ${stage}`,
      metadata: { new_stage: stage },
    });

    revalidatePath('/salesman/leads');
    revalidatePath('/admin/leads');
    return { data, error: null };
  } catch {
    return { data: null, error: 'Failed to update lead stage' };
  }
}

export async function deleteLead(id: string): Promise<ActionResult<void>> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { data: null, error: 'Unauthorized' };
    const { error } = await supabase.from('leads').delete().eq('id', id);

    if (error) return { data: null, error: error.message };

    revalidatePath('/salesman/leads');
    revalidatePath('/admin/leads');
    return { data: undefined, error: null };
  } catch {
    return { data: null, error: 'Failed to delete lead' };
  }
}

export async function convertLeadToClient(id: string): Promise<ActionResult<Client>> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { data: null, error: 'Unauthorized' };

    // Fetch the lead
    const { data: lead, error: leadError } = await supabase
      .from('leads')
      .select(
        'id, contact_name, email, phone, company_name, source, stage, deal_value, probability, notes, assigned_to, lost_reason, expected_close_date, last_contacted_at, converted_to_client_id, converted_at, created_at, updated_at',
      )
      .eq('id', id)
      .single();

    if (leadError || !lead) return { data: null, error: 'Lead not found' };
    if (lead.stage === 'won' && lead.converted_to_client_id) {
      return { data: null, error: 'Lead already converted' };
    }

    // Create client record
    const { data: client, error: clientError } = await supabase
      .from('clients')
      .insert({
        contact_name: lead.contact_name,
        email: lead.email,
        phone: lead.phone,
        company_name: lead.company_name,
        status: 'active',
      })
      .select(
        'id, user_id, company_name, contact_name, email, phone, address, vat_number, avatar_url, notes, status, created_at, updated_at',
      )
      .single();

    if (clientError) return { data: null, error: clientError.message };

    // Update lead as converted
    await supabase
      .from('leads')
      .update({
        stage: 'won',
        converted_to_client_id: client.id,
        converted_at: new Date().toISOString(),
      })
      .eq('id', id);

    // Log conversion activity
    await supabase.from('lead_activities').insert({
      lead_id: id,
      user_id: user.id,
      activity_type: 'stage_change',
      title: 'Lead converted to client',
      metadata: { client_id: client.id },
    });

    revalidatePath('/salesman/leads');
    revalidatePath('/admin/leads');
    revalidatePath('/admin/clients');
    return { data: client, error: null };
  } catch {
    return { data: null, error: 'Failed to convert lead to client' };
  }
}
