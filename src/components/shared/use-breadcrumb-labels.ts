'use client';

import { useEffect, useState } from 'react';
import { resolveBreadcrumbLabel } from '@/lib/actions/breadcrumb-labels';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// id segment -> resolved human label, shared across navigations so revisits are instant.
const cache = new Map<string, string>();

export function isUuidSegment(segment: string): boolean {
  return UUID_RE.test(segment);
}

// Resolves any UUID segments in the path to their entity name. Returns a map
// keyed by the segment; absent keys mean "still loading or no name available".
export function useBreadcrumbLabels(segments: string[]): Record<string, string> {
  const [labels, setLabels] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {};
    segments.forEach((segment) => {
      if (cache.has(segment)) initial[segment] = cache.get(segment)!;
    });
    return initial;
  });

  const key = segments.join('/');
  useEffect(() => {
    let active = true;
    segments.forEach((segment, index) => {
      if (!isUuidSegment(segment) || cache.has(segment)) return;
      const parent = segments[index - 1];
      if (!parent) return;
      resolveBreadcrumbLabel(parent, segment).then((name) => {
        if (!name) return;
        cache.set(segment, name);
        if (active) setLabels((prev) => ({ ...prev, [segment]: name }));
      });
    });
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  return labels;
}
