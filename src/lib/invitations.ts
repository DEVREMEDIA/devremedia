import { createAdminClient } from '@/lib/supabase/admin';
import { sendInviteEmail } from '@/lib/email/send-invite-email';
import { CONFIRMATION_ROUTE } from '@/lib/auth/resolve-redirect';
import type { UserRole } from '@/lib/constants';

interface DeliverInvitationParams {
  email: string;
  /** Auth user id of the admin who issued the invite (stored as the `invited_by` flag). */
  invitedBy: string;
  locale: string;
  /** Admin-entered name (Client contact_name, or team member name). Never typed by the invitee. */
  displayName?: string;
  /** Set for team invites so the new profile gets the right role. */
  role?: UserRole;
}

type DeliverInvitationResult = { ok: true; userId: string } | { ok: false; error: string };

const APP_URL = process.env.NEXT_PUBLIC_APP_URL;

function rateLimitMessage(locale: string): string {
  return locale === 'el'
    ? 'Πολλές προσκλήσεις σε σύντομο χρόνο. Δοκιμάστε ξανά σε λίγο.'
    : 'Too many invitations sent. Please try again later.';
}

/**
 * The single, reliable way every Invitation is delivered: generate a self-contained
 * `token_hash` invite link (no Cloud template, no PKCE) and send it through the branded
 * Resend invite email. The link redirects to `/auth/confirm`, which verifies the OTP and
 * forwards to the Confirmation screen.
 *
 * Used by `inviteClient`, `inviteTeamMember`, and the public resend endpoint — see
 * ADR-0003. Callers are responsible for their own authorization and for linking the
 * `clients` record afterward.
 */
export async function deliverInvitation({
  email,
  invitedBy,
  locale,
  displayName,
  role,
}: DeliverInvitationParams): Promise<DeliverInvitationResult> {
  const adminClient = createAdminClient();

  const metadata: Record<string, unknown> = { invited_by: invitedBy, locale };
  if (displayName) metadata.display_name = displayName;
  if (role) metadata.role = role;

  // If the user already exists (e.g. a prior invite that was never confirmed), refresh
  // their invite metadata so the gate re-opens. We never null `display_name` — the
  // admin-entered name stays authoritative (issue #29, story 18).
  const { data: usersList } = await adminClient.auth.admin.listUsers({ perPage: 1000 });
  const existing = usersList?.users.find((u) => u.email === email);
  if (existing) {
    await adminClient.auth.admin.updateUserById(existing.id, { user_metadata: metadata });
  }

  const { data: linkData, error } = await adminClient.auth.admin.generateLink({
    type: 'invite',
    email,
    options: {
      redirectTo: `${APP_URL}/auth/confirm?type=invite&next=${CONFIRMATION_ROUTE}`,
      data: metadata,
    },
  });

  if (error || !linkData?.properties?.action_link) {
    if (error?.message.toLowerCase().includes('rate limit')) {
      return { ok: false, error: rateLimitMessage(locale) };
    }
    return { ok: false, error: error?.message ?? 'Failed to generate invitation link' };
  }

  const emailResult = await sendInviteEmail({
    to: email,
    inviteLink: linkData.properties.action_link,
    locale,
  });

  if (!emailResult.success) {
    return { ok: false, error: emailResult.error ?? 'Failed to send invitation email' };
  }

  const userId = existing?.id ?? linkData.user?.id;
  if (!userId) {
    return { ok: false, error: 'Failed to resolve invited user' };
  }

  return { ok: true, userId };
}
