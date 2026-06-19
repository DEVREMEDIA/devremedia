'use server';

import {
  createDeliverableSchema,
  createAnnotationSchema,
  updateDeliverableSchema,
} from '@/lib/schemas/deliverable';
import type { ActionResult, Deliverable, VideoAnnotation } from '@/types/index';
import type { DeliverableStatus } from '@/lib/constants';
import { revalidatePath } from 'next/cache';
import { createNotification, getClientUserIdFromProject } from '@/lib/actions/notifications';
import { applyStatusChange } from '@/lib/apply-status-change';
import { NOTIFICATION_TYPES } from '@/lib/notification-types';
import { requireUser } from '@/lib/auth-helpers';

export async function getDeliverablesByProject(
  projectId: string,
): Promise<ActionResult<Deliverable[]>> {
  try {
    const { supabase, error: authError } = await requireUser();
    if (authError) return { data: null, error: authError };

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
    const { supabase, error: authError } = await requireUser();
    if (authError) return { data: null, error: authError };

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
    const { supabase, user, error: authError } = await requireUser();
    if (authError) return { data: null, error: authError };

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
    revalidatePath(`/client/projects/${validated.project_id}`);
    revalidatePath('/client/dashboard');
    revalidatePath(`/employee/deliverables/${validated.project_id}`);
    revalidatePath(`/employee/projects/${validated.project_id}`);

    // Notify client about new deliverable
    const clientUserId = await getClientUserIdFromProject(validated.project_id);
    if (clientUserId) {
      createNotification({
        userId: clientUserId,
        type: NOTIFICATION_TYPES.DELIVERABLE_UPLOADED,
        title: 'New deliverable ready for review',
        body: data.title,
        actionUrl: `/client/projects/${validated.project_id}`,
      });
    }

    return { data, error: null };
  } catch (error) {
    if (error instanceof Error) {
      return { data: null, error: error.message };
    }
    return { data: null, error: 'Failed to create deliverable' };
  }
}

export async function updateDeliverable(
  id: string,
  input: unknown,
): Promise<ActionResult<Deliverable>> {
  try {
    const validated = updateDeliverableSchema.parse(input);
    const { supabase, error: authError } = await requireUser();
    if (authError) return { data: null, error: authError };

    // If file_path changed, bump version
    const updateData: Record<string, unknown> = { ...validated };
    if (validated.file_path) {
      const { data: current } = await supabase
        .from('deliverables')
        .select('version, project_id')
        .eq('id', id)
        .single();

      if (current) {
        updateData.version = current.version + 1;
      }
    }

    const { data, error } = await supabase
      .from('deliverables')
      .update(updateData)
      .eq('id', id)
      .select(
        'id, project_id, title, description, file_path, file_size, file_type, version, status, uploaded_by, download_count, expires_at, created_at',
      )
      .single();

    if (error) return { data: null, error: error.message };

    if (data?.project_id) {
      revalidatePath(`/admin/projects/${data.project_id}`);
      revalidatePath(`/client/projects/${data.project_id}`);
      revalidatePath('/client/dashboard');

      // Notify client about updated deliverable
      if (validated.file_path) {
        const clientUserId = await getClientUserIdFromProject(data.project_id);
        if (clientUserId) {
          createNotification({
            userId: clientUserId,
            type: NOTIFICATION_TYPES.DELIVERABLE_UPLOADED,
            title: 'Deliverable updated with new version',
            body: data.title,
            actionUrl: `/client/projects/${data.project_id}`,
          });
        }
      }
    }

    return { data, error: null };
  } catch (error) {
    if (error instanceof Error) {
      return { data: null, error: error.message };
    }
    return { data: null, error: 'Failed to update deliverable' };
  }
}

export async function updateDeliverableStatus(
  id: string,
  status: DeliverableStatus,
): Promise<ActionResult<Deliverable>> {
  try {
    const { supabase, user, error: authError } = await requireUser();
    if (authError) return { data: null, error: authError };

    const { data, error } = await supabase
      .from('deliverables')
      .update({ status })
      .eq('id', id)
      .select(
        'id, project_id, title, description, file_path, file_size, file_type, version, status, uploaded_by, download_count, expires_at, created_at',
      )
      .single();

    if (error) return { data: null, error: error.message };

    // The decision function branches on the actor's role; resolve it only when the
    // deliverable has a project (mirrors the original guard — avoids a wasted query).
    let actorRole: string | undefined;
    if (data.project_id) {
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('role')
        .eq('id', user.id)
        .single();
      actorRole = profile?.role;
    }

    await applyStatusChange({
      entity: 'deliverable',
      status,
      ctx: {
        entityId: data.id,
        title: data.title,
        projectId: data.project_id,
        actorId: user.id,
        actorRole,
        uploadedBy: data.uploaded_by,
      },
    });

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
    const { supabase, user, error: authError } = await requireUser();
    if (authError) return { data: null, error: authError };

    // Snapshot the deliverable before deletion so the audit trail records what was
    // removed (the underlying Drive/YouTube/Vimeo video itself is never touched).
    const { data: deliverable } = await supabase
      .from('deliverables')
      .select('project_id, title, file_path, version')
      .eq('id', id)
      .single();

    // .select() returns the rows actually deleted. If RLS blocks the delete it
    // removes 0 rows with no error — guard against silently reporting success.
    const { data: deleted, error } = await supabase
      .from('deliverables')
      .delete()
      .eq('id', id)
      .select('id');

    if (error) return { data: null, error: error.message };
    if (!deleted || deleted.length === 0) {
      return { data: null, error: 'Deliverable not found or not permitted' };
    }

    // Best-effort audit entry — surfaces in the admin recent-activity feed.
    await supabase.rpc('log_activity', {
      p_user_id: user.id,
      p_action: 'deleted',
      p_entity_type: 'deliverable',
      p_entity_id: id,
      p_metadata: {
        title: deliverable?.title ?? null,
        file_path: deliverable?.file_path ?? null,
        version: deliverable?.version ?? null,
        project_id: deliverable?.project_id ?? null,
      },
    });

    if (deliverable?.project_id) {
      revalidatePath(`/admin/projects/${deliverable.project_id}`);
      revalidatePath(`/client/projects/${deliverable.project_id}`);
      revalidatePath(`/employee/deliverables/${deliverable.project_id}`);
      revalidatePath(`/employee/projects/${deliverable.project_id}`);
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
    const { supabase, error: authError } = await requireUser();
    if (authError) return { data: null, error: authError };

    const { data, error } = await supabase
      .from('video_annotations')
      .select(
        'id, deliverable_id, user_id, timestamp_seconds, content, resolved, created_at, user_profiles(display_name, avatar_url)',
      )
      .eq('deliverable_id', deliverableId)
      .order('created_at', { ascending: true });

    if (error) return { data: null, error: error.message };

    const annotations: VideoAnnotation[] = (data ?? []).map((row) => {
      const profile = Array.isArray(row.user_profiles) ? row.user_profiles[0] : row.user_profiles;
      return {
        id: row.id,
        deliverable_id: row.deliverable_id,
        user_id: row.user_id,
        timestamp_seconds: row.timestamp_seconds,
        content: row.content,
        resolved: row.resolved,
        created_at: row.created_at,
        author_name: profile?.display_name ?? null,
        author_avatar_url: profile?.avatar_url ?? null,
      };
    });

    return { data: annotations, error: null };
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
    const { supabase, user, error: authError } = await requireUser();
    if (authError) return { data: null, error: authError };

    const { data, error } = await supabase
      .from('video_annotations')
      .insert({ ...validated, user_id: user.id })
      .select('id, deliverable_id, user_id, timestamp_seconds, content, resolved, created_at')
      .single();

    if (error) return { data: null, error: error.message };

    revalidatePath(`/admin/deliverables/${validated.deliverable_id}`);

    // Also revalidate client project page
    const { data: deliverable } = await supabase
      .from('deliverables')
      .select('project_id')
      .eq('id', validated.deliverable_id)
      .single();
    if (deliverable?.project_id) {
      revalidatePath(`/client/projects/${deliverable.project_id}`);
      revalidatePath(`/employee/deliverables/${deliverable.project_id}`);
      revalidatePath(`/employee/projects/${deliverable.project_id}`);
    }
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
    const { supabase, error: authError } = await requireUser();
    if (authError) return { data: null, error: authError };

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

      // Also revalidate client project page
      const { data: deliverable } = await supabase
        .from('deliverables')
        .select('project_id')
        .eq('id', data.deliverable_id)
        .single();
      if (deliverable?.project_id) {
        revalidatePath(`/client/projects/${deliverable.project_id}`);
      }
    }
    return { data, error: null };
  } catch (err: unknown) {
    return {
      data: null,
      error: err instanceof Error ? err.message : 'Failed to resolve annotation',
    };
  }
}

export async function requestRevisionWithNote(
  deliverableId: string,
  note: string,
): Promise<ActionResult<Deliverable>> {
  if (!note.trim()) {
    return { data: null, error: 'Revision note is required' };
  }

  try {
    const { supabase, user, error: authError } = await requireUser();
    if (authError) return { data: null, error: authError };

    const { error: annotationError } = await supabase
      .from('video_annotations')
      .insert({
        deliverable_id: deliverableId,
        timestamp_seconds: null,
        content: note.trim(),
        user_id: user.id,
      });

    if (annotationError) return { data: null, error: annotationError.message };

    const { data, error } = await supabase
      .from('deliverables')
      .update({ status: 'revision_requested' })
      .eq('id', deliverableId)
      .select(
        'id, project_id, title, description, file_path, file_size, file_type, version, status, uploaded_by, download_count, expires_at, created_at',
      )
      .single();

    if (error) return { data: null, error: error.message };

    let actorRole: string | undefined;
    if (data.project_id) {
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('role')
        .eq('id', user.id)
        .single();
      actorRole = profile?.role;
    }

    await applyStatusChange({
      entity: 'deliverable',
      status: 'revision_requested',
      ctx: {
        entityId: data.id,
        title: data.title,
        projectId: data.project_id,
        actorId: user.id,
        actorRole,
        uploadedBy: data.uploaded_by,
      },
    });

    revalidatePath(`/admin/projects/${data.project_id}`);
    revalidatePath(`/client/projects/${data.project_id}`);
    revalidatePath(`/admin/deliverables/${deliverableId}`);
    revalidatePath(`/employee/deliverables/${data.project_id}`);

    return { data, error: null };
  } catch (err: unknown) {
    return {
      data: null,
      error: err instanceof Error ? err.message : 'Failed to request revision',
    };
  }
}
