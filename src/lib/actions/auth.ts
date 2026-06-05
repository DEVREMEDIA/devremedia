'use server';

import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { requireAdmin } from '@/lib/auth-helpers';
import { confirmationSchema } from '@/lib/schemas/auth';
import { deliverInvitation } from '@/lib/invitations';
import type { ActionResult } from '@/types';
import { cookies } from 'next/headers';
import { z } from 'zod';

async function getLocale(): Promise<string> {
  const cookieStore = await cookies();
  return cookieStore.get('NEXT_LOCALE')?.value ?? 'el';
}

/**
 * Invite a Client to the DMS. The admin-entered name (contact_name) flows into the
 * invitation; the invitee never types it. Delivery goes through the one reliable path
 * (generateLink + Resend → /auth/confirm) — see ADR-0003.
 */
export async function inviteClient(
  email: string,
  displayName?: string,
): Promise<ActionResult<{ userId: string }>> {
  try {
    const { user, error: authError } = await requireAdmin();
    if (authError) return { data: null, error: authError };

    const locale = await getLocale();
    const result = await deliverInvitation({ email, invitedBy: user.id, locale, displayName });

    if (!result.ok) return { data: null, error: result.error };

    // Link the client record by email (the admin may have just created it).
    const adminClient = createAdminClient();
    await adminClient
      .from('clients')
      .update({ user_id: result.userId })
      .eq('email', email)
      .is('user_id', null);

    return { data: { userId: result.userId }, error: null };
  } catch {
    return { data: null, error: 'Failed to send invitation' };
  }
}

/**
 * Confirmation: the invitee sets a password and the invite flag is cleared, closing the
 * gate. The admin-entered display_name is left untouched (story 18) — the invitee has no
 * profile form to fill.
 */
export async function completeOnboarding(
  input: z.infer<typeof confirmationSchema>,
): Promise<ActionResult<{ role: string }>> {
  try {
    const validated = confirmationSchema.parse(input);
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { data: null, error: 'Unauthorized' };
    }

    const { error: passwordError } = await supabase.auth.updateUser({
      password: validated.password,
      data: { invited_by: null },
    });

    if (passwordError) {
      return { data: null, error: passwordError.message };
    }

    // Auto-link client record by email (fallback if the invite didn't link it).
    const adminClient = createAdminClient();
    await adminClient
      .from('clients')
      .update({ user_id: user.id })
      .eq('email', user.email ?? '')
      .is('user_id', null);

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
    return { data: null, error: 'Failed to complete confirmation' };
  }
}

export async function signOut(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
}
