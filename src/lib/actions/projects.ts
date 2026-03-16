'use server';

import { createClient } from '@/lib/supabase/server';
import { createProjectSchema, updateProjectSchema } from '@/lib/schemas/project';
import type { ActionResult, ProjectWithClient, Project } from '@/types/index';
import type { ProjectStatus, Priority } from '@/lib/constants';
import { revalidatePath } from 'next/cache';
import { escapePostgrestFilter } from '@/lib/utils';

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
    return { data: undefined, error: null };
  } catch (err: unknown) {
    return { data: null, error: err instanceof Error ? err.message : 'Failed to delete project' };
  }
}
