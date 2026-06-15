import { describe, it, expect } from 'vitest';
import { resolveDeliverableVideoUrl, type DeliverableVideoSource } from './deliverable-video';

const deliverable = (overrides: Partial<DeliverableVideoSource>): DeliverableVideoSource => ({
  file_path: 'deliverables/sample.mp4',
  file_url: undefined,
  ...overrides,
});

// A storage public-url resolver stub. The real caller injects the Supabase
// `getPublicUrl` result; here we make it deterministic and assert it is used
// only for non-external storage paths.
const toPublicUrl = (path: string) => `https://storage.example/public/${path}`;

describe('resolveDeliverableVideoUrl', () => {
  it('returns an external https file_path unchanged without touching storage', () => {
    const result = resolveDeliverableVideoUrl(
      deliverable({ file_path: 'https://youtu.be/abc123' }),
      toPublicUrl,
    );
    expect(result).toBe('https://youtu.be/abc123');
  });

  it('returns an external http file_path unchanged', () => {
    const result = resolveDeliverableVideoUrl(
      deliverable({ file_path: 'http://example.com/clip.mp4' }),
      toPublicUrl,
    );
    expect(result).toBe('http://example.com/clip.mp4');
  });

  it('resolves a storage file_path to its public url', () => {
    const result = resolveDeliverableVideoUrl(
      deliverable({ file_path: 'deliverables/sample.mp4' }),
      toPublicUrl,
    );
    expect(result).toBe('https://storage.example/public/deliverables/sample.mp4');
  });

  it('falls back to file_url when there is no file_path', () => {
    const result = resolveDeliverableVideoUrl(
      deliverable({ file_path: '', file_url: 'https://drive.google.com/file/d/X/view' }),
      toPublicUrl,
    );
    expect(result).toBe('https://drive.google.com/file/d/X/view');
  });

  it('returns null when neither file_path nor file_url is available', () => {
    const result = resolveDeliverableVideoUrl(
      deliverable({ file_path: '', file_url: undefined }),
      toPublicUrl,
    );
    expect(result).toBeNull();
  });

  it('is synchronous (no Promise) so selecting a deliverable needs no extra round-trip', () => {
    const result = resolveDeliverableVideoUrl(
      deliverable({ file_path: 'https://vimeo.com/123' }),
      toPublicUrl,
    );
    expect(result).not.toBeInstanceOf(Promise);
  });
});
