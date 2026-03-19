'use server';

import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import type { ActionResult, UserProfile } from '@/types';
import type { UserWithEmail } from '@/types/entities';
import type { UserRole } from '@/lib/constants';
import { revalidatePath } from 'next/cache';

export async function getTeamMembers(): Promise<ActionResult<UserProfile[]>> {
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
    const { data: authData, error: authError } = await adminClient.auth.admin.listUsers({
      perPage: 1000,
    });

    if (authError) {
      return { data: null, error: authError.message };
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
): Promise<ActionResult<{ email: string }>> {
  try {
    const supabase = await createClient();

    // Verify caller is admin
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { data: null, error: 'Unauthorized' };

    const { data: profile } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!profile || (profile.role !== 'super_admin' && profile.role !== 'admin')) {
      return { data: null, error: 'Forbidden: admin access required' };
    }

    // Use admin client to invite user via Supabase Auth
    const adminClient = createAdminClient();
    const redirectTo = `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback?next=/onboarding`;

    const { data: inviteData, error } = await adminClient.auth.admin.inviteUserByEmail(email, {
      data: {
        role,
        invited_by: user.id,
      },
      redirectTo,
    });

    if (error) {
      // If user already exists (expired invite), resend via recovery link
      const isUserExists =
        error.message.toLowerCase().includes('already') ||
        error.message.toLowerCase().includes('exists');

      if (isUserExists) {
        // Send a recovery email — user clicks link → lands on /onboarding → sets password
        const { error: resetError } = await adminClient.auth.resetPasswordForEmail(email, {
          redirectTo,
        });

        if (resetError) {
          return { data: null, error: resetError.message };
        }

        // Find existing user, update role, and force onboarding state
        const { data: authData } = await adminClient.auth.admin.listUsers();
        const existingUser = authData?.users.find((u) => u.email === email);
        if (existingUser) {
          await Promise.all([
            supabase
              .from('user_profiles')
              .update({ role, display_name: null })
              .eq('id', existingUser.id),
            adminClient.auth.admin.updateUserById(existingUser.id, {
              user_metadata: { invited_by: user.id },
            }),
          ]);
        }

        revalidatePath('/admin/settings');
        revalidatePath('/admin/users');
        return { data: { email }, error: null };
      }

      return { data: null, error: error.message };
    }

    // If inviting as client, auto-link client record by email
    if (role === 'client' && inviteData?.user) {
      await adminClient
        .from('clients')
        .update({ user_id: inviteData.user.id })
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

    const { error } = await supabase.from('user_profiles').update({ role }).eq('id', userId);

    if (error) {
      return { data: null, error: error.message };
    }

    // When changing role to 'client', ensure a clients record exists
    if (role === 'client') {
      const adminClient = createAdminClient();
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
    const supabase = await createClient();

    // Verify caller is admin
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

    if (user.id === userId) {
      return { data: null, error: 'Cannot deactivate your own account' };
    }

    // Use admin client to ban the user in Supabase Auth
    const adminClient = createAdminClient();
    const { error: authError } = await adminClient.auth.admin.updateUserById(userId, {
      ban_duration: '876600h', // ~100 years = effectively permanent
    });

    if (authError) {
      return { data: null, error: authError.message };
    }

    // Also mark in user_profiles for UI purposes
    const { error: profileError } = await supabase
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

    // Unban the user in Supabase Auth
    const adminClient = createAdminClient();
    const { error: authError } = await adminClient.auth.admin.updateUserById(userId, {
      ban_duration: 'none',
    });

    if (authError) {
      return { data: null, error: authError.message };
    }

    // Remove deactivated flag from preferences
    const { data: targetProfile } = await supabase
      .from('user_profiles')
      .select('preferences')
      .eq('id', userId)
      .single();

    if (targetProfile) {
      const { deactivated: _, ...restPreferences } = targetProfile.preferences as Record<
        string,
        unknown
      >;
      await supabase
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
