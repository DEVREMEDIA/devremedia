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
