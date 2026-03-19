'use server';

import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { onboardingSchema } from '@/lib/schemas/auth';
import type { ActionResult } from '@/types';
import { cookies } from 'next/headers';
import { z } from 'zod';

async function getLocale(): Promise<string> {
  const cookieStore = await cookies();
  return cookieStore.get('NEXT_LOCALE')?.value ?? 'el';
}

/**
 * Forces a user into onboarding state:
 * 1. Clears display_name in profile (middleware checks this)
 * 2. Sets invited_by + locale in user metadata (middleware also checks this)
 */
async function forceOnboardingState(
  adminClient: ReturnType<typeof createAdminClient>,
  targetUserId: string,
  invitedByUserId: string,
  locale: string,
) {
  await Promise.all([
    adminClient.from('user_profiles').update({ display_name: null }).eq('id', targetUserId),
    adminClient.auth.admin.updateUserById(targetUserId, {
      user_metadata: { invited_by: invitedByUserId, locale },
    }),
  ]);
}

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
    const locale = await getLocale();

    const { data, error } = await adminClient.auth.admin.inviteUserByEmail(email, {
      data: {
        display_name: displayName || email,
        invited_by: user.id,
        locale,
      },
    });

    if (error) {
      // User already exists — re-invite via recovery email
      const { data: existingUsers } = await adminClient.auth.admin.listUsers();
      const existingUser = existingUsers?.users.find((u) => u.email === email);

      if (existingUser) {
        const { error: resetError } = await adminClient.auth.resetPasswordForEmail(email, {
          redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/confirm?type=recovery`,
        });

        if (resetError) {
          return { data: null, error: resetError.message };
        }

        // Force onboarding state so middleware catches them
        await forceOnboardingState(adminClient, existingUser.id, user.id, locale);

        // Auto-link client record
        await adminClient
          .from('clients')
          .update({ user_id: existingUser.id })
          .eq('email', email)
          .is('user_id', null);

        return { data: { userId: existingUser.id }, error: null };
      }

      return { data: null, error: error.message };
    }

    // New user — DB trigger sets display_name = NULL, but ensure invited_by is set
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

    // Set the user's password and clear invite flag so they won't be redirected to onboarding again
    const { error: passwordError } = await supabase.auth.updateUser({
      password: validated.password,
      data: { invited_by: null },
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
    const { data: profileData } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    const role = profileData?.role ?? 'client';

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
