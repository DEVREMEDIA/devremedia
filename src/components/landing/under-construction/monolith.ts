import type * as T from 'three';
import {
  buildBurst,
  buildPanels,
  buildScaffoldLines,
  buildScaffoldNodes,
  FLOOR_Y,
} from './geometry';
import { PANEL_FRAGMENT, PANEL_VERTEX } from './panel-shaders';
import {
  BURST_FRAGMENT,
  BURST_VERTEX,
  LINE_FRAGMENT,
  LINE_VERTEX,
  NODE_FRAGMENT,
  NODE_VERTEX,
} from './shaders';
import { createHoardingTexture, loadLogoTexture } from './textures';
import { distanceAhead, facingYaw, monolithX, monolithZ, stageAt } from './path';

type Three = typeof import('three');
type Uniform<V> = { value: V };

const BURST_COUNT = 90;
const GOLDEN = 0.618034;

/** Uniform objects shared by reference across every monolith's materials. */
function createShared(THREE: Three, pixelRatio: number, dot: T.Texture) {
  const color = (hex: string, k = 1) => ({ value: new THREE.Color(hex).multiplyScalar(k) });
  const hoarding = createHoardingTexture(THREE);
  const logo = loadLogoTexture(THREE);
  const uniforms = {
    uLogo: { value: logo },
    uHoard: { value: hoarding.texture },
    uHoardAspect: { value: hoarding.aspect },
    uDot: { value: dot },
    uTime: { value: 0 },
    uFloorY: { value: FLOOR_Y },
    uPixelRatio: { value: pixelRatio },
    uFog: { value: new THREE.Vector2(14, 50) },
    uInk: color('#0a0908'),
    uBase: color('#1d1915'),
    uGold: color('#c9a033'),
    uLightGold: color('#f0d98a'),
    uIvory: color('#f5eedb'),
    uKeyDir: { value: new THREE.Vector3(-0.45, 0.6, 0.85).normalize() },
    uKeyCol: color('#ffdcaa', 1.15),
    uRimDir: { value: new THREE.Vector3(0.8, 0.35, -0.75).normalize() },
    uRimCol: color('#c9a033', 0.9),
  };
  return { uniforms, textures: [hoarding.texture, logo] };
}

export type MonolithKit = ReturnType<typeof createMonolithKit>;

export function createMonolithKit(
  THREE: Three,
  pixelRatio: number,
  dot: T.Texture,
  glow: T.Texture,
) {
  const shared = createShared(THREE, pixelRatio, dot);
  const geometry = {
    panels: buildPanels(THREE),
    lines: buildScaffoldLines(THREE),
    nodes: buildScaffoldNodes(THREE),
    burst: buildBurst(THREE, BURST_COUNT),
    pool: new THREE.PlaneGeometry(7, 4.2),
  };
  return { THREE, shared, geometry, glow };
}

function createMaterials(kit: MonolithKit) {
  const { THREE, shared } = kit;
  const s = shared.uniforms;
  const own = <V>(value: V): Uniform<V> => ({ value });
  const panel = new THREE.ShaderMaterial({
    vertexShader: PANEL_VERTEX,
    fragmentShader: PANEL_FRAGMENT,
    side: THREE.DoubleSide,
    uniforms: {
      ...s,
      uBuild: own(0),
      uDemolish: own(0),
      uVariant: own(0),
      uSweep: own(0),
      uReveal: own(0),
    },
  });
  const scaffold = { uProgress: own(0), uCollapse: own(0) };
  const transparent = { transparent: true, depthWrite: false } as const;
  const line = new THREE.ShaderMaterial({
    vertexShader: LINE_VERTEX,
    fragmentShader: LINE_FRAGMENT,
    ...transparent,
    uniforms: { ...s, ...scaffold, uOpacity: own(0.5) },
  });
  const node = new THREE.ShaderMaterial({
    vertexShader: NODE_VERTEX,
    fragmentShader: NODE_FRAGMENT,
    ...transparent,
    uniforms: { ...s, ...scaffold },
  });
  const burst = new THREE.ShaderMaterial({
    vertexShader: BURST_VERTEX,
    fragmentShader: BURST_FRAGMENT,
    ...transparent,
    blending: THREE.AdditiveBlending,
    uniforms: { ...s, uBurst: own(0) },
  });
  const pool = new THREE.MeshBasicMaterial({
    map: kit.glow,
    ...transparent,
    blending: THREE.AdditiveBlending,
    opacity: 0,
  });
  return { panel, line, node, burst, pool };
}

type Materials = ReturnType<typeof createMaterials>;

function makeBody(kit: MonolithKit, m: Materials, isMirror: boolean): T.Group {
  const { THREE, geometry } = kit;
  const group = new THREE.Group();
  const lines = new THREE.LineSegments(geometry.lines, m.line);
  const nodes = new THREE.Points(geometry.nodes, m.node);
  // Draw order for see-through layers: mirror → floor (1) → pools (2) → real scaffold (3).
  lines.renderOrder = isMirror ? 0 : 3;
  nodes.renderOrder = isMirror ? 0 : 3;
  group.add(new THREE.Mesh(geometry.panels, m.panel), lines, nodes);
  if (isMirror) {
    group.scale.y = -1;
    group.position.y = FLOOR_Y * 2;
  }
  return group;
}

export interface Monolith {
  slot: number;
  main: T.Group;
  mirror: T.Group;
  materials: Materials;
}

export function createMonolith(kit: MonolithKit, slot: number): Monolith {
  const { THREE, geometry } = kit;
  const materials = createMaterials(kit);
  const main = makeBody(kit, materials, false);
  const mirror = makeBody(kit, materials, true);
  const burst = new THREE.Points(geometry.burst, materials.burst);
  burst.renderOrder = 3;
  burst.frustumCulled = false;
  const pool = new THREE.Mesh(geometry.pool, materials.pool);
  pool.rotation.x = -Math.PI / 2;
  pool.position.set(0, FLOOR_Y + 0.01, 1.2);
  pool.renderOrder = 2;
  main.add(burst, pool);
  return { slot, main, mirror, materials };
}

/** Places monolith k on the avenue and drives its construction state from distance alone. */
export function updateMonolith(m: Monolith, k: number, p: number, extraYaw: number): void {
  const stage = stageAt(distanceAhead(k, p));
  const isVisible = stage.scaffold > 0 && stage.collapse < 1;
  m.main.visible = isVisible;
  m.mirror.visible = isVisible;
  if (!isVisible) return;
  const yaw = facingYaw(k) + extraYaw;
  [m.main, m.mirror].forEach((g) => {
    g.position.x = monolithX(k);
    g.position.z = monolithZ(k);
    g.rotation.y = yaw;
  });
  const { panel, line, burst, pool } = m.materials;
  panel.uniforms.uBuild.value = stage.build;
  panel.uniforms.uDemolish.value = stage.demolish;
  panel.uniforms.uVariant.value = (k * GOLDEN) % 1;
  panel.uniforms.uSweep.value = stage.sweep;
  panel.uniforms.uReveal.value = stage.sweep >= 1 ? 1 : 0;
  line.uniforms.uProgress.value = stage.scaffold;
  line.uniforms.uCollapse.value = stage.collapse;
  burst.uniforms.uBurst.value = stage.demolish;
  pool.opacity = 0.5 * stage.build * (1 - stage.demolish);
}
