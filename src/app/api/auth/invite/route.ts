import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';

const inviteSchema = z.object({
  email: z.string().email().max(255),
  display_name: z.string().min(1).max(255).optional(),
});

export async function POST(request: Request) {
  try {
    // Verify the requester is an admin
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!profile || (profile.role !== 'super_admin' && profile.role !== 'admin')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Validate input
    const body = await request.json();
    const validated = inviteSchema.parse(body);

    // Use admin client to invite user
    const adminClient = createAdminClient();
    const { data, error } = await adminClient.auth.admin.inviteUserByEmail(validated.email, {
      data: {
        display_name: validated.display_name || validated.email,
        invited_by: user.id,
      },
      redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback?next=/onboarding`,
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    // Auto-link client record by email
    await adminClient
      .from('clients')
      .update({ user_id: data.user.id })
      .eq('email', validated.email)
      .is('user_id', null);

    return NextResponse.json({ data: { user: data.user } });
  } catch (error: unknown) {
    if (error instanceof z.ZodError) {
      const zodError = error as z.ZodError;
      return NextResponse.json({ error: zodError.issues[0].message }, { status: 400 });
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
