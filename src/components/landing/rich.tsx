import type { ReactNode } from 'react';

/**
 * Rich-text renderers for the editorial accent tags embedded in the landing
 * title messages: <i> = italic serif accent, <g> = italic gold accent.
 * Used with next-intl `t.rich(...)`.
 */
export const richAccent = {
  i: (chunks: ReactNode) => <span className="ital">{chunks}</span>,
  g: (chunks: ReactNode) => <span className="ital gold">{chunks}</span>,
};
