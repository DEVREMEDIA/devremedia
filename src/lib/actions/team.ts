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
    const { data: inviteData, error } = await adminClient.auth.admin.inviteUserByEmail(email, {
      data: {
        role,
        invited_by: user.id,
      },
      redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback?next=/onboarding`,
    });

    if (error) {
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

    revalidatePath('/admin/users');
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
