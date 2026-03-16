'use server';

import { createClient } from '@/lib/supabase/server';
import {
  updateEquipmentListSchema,
  updateShotListSchema,
  createConceptNoteSchema,
  updateConceptNoteSchema,
} from '@/lib/schemas/filming-prep';
import type { ActionResult, EquipmentList, ShotList, ConceptNote } from '@/types/index';
import { revalidatePath } from 'next/cache';

export async function getEquipmentList(projectId: string): Promise<ActionResult<EquipmentList>> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { data: null, error: 'Unauthorized' };

    const { data, error } = await supabase
      .from('equipment_lists')
      .select('id, project_id, items, created_at, updated_at')
      .eq('project_id', projectId)
      .single();

    if (error && error.code === 'PGRST116') {
      const { data: newList, error: createError } = await supabase
        .from('equipment_lists')
        .insert({
          project_id: projectId,
          items: [],
        })
        .select('id, project_id, items, created_at, updated_at')
        .single();

      if (createError) return { data: null, error: createError.message };
      return { data: newList, error: null };
    } else if (error) {
      return { data: null, error: error.message };
    }

    return { data, error: null };
  } catch (err: unknown) {
    return {
      data: null,
      error: err instanceof Error ? err.message : 'Failed to fetch equipment list',
    };
  }
}

export async function updateEquipmentList(
  projectId: string,
  input: unknown,
): Promise<ActionResult<EquipmentList>> {
  try {
    const validated = updateEquipmentListSchema.parse(input);
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { data: null, error: 'Unauthorized' };

    const { data, error } = await supabase
      .from('equipment_lists')
      .update({ items: validated.items })
      .eq('project_id', projectId)
      .select('id, project_id, items, created_at, updated_at')
      .single();

    if (error) return { data: null, error: error.message };

    revalidatePath(`/admin/projects/${projectId}/prep`);
    return { data, error: null };
  } catch (error) {
    if (error instanceof Error) {
      return { data: null, error: error.message };
    }
    return { data: null, error: 'Failed to update equipment list' };
  }
}

export async function getShotLists(projectId: string): Promise<ActionResult<ShotList[]>> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { data: null, error: 'Unauthorized' };

    const { data, error } = await supabase
      .from('shot_lists')
      .select('id, project_id, shots, created_at, updated_at')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false });

    if (error) return { data: null, error: error.message };
    return { data, error: null };
  } catch (err: unknown) {
    return { data: null, error: err instanceof Error ? err.message : 'Failed to fetch shot lists' };
  }
}

export async function createShotList(projectId: string): Promise<ActionResult<ShotList>> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { data: null, error: 'Unauthorized' };

    const { data, error } = await supabase
      .from('shot_lists')
      .insert({
        project_id: projectId,
        shots: [],
      })
      .select('id, project_id, shots, created_at, updated_at')
      .single();

    if (error) return { data: null, error: error.message };

    revalidatePath(`/admin/projects/${projectId}/prep`);
    return { data, error: null };
  } catch (err: unknown) {
    return { data: null, error: err instanceof Error ? err.message : 'Failed to create shot list' };
  }
}

export async function updateShotList(id: string, input: unknown): Promise<ActionResult<ShotList>> {
  try {
    const validated = updateShotListSchema.parse(input);
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { data: null, error: 'Unauthorized' };

    const { data, error } = await supabase
      .from('shot_lists')
      .update({ shots: validated.shots })
      .eq('id', id)
      .select('id, project_id, shots, created_at, updated_at')
      .single();

    if (error) return { data: null, error: error.message };

    if (data?.project_id) {
      revalidatePath(`/admin/projects/${data.project_id}/prep`);
    }
    return { data, error: null };
  } catch (error) {
    if (error instanceof Error) {
      return { data: null, error: error.message };
    }
    return { data: null, error: 'Failed to update shot list' };
  }
}

export async function getConceptNotes(projectId: string): Promise<ActionResult<ConceptNote[]>> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { data: null, error: 'Unauthorized' };

    const { data, error } = await supabase
      .from('concept_notes')
      .select('id, project_id, title, content, attachments, created_at, updated_at')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false });

    if (error) return { data: null, error: error.message };
    return { data, error: null };
  } catch (err: unknown) {
    return {
      data: null,
      error: err instanceof Error ? err.message : 'Failed to fetch concept notes',
    };
  }
}

export async function getConceptNote(id: string): Promise<ActionResult<ConceptNote>> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { data: null, error: 'Unauthorized' };

    const { data, error } = await supabase
      .from('concept_notes')
      .select('id, project_id, title, content, attachments, created_at, updated_at')
      .eq('id', id)
      .single();

    if (error) return { data: null, error: error.message };
    return { data, error: null };
  } catch (err: unknown) {
    return {
      data: null,
      error: err instanceof Error ? err.message : 'Failed to fetch concept note',
    };
  }
}

export async function createConceptNote(input: unknown): Promise<ActionResult<ConceptNote>> {
  try {
    const validated = createConceptNoteSchema.parse(input);
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { data: null, error: 'Unauthorized' };

    const { data, error } = await supabase
      .from('concept_notes')
      .insert(validated)
      .select('id, project_id, title, content, attachments, created_at, updated_at')
      .single();

    if (error) return { data: null, error: error.message };

    revalidatePath(`/admin/projects/${validated.project_id}/prep`);
    return { data, error: null };
  } catch (error) {
    if (error instanceof Error) {
      return { data: null, error: error.message };
    }
    return { data: null, error: 'Failed to create concept note' };
  }
}

export async function updateConceptNote(
  id: string,
  input: unknown,
): Promise<ActionResult<ConceptNote>> {
  try {
    const validated = updateConceptNoteSchema.parse(input);
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { data: null, error: 'Unauthorized' };

    const { data, error } = await supabase
      .from('concept_notes')
      .update(validated)
      .eq('id', id)
      .select('id, project_id, title, content, attachments, created_at, updated_at')
      .single();

    if (error) return { data: null, error: error.message };

    if (data?.project_id) {
      revalidatePath(`/admin/projects/${data.project_id}/prep`);
    }
    return { data, error: null };
  } catch (error) {
    if (error instanceof Error) {
      return { data: null, error: error.message };
    }
    return { data: null, error: 'Failed to update concept note' };
  }
}

export async function deleteConceptNote(id: string): Promise<ActionResult<void>> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { data: null, error: 'Unauthorized' };

    const { data: note } = await supabase
      .from('concept_notes')
      .select('project_id')
      .eq('id', id)
      .single();

    const { error } = await supabase.from('concept_notes').delete().eq('id', id);

    if (error) return { data: null, error: error.message };

    if (note?.project_id) {
      revalidatePath(`/admin/projects/${note.project_id}/prep`);
    }
    return { data: undefined, error: null };
  } catch (err: unknown) {
    return {
      data: null,
      error: err instanceof Error ? err.message : 'Failed to delete concept note',
    };
  }
}
