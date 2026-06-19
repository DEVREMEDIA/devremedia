import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * Regression guard for the invitation link (ADR-0003): the branded email MUST carry a
 * self-contained `token_hash` link to `/auth/confirm`, NOT Supabase's hosted action_link
 * (`/auth/v1/verify?…`). The action_link routes through the verify endpoint and lands on
 * `/auth/confirm` with a PKCE `?code=` that cannot be exchanged (no `code_verifier` cookie
 * for a server-initiated invite), so every link read as "expired".
 */

const generateLink = vi.fn();
const listUsers = vi.fn();
const updateUserById = vi.fn();
const sendInviteEmail = vi.fn();

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: () => ({
    auth: { admin: { generateLink, listUsers, updateUserById } },
    from: () => ({ insert: vi.fn() }),
  }),
}));

vi.mock('@/lib/email/send-invite-email', () => ({
  sendInviteEmail: (args: unknown) => sendInviteEmail(args),
}));

const ACTION_LINK =
  'https://proj.supabase.co/auth/v1/verify?token=raw-token&type=invite&redirect_to=https%3A%2F%2Fapp%2Fauth%2Fconfirm';

describe('deliverInvitation', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    process.env.NEXT_PUBLIC_APP_URL = 'https://app.devremedia.com';
    listUsers.mockResolvedValue({ data: { users: [] } });
    generateLink.mockResolvedValue({
      data: {
        properties: { hashed_token: 'HASHED_TOKEN_123', action_link: ACTION_LINK },
        user: { id: 'new-user-id' },
      },
      error: null,
    });
    sendInviteEmail.mockResolvedValue({ success: true });
  });

  it('emails a self-contained /auth/confirm token_hash link, not the hosted action_link', async () => {
    const { deliverInvitation } = await import('@/lib/invitations');

    const result = await deliverInvitation({
      email: 'client@example.com',
      invitedBy: 'admin-id',
      locale: 'el',
    });

    expect(result).toEqual({ ok: true, userId: 'new-user-id' });

    expect(sendInviteEmail).toHaveBeenCalledTimes(1);
    const { inviteLink } = sendInviteEmail.mock.calls[0][0] as { inviteLink: string };
    const url = new URL(inviteLink);

    expect(url.origin).toBe('https://app.devremedia.com');
    expect(url.pathname).toBe('/auth/confirm');
    expect(url.searchParams.get('token_hash')).toBe('HASHED_TOKEN_123');
    expect(url.searchParams.get('type')).toBe('invite');
    expect(url.searchParams.get('next')).toBe('/confirm');
    // Must NOT route through Supabase's hosted verify endpoint (the PKCE-code trap).
    expect(inviteLink).not.toContain('/auth/v1/verify');
  });

  it('fails cleanly when no token_hash is returned', async () => {
    generateLink.mockResolvedValue({ data: { properties: {} }, error: null });
    const { deliverInvitation } = await import('@/lib/invitations');

    const result = await deliverInvitation({
      email: 'client@example.com',
      invitedBy: 'admin-id',
      locale: 'el',
    });

    expect(result.ok).toBe(false);
    expect(sendInviteEmail).not.toHaveBeenCalled();
  });
});
