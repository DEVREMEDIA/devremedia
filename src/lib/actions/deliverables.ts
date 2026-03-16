'use server';

import { createClient } from '@/lib/supabase/server';
import { createDeliverableSchema, createAnnotationSchema } from '@/lib/schemas/deliverable';
import type { ActionResult, Deliverable, VideoAnnotation } from '@/types/index';
import type { DeliverableStatus } from '@/lib/constants';
import { revalidatePath } from 'next/cache';

export async function getDeliverablesByProject(
  projectId: string,
): Promise<ActionResult<Deliverable[]>> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { data: null, error: 'Unauthorized' };

    const { data, error } = await supabase
      .from('deliverables')
      .select(
        'id, project_id, title, description, file_path, file_size, file_type, version, status, uploaded_by, download_count, expires_at, created_at',
      )
      .eq('project_id', projectId)
      .order('version', { ascending: false });

    if (error) return { data: null, error: error.message };
    return { data, error: null };
  } catch (err: unknown) {
    return {
      data: null,
      error: err instanceof Error ? err.message : 'Failed to fetch deliverables',
    };
  }
}

export async function getDeliverable(id: string): Promise<ActionResult<Deliverable>> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { data: null, error: 'Unauthorized' };

    const { data, error } = await supabase
      .from('deliverables')
      .select(
        'id, project_id, title, description, file_path, file_size, file_type, version, status, uploaded_by, download_count, expires_at, created_at',
      )
      .eq('id', id)
      .single();

    if (error) return { data: null, error: error.message };
    return { data, error: null };
  } catch (err: unknown) {
    return {
      data: null,
      error: err instanceof Error ? err.message : 'Failed to fetch deliverable',
    };
  }
}

export async function createDeliverable(input: unknown): Promise<ActionResult<Deliverable>> {
  try {
    const validated = createDeliverableSchema.parse(input);
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { data: null, error: 'User not authenticated' };

    const { data: maxVersion } = await supabase
      .from('deliverables')
      .select('version')
      .eq('project_id', validated.project_id)
      .order('version', { ascending: false })
      .limit(1)
      .single();

    const versionNumber = maxVersion ? maxVersion.version + 1 : 1;

    const { data, error } = await supabase
      .from('deliverables')
      .insert({
        ...validated,
        uploaded_by: user.id,
        version: versionNumber,
        status: 'pending_review',
      })
      .select(
        'id, project_id, title, description, file_path, file_size, file_type, version, status, uploaded_by, download_count, expires_at, created_at',
      )
      .single();

    if (error) return { data: null, error: error.message };

    revalidatePath(`/admin/projects/${validated.project_id}`);
    return { data, error: null };
  } catch (error) {
    if (error instanceof Error) {
      return { data: null, error: error.message };
    }
    return { data: null, error: 'Failed to create deliverable' };
  }
}

export async function updateDeliverableStatus(
  id: string,
  status: DeliverableStatus,
): Promise<ActionResult<Deliverable>> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { data: null, error: 'Unauthorized' };

    const { data, error } = await supabase
      .from('deliverables')
      .update({ status })
      .eq('id', id)
      .select(
        'id, project_id, title, description, file_path, file_size, file_type, version, status, uploaded_by, download_count, expires_at, created_at',
      )
      .single();

    if (error) return { data: null, error: error.message };

    if (data?.project_id) {
      revalidatePath(`/admin/projects/${data.project_id}`);
    }
    return { data, error: null };
  } catch (err: unknown) {
    return {
      data: null,
      error: err instanceof Error ? err.message : 'Failed to update deliverable status',
    };
  }
}

export async function deleteDeliverable(id: string): Promise<ActionResult<void>> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { data: null, error: 'Unauthorized' };

    const { data: deliverable } = await supabase
      .from('deliverables')
      .select('project_id')
      .eq('id', id)
      .single();

    const { error } = await supabase.from('deliverables').delete().eq('id', id);

    if (error) return { data: null, error: error.message };

    if (deliverable?.project_id) {
      revalidatePath(`/admin/projects/${deliverable.project_id}`);
    }
    return { data: undefined, error: null };
  } catch (err: unknown) {
    return {
      data: null,
      error: err instanceof Error ? err.message : 'Failed to delete deliverable',
    };
  }
}

export async function getAnnotations(
  deliverableId: string,
): Promise<ActionResult<VideoAnnotation[]>> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { data: null, error: 'Unauthorized' };

    const { data, error } = await supabase
      .from('video_annotations')
      .select('id, deliverable_id, user_id, timestamp_seconds, content, resolved, created_at')
      .eq('deliverable_id', deliverableId)
      .order('timestamp_seconds', { ascending: true });

    if (error) return { data: null, error: error.message };
    return { data, error: null };
  } catch (err: unknown) {
    return {
      data: null,
      error: err instanceof Error ? err.message : 'Failed to fetch annotations',
    };
  }
}

export async function createAnnotation(input: unknown): Promise<ActionResult<VideoAnnotation>> {
  try {
    const validated = createAnnotationSchema.parse(input);
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { data: null, error: 'User not authenticated' };

    const { data, error } = await supabase
      .from('video_annotations')
      .insert({ ...validated, user_id: user.id })
      .select('id, deliverable_id, user_id, timestamp_seconds, content, resolved, created_at')
      .single();

    if (error) return { data: null, error: error.message };

    revalidatePath(`/admin/deliverables/${validated.deliverable_id}`);
    return { data, error: null };
  } catch (error) {
    if (error instanceof Error) {
      return { data: null, error: error.message };
    }
    return { data: null, error: 'Failed to create annotation' };
  }
}

export async function resolveAnnotation(id: string): Promise<ActionResult<VideoAnnotation>> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { data: null, error: 'Unauthorized' };

    const { data: annotation } = await supabase
      .from('video_annotations')
      .select('resolved')
      .eq('id', id)
      .single();

    const { data, error } = await supabase
      .from('video_annotations')
      .update({ resolved: !annotation?.resolved })
      .eq('id', id)
      .select('id, deliverable_id, user_id, timestamp_seconds, content, resolved, created_at')
      .single();

    if (error) return { data: null, error: error.message };

    if (data?.deliverable_id) {
      revalidatePath(`/admin/deliverables/${data.deliverable_id}`);
    }
    return { data, error: null };
  } catch (err: unknown) {
    return {
      data: null,
      error: err instanceof Error ? err.message : 'Failed to resolve annotation',
    };
  }
}
