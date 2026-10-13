/** Drag-to-rotate (nearest monolith) with inertia that settles back to face-on, plus pointer steering. */

const TAU = Math.PI * 2;

export interface ViewState {
  /** Extra yaw in [-π, π) for the monolith at focus. */
  yaw: number;
  steerX: number;
  steerY: number;
}

export interface Controls {
  step: (dt: number) => ViewState;
  dispose: () => void;
}

const approach = (rate: number, k: number): number => 1 - Math.pow(rate, k);
const wrap = (a: number): number => a - TAU * Math.floor((a + Math.PI) / TAU);

export function createControls(surface: HTMLElement): Controls {
  const state = { yaw: 0, vel: 0, isDragging: false, lastX: 0, px: 0, py: 0, sx: 0, sy: 0 };

  const handleDown = (e: PointerEvent): void => {
    state.isDragging = true;
    state.lastX = e.clientX;
    surface.setPointerCapture(e.pointerId);
    surface.style.cursor = 'grabbing';
  };
  const handleMove = (e: PointerEvent): void => {
    state.px = (e.clientX / window.innerWidth) * 2 - 1;
    state.py = (e.clientY / window.innerHeight) * 2 - 1;
    if (!state.isDragging) return;
    state.vel = (e.clientX - state.lastX) * 0.007;
    state.yaw += state.vel;
    state.lastX = e.clientX;
  };
  const handleUp = (): void => {
    state.isDragging = false;
    surface.style.cursor = 'grab';
  };
  const handleLeave = (): void => {
    state.px = 0;
    state.py = 0;
  };

  surface.addEventListener('pointerdown', handleDown);
  window.addEventListener('pointermove', handleMove, { passive: true });
  window.addEventListener('pointerup', handleUp);
  window.addEventListener('pointercancel', handleUp);
  document.addEventListener('pointerleave', handleLeave);

  const settle = (k: number): void => {
    state.yaw += state.vel * k;
    state.vel *= Math.pow(0.95, k);
    if (Math.abs(state.vel) > 0.003) return;
    const home = Math.round(state.yaw / TAU) * TAU;
    state.yaw += (home - state.yaw) * approach(0.985, k);
  };

  const step = (dt: number): ViewState => {
    const k = dt * 60;
    if (!state.isDragging) settle(k);
    state.sx += (state.px - state.sx) * approach(0.95, k);
    state.sy += (state.py - state.sy) * approach(0.95, k);
    return { yaw: wrap(state.yaw), steerX: state.sx, steerY: state.sy };
  };

  const dispose = (): void => {
    surface.removeEventListener('pointerdown', handleDown);
    window.removeEventListener('pointermove', handleMove);
    window.removeEventListener('pointerup', handleUp);
    window.removeEventListener('pointercancel', handleUp);
    document.removeEventListener('pointerleave', handleLeave);
  };

  return { step, dispose };
}
