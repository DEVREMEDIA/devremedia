# Invitations are delivered via generateLink + Resend, landing on /auth/confirm

We deliver every invitation through `supabase.auth.admin.generateLink({ type: 'invite' })`
and send the resulting action link in our own branded **Resend** email, with the link
redirecting to `/auth/confirm` (which verifies the `token_hash` OTP). We do **not** rely
on Supabase's native `inviteUserByEmail` email delivery, nor on the PKCE `code` flow
through `/auth/callback`, for invitations. The first sign-in is a **Confirmation**
screen: the invitee reviews their admin-entered details (read-only) and sets only a
password.

## Context

Invitations are admin-initiated and server-side: an admin invites a Client from the
client record (`client.email` + `client.contact_name` already exist) or a team member
from the user-management dialog. There was no working initial-invite path:

- The first invite called `inviteUserByEmail` and depended on the Supabase **Cloud**
  email template. Our local `supabase/templates/invite.html` (token_hash based) is not
  active in cloud unless manually uploaded to the Dashboard.
- The `@supabase/ssr` client uses **PKCE**. The default cloud link routes through
  `/auth/v1/verify` and lands with `?code=`, but `exchangeCodeForSession(code)` cannot
  succeed for a server-initiated invite — there is no `code_verifier` cookie in the
  invitee's browser. Result: `/login?error=auth_callback_error` → the client sees a
  generic error on click ("προέκυψε σφάλμα").
- `/auth/callback` only handles `code`, while `/auth/confirm` handles both `code` and
  `token_hash`. The invite paths pointed at different, non-interchangeable routes.

Only the *re-invite* branch (user already exists) worked, because it already used
`generateLink` + Resend + `/auth/confirm`.

## Decision

- **Unify all invitations** on the proven path: `generateLink({ type: 'invite' })`
  → branded **Resend** email → redirect to `/auth/confirm`. Self-contained token_hash
  link; no dependency on a Dashboard-uploaded template or on PKCE.
- **Confirmation replaces onboarding.** Invitees no longer enter their own profile data.
  They see name / email / company read-only (sourced from the `clients` record, or the
  invite dialog for team members) and set only a password. Applies to **all** invited
  roles. `completeOnboarding` sets the password and clears `invited_by`, but must **not**
  overwrite the admin-set `display_name`.
- **Expired/invalid links** show a friendly "link expired" screen with a self-service
  "send me a new one" action — a public, rate-limited resend endpoint that returns a
  generic message (no account-existence disclosure).

## Consequences

- We own the invitation email (deliverability, branding, bilingual copy) and depend on
  **Resend** for it — the same dependency the rest of the automated email system already
  carries.
- Native `inviteUserByEmail` email delivery is deliberately bypassed; a future engineer
  should not "simplify" back to it without re-introducing the PKCE/template failure.
- The onboarding gate now keys off the `invited_by` metadata flag, not a null
  `display_name` (which is pre-filled by the admin).
- The team-member invite dialog must collect a name (no `clients` record to source it
  from); previously optional.
