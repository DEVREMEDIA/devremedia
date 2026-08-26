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
  error: 'Unauthorized' | 'Forbidden: admin access required';
};

export async function requireUser(): Promise<AuthOk | AuthErr> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { supabase, user: null, error: 'Unauthorized' };
  }

  return { supabase, user, error: null };
}

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

/** Ρόλος του τρέχοντος admin — για UI gating (super_admin βλέπει τα οικονομικά widgets). */
export async function getAdminRole(): Promise<'super_admin' | 'admin' | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from('user_profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle();

  if (data?.role === 'super_admin' || data?.role === 'admin') return data.role;
  return null;
}
