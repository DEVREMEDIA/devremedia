'use server';

import { createClient } from '@/lib/supabase/server';
import { createProjectSchema, updateProjectSchema } from '@/lib/schemas/project';
import type { ActionResult, ProjectWithClient, Project } from '@/types/index';
import type { ProjectStatus, Priority } from '@/lib/constants';
import { revalidatePath } from 'next/cache';
import { escapePostgrestFilter } from '@/lib/utils';
import { createNotification, getClientUserIdFromProject } from '@/lib/actions/notifications';
import { NOTIFICATION_TYPES } from '@/lib/notification-types';
import { syncEntityToGoogle } from '@/lib/google-sync-helper';
import { triggerProjectDeliveredEmail } from '@/lib/email/triggers/project-delivered';
import { getGoogleColorId } from '@/lib/google-calendar';
import { syncProjectFilmingToCalendar } from '@/lib/actions/sync-project-filming';

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
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { data: null, error: 'Unauthorized' };
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

export async function getProject(id: string): Promise<ActionResult<ProjectWithClient>> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { data: null, error: 'Unauthorized' };
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
}

export async function createProject(input: unknown): Promise<ActionResult<ProjectWithClient>> {
  try {
    const validated = createProjectSchema.parse(input);
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { data: null, error: 'User not authenticated' };

    const { data, error } = await supabase
      .from('projects')
      .insert({ ...validated, created_by: user.id })
      .select('*, client:clients(*)')
      .single();

    if (error) return { data: null, error: error.message };

    revalidatePath('/admin/projects');
    revalidatePath('/client/projects');
    revalidatePath('/client/dashboard');
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
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { data: null, error: 'Unauthorized' };

    const { data, error } = await supabase
      .from('projects')
      .update(validated)
      .eq('id', id)
      .select('*, client:clients(*)')
      .single();

    if (error) return { data: null, error: error.message };

    revalidatePath('/admin/projects');
    revalidatePath(`/admin/projects/${id}`);
    revalidatePath('/client/projects');
    revalidatePath(`/client/projects/${id}`);
    revalidatePath('/client/dashboard');
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
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { data: null, error: 'Unauthorized' };

    const { data, error } = await supabase
      .from('projects')
      .update({ status })
      .eq('id', id)
      .select()
      .single();

    if (error) return { data: null, error: error.message };

    revalidatePath('/admin/projects');
    revalidatePath(`/admin/projects/${id}`);
    revalidatePath('/client/projects');
    revalidatePath(`/client/projects/${id}`);
    revalidatePath('/client/dashboard');

    // Notify client of status change
    const clientUserId = await getClientUserIdFromProject(id);
    if (clientUserId) {
      createNotification({
        userId: clientUserId,
        type: NOTIFICATION_TYPES.PROJECT_STATUS,
        title: `Project "${data.title}" status updated to ${status}`,
        actionUrl: `/client/projects/${id}`,
      });
    }

    // Send email when project is delivered (fire-and-forget)
    if (status === 'delivered' && data.client_id) {
      triggerProjectDeliveredEmail({
        projectId: id,
        projectTitle: data.title,
        clientId: data.client_id,
      });
    }

    // Auto-sync a filming calendar event when the project enters (or leaves)
    // the 'filming' phase. syncProjectFilmingToCalendar is idempotent and
    // self-healing so calling it on every status change is safe.
    if (status === 'filming') {
      await syncProjectFilmingToCalendar(id);
    }

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
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { data: null, error: 'Unauthorized' };
    const { error } = await supabase.from('projects').delete().eq('id', id);

    if (error) return { data: null, error: error.message };

    revalidatePath('/admin/projects');
    revalidatePath('/client/projects');
    revalidatePath('/client/dashboard');
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
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { data: null, error: 'Unauthorized' };

    // Verify caller is admin
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('id', user.id)
      .single();
    if (!profile || !['super_admin', 'admin'].includes(profile.role)) {
      return { data: null, error: 'Forbidden: admin access required' };
    }

    const { data, error } = await supabase
      .from('projects')
      .update({ assigned_to: userId })
      .eq('id', projectId)
      .select()
      .single();

    if (error) return { data: null, error: error.message };

    revalidatePath('/admin/projects');
    revalidatePath(`/admin/projects/${projectId}`);
    revalidatePath('/employee/projects');
    revalidatePath('/employee/dashboard');

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
