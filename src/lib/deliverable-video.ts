/**
 * The fields needed to derive a deliverable's playable video URL.
 * A subset of `Deliverable` (+ the optional `file_url` extra the client portal
 * sometimes carries), so callers can pass their richer objects directly.
 */
export interface DeliverableVideoSource {
  file_path: string;
  file_url?: string | null;
}

const isExternalUrl = (path: string): boolean =>
  path.startsWith('http://') || path.startsWith('https://');

/**
 * Synchronously resolve the video URL for an already-loaded deliverable.
 *
 * Phase 1: selecting a deliverable used to trigger a second client-side
 * `fetchVideoUrl` round-trip even though every input is already in memory.
 * The only non-local piece is turning a storage path into a public URL, which
 * the caller injects (`toPublicUrl`) from the Supabase client. No network call.
 */
export function resolveDeliverableVideoUrl(
  deliverable: DeliverableVideoSource,
  toPublicUrl: (path: string) => string,
): string | null {
  const { file_path, file_url } = deliverable;

  if (!file_path) {
    return file_url ?? null;
  }

  if (isExternalUrl(file_path)) {
    return file_path;
  }

  return toPublicUrl(file_path);
}
