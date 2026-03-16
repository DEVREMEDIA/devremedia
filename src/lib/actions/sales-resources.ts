'use server';

import { createClient } from '@/lib/supabase/server';
import {
  createSalesResourceCategorySchema,
  updateSalesResourceCategorySchema,
  createSalesResourceSchema,
} from '@/lib/schemas/sales-resource';
import type { ActionResult, SalesResourceCategory, SalesResource } from '@/types';
import { revalidatePath } from 'next/cache';

// --- Categories ---

export async function getSalesResourceCategories(): Promise<ActionResult<SalesResourceCategory[]>> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { data: null, error: 'Unauthorized' };
    const { data, error } = await supabase
      .from('sales_resource_categories')
      .select('id, title, description, sort_order, created_at')
      .order('sort_order', { ascending: true });

    if (error) return { data: null, error: error.message };
    return { data: data ?? [], error: null };
  } catch {
    return { data: null, error: 'Failed to fetch resource categories' };
  }
}

export async function createSalesResourceCategory(
  input: unknown,
): Promise<ActionResult<SalesResourceCategory>> {
  try {
    const validated = createSalesResourceCategorySchema.parse(input);
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
      .from('sales_resource_categories')
      .insert(validated)
      .select('id, title, description, sort_order, created_at')
      .single();

    if (error) return { data: null, error: error.message };

    revalidatePath('/admin/sales-resources');
    revalidatePath('/salesman/resources');
    return { data, error: null };
  } catch (error) {
    if (error instanceof Error) return { data: null, error: error.message };
    return { data: null, error: 'Failed to create category' };
  }
}

export async function updateSalesResourceCategory(
  id: string,
  input: unknown,
): Promise<ActionResult<SalesResourceCategory>> {
  try {
    const validated = updateSalesResourceCategorySchema.parse(input);
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
      .from('sales_resource_categories')
      .update(validated)
      .eq('id', id)
      .select('id, title, description, sort_order, created_at')
      .single();

    if (error) return { data: null, error: error.message };

    revalidatePath('/admin/sales-resources');
    revalidatePath('/salesman/resources');
    return { data, error: null };
  } catch (error) {
    if (error instanceof Error) return { data: null, error: error.message };
    return { data: null, error: 'Failed to update category' };
  }
}

export async function deleteSalesResourceCategory(id: string): Promise<ActionResult<void>> {
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

    const { error } = await supabase.from('sales_resource_categories').delete().eq('id', id);

    if (error) return { data: null, error: error.message };

    revalidatePath('/admin/sales-resources');
    revalidatePath('/salesman/resources');
    return { data: undefined, error: null };
  } catch {
    return { data: null, error: 'Failed to delete category' };
  }
}

// --- Resources ---

export async function getSalesResources(
  categoryId?: string,
): Promise<ActionResult<SalesResource[]>> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { data: null, error: 'Unauthorized' };
    let query = supabase
      .from('sales_resources')
      .select('*, category:sales_resource_categories(title)')
      .order('created_at', { ascending: false });

    if (categoryId) {
      query = query.eq('category_id', categoryId);
    }

    const { data, error } = await query;
    if (error) return { data: null, error: error.message };
    return { data: data ?? [], error: null };
  } catch {
    return { data: null, error: 'Failed to fetch resources' };
  }
}

export async function createSalesResource(input: unknown): Promise<ActionResult<SalesResource>> {
  try {
    const validated = createSalesResourceSchema.parse(input);
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { data: null, error: 'Unauthorized' };

    const { data, error } = await supabase
      .from('sales_resources')
      .insert({ ...validated, uploaded_by: user.id })
      .select(
        'id, category_id, title, description, file_path, file_name, file_size, file_type, uploaded_by, created_at',
      )
      .single();

    if (error) return { data: null, error: error.message };

    revalidatePath('/admin/sales-resources');
    revalidatePath('/salesman/resources');
    return { data, error: null };
  } catch (error) {
    if (error instanceof Error) return { data: null, error: error.message };
    return { data: null, error: 'Failed to create resource' };
  }
}

export async function deleteSalesResource(id: string): Promise<ActionResult<void>> {
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

    // Get file path first to delete from storage
    const { data: resource } = await supabase
      .from('sales_resources')
      .select('file_path')
      .eq('id', id)
      .single();

    const { error } = await supabase.from('sales_resources').delete().eq('id', id);
    if (error) return { data: null, error: error.message };

    // Clean up storage
    if (resource?.file_path) {
      await supabase.storage.from('sales-resources').remove([resource.file_path]);
    }

    revalidatePath('/admin/sales-resources');
    revalidatePath('/salesman/resources');
    return { data: undefined, error: null };
  } catch {
    return { data: null, error: 'Failed to delete resource' };
  }
}

export async function getSalesResourceDownloadUrl(filePath: string): Promise<ActionResult<string>> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { data: null, error: 'Unauthorized' };
    const { data, error } = await supabase.storage
      .from('sales-resources')
      .createSignedUrl(filePath, 3600); // 1 hour expiry

    if (error) return { data: null, error: error.message };
    return { data: data.signedUrl, error: null };
  } catch {
    return { data: null, error: 'Failed to generate download URL' };
  }
}
