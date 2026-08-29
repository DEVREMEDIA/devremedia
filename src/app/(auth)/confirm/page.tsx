import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { ConfirmationForm } from '@/components/auth/confirmation-form';

const ROLE_DASHBOARDS: Record<string, string> = {
  super_admin: '/admin/today',
  admin: '/admin/today',
  employee: '/employee/today',
  salesman: '/salesman/today',
  client: '/client/home',
};

/**
 * Confirmation screen. The invitee reviews their admin-entered details (read-only) and
 * sets a password. A user who has already confirmed (invite flag cleared) is not re-trapped
 * here — they're sent straight to their dashboard (issue #29, story 21).
 */
export default async function ConfirmPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('role, display_name')
    .eq('id', user.id)
    .single();

  const role = profile?.role ?? 'client';

  // Already confirmed → no Confirmation needed.
  const isInvited = !!user.user_metadata?.invited_by;
  if (!isInvited) {
    redirect(ROLE_DASHBOARDS[role] ?? '/client/home');
  }

  // Read-only details: name from the profile (admin pre-filled) falling back to the linked
  // client record; company from the client record (Clients only — team members have none).
  const { data: client } = await supabase
    .from('clients')
    .select('contact_name, company_name')
    .eq('user_id', user.id)
    .maybeSingle();

  const details = {
    name: profile?.display_name ?? client?.contact_name ?? user.email ?? '',
    email: user.email ?? '',
    company: client?.company_name ?? null,
  };

  return <ConfirmationForm details={details} />;
}
