'use server';

import { createClient } from '@/lib/supabase/server';
import { createKbCategorySchema, updateKbCategorySchema } from '@/lib/schemas/kb-category';
import type { ActionResult, KbCategory } from '@/types';
import { revalidatePath } from 'next/cache';

export async function getKbCategories(): Promise<ActionResult<KbCategory[]>> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { data: null, error: 'Unauthorized' };
    const { data, error } = await supabase
      .from('kb_categories')
      .select(
        'id, title, description, slug, sort_order, parent_id, created_by, created_at, updated_at',
      )
      .order('sort_order', { ascending: true });

    if (error) return { data: null, error: error.message };
    return { data: data ?? [], error: null };
  } catch {
    return { data: null, error: 'Failed to fetch categories' };
  }
}

export async function getKbCategory(id: string): Promise<ActionResult<KbCategory>> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { data: null, error: 'Unauthorized' };
    const { data, error } = await supabase
      .from('kb_categories')
      .select(
        'id, title, description, slug, sort_order, parent_id, created_by, created_at, updated_at',
      )
      .eq('id', id)
      .single();

    if (error) return { data: null, error: error.message };
    return { data, error: null };
  } catch {
    return { data: null, error: 'Failed to fetch category' };
  }
}

export async function getKbCategoryBySlug(slug: string): Promise<ActionResult<KbCategory>> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { data: null, error: 'Unauthorized' };
    const { data, error } = await supabase
      .from('kb_categories')
      .select(
        'id, title, description, slug, sort_order, parent_id, created_by, created_at, updated_at',
      )
      .eq('slug', slug)
      .single();

    if (error) return { data: null, error: error.message };
    return { data, error: null };
  } catch {
    return { data: null, error: 'Failed to fetch category' };
  }
}

export async function createKbCategory(input: unknown): Promise<ActionResult<KbCategory>> {
  try {
    const validated = createKbCategorySchema.parse(input);
    const supabase = await createClient();

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
      .from('kb_categories')
      .insert({ ...validated, created_by: user.id })
      .select(
        'id, title, description, slug, sort_order, parent_id, created_by, created_at, updated_at',
      )
      .single();

    if (error) return { data: null, error: error.message };

    revalidatePath('/admin/university');
    revalidatePath('/employee/university', 'layout');
    return { data, error: null };
  } catch (error) {
    if (error instanceof Error) return { data: null, error: error.message };
    return { data: null, error: 'Failed to create category' };
  }
}

export async function updateKbCategory(
  id: string,
  input: unknown,
): Promise<ActionResult<KbCategory>> {
  try {
    const validated = updateKbCategorySchema.parse(input);
    const supabase = await createClient();
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
      .from('kb_categories')
      .update(validated)
      .eq('id', id)
      .select(
        'id, title, description, slug, sort_order, parent_id, created_by, created_at, updated_at',
      )
      .single();

    if (error) return { data: null, error: error.message };

    revalidatePath('/admin/university');
    revalidatePath('/employee/university', 'layout');
    return { data, error: null };
  } catch (error) {
    if (error instanceof Error) return { data: null, error: error.message };
    return { data: null, error: 'Failed to update category' };
  }
}

export async function deleteKbCategory(id: string): Promise<ActionResult<void>> {
  try {
    const supabase = await createClient();
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

    const { error } = await supabase.from('kb_categories').delete().eq('id', id);

    if (error) return { data: null, error: error.message };

    revalidatePath('/admin/university');
    revalidatePath('/employee/university', 'layout');
    return { data: undefined, error: null };
  } catch {
    return { data: null, error: 'Failed to delete category' };
  }
}
