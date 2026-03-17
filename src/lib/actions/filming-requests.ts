'use server';

import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import {
  createFilmingRequestSchema,
  reviewFilmingRequestSchema,
  publicBookingSchema,
} from '@/lib/schemas/filming-request';
import type { ActionResult, FilmingRequest, Project } from '@/types/index';
import type { FilmingRequestStatus } from '@/lib/constants';
import { revalidatePath } from 'next/cache';

export async function getFilmingRequests(filters?: {
  status?: FilmingRequestStatus | FilmingRequestStatus[];
}): Promise<ActionResult<FilmingRequest[]>> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { data: null, error: 'User not authenticated' };

    let query = supabase
      .from('filming_requests')
      .select(
        'id, client_id, title, description, preferred_dates, location, project_type, budget_range, reference_links, selected_package, status, admin_notes, converted_project_id, contact_name, contact_email, contact_phone, contact_company, created_at',
      )
      .order('created_at', { ascending: false });

    if (filters?.status) {
      if (Array.isArray(filters.status)) {
        query = query.in('status', filters.status);
      } else {
        query = query.eq('status', filters.status);
      }
    }

    const { data, error } = await query;
    if (error) return { data: null, error: error.message };
    return { data, error: null };
  } catch (err: unknown) {
    return {
      data: null,
      error: err instanceof Error ? err.message : 'Failed to fetch filming requests',
    };
  }
}

export async function getClientFilmingRequests(): Promise<ActionResult<FilmingRequest[]>> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { data: null, error: 'Not authenticated' };

    // RLS automatically filters to only this client's requests
    const { data, error } = await supabase
      .from('filming_requests')
      .select(
        'id, client_id, title, description, preferred_dates, location, project_type, budget_range, reference_links, selected_package, status, admin_notes, converted_project_id, contact_name, contact_email, contact_phone, contact_company, created_at',
      )
      .order('created_at', { ascending: false });

    if (error) return { data: null, error: error.message };
    return { data: data ?? [], error: null };
  } catch (err: unknown) {
    return {
      data: null,
      error: err instanceof Error ? err.message : 'Failed to fetch filming requests',
    };
  }
}

export async function getFilmingRequest(id: string): Promise<ActionResult<FilmingRequest>> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { data: null, error: 'User not authenticated' };

    const { data, error } = await supabase
      .from('filming_requests')
      .select(
        'id, client_id, title, description, preferred_dates, location, project_type, budget_range, reference_links, selected_package, status, admin_notes, converted_project_id, contact_name, contact_email, contact_phone, contact_company, created_at',
      )
      .eq('id', id)
      .single();

    if (error) return { data: null, error: error.message };
    return { data, error: null };
  } catch (err: unknown) {
    return {
      data: null,
      error: err instanceof Error ? err.message : 'Failed to fetch filming request',
    };
  }
}

export async function createFilmingRequest(input: unknown): Promise<ActionResult<FilmingRequest>> {
  try {
    const validated = createFilmingRequestSchema.parse(input);
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { data: null, error: 'User not authenticated' };

    // Find the client record linked to this user
    const { data: client } = await supabase
      .from('clients')
      .select('id')
      .eq('user_id', user.id)
      .single();

    const { data, error } = await supabase
      .from('filming_requests')
      .insert({
        ...validated,
        client_id: client?.id || null,
        status: 'pending',
      })
      .select(
        'id, client_id, title, description, preferred_dates, location, project_type, budget_range, reference_links, selected_package, status, admin_notes, converted_project_id, contact_name, contact_email, contact_phone, contact_company, created_at',
      )
      .single();

    if (error) return { data: null, error: error.message };

    revalidatePath('/admin/filming-requests');
    return { data, error: null };
  } catch (error) {
    if (error instanceof Error) {
      return { data: null, error: error.message };
    }
    return { data: null, error: 'Failed to create filming request' };
  }
}

export async function reviewFilmingRequest(
  id: string,
  input: unknown,
): Promise<ActionResult<FilmingRequest>> {
  try {
    const validated = reviewFilmingRequestSchema.parse(input);
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { data: null, error: 'User not authenticated' };

    const { data: profile } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('id', user.id)
      .single();
    if (!profile || !['super_admin', 'admin'].includes(profile.role)) {
      return { data: null, error: 'Forbidden: admin access required' };
    }

    const { data, error } = await supabase
      .from('filming_requests')
      .update({
        status: validated.status,
        admin_notes: validated.admin_notes,
        reviewed_by: user.id,
        reviewed_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select(
        'id, client_id, title, description, preferred_dates, location, project_type, budget_range, reference_links, selected_package, status, admin_notes, converted_project_id, contact_name, contact_email, contact_phone, contact_company, created_at',
      )
      .single();

    if (error) return { data: null, error: error.message };

    revalidatePath('/admin/filming-requests');
    revalidatePath(`/admin/filming-requests/${id}`);
    return { data, error: null };
  } catch (error) {
    if (error instanceof Error) {
      return { data: null, error: error.message };
    }
    return { data: null, error: 'Failed to review filming request' };
  }
}

export async function convertToProject(id: string): Promise<ActionResult<Project>> {
  try {
    const supabase = await createClient();
    const adminSupabase = createAdminClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { data: null, error: 'User not authenticated' };

    const { data: profile } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('id', user.id)
      .single();
    if (!profile || !['super_admin', 'admin'].includes(profile.role)) {
      return { data: null, error: 'Forbidden: admin access required' };
    }

    const { data: request, error: fetchError } = await supabase
      .from('filming_requests')
      .select(
        'id, client_id, title, description, preferred_dates, location, project_type, budget_range, reference_links, selected_package, status, admin_notes, converted_project_id, contact_name, contact_email, contact_phone, contact_company, created_at',
      )
      .eq('id', id)
      .single();

    if (fetchError) return { data: null, error: fetchError.message };
    if (!request) return { data: null, error: 'Filming request not found' };
    if (request.status !== 'accepted') {
      return { data: null, error: 'Only accepted requests can be converted to projects' };
    }

    // Resolve client_id: use existing, or find/create from contact info (public bookings)
    // Use admin client to bypass RLS for client creation
    let clientId = request.client_id as string | null;

    if (!clientId) {
      const contactEmail = request.contact_email as string | null;
      const contactName = (request.contact_name || contactEmail || 'Unknown') as string;

      if (contactEmail) {
        // Try to find existing client by email
        const { data: existingClient } = await adminSupabase
          .from('clients')
          .select('id')
          .eq('email', contactEmail)
          .single();

        if (existingClient) {
          clientId = existingClient.id;
        } else {
          // Auto-create client from booking contact info
          const { data: newClient, error: clientError } = await adminSupabase
            .from('clients')
            .insert({
              contact_name: contactName,
              email: contactEmail,
              phone: (request.contact_phone as string | null) ?? null,
              company_name: (request.contact_company as string | null) ?? null,
              status: 'active',
            })
            .select('id')
            .single();

          if (clientError)
            return { data: null, error: `Failed to create client: ${clientError.message}` };
          clientId = newClient.id;
        }
      } else {
        // No email — create a placeholder client from whatever info we have
        const { data: newClient, error: clientError } = await adminSupabase
          .from('clients')
          .insert({
            contact_name: contactName,
            email: `placeholder-${crypto.randomUUID()}@placeholder.local`,
            status: 'active',
          })
          .select('id')
          .single();

        if (clientError)
          return { data: null, error: `Failed to create client: ${clientError.message}` };
        clientId = newClient.id;
      }

      // Update filming_request with resolved client_id
      await adminSupabase.from('filming_requests').update({ client_id: clientId }).eq('id', id);
    }

    const { data: project, error: projectError } = await supabase
      .from('projects')
      .insert({
        client_id: clientId,
        title: request.title,
        description: request.description,
        project_type: request.project_type || 'other',
        status: 'briefing',
        priority: 'medium',
        created_by: user.id,
      })
      .select(
        'id, client_id, title, description, project_type, status, priority, budget, deadline, start_date, created_at, updated_at',
      )
      .single();

    if (projectError) return { data: null, error: projectError.message };

    const { error: updateError } = await supabase
      .from('filming_requests')
      .update({
        status: 'converted',
        converted_project_id: project.id,
      })
      .eq('id', id);

    if (updateError) return { data: null, error: updateError.message };

    revalidatePath('/admin/filming-requests');
    revalidatePath('/admin/projects');
    revalidatePath('/admin/clients');
    return { data: project, error: null };
  } catch (err: unknown) {
    return {
      data: null,
      error: err instanceof Error ? err.message : 'Failed to convert filming request to project',
    };
  }
}

export async function createPublicFilmingRequest(
  input: unknown,
): Promise<ActionResult<{ id: string }>> {
  try {
    const validated = publicBookingSchema.parse(input);
    const supabase = createAdminClient();

    // Build notes from the booking details
    const notesParts: string[] = [];
    if (validated.project_type) notesParts.push(`Project type: ${validated.project_type}`);
    if (validated.selected_package) notesParts.push(`Package: ${validated.selected_package}`);
    if (validated.title) notesParts.push(`Title: ${validated.title}`);
    if (validated.description) notesParts.push(`Description: ${validated.description}`);
    if (validated.location) notesParts.push(`Location: ${validated.location}`);
    if (validated.budget_range) notesParts.push(`Budget: ${validated.budget_range}`);
    if (validated.preferred_dates?.length) {
      const dates = validated.preferred_dates.map((d) => d.date).join(', ');
      notesParts.push(`Preferred dates: ${dates}`);
    }

    const { data, error } = await supabase
      .from('leads')
      .insert({
        contact_name: validated.contact_name,
        email: validated.contact_email,
        phone: validated.contact_phone || null,
        company_name: validated.contact_company || null,
        source: 'website' as const,
        stage: 'new' as const,
        notes: notesParts.join('\n') || null,
      })
      .select('id')
      .single();

    if (error) return { data: null, error: error.message };

    revalidatePath('/admin/leads');
    revalidatePath('/salesman/leads');
    return { data, error: null };
  } catch (error) {
    if (error instanceof Error) {
      return { data: null, error: error.message };
    }
    return { data: null, error: 'Failed to submit booking request' };
  }
}
