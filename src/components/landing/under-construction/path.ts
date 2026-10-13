/** Pure corridor math for «Διάδρομος μονόλιθων» — no three.js, no state. */

const TAU = Math.PI * 2;

/** Distance between consecutive monoliths along the avenue. */
export const SPACING = 10;
/** Monolith objects in the pool; each is recycled far ahead once it is behind the camera. */
export const SLOTS = 6;
/** Camera-to-monolith distance at the moment the logo is held. */
export const FOCUS = 6.8;
export const X_OFFSET = 1.9;
const CAM_SWAY = 0.3;
const BEHIND = 1.2;
/** How strongly the camera slows near each monolith (0 = constant speed, <1 never stops). */
const EASE_DEPTH = 0.8;

export const SECONDS_PER_MONOLITH = 7.5;
/** Opening moment: monolith 00 is crumbling, monolith 01 is about to be revealed. */
export const START_U = 0.55;
/** Reduced motion: a single frame held on a finished monolith. */
export const STILL_U = 1;

const clamp01 = (v: number): number => Math.min(1, Math.max(0, v));
const smooth = (x: number): number => x * x * (3 - 2 * x);
const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;
/** 0 while d ≥ from, 1 once d ≤ to (d shrinks as the camera approaches). */
const ramp = (from: number, to: number, d: number): number => clamp01((from - d) / (from - to));

/** Continuous focus index: integers mean a monolith sits at the focus point. Slows near integers. */
export const progressAt = (u: number): number => u - (EASE_DEPTH * Math.sin(TAU * u)) / TAU;

export const cameraZ = (p: number): number => FOCUS - p * SPACING;
export const monolithZ = (k: number): number => -k * SPACING;
export const sideOf = (k: number): number => (((k % 2) + 2) % 2 === 0 ? -1 : 1);
export const monolithX = (k: number): number => sideOf(k) * X_OFFSET;
/** Signed distance from the camera to monolith k along the avenue (positive = ahead). */
export const distanceAhead = (k: number, p: number): number => FOCUS + (k - p) * SPACING;

/** The monolith index a pool slot currently represents: always within (-BEHIND, SLOTS-BEHIND] of p. */
export const slotIndex = (slot: number, p: number): number =>
  slot + SLOTS * Math.floor((p + SLOTS - BEHIND - slot) / SLOTS);

const focusCameraX = (k: number): number => -sideOf(k) * CAM_SWAY;

/** Yaw that turns monolith k's logo face squarely toward the camera at its focus moment. */
export const facingYaw = (k: number): number => Math.atan2(focusCameraX(k) - monolithX(k), FOCUS);

export interface Stage {
  scaffold: number;
  build: number;
  sweep: number;
  demolish: number;
  collapse: number;
}

export function stageAt(d: number): Stage {
  return {
    scaffold: smooth(ramp(55, 43, d)),
    build: ramp(40, 16, d),
    sweep: ramp(14, FOCUS + 2.2, d),
    demolish: ramp(4.6, -2.5, d),
    collapse: ramp(3.2, -3.6, d),
  };
}

export const buildPercent = (s: Stage): number =>
  Math.round((0.2 * s.scaffold + 0.8 * s.build) * 100);

export function phaseOf(s: Stage): string {
  if (s.demolish > 0) return 'ΚΑΤΕΔΑΦΙΣΗ';
  if (s.build <= 0) return 'ΣΚΑΛΩΣΙΑ';
  if (s.build < 1) return 'ΠΑΝΕΛ';
  if (s.sweep < 1) return 'ΑΠΟΚΑΛΥΨΗ';
  return 'ΟΛΟΚΛΗΡΩΘΗΚΕ';
}

/** The monolith the HUD talks about: switches to the next one shortly after each reveal. */
export const currentIndex = (p: number): number => Math.floor(p + 0.7);

export interface Rig {
  x: number;
  z: number;
  lookX: number;
  lookZ: number;
}

export function rigAt(p: number): Rig {
  const n = Math.floor(p);
  const blend = smooth(clamp01((p - n - 0.2) / 0.6));
  return {
    x: lerp(focusCameraX(n), focusCameraX(n + 1), blend),
    z: cameraZ(p),
    lookX: lerp(monolithX(n), monolithX(n + 1), blend),
    lookZ: lerp(monolithZ(n), monolithZ(n + 1), blend),
  };
}
