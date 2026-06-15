import { describe, it, expect } from 'vitest';
import { shouldFetchTabData, resolveTabData } from './tab-data';

describe('resolveTabData', () => {
  it('returns the server-provided initial data verbatim on first render', () => {
    const initial = [{ id: 'a' }, { id: 'b' }];
    expect(resolveTabData(initial, undefined)).toEqual(initial);
  });

  it('prefers freshly fetched data over the initial data once it exists', () => {
    const initial = [{ id: 'a' }];
    const fetched = [{ id: 'a' }, { id: 'c' }];
    expect(resolveTabData(initial, fetched)).toEqual(fetched);
  });

  it('falls back to an empty array when there is neither initial nor fetched data', () => {
    expect(resolveTabData(undefined, undefined)).toEqual([]);
  });
});

describe('shouldFetchTabData', () => {
  it('does NOT fetch on first mount when the server already provided the data', () => {
    expect(shouldFetchTabData({ hasInitialData: true, refreshKey: 0 })).toBe(false);
  });

  it('fetches when no initial data was provided', () => {
    expect(shouldFetchTabData({ hasInitialData: false, refreshKey: 0 })).toBe(true);
  });

  it('fetches again after a refresh even when initial data was provided', () => {
    expect(shouldFetchTabData({ hasInitialData: true, refreshKey: 1 })).toBe(true);
  });
});
