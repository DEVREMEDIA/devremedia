/**
 * Counts the outcome of a batched bulk op: an id "succeeded" if it appears in the
 * set of rows the single .in('id', ids) write actually affected; everything else
 * "failed" (already gone, RLS-filtered, etc.). Keeps the ActionResult contract that
 * the per-id loop used to produce, in one round-trip.
 */
export function countBulkOutcome(
  requestedIds: string[],
  affectedIds: string[],
): { succeeded: number; failed: number } {
  const succeeded = affectedIds.length;
  return { succeeded, failed: requestedIds.length - succeeded };
}
