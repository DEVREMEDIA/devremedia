/**
 * Phase 1 seam for detail-page tabs (Client Invoices/Productions, etc.).
 *
 * The route-level Server Component fetches the tab data once and passes it down
 * as `initial*` props. The tab renders that on the first byte instead of
 * running a post-hydration `useEffect → fetch → setState`. A client-side fetch
 * only happens when there was no server data, or after an explicit refresh.
 */

/** Render value: prefer freshly fetched data, then server initial, then empty. */
export function resolveTabData<T>(initial: T[] | undefined, fetched: T[] | undefined): T[] {
  return fetched ?? initial ?? [];
}

export interface TabFetchDecision {
  hasInitialData: boolean;
  refreshKey: number;
}

/**
 * Whether the tab should fetch on the client. Skips the redundant first-mount
 * fetch when the server already provided the data; still fetches after a
 * refresh (refreshKey > 0) so mutations stay reflected.
 */
export function shouldFetchTabData({ hasInitialData, refreshKey }: TabFetchDecision): boolean {
  if (refreshKey > 0) return true;
  return !hasInitialData;
}
