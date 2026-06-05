/**
 * The Confirmation screen an invitee lands on after their invite link is verified:
 * they review their admin-entered details (read-only) and set a password.
 * The OTP-verifying handler is `/auth/confirm`; it redirects here.
 */
export const CONFIRMATION_ROUTE = '/confirm';

interface AuthRedirectState {
  /** True when the user still carries the `invited_by` metadata flag (not yet confirmed). */
  isInvited: boolean;
  /** True when a password recovery is in progress (type=recovery or a recent recovery_sent_at). */
  isRecovery: boolean;
  /** Sanitized `next` destination (already validated against open redirects by the caller). */
  next: string;
}

/**
 * Single source of truth for the post-verification redirect decision, shared by
 * `/auth/confirm` and `/auth/callback`.
 *
 * The Confirmation gate keys off the `invited_by` flag — NOT a null `display_name`
 * (the admin now pre-fills the name). An invited user always goes to Confirmation,
 * regardless of display_name or a concurrent recovery window.
 */
export function resolveAuthRedirect({ isInvited, isRecovery, next }: AuthRedirectState): string {
  if (isInvited) return CONFIRMATION_ROUTE;
  if (isRecovery) return '/update-password';
  return next;
}
