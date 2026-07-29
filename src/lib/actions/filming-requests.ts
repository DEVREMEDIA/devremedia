'use server';

import { createAdminClient } from '@/lib/supabase/admin';
import {
  createFilmingRequestSchema,
  reviewFilmingRequestSchema,
  publicBookingSchema,
} from '@/lib/schemas/filming-request';
import type { ActionResult, FilmingRequest, Project } from '@/types/index';
import type { FilmingRequestStatus } from '@/lib/constants';
import { revalidatePath } from 'next/cache';
import {
  createNotification,
  createNotificationForMany,
  getClientUserIdFromClientId,
  getAdminUserIds,
} from '@/lib/notification-helpers';
import { NOTIFICATION_TYPES } from '@/lib/notification-types';
import { requireUser, requireAdmin } from '@/lib/auth-helpers';
import { syncEntityToGoogle } from '@/lib/google-sync-helper';
import { getGoogleColorId } from '@/lib/google-calendar';

/** ISO Athens offset (e.g. "+03:00") for a date — copy of sync-project-filming.athensOffsetFor. */
function athensOffsetFor(filmingDate: string): string {
  const [y, m, d] = filmingDate.split('-').map(Number);
  try {
    const probe = new Date(Date.UTC(y, (m || 1) - 1, d || 1, 12, 0, 0));
    const fmt = new Intl.DateTimeFormat('en', {
      timeZone: 'Europe/Athens',
      timeZoneName: 'longOffset',
    });
    const part = fmt.formatToParts(probe).find((p) => p.type === 'timeZoneName')?.value;
    if (part?.startsWith('GMT')) return part.replace('GMT', '').trim() || '+00:00';
  } catch {
    /* fall through */
  }
  return '+02:00';
}

/** "HH:MM" + minutes → "HH:MM" (same day; durations never cross midnight here). */
function addMinutes(time: string, minutes: number): string {
  const [h, m] = time.split(':').map(Number);
  const total = h * 60 + m + minutes;
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
}

export async function getFilmingRequests(filters?: {
  status?: FilmingRequestStatus | FilmingRequestStatus[];
}): Promise<ActionResult<FilmingRequest[]>> {
  try {
    const { supabase, error: authError } = await requireUser();
    if (authError) return { data: null, error: authError };

    let query = supabase
      .from('filming_requests')
      .select(
        'id, client_id, title, description, preferred_dates, booking_date, start_time, duration_minutes, location, project_type, budget_range, reference_links, selected_package, status, admin_notes, converted_project_id, contact_name, contact_email, contact_phone, contact_company, created_at',
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
    const { supabase, error: authError } = await requireUser();
    if (authError) return { data: null, error: authError };

    // RLS automatically filters to only this client's requests
    const { data, error } = await supabase
      .from('filming_requests')
      .select(
        'id, client_id, title, description, preferred_dates, booking_date, start_time, duration_minutes, location, project_type, budget_range, reference_links, selected_package, status, admin_notes, converted_project_id, contact_name, contact_email, contact_phone, contact_company, created_at',
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
    const { supabase, error: authError } = await requireUser();
    if (authError) return { data: null, error: authError };

    const { data, error } = await supabase
      .from('filming_requests')
      .select(
        'id, client_id, title, description, preferred_dates, booking_date, start_time, duration_minutes, location, project_type, budget_range, reference_links, selected_package, status, admin_notes, converted_project_id, contact_name, contact_email, contact_phone, contact_company, created_at',
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
    const { supabase, user, error: authError } = await requireUser();
    if (authError) return { data: null, error: authError };

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
        'id, client_id, title, description, preferred_dates, booking_date, start_time, duration_minutes, location, project_type, budget_range, reference_links, selected_package, status, admin_notes, converted_project_id, contact_name, contact_email, contact_phone, contact_company, created_at',
      )
      .single();

    if (error) return { data: null, error: error.message };

    revalidatePath('/admin/productions');
    revalidatePath('/client/productions');
    revalidatePath('/client/home');

    // Notify all admins about new booking request
    const adminIds = await getAdminUserIds();
    createNotificationForMany(adminIds, {
      type: NOTIFICATION_TYPES.BOOKING_SUBMITTED,
      title: 'New booking request submitted',
      body: data.title,
      actionUrl: '/admin/filming-requests',
    });

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
    const { supabase, user, error: authError } = await requireAdmin();
    if (authError) return { data: null, error: authError };

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
        'id, client_id, title, description, preferred_dates, booking_date, start_time, duration_minutes, location, project_type, budget_range, reference_links, selected_package, status, admin_notes, converted_project_id, contact_name, contact_email, contact_phone, contact_company, created_at',
      )
      .single();

    if (error) return { data: null, error: error.message };

    revalidatePath('/admin/productions');
    revalidatePath(`/admin/filming-requests/${id}`);
    revalidatePath('/client/productions');
    revalidatePath('/client/home');

    // Notify client if they have an account
    if (data.client_id) {
      const clientUserId = await getClientUserIdFromClientId(data.client_id);
      if (clientUserId) {
        createNotification({
          userId: clientUserId,
          type: NOTIFICATION_TYPES.FILMING_REQUEST_STATUS,
          title: `Filming request "${data.title}" ${validated.status}`,
          actionUrl: '/client/home',
        });
      }
    }

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
    const { supabase, user, error: authError } = await requireAdmin();
    if (authError) return { data: null, error: authError };

    const adminSupabase = createAdminClient();

    const { data: request, error: fetchError } = await supabase
      .from('filming_requests')
      .select(
        'id, client_id, title, description, preferred_dates, booking_date, start_time, duration_minutes, location, project_type, budget_range, reference_links, selected_package, status, admin_notes, converted_project_id, contact_name, contact_email, contact_phone, contact_company, created_at',
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

    // Extract filming date/time from preferred_dates
    const preferredDates = request.preferred_dates as Array<{
      date?: string;
      time_slot?: string;
    }> | null;
    const filmingDate = preferredDates?.[0]?.date ?? null;
    const filmingTime = preferredDates?.[0]?.time_slot ?? null;

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
        filming_date: filmingDate,
        filming_time: filmingTime,
        location: request.location,
      })
      .select(
        'id, client_id, title, description, project_type, status, priority, budget, deadline, start_date, assigned_to, filming_date, filming_time, location, shooting_hours, editing_hours, cost_per_hour_snapshot, quoted_price, created_at, updated_at',
      )
      .single();

    if (projectError) return { data: null, error: projectError.message };

    // Auto-create calendar event for the filming date
    if (filmingDate) {
      await supabase.from('calendar_events').insert({
        title: `🎬 ${request.title}`,
        description: request.location ? `📍 ${request.location}` : null,
        start_date: filmingTime ? `${filmingDate}T${filmingTime}` : filmingDate,
        end_date: filmingTime ? `${filmingDate}T${filmingTime}` : filmingDate,
        all_day: !filmingTime,
        event_type: 'filming',
        created_by: user.id,
      });
    }

    const { error: updateError } = await supabase
      .from('filming_requests')
      .update({
        status: 'converted',
        converted_project_id: project.id,
      })
      .eq('id', id);

    if (updateError) return { data: null, error: updateError.message };

    revalidatePath('/admin/productions');
    revalidatePath('/admin/clients');
    revalidatePath('/admin/calendar');
    revalidatePath('/client/productions');
    revalidatePath('/client/home');
    return { data: project, error: null };
  } catch (err: unknown) {
    return {
      data: null,
      error: err instanceof Error ? err.message : 'Failed to convert filming request to project',
    };
  }
}

/**
 * Approve a Hold into a confirmed Filming. The pending filming_request keeps its
 * date+Slot (so it goes on counting toward Capacity and the Client's monthly
 * Allowance — approval does NOT free the spot), one new Production is created per
 * Filming (the existing convert behavior), the Filming is placed on the calendar,
 * and the Client is notified. (#78)
 */
export async function approveHold(id: string): Promise<ActionResult<Project>> {
  try {
    const { supabase, user, error: authError } = await requireAdmin();
    if (authError) return { data: null, error: authError };

    const { data: hold, error: fetchError } = await supabase
      .from('filming_requests')
      .select(
        'id, client_id, title, description, status, booking_date, start_time, duration_minutes, location',
      )
      .eq('id', id)
      .single();

    if (fetchError) return { data: null, error: fetchError.message };
    if (!hold) return { data: null, error: 'Hold not found' };
    if (hold.status !== 'pending') {
      return { data: null, error: 'Only a pending Hold can be approved' };
    }

    const filmingDate = hold.booking_date as string | null;
    // PostgREST returns `time` columns as "HH:MM:SS"; slice to "HH:MM" so the
    // ISO timestamp we build is valid (avoids "HH:MM:SS:00+offset" pattern).
    const startTime = (hold.start_time as string | null)?.slice(0, 5) ?? null;
    const duration = hold.duration_minutes as number | null;

    // One Production per confirmed Filming (unchanged behavior).
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .insert({
        client_id: hold.client_id,
        title: hold.title,
        description: hold.description,
        project_type: 'other',
        status: 'briefing',
        priority: 'medium',
        created_by: user.id,
        filming_date: filmingDate,
        filming_time: startTime, // already "HH:MM" — normalized above
        location: hold.location,
      })
      .select(
        'id, client_id, title, description, project_type, status, priority, budget, deadline, start_date, assigned_to, filming_date, filming_time, location, shooting_hours, editing_hours, cost_per_hour_snapshot, quoted_price, created_at, updated_at',
      )
      .single();

    if (projectError) return { data: null, error: projectError.message };

    // Put the confirmed Filming on the calendar as a TIMED event and push to Google.
    if (filmingDate && startTime && duration) {
      const offset = athensOffsetFor(filmingDate);
      const startIso = `${filmingDate}T${startTime}:00${offset}`;
      const endIso = `${filmingDate}T${addMinutes(startTime, duration)}:00${offset}`;

      const { data: event, error: eventError } = await supabase
        .from('calendar_events')
        .insert({
          title: `🎬 ${hold.title}`,
          description: hold.location ? `📍 ${hold.location}` : null,
          start_date: startIso,
          end_date: endIso,
          all_day: false,
          event_type: 'filming',
          project_id: project.id,
          created_by: user.id,
        })
        .select('id, title, description, start_date, end_date, all_day, event_type')
        .single();

      if (!eventError && event) {
        await syncEntityToGoogle({
          entityType: 'custom',
          entityId: event.id,
          operation: 'create',
          eventData: {
            title: event.title,
            description: event.description ?? undefined,
            startDate: event.start_date,
            endDate: event.end_date ?? undefined,
            allDay: event.all_day,
            colorId: getGoogleColorId('custom', null, event.event_type),
          },
        });
      }
    }

    // Confirm the Hold — 'converted' still counts (approval doesn't free the spot).
    const { error: updateError } = await supabase
      .from('filming_requests')
      .update({ status: 'converted', converted_project_id: project.id })
      .eq('id', id);

    if (updateError) return { data: null, error: updateError.message };

    revalidatePath('/admin/productions');
    revalidatePath(`/admin/filming-requests/${id}`);
    revalidatePath('/admin/calendar');
    revalidatePath('/client/book');
    revalidatePath('/client/home');

    await notifyClientOfHoldOutcome(hold.client_id as string | null, hold.title as string, true);

    return { data: project, error: null };
  } catch (err: unknown) {
    return {
      data: null,
      error: err instanceof Error ? err.message : 'Failed to approve Hold',
    };
  }
}

/**
 * Reject a Hold. The pending filming_request is moved to 'declined', which
 * releases its date+Slot back to Free: both the availability calculation
 * (getMyAvailability) and the atomic claim (book_filming) count only rows where
 * status <> 'declined', so a rejected Hold stops counting against Capacity and
 * the Client's monthly Allowance. The Client is notified of the outcome. (#78)
 */
export async function rejectHold(id: string): Promise<ActionResult<FilmingRequest>> {
  try {
    const { supabase, error: authError } = await requireAdmin();
    if (authError) return { data: null, error: authError };

    const { data: hold, error: fetchError } = await supabase
      .from('filming_requests')
      .select('id, client_id, title, status, booking_date, start_time, duration_minutes')
      .eq('id', id)
      .single();

    if (fetchError) return { data: null, error: fetchError.message };
    if (!hold) return { data: null, error: 'Hold not found' };
    if (hold.status !== 'pending') {
      return { data: null, error: 'Only a pending Hold can be rejected' };
    }

    const { error: updateError } = await supabase
      .from('filming_requests')
      .update({ status: 'declined' })
      .eq('id', id);

    if (updateError) return { data: null, error: updateError.message };

    revalidatePath('/admin/productions');
    revalidatePath(`/admin/filming-requests/${id}`);
    revalidatePath('/client/book');
    revalidatePath('/client/home');

    await notifyClientOfHoldOutcome(hold.client_id as string | null, hold.title as string, false);

    return { data: { ...hold, status: 'declined' } as FilmingRequest, error: null };
  } catch (err: unknown) {
    return {
      data: null,
      error: err instanceof Error ? err.message : 'Failed to reject Hold',
    };
  }
}

/** Notify a Client that their Hold was approved or rejected (best-effort). */
async function notifyClientOfHoldOutcome(
  clientId: string | null,
  title: string,
  approved: boolean,
): Promise<void> {
  if (!clientId) return;
  const clientUserId = await getClientUserIdFromClientId(clientId);
  if (!clientUserId) return;
  await createNotification({
    userId: clientUserId,
    type: NOTIFICATION_TYPES.FILMING_REQUEST_STATUS,
    title: approved
      ? `Your booking "${title}" was confirmed`
      : `Your booking "${title}" was declined`,
    actionUrl: '/client/home',
  });
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

    // Notify admins about the new lead
    const adminIds = await getAdminUserIds();
    await createNotificationForMany(adminIds, {
      type: NOTIFICATION_TYPES.BOOKING_SUBMITTED,
      title: 'New lead from website',
      body: `${validated.contact_name}${validated.title ? ` — ${validated.title}` : ''}`,
      actionUrl: '/admin/leads',
    });

    revalidatePath('/admin/clients');
    revalidatePath('/salesman/leads');
    return { data, error: null };
  } catch (error) {
    if (error instanceof Error) {
      return { data: null, error: error.message };
    }
    return { data: null, error: 'Failed to submit booking request' };
  }
}
