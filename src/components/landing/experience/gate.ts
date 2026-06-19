/**
 * Capability gate for the L5 landing experience.
 * Heavy motion/WebGL runs ONLY on capable desktop pointers that don't ask for reduced motion.
 */

export function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined') return true;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/** Desktop, fine pointer, hover-capable, not reduced motion. */
export function canEnhance(): boolean {
  if (typeof window === 'undefined') return false;
  if (prefersReducedMotion()) return false;
  return window.matchMedia('(min-width: 1024px) and (hover: hover) and (pointer: fine)').matches;
}

/** Cheap WebGL support probe. */
export function hasWebGL(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const c = document.createElement('canvas');
    return !!(c.getContext('webgl2') || c.getContext('webgl'));
  } catch {
    return false;
  }
}
