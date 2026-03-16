'use server';

import { createClient } from '@/lib/supabase/server';
import type { ActionResult } from '@/types';

export type CompanySettings = {
  company_name: string;
  logo_url: string | null;
  address: string | null;
  phone: string | null;
  email: string | null;
  vat_number: string | null;
  primary_color: string | null;
};

export type NotificationSettings = {
  email_new_project: boolean;
  email_project_deadline: boolean;
  email_invoice_paid: boolean;
  email_new_message: boolean;
  email_deliverable_feedback: boolean;
};

export async function getCompanySettings(): Promise<ActionResult<CompanySettings>> {
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

    // For now, we'll use a simple approach with a settings table
    const { data, error } = await supabase
      .from('settings')
      .select('*')
      .eq('key', 'company_settings')
      .single();

    if (error && error.code !== 'PGRST116') {
      // PGRST116 is "not found" - acceptable for first load
      return { data: null, error: error.message };
    }

    const settings: CompanySettings = data?.value || {
      company_name: 'Devre Media',
      logo_url: null,
      address: null,
      phone: null,
      email: null,
      vat_number: null,
      primary_color: null,
    };

    return { data: settings, error: null };
  } catch (err: unknown) {
    return {
      data: null,
      error: err instanceof Error ? err.message : 'Failed to fetch company settings',
    };
  }
}

export async function updateCompanySettings(
  settings: CompanySettings,
): Promise<ActionResult<CompanySettings>> {
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

    const { error } = await supabase.from('settings').upsert({
      key: 'company_settings',
      value: settings,
      updated_at: new Date().toISOString(),
    });

    if (error) {
      return { data: null, error: error.message };
    }

    return { data: settings, error: null };
  } catch (err: unknown) {
    return {
      data: null,
      error: err instanceof Error ? err.message : 'Failed to update company settings',
    };
  }
}

export async function getNotificationSettings(
  userId: string,
): Promise<ActionResult<NotificationSettings>> {
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
    const isAdmin = profile && ['super_admin', 'admin'].includes(profile.role);
    if (!isAdmin && user.id !== userId) {
      return { data: null, error: "Forbidden: cannot access another user's settings" };
    }

    const { data, error } = await supabase
      .from('user_profiles')
      .select('preferences')
      .eq('id', userId)
      .single();

    if (error) {
      return { data: null, error: error.message };
    }

    const preferences = (data?.preferences as Record<string, unknown>) || {};
    const settings: NotificationSettings = {
      email_new_project:
        preferences.email_new_project !== undefined ? Boolean(preferences.email_new_project) : true,
      email_project_deadline:
        preferences.email_project_deadline !== undefined
          ? Boolean(preferences.email_project_deadline)
          : true,
      email_invoice_paid:
        preferences.email_invoice_paid !== undefined
          ? Boolean(preferences.email_invoice_paid)
          : true,
      email_new_message:
        preferences.email_new_message !== undefined ? Boolean(preferences.email_new_message) : true,
      email_deliverable_feedback:
        preferences.email_deliverable_feedback !== undefined
          ? Boolean(preferences.email_deliverable_feedback)
          : true,
    };

    return { data: settings, error: null };
  } catch (err: unknown) {
    return {
      data: null,
      error: err instanceof Error ? err.message : 'Failed to fetch notification settings',
    };
  }
}

export async function updateNotificationSettings(
  userId: string,
  settings: NotificationSettings,
): Promise<ActionResult<NotificationSettings>> {
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
    const isAdmin = profile && ['super_admin', 'admin'].includes(profile.role);
    if (!isAdmin && user.id !== userId) {
      return { data: null, error: "Forbidden: cannot update another user's settings" };
    }

    // Get current preferences
    const { data: currentData } = await supabase
      .from('user_profiles')
      .select('preferences')
      .eq('id', userId)
      .single();

    const currentPreferences = (currentData?.preferences as Record<string, unknown>) || {};
    const updatedPreferences = {
      ...currentPreferences,
      ...settings,
    };

    const { error } = await supabase
      .from('user_profiles')
      .update({ preferences: updatedPreferences })
      .eq('id', userId);

    if (error) {
      return { data: null, error: error.message };
    }

    return { data: settings, error: null };
  } catch (err: unknown) {
    return {
      data: null,
      error: err instanceof Error ? err.message : 'Failed to update notification settings',
    };
  }
}
