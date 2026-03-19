'use server';

import { createClient } from '@/lib/supabase/server';
import { createTaskSchema, updateTaskSchema } from '@/lib/schemas/task';
import type { ActionResult, Task } from '@/types/index';
import type { TaskStatus } from '@/lib/constants';
import { revalidatePath } from 'next/cache';
import {
  createNotification,
  createNotificationForMany,
  getAdminUserIds,
} from '@/lib/actions/notifications';
import { NOTIFICATION_TYPES } from '@/lib/notification-types';

export async function getTasksByProject(projectId: string): Promise<ActionResult<Task[]>> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { data: null, error: 'Unauthorized' };
    const { data, error } = await supabase
      .from('tasks')
      .select(
        'id, project_id, title, description, status, priority, assigned_to, due_date, sort_order, created_at',
      )
      .eq('project_id', projectId)
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: false });

    if (error) return { data: null, error: error.message };
    return { data, error: null };
  } catch (err: unknown) {
    return { data: null, error: err instanceof Error ? err.message : 'Failed to fetch tasks' };
  }
}

export async function getTask(id: string): Promise<ActionResult<Task>> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { data: null, error: 'Unauthorized' };
    const { data, error } = await supabase
      .from('tasks')
      .select(
        'id, project_id, title, description, status, priority, assigned_to, due_date, sort_order, created_at',
      )
      .eq('id', id)
      .single();

    if (error) return { data: null, error: error.message };
    return { data, error: null };
  } catch (err: unknown) {
    return { data: null, error: err instanceof Error ? err.message : 'Failed to fetch task' };
  }
}

export async function createTask(input: unknown): Promise<ActionResult<Task>> {
  try {
    const validated = createTaskSchema.parse(input);
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { data: null, error: 'User not authenticated' };

    const { data, error } = await supabase
      .from('tasks')
      .insert({ ...validated, created_by: user.id })
      .select(
        'id, project_id, title, description, status, priority, assigned_to, due_date, sort_order, created_at',
      )
      .single();

    if (error) return { data: null, error: error.message };

    revalidatePath(`/admin/projects/${validated.project_id}`);
    revalidatePath('/employee/tasks');
    revalidatePath('/employee/dashboard');

    if (validated.assigned_to) {
      createNotification({
        userId: validated.assigned_to,
        type: NOTIFICATION_TYPES.TASK_ASSIGNED,
        title: 'New task assigned to you',
        body: data.title,
        actionUrl: `/employee/tasks/${data.id}`,
      });
    }

    return { data, error: null };
  } catch (error) {
    if (error instanceof Error) {
      return { data: null, error: error.message };
    }
    return { data: null, error: 'Failed to create task' };
  }
}

export async function updateTask(id: string, input: unknown): Promise<ActionResult<Task>> {
  try {
    const validated = updateTaskSchema.parse(input);
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { data: null, error: 'Unauthorized' };

    // Fetch old task to compare assigned_to
    const { data: oldTask } = await supabase
      .from('tasks')
      .select('assigned_to')
      .eq('id', id)
      .single();

    const { data, error } = await supabase
      .from('tasks')
      .update(validated)
      .eq('id', id)
      .select(
        'id, project_id, title, description, status, priority, assigned_to, due_date, sort_order, created_at',
      )
      .single();

    if (error) return { data: null, error: error.message };

    if (data?.project_id) {
      revalidatePath(`/admin/projects/${data.project_id}`);
    }
    revalidatePath('/employee/tasks');
    revalidatePath('/employee/dashboard');

    // Notify new assignee if assigned_to changed
    if (validated.assigned_to && validated.assigned_to !== oldTask?.assigned_to) {
      createNotification({
        userId: validated.assigned_to,
        type: NOTIFICATION_TYPES.TASK_ASSIGNED,
        title: 'New task assigned to you',
        body: data.title,
        actionUrl: `/employee/tasks/${data.id}`,
      });
    }

    return { data, error: null };
  } catch (error) {
    if (error instanceof Error) {
      return { data: null, error: error.message };
    }
    return { data: null, error: 'Failed to update task' };
  }
}

export async function updateTaskStatus(
  id: string,
  status: TaskStatus,
  sortOrder?: number,
): Promise<ActionResult<Task>> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { data: null, error: 'Unauthorized' };

    const updateData: { status: TaskStatus; sort_order?: number } = { status };
    if (sortOrder !== undefined) {
      updateData.sort_order = sortOrder;
    }

    const { data, error } = await supabase
      .from('tasks')
      .update(updateData)
      .eq('id', id)
      .select(
        'id, project_id, title, description, status, priority, assigned_to, due_date, sort_order, created_at',
      )
      .single();

    if (error) return { data: null, error: error.message };

    if (data?.project_id) {
      revalidatePath(`/admin/projects/${data.project_id}`);
    }
    revalidatePath('/employee/tasks');
    revalidatePath('/employee/dashboard');

    // Notify based on who changed the status
    if (data.assigned_to && data.assigned_to !== user.id) {
      // Admin changed status → notify assigned employee
      await createNotification({
        userId: data.assigned_to,
        type: NOTIFICATION_TYPES.TASK_UPDATED,
        title: `Task "${data.title}" status changed to ${status}`,
        actionUrl: `/employee/tasks/${data.id}`,
      });
    } else if (data.assigned_to === user.id) {
      // Employee changed status → notify all admins
      const adminIds = await getAdminUserIds();
      await createNotificationForMany(adminIds, {
        type: NOTIFICATION_TYPES.TASK_UPDATED,
        title: `Task "${data.title}" marked as ${status}`,
        actionUrl: `/admin/projects/${data.project_id}?tab=tasks`,
      });
    }

    return { data, error: null };
  } catch (err: unknown) {
    return {
      data: null,
      error: err instanceof Error ? err.message : 'Failed to update task status',
    };
  }
}

export async function deleteTask(id: string): Promise<ActionResult<void>> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { data: null, error: 'Unauthorized' };

    const { data: task } = await supabase.from('tasks').select('project_id').eq('id', id).single();

    const { error } = await supabase.from('tasks').delete().eq('id', id);

    if (error) return { data: null, error: error.message };

    if (task?.project_id) {
      revalidatePath(`/admin/projects/${task.project_id}`);
    }
    revalidatePath('/employee/tasks');
    revalidatePath('/employee/dashboard');
    return { data: undefined, error: null };
  } catch (err: unknown) {
    return { data: null, error: err instanceof Error ? err.message : 'Failed to delete task' };
  }
}
