import { describe, it, expect } from 'vitest';
import {
  resolveInitialAuthProfile,
  shouldFetchProfileOnMount,
  type AuthProfile,
} from './auth-profile';

const profile = (overrides: Partial<AuthProfile> = {}): AuthProfile => ({
  id: 'user-1',
  role: 'admin',
  display_name: 'Tina',
  avatar_url: null,
  ...overrides,
});

describe('resolveInitialAuthProfile', () => {
  it('uses the server-provided profile as the initial value', () => {
    const server = profile({ role: 'client' });
    expect(resolveInitialAuthProfile(server)).toEqual(server);
  });

  it('returns null when the server provided no profile', () => {
    expect(resolveInitialAuthProfile(null)).toBeNull();
    expect(resolveInitialAuthProfile(undefined)).toBeNull();
  });
});

describe('shouldFetchProfileOnMount', () => {
  it('does NOT re-fetch user_profiles when the server already provided one', () => {
    expect(shouldFetchProfileOnMount(profile())).toBe(false);
  });

  it('fetches once when the server provided no profile (e.g. public page hydration)', () => {
    expect(shouldFetchProfileOnMount(null)).toBe(true);
    expect(shouldFetchProfileOnMount(undefined)).toBe(true);
  });
});
