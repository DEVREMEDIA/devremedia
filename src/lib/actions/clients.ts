'use server';

import { createClient as createSupabase } from '@/lib/supabase/server';
import { createClientSchema, updateClientSchema } from '@/lib/schemas/client';
import type { ActionResult, Client } from '@/types/index';
import { revalidatePath } from 'next/cache';
import { escapePostgrestFilter } from '@/lib/utils';

export async function getClients(filters?: {
  status?: string;
  search?: string;
}): Promise<ActionResult<Client[]>> {
  try {
    const supabase = await createSupabase();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { data: null, error: 'Unauthorized' };
    let query = supabase
      .from('clients')
      .select(
        'id, user_id, company_name, contact_name, email, phone, address, vat_number, avatar_url, notes, status, created_at, updated_at',
      )
      .order('created_at', { ascending: false });

    if (filters?.status) {
      query = query.eq('status', filters.status);
    }
    if (filters?.search) {
      const s = escapePostgrestFilter(filters.search);
      query = query.or(`contact_name.ilike.%${s}%,email.ilike.%${s}%,company_name.ilike.%${s}%`);
    }

    const { data, error } = await query;
    if (error) return { data: null, error: error.message };
    return { data: data ?? [], error: null };
  } catch {
    return { data: null, error: 'Failed to fetch clients' };
  }
}

export async function getClient(id: string): Promise<ActionResult<Client>> {
  try {
    const supabase = await createSupabase();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { data: null, error: 'Unauthorized' };
    const { data, error } = await supabase
      .from('clients')
      .select(
        'id, user_id, company_name, contact_name, email, phone, address, vat_number, avatar_url, notes, status, created_at, updated_at',
      )
      .eq('id', id)
      .single();

    if (error) return { data: null, error: error.message };
    return { data, error: null };
  } catch {
    return { data: null, error: 'Failed to fetch client' };
  }
}

export async function createNewClient(input: unknown): Promise<ActionResult<Client>> {
  try {
    const validated = createClientSchema.parse(input);
    const supabase = await createSupabase();
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
      .from('clients')
      .insert(validated)
      .select(
        'id, user_id, company_name, contact_name, email, phone, address, vat_number, avatar_url, notes, status, created_at, updated_at',
      )
      .single();

    if (error) return { data: null, error: error.message };

    revalidatePath('/admin/clients');
    return { data, error: null };
  } catch (error: unknown) {
    if (error instanceof Error) {
      return { data: null, error: error.message };
    }
    return { data: null, error: 'Failed to create client' };
  }
}

export async function updateClient(id: string, input: unknown): Promise<ActionResult<Client>> {
  try {
    const validated = updateClientSchema.parse(input);
    const supabase = await createSupabase();
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
      .from('clients')
      .update(validated)
      .eq('id', id)
      .select(
        'id, user_id, company_name, contact_name, email, phone, address, vat_number, avatar_url, notes, status, created_at, updated_at',
      )
      .single();

    if (error) return { data: null, error: error.message };

    revalidatePath('/admin/clients');
    revalidatePath(`/admin/clients/${id}`);
    revalidatePath('/client/settings');
    revalidatePath('/client/dashboard');
    return { data, error: null };
  } catch (error: unknown) {
    if (error instanceof Error) {
      return { data: null, error: error.message };
    }
    return { data: null, error: 'Failed to update client' };
  }
}

export async function getOrphanedClientsInfo(): Promise<
  ActionResult<{ total: number; withProjects: number; withoutProjects: number }>
> {
  try {
    const supabase = await createSupabase();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { data: null, error: 'Unauthorized' };

    const { data: orphaned, error: fetchError } = await supabase
      .from('clients')
      .select('id')
      .is('user_id', null);

    if (fetchError) return { data: null, error: fetchError.message };
    if (!orphaned || orphaned.length === 0) {
      return { data: { total: 0, withProjects: 0, withoutProjects: 0 }, error: null };
    }

    const orphanedIds = orphaned.map((c) => c.id);

    const { data: projectLinks } = await supabase
      .from('projects')
      .select('client_id')
      .in('client_id', orphanedIds);

    const idsWithProjects = new Set((projectLinks ?? []).map((p) => p.client_id));
    const withProjects = orphanedIds.filter((id) => idsWithProjects.has(id)).length;

    return {
      data: {
        total: orphaned.length,
        withProjects,
        withoutProjects: orphaned.length - withProjects,
      },
      error: null,
    };
  } catch {
    return { data: null, error: 'Failed to fetch orphaned clients info' };
  }
}

export async function cleanupOrphanedClients(): Promise<
  ActionResult<{ archived: number; deleted: number }>
> {
  try {
    const supabase = await createSupabase();
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

    const { data: orphaned, error: fetchError } = await supabase
      .from('clients')
      .select('id')
      .is('user_id', null);

    if (fetchError) return { data: null, error: fetchError.message };
    if (!orphaned || orphaned.length === 0) {
      return { data: { archived: 0, deleted: 0 }, error: null };
    }

    const orphanedIds = orphaned.map((c) => c.id);

    const { data: projectLinks } = await supabase
      .from('projects')
      .select('client_id')
      .in('client_id', orphanedIds);

    const idsWithProjects = new Set((projectLinks ?? []).map((p) => p.client_id));

    const toArchive = orphanedIds.filter((id) => idsWithProjects.has(id));
    const toDelete = orphanedIds.filter((id) => !idsWithProjects.has(id));

    if (toArchive.length > 0) {
      const { error } = await supabase
        .from('clients')
        .update({ status: 'inactive' })
        .in('id', toArchive);
      if (error) return { data: null, error: error.message };
    }

    if (toDelete.length > 0) {
      const { error } = await supabase.from('clients').delete().in('id', toDelete);
      if (error) return { data: null, error: error.message };
    }

    revalidatePath('/admin/clients');
    return { data: { archived: toArchive.length, deleted: toDelete.length }, error: null };
  } catch {
    return { data: null, error: 'Failed to cleanup orphaned clients' };
  }
}

export async function deleteClient(id: string): Promise<ActionResult<null>> {
  try {
    const supabase = await createSupabase();
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
    const { error } = await supabase.from('clients').delete().eq('id', id);

    if (error) return { data: null, error: error.message };

    revalidatePath('/admin/clients');
    return { data: null, error: null };
  } catch {
    return { data: null, error: 'Failed to delete client' };
  }
}
