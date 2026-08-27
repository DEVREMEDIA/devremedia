'use server';

import { cache } from 'react';
import { createClient } from '@/lib/supabase/server';
import { requireUser, requireAdmin } from '@/lib/auth-helpers';
import { createProjectSchema, updateProjectSchema } from '@/lib/schemas/project';
import type { ActionResult, ProjectWithClient, Project } from '@/types/index';
import type { ProjectStatus, Priority } from '@/lib/constants';
import { revalidatePath } from 'next/cache';
import { escapePostgrestFilter } from '@/lib/utils';
import { createNotification } from '@/lib/actions/notifications';
import { NOTIFICATION_TYPES } from '@/lib/notification-types';
import { syncEntityToGoogle } from '@/lib/google-sync-helper';
import { getGoogleColorId } from '@/lib/google-calendar';
import { syncProjectFilmingToCalendar } from '@/lib/actions/sync-project-filming';
import { applyStatusChange } from '@/lib/apply-status-change';

interface ProjectFilters {
  client_id?: string;
  status?: ProjectStatus | ProjectStatus[];
  priority?: Priority | Priority[];
  search?: string;
}

export async function getProjects(
  filters?: ProjectFilters,
): Promise<ActionResult<ProjectWithClient[]>> {
  try {
    const { supabase, error: authError } = await requireUser();
    if (authError) return { data: null, error: authError };
    let query = supabase
      .from('projects')
      .select('*, client:clients(*)')
      .order('created_at', { ascending: false });

    if (filters?.client_id) {
      query = query.eq('client_id', filters.client_id);
    }
    if (filters?.status) {
      if (Array.isArray(filters.status)) {
        query = query.in('status', filters.status);
      } else {
        query = query.eq('status', filters.status);
      }
    }
    if (filters?.priority) {
      if (Array.isArray(filters.priority)) {
        query = query.in('priority', filters.priority);
      } else {
        query = query.eq('priority', filters.priority);
      }
    }
    if (filters?.search) {
      const s = escapePostgrestFilter(filters.search);
      query = query.or(`title.ilike.%${s}%,description.ilike.%${s}%`);
    }

    const { data, error } = await query;
    if (error) return { data: null, error: error.message };
    return { data, error: null };
  } catch (err: unknown) {
    return { data: null, error: err instanceof Error ? err.message : 'Failed to fetch projects' };
  }
}

// Κάθε άνοιγμα σελίδας έργου καλούσε αυτή τη συνάρτηση δύο φορές — μια στο
// `generateMetadata` για τον τίτλο της καρτέλας, μια για το σώμα της σελίδας —
// και έκανε δύο ταυτόσημα ταξίδια στη βάση. Το `cache()` είναι η ανά-αίτημα
// απομνημόνευση του React (όχι το `unstable_cache`): η δεύτερη κλήση
// επαναχρησιμοποιεί το αποτέλεσμα της πρώτης. Ίδιο μοτίβο με το `getInvoice`
// στο invoices.ts, που το είχε ήδη λύσει για τα τιμολόγια.
export const getProject = cache(async (id: string): Promise<ActionResult<ProjectWithClient>> => {
  try {
    const { supabase, error: authError } = await requireUser();
    if (authError) return { data: null, error: authError };
    const { data, error } = await supabase
      .from('projects')
      .select('*, client:clients(*)')
      .eq('id', id)
      .single();

    if (error) return { data: null, error: error.message };
    return { data, error: null };
  } catch (err: unknown) {
    return { data: null, error: err instanceof Error ? err.message : 'Failed to fetch project' };
  }
});

// Prepend "{Client} — " to a Production title unless it is already there, so
// the client is always part of the name (see docs/adr/0001). Module-private.
async function ensureClientPrefixedTitle(
  supabase: Awaited<ReturnType<typeof createClient>>,
  clientId: string,
  title: string,
): Promise<string> {
  const { data: client } = await supabase
    .from('clients')
    .select('company_name, contact_name')
    .eq('id', clientId)
    .single();
  const clientName = client?.company_name || client?.contact_name;
  if (!clientName) return title;
  const prefix = `${clientName} — `;
  return title.startsWith(prefix) ? title : `${prefix}${title}`;
}

export async function createProject(input: unknown): Promise<ActionResult<ProjectWithClient>> {
  try {
    const validated = createProjectSchema.parse(input);
    const { supabase, user, error: authError } = await requireUser();
    if (authError) return { data: null, error: authError };

    // Guarantee the client's name is part of the title regardless of how it was
    // entered in the form (see docs/adr/0001). Idempotent: skipped if the title
    // already starts with the prefix (e.g. the form prefill already added it).
    const title = await ensureClientPrefixedTitle(supabase, validated.client_id, validated.title);

    const { data, error } = await supabase
      .from('projects')
      .insert({ ...validated, title, created_by: user.id })
      .select('*, client:clients(*)')
      .single();

    if (error) return { data: null, error: error.message };

    revalidatePath('/admin/productions');
    revalidatePath('/client/productions');
    revalidatePath('/client/home');
    if (data.start_date) {
      await syncEntityToGoogle({
        entityType: 'project',
        entityId: data.id,
        operation: 'create',
        subtype: 'start',
        eventData: {
          title: `Start: ${data.title}`,
          startDate: data.start_date,
          allDay: true,
          colorId: getGoogleColorId('project', 'start'),
        },
      });
    }
    if (data.deadline) {
      await syncEntityToGoogle({
        entityType: 'project',
        entityId: data.id,
        operation: 'create',
        subtype: 'deadline',
        eventData: {
          title: `Deadline: ${data.title}`,
          startDate: data.deadline,
          allDay: true,
          colorId: getGoogleColorId('project', 'deadline'),
        },
      });
    }
    return { data, error: null };
  } catch (error) {
    if (error instanceof Error) {
      return { data: null, error: error.message };
    }
    return { data: null, error: 'Failed to create project' };
  }
}

export async function updateProject(
  id: string,
  input: unknown,
): Promise<ActionResult<ProjectWithClient>> {
  try {
    const validated = updateProjectSchema.parse(input);
    const { supabase, error: authError } = await requireUser();
    if (authError) return { data: null, error: authError };

    const { data, error } = await supabase
      .from('projects')
      .update(validated)
      .eq('id', id)
      .select('*, client:clients(*)')
      .single();

    if (error) return { data: null, error: error.message };

    revalidatePath('/admin/productions');
    revalidatePath(`/admin/projects/${id}`);
    revalidatePath('/client/productions');
    revalidatePath(`/client/projects/${id}`);
    revalidatePath('/client/home');
    if (data.start_date) {
      await syncEntityToGoogle({
        entityType: 'project',
        entityId: data.id,
        operation: 'update',
        subtype: 'start',
        eventData: {
          title: `Start: ${data.title}`,
          startDate: data.start_date,
          allDay: true,
          colorId: getGoogleColorId('project', 'start'),
        },
      });
    }
    if (data.deadline) {
      await syncEntityToGoogle({
        entityType: 'project',
        entityId: data.id,
        operation: 'update',
        subtype: 'deadline',
        eventData: {
          title: `Deadline: ${data.title}`,
          startDate: data.deadline,
          allDay: true,
          colorId: getGoogleColorId('project', 'deadline'),
        },
      });
    }

    // Keep the synced filming calendar event in lock-step with filming fields.
    // Sync is idempotent: if no filming_date/status='filming' flow exists yet,
    // the helper does nothing destructive.
    await syncProjectFilmingToCalendar(data.id);

    return { data, error: null };
  } catch (error) {
    if (error instanceof Error) {
      return { data: null, error: error.message };
    }
    return { data: null, error: 'Failed to update project' };
  }
}

export async function updateProjectStatus(
  id: string,
  status: ProjectStatus,
): Promise<ActionResult<Project>> {
  try {
    const { supabase, error: authError } = await requireUser();
    if (authError) return { data: null, error: authError };

    const { data, error } = await supabase
      .from('projects')
      .update({ status })
      .eq('id', id)
      .select()
      .single();

    if (error) return { data: null, error: error.message };

    await applyStatusChange({
      entity: 'project',
      status,
      ctx: { entityId: id, title: data.title, clientId: data.client_id },
    });

    return { data, error: null };
  } catch (err: unknown) {
    return {
      data: null,
      error: err instanceof Error ? err.message : 'Failed to update project status',
    };
  }
}

export async function deleteProject(id: string): Promise<ActionResult<void>> {
  try {
    const { supabase, error: authError } = await requireUser();
    if (authError) return { data: null, error: authError };
    const { error } = await supabase.from('projects').delete().eq('id', id);

    if (error) return { data: null, error: error.message };

    revalidatePath('/admin/productions');
    revalidatePath('/client/productions');
    revalidatePath('/client/home');
    await syncEntityToGoogle({
      entityType: 'project',
      entityId: id,
      operation: 'delete',
      subtype: 'start',
    });
    await syncEntityToGoogle({
      entityType: 'project',
      entityId: id,
      operation: 'delete',
      subtype: 'deadline',
    });
    return { data: undefined, error: null };
  } catch (err: unknown) {
    return { data: null, error: err instanceof Error ? err.message : 'Failed to delete project' };
  }
}

export async function assignProject(
  projectId: string,
  userId: string | null,
): Promise<ActionResult<Project>> {
  try {
    const { supabase, user, error: authError } = await requireAdmin();
    if (authError) return { data: null, error: authError };

    const { data, error } = await supabase
      .from('projects')
      .update({ assigned_to: userId })
      .eq('id', projectId)
      .select()
      .single();

    if (error) return { data: null, error: error.message };

    revalidatePath('/admin/productions');
    revalidatePath(`/admin/projects/${projectId}`);
    revalidatePath('/employee/productions');
    revalidatePath('/employee/today');

    // Notify the assigned employee
    if (userId) {
      createNotification({
        userId,
        type: NOTIFICATION_TYPES.TASK_ASSIGNED,
        title: `You have been assigned to production "${data.title}"`,
        actionUrl: `/employee/projects/${projectId}`,
      });
    }

    return { data, error: null };
  } catch (err: unknown) {
    return {
      data: null,
      error: err instanceof Error ? err.message : 'Failed to assign project',
    };
  }
}
