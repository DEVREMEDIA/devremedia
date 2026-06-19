import { EB_Garamond, Inter } from 'next/font/google';

/**
 * Landing-only typography for the "Editorial Noir" (L5) design.
 * Exposed as CSS variables and applied to the landing root wrapper ONLY —
 * the admin/client/employee portals keep Geist (set in the root layout).
 *
 * EB Garamond is the display serif (full Greek + Latin, true italic) and Inter
 * the grotesk body. Fraunces (the original mock face) ships no Greek glyphs, so
 * it can't carry this Greek-first page.
 */
export const displaySerif = EB_Garamond({
  variable: '--font-serif-display',
  subsets: ['latin', 'greek'],
  weight: ['400', '500', '600'],
  style: ['normal', 'italic'],
  display: 'swap',
});

export const bodyGrotesk = Inter({
  variable: '--font-grotesk',
  subsets: ['latin', 'greek'],
  weight: ['300', '400', '500', '600'],
  display: 'swap',
});
