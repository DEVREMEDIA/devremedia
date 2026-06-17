'use server';

import { createAdminClient } from '@/lib/supabase/admin';
import { requireAdmin } from '@/lib/auth-helpers';
import { deliverInvitation } from '@/lib/invitations';
import type { ActionResult, UserProfile } from '@/types';
import type { UserWithEmail } from '@/types/entities';
import type { UserRole } from '@/lib/constants';
import { revalidatePath } from 'next/cache';
import { cookies } from 'next/headers';

export async function getTeamMembers(): Promise<ActionResult<UserProfile[]>> {
  try {
    const { supabase, error: authError } = await requireAdmin();
    if (authError) return { data: null, error: authError };

    const { data, error } = await supabase
      .from('user_profiles')
      .select('*')
      .in('role', ['super_admin', 'admin', 'employee', 'salesman'])
      .order('created_at', { ascending: true });

    if (error) {
      return { data: null, error: error.message };
    }

    return { data: data || [], error: null };
  } catch (error) {
    return {
      data: null,
      error: error instanceof Error ? error.message : 'Failed to fetch team members',
    };
  }
}

export async function getAllUsers(): Promise<ActionResult<UserWithEmail[]>> {
  try {
    const { supabase, error: authError } = await requireAdmin();
    if (authError) return { data: null, error: authError };

    // Fetch all user profiles
    const { data: profiles, error: profilesError } = await supabase
      .from('user_profiles')
      .select('id, role, display_name, avatar_url, preferences, created_at')
      .order('created_at', { ascending: true });

    if (profilesError) {
      return { data: null, error: profilesError.message };
    }

    // Fetch emails from Supabase Auth via admin client
    const adminClient = createAdminClient();
    const { data: authData, error: authError2 } = await adminClient.auth.admin.listUsers({
      perPage: 1000,
    });

    if (authError2) {
      return { data: null, error: authError2.message };
    }

    // Build email lookup map
    const emailMap = new Map<string, string>();
    for (const authUser of authData.users) {
      emailMap.set(authUser.id, authUser.email ?? '');
    }

    // Merge profiles with emails
    const usersWithEmail: UserWithEmail[] = (profiles ?? []).map((p) => ({
      ...p,
      email: emailMap.get(p.id) ?? '',
    }));

    return { data: usersWithEmail, error: null };
  } catch (error) {
    return {
      data: null,
      error: error instanceof Error ? error.message : 'Failed to fetch users',
    };
  }
}

export async function inviteTeamMember(
  email: string,
  role: UserRole,
  name: string,
): Promise<ActionResult<{ email: string }>> {
  try {
    const { user, error: authError } = await requireAdmin();
    if (authError) return { data: null, error: authError };

    const cookieStore = await cookies();
    const locale = cookieStore.get('NEXT_LOCALE')?.value ?? 'el';

    // One reliable delivery path for every invite (generateLink + Resend → /auth/confirm).
    // There is no `clients` record to source the name from, so the dialog requires one;
    // fall back to the email if somehow absent.
    const result = await deliverInvitation({
      email,
      invitedBy: user.id,
      locale,
      role,
      displayName: name || email,
    });

    if (!result.ok) return { data: null, error: result.error };

    // If inviting as a client, link the client record by email.
    if (role === 'client') {
      const adminClient = createAdminClient();
      await adminClient
        .from('clients')
        .update({ user_id: result.userId })
        .eq('email', email)
        .is('user_id', null);
    }

    revalidatePath('/admin/settings');
    revalidatePath('/admin/users');
    return { data: { email }, error: null };
  } catch (error) {
    console.error('Failed to invite team member:', error);
    return {
      data: null,
      error: error instanceof Error ? error.message : 'Failed to invite team member',
    };
  }
}

export async function updateTeamMemberRole(
  userId: string,
  role: UserRole,
): Promise<ActionResult<{ userId: string; role: UserRole }>> {
  try {
    const { supabase, error: authError } = await requireAdmin();
    if (authError) return { data: null, error: authError };

    // Use admin client to bypass RLS — caller is already verified as admin
    const adminClient = createAdminClient();
    const { error } = await adminClient.from('user_profiles').update({ role }).eq('id', userId);

    if (error) {
      return { data: null, error: error.message };
    }

    // When changing role to 'client', ensure a clients record exists
    if (role === 'client') {
      const { data: authData } = await adminClient.auth.admin.getUserById(userId);
      const email = authData?.user?.email;

      if (email) {
        // Check if client record already linked to this user
        const { data: existingClient } = await supabase
          .from('clients')
          .select('id')
          .eq('user_id', userId)
          .maybeSingle();

        if (!existingClient) {
          // Try to link by email first (orphaned client record)
          const { data: emailClient } = await supabase
            .from('clients')
            .select('id')
            .eq('email', email)
            .is('user_id', null)
            .maybeSingle();

          if (emailClient) {
            await supabase.from('clients').update({ user_id: userId }).eq('id', emailClient.id);
          } else {
            // Create new client record
            const { data: targetProfile } = await supabase
              .from('user_profiles')
              .select('display_name')
              .eq('id', userId)
              .single();

            await supabase.from('clients').insert({
              user_id: userId,
              email,
              contact_name: targetProfile?.display_name ?? email.split('@')[0],
              status: 'active',
            });
          }
        }
      }
    }

    revalidatePath('/admin/users');
    revalidatePath('/admin/clients');
    return { data: { userId, role }, error: null };
  } catch (error) {
    return {
      data: null,
      error: error instanceof Error ? error.message : 'Failed to update team member role',
    };
  }
}

export async function deactivateTeamMember(
  userId: string,
): Promise<ActionResult<{ userId: string }>> {
  try {
    const { user, error: authError } = await requireAdmin();
    if (authError) return { data: null, error: authError };

    if (user.id === userId) {
      return { data: null, error: 'Cannot deactivate your own account' };
    }

    // Use admin client to ban the user in Supabase Auth
    const adminClient = createAdminClient();
    const { error: banError } = await adminClient.auth.admin.updateUserById(userId, {
      ban_duration: '876600h', // ~100 years = effectively permanent
    });

    if (banError) {
      return { data: null, error: banError.message };
    }

    // Also mark in user_profiles for UI purposes (use admin client to bypass RLS)
    const { error: profileError } = await adminClient
      .from('user_profiles')
      .update({
        preferences: { deactivated: true },
      })
      .eq('id', userId);

    if (profileError) {
      console.error('Failed to update profile:', profileError);
    }

    revalidatePath('/admin/settings');
    revalidatePath('/admin/users');
    return { data: { userId }, error: null };
  } catch (error) {
    console.error('Failed to deactivate team member:', error);
    return {
      data: null,
      error: error instanceof Error ? error.message : 'Failed to deactivate team member',
    };
  }
}

export async function reactivateTeamMember(
  userId: string,
): Promise<ActionResult<{ userId: string }>> {
  try {
    const { error: authError } = await requireAdmin();
    if (authError) return { data: null, error: authError };

    // Unban the user in Supabase Auth
    const adminClient = createAdminClient();
    const { error: banError } = await adminClient.auth.admin.updateUserById(userId, {
      ban_duration: 'none',
    });

    if (banError) {
      return { data: null, error: banError.message };
    }

    // Remove deactivated flag from preferences (use admin client to bypass RLS)
    const { data: targetProfile } = await adminClient
      .from('user_profiles')
      .select('preferences')
      .eq('id', userId)
      .single();

    if (targetProfile) {
      const { deactivated: _, ...restPreferences } = targetProfile.preferences as Record<
        string,
        unknown
      >;
      await adminClient
        .from('user_profiles')
        .update({ preferences: restPreferences })
        .eq('id', userId);
    }

    revalidatePath('/admin/settings');
    revalidatePath('/admin/users');
    return { data: { userId }, error: null };
  } catch (error) {
    console.error('Failed to reactivate team member:', error);
    return {
      data: null,
      error: error instanceof Error ? error.message : 'Failed to reactivate team member',
    };
  }
}
