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

// Ο server και η βάση δεν είναι πια σε δύο ηπείρους, αλλά κάθε κλήση στον Auth
// παραμένει ταξίδι στο δίκτυο. Οι τρεις παρακάτω είναι τα μοναδικά σημεία που
// μιλούν στη Supabase για ταυτότητα και ρόλο· όλοι οι helpers από κάτω τις
// μοιράζονται, οπότε ένα αίτημα ρωτά μία φορά όσες ενέργειες κι αν καλέσει.
const getRequestClient = cache(createClient);

const getRequestUser = cache(async (): Promise<User | null> => {
  const supabase = await getRequestClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
});

const getRequestRole = cache(async (userId: string): Promise<string | null> => {
  const supabase = await getRequestClient();
  const { data, error } = await supabase
    .from('user_profiles')
    .select('role')
    .eq('id', userId)
    .maybeSingle();

  if (error) console.error('[auth-helpers] role lookup', error);

  return data?.role ?? null;
});

export const requireUser = cache(async (): Promise<AuthOk | AuthErr> => {
  const supabase = await getRequestClient();
  const user = await getRequestUser();

  if (!user) {
    return { supabase, user: null, error: 'Unauthorized' };
  }

  return { supabase, user, error: null };
});

export async function requireAdmin(): Promise<AuthOk | AuthErr> {
  const supabase = await getRequestClient();
  const user = await getRequestUser();

  if (!user) {
    return { supabase, user: null, error: 'Unauthorized' };
  }

  const role = await getRequestRole(user.id);
  if (!role || !['super_admin', 'admin'].includes(role)) {
    return { supabase, user: null, error: 'Forbidden: admin access required' };
  }

  return { supabase, user, error: null };
}

// Admins and super_admins pass every role check, so callers only list the extra
// roles they want to allow (e.g. requireRole(['salesman'])).
export async function requireRole(roles: readonly string[]): Promise<AuthOk | AuthErr> {
  const supabase = await getRequestClient();
  const user = await getRequestUser();

  if (!user) {
    return { supabase, user: null, error: 'Unauthorized' };
  }

  const role = await getRequestRole(user.id);
  const allowed = ['super_admin', 'admin', ...roles];
  if (!role || !allowed.includes(role)) {
    return { supabase, user: null, error: 'Forbidden: insufficient permissions' };
  }

  return { supabase, user, error: null };
}

/** Ρόλος του τρέχοντος admin — για UI gating (super_admin βλέπει τα οικονομικά widgets). */
export const getAdminRole = cache(async (): Promise<'super_admin' | 'admin' | null> => {
  const user = await getRequestUser();
  if (!user) return null;

  const role = await getRequestRole(user.id);
  if (role === 'super_admin' || role === 'admin') return role;
  return null;
});
