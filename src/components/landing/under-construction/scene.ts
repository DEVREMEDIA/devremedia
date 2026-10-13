import type * as T from 'three';
import { createControls, type ViewState } from './controls';
import { createCorridor } from './corridor';
import {
  createMonolith,
  createMonolithKit,
  updateMonolith,
  type Monolith,
} from './monolith';
import {
  buildPercent,
  currentIndex,
  distanceAhead,
  FOCUS,
  phaseOf,
  progressAt,
  rigAt,
  SECONDS_PER_MONOLITH,
  slotIndex,
  SLOTS,
  stageAt,
  START_U,
  STILL_U,
} from './path';
import { createDotTexture, createGlowTexture } from './textures';

type Three = typeof import('three');

export interface CorridorStatus {
  index: number;
  percent: number;
  phase: string;
}

export interface MountOptions {
  isReducedMotion: boolean;
  onStatus: (status: CorridorStatus) => void;
}

const INK = 0x0a0908;
const CAM_Y = 0.3;

function createRenderer(THREE: Three, host: HTMLElement): T.WebGLRenderer {
  const probe = document.createElement('canvas');
  if (!(probe.getContext('webgl2') ?? probe.getContext('webgl')))
    throw new Error('WebGL unavailable');
  const renderer = new THREE.WebGLRenderer({
    antialias: true,
    powerPreference: 'high-performance',
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setClearColor(INK, 1);
  renderer.domElement.style.display = 'block';
  renderer.domElement.style.touchAction = 'none';
  renderer.domElement.style.cursor = 'grab';
  host.appendChild(renderer.domElement);
  return renderer;
}

/** Fixed focus distance; the lens widens on narrow screens so the whole monolith stays in frame. */
function fitCamera(camera: T.PerspectiveCamera, aspect: number): number {
  const tanV = Math.max(0.32, 2.3 / (FOCUS * aspect));
  camera.aspect = aspect;
  camera.fov = (2 * Math.atan(tanV) * 180) / Math.PI;
  camera.updateProjectionMatrix();
  return tanV;
}

function placeCamera(camera: T.PerspectiveCamera, p: number, view: ViewState, tanV: number): void {
  const rig = rigAt(p);
  const lookY = -FOCUS * tanV * 0.3;
  camera.position.set(rig.x + view.steerX * 0.35, CAM_Y - view.steerY * 0.15, rig.z);
  camera.lookAt(rig.lookX + view.steerX * 0.9, lookY - view.steerY * 0.35, rig.lookZ);
}

function focusYaw(k: number, p: number, yaw: number): number {
  const off = (distanceAhead(k, p) - FOCUS) / 3.5;
  return yaw * Math.exp(-off * off);
}

function readStatus(p: number): CorridorStatus {
  const index = currentIndex(p);
  const stage = stageAt(distanceAhead(index, p));
  return { index, percent: buildPercent(stage), phase: phaseOf(stage) };
}

function disposeScene(THREE: Three, scene: T.Scene, textures: T.Texture[]): void {
  const disposables = new Set<{ dispose: () => void }>(textures);
  scene.traverse((object) => {
    if (object instanceof THREE.Sprite) disposables.add(object.material);
    const isDrawable =
      object instanceof THREE.Mesh ||
      object instanceof THREE.Points ||
      object instanceof THREE.Line;
    if (!isDrawable) return;
    disposables.add(object.geometry);
    const materials: T.Material[] = Array.isArray(object.material)
      ? object.material
      : [object.material];
    materials.forEach((material) => disposables.add(material));
  });
  disposables.forEach((d) => d.dispose());
}

export function mountCorridor(THREE: Three, host: HTMLElement, opts: MountOptions): () => void {
  const renderer = createRenderer(THREE, host);
  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(INK, 14, 50);
  const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 90);
  const dot = createDotTexture(THREE);
  const glow = createGlowTexture(THREE);
  const kit = createMonolithKit(THREE, renderer.getPixelRatio(), dot, glow);
  const monoliths: Monolith[] = Array.from({ length: SLOTS }, (_, slot) =>
    createMonolith(kit, slot),
  );
  monoliths.forEach((m) => scene.add(m.main, m.mirror));
  const anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
  const corridor = createCorridor(THREE, scene, { dot, glow, anisotropy });

  let tanV = fitCamera(camera, 1);
  const resize = (): void => {
    const { clientWidth: w, clientHeight: h } = host;
    renderer.setSize(w, h);
    tanV = fitCamera(camera, w / Math.max(h, 1));
  };
  const observer = new ResizeObserver(resize);
  observer.observe(host);
  resize();

  const controls = createControls(renderer.domElement);
  const motion = opts.isReducedMotion ? 0 : 1;
  const start = performance.now();
  let last = start;
  let lastReport = '';
  let raf = 0;

  const frame = (now: number): void => {
    const dt = Math.min((now - last) / 1000, 0.05);
    last = now;
    const seconds = (now - start) / 1000;
    const u = opts.isReducedMotion ? STILL_U : START_U + seconds / SECONDS_PER_MONOLITH;
    const p = progressAt(u);
    const view = controls.step(dt);
    kit.shared.uniforms.uTime.value = seconds * motion;
    monoliths.forEach((m) => {
      const k = slotIndex(m.slot, p);
      updateMonolith(m, k, p, focusYaw(k, p, view.yaw));
    });
    corridor.update(rigAt(p).z, dt, motion);
    placeCamera(camera, p, view, tanV);
    renderer.render(scene, camera);
    const status = readStatus(p);
    const report = `${status.index}|${status.percent}|${status.phase}`;
    if (report !== lastReport) opts.onStatus(status);
    lastReport = report;
    raf = requestAnimationFrame(frame);
  };
  raf = requestAnimationFrame(frame);

  return () => {
    cancelAnimationFrame(raf);
    observer.disconnect();
    controls.dispose();
    disposeScene(THREE, scene, [
      ...kit.shared.textures,
      dot,
      glow,
      corridor.tapeMap,
      corridor.floorMap,
    ]);
    renderer.dispose();
    renderer.domElement.remove();
  };
}
