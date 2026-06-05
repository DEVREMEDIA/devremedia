import { describe, it, expect } from 'vitest';
import { resolveAuthRedirect, CONFIRMATION_ROUTE } from './resolve-redirect';

describe('resolveAuthRedirect', () => {
  it('sends an invited user to Confirmation, even without a display_name', () => {
    expect(
      resolveAuthRedirect({ isInvited: true, isRecovery: false, next: '/admin/dashboard' }),
    ).toBe(CONFIRMATION_ROUTE);
  });

  it('sends an invited user to Confirmation even when a recovery is also in window (flag wins)', () => {
    expect(resolveAuthRedirect({ isInvited: true, isRecovery: true, next: '/' })).toBe(
      CONFIRMATION_ROUTE,
    );
  });

  it('sends a non-invited user with a recovery in window to update-password', () => {
    expect(
      resolveAuthRedirect({ isInvited: false, isRecovery: true, next: '/client/dashboard' }),
    ).toBe('/update-password');
  });

  it('sends a confirmed user to the next destination', () => {
    expect(
      resolveAuthRedirect({ isInvited: false, isRecovery: false, next: '/client/dashboard' }),
    ).toBe('/client/dashboard');
  });

  it('falls back to the next param (which defaults to /) when nothing special applies', () => {
    expect(resolveAuthRedirect({ isInvited: false, isRecovery: false, next: '/' })).toBe('/');
  });
});
