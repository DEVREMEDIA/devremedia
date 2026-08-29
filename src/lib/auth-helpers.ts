import { cache } from 'react';
import { createClient } from '@/lib/supabase/server';
import type { SupabaseClient, User } from '@supabase/supabase-js';

type AuthOk = {
  supabase: SupabaseClient;
  user: User;
  error: null;
};

type AuthErr = {
  supabase: SupabaseClient;
  user: null;
  error:
    | 'Unauthorized'
    | 'Forbidden: admin access required'
    | 'Forbidden: insufficient permissions';
};

// Κάθε ενέργεια αυτού του προϊόντος περνά από εδώ, και μια σελίδα του πελάτη
// καλεί πέντε ενέργειες — δηλαδή πέντε ταξίδια στον Auth για την ίδια απάντηση,
// μέσα στο ίδιο αίτημα. Το `cache()` τα κάνει ένα. Ο `getAdminRole` από κάτω
// είναι ήδη έτσι· αυτό απλώς έλειπε.
export const requireUser = cache(async (): Promise<AuthOk | AuthErr> => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { supabase, user: null, error: 'Unauthorized' };
  }

  return { supabase, user, error: null };
});

export async function requireAdmin(): Promise<AuthOk | AuthErr> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { supabase, user: null, error: 'Unauthorized' };
  }

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (!profile || !['super_admin', 'admin'].includes(profile.role)) {
    return { supabase, user: null, error: 'Forbidden: admin access required' };
  }

  return { supabase, user, error: null };
}

// Admins and super_admins pass every role check, so callers only list the extra
// roles they want to allow (e.g. requireRole(['salesman'])).
export async function requireRole(roles: readonly string[]): Promise<AuthOk | AuthErr> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { supabase, user: null, error: 'Unauthorized' };
  }

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  const allowed = ['super_admin', 'admin', ...roles];
  if (!profile || !allowed.includes(profile.role)) {
    return { supabase, user: null, error: 'Forbidden: insufficient permissions' };
  }

  return { supabase, user, error: null };
}

/** Ρόλος του τρέχοντος admin — για UI gating (super_admin βλέπει τα οικονομικά widgets). */
export const getAdminRole = cache(async (): Promise<'super_admin' | 'admin' | null> => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from('user_profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle();

  if (error) console.error('[getAdminRole]', error);

  if (data?.role === 'super_admin' || data?.role === 'admin') return data.role;
  return null;
});
