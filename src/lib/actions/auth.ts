'use server';

import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { onboardingSchema } from '@/lib/schemas/auth';
import type { ActionResult } from '@/types';
import { z } from 'zod';

export async function inviteClient(
  email: string,
  displayName?: string,
): Promise<ActionResult<{ userId: string }>> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { data: null, error: 'Unauthorized' };
    }

    const { data: profile } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!profile || (profile.role !== 'super_admin' && profile.role !== 'admin')) {
      return { data: null, error: 'Forbidden: admin access required' };
    }

    const adminClient = createAdminClient();
    const { data, error } = await adminClient.auth.admin.inviteUserByEmail(email, {
      data: {
        display_name: displayName || email,
        invited_by: user.id,
      },
      redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback?next=/onboarding`,
    });

    if (error) {
      return { data: null, error: error.message };
    }

    // Auto-link client record by email
    await adminClient
      .from('clients')
      .update({ user_id: data.user.id })
      .eq('email', email)
      .is('user_id', null);

    return { data: { userId: data.user.id }, error: null };
  } catch {
    return { data: null, error: 'Failed to send invitation' };
  }
}

export async function completeOnboarding(
  input: z.infer<typeof onboardingSchema>,
): Promise<ActionResult<{ role: string }>> {
  try {
    const validated = onboardingSchema.parse(input);
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { data: null, error: 'Unauthorized' };
    }

    // Set the user's password so they can log in with email/password
    const { error: passwordError } = await supabase.auth.updateUser({
      password: validated.password,
    });

    if (passwordError) {
      return { data: null, error: passwordError.message };
    }

    // Update display name in user_profiles
    const { error } = await supabase
      .from('user_profiles')
      .update({
        display_name: validated.display_name,
      })
      .eq('id', user.id);

    if (error) {
      return { data: null, error: error.message };
    }

    // Auto-link client record by email (fallback if invite didn't link)
    const adminClient = createAdminClient();
    await adminClient
      .from('clients')
      .update({ user_id: user.id })
      .eq('email', user.email ?? '')
      .is('user_id', null);

    // Fetch user role for redirect
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    const role = profile?.role ?? 'client';

    return { data: { role }, error: null };
  } catch (err: unknown) {
    if (err instanceof z.ZodError) {
      const zodError = err as z.ZodError;
      return { data: null, error: zodError.issues[0].message };
    }
    return { data: null, error: 'Failed to complete onboarding' };
  }
}

export async function signOut(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
}
