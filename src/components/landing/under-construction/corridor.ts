import type * as T from 'three';
import { FLOOR_Y, seededRandom } from './geometry';
import { createFloorTexture, createTapeTexture } from './textures';

/** The avenue itself: reflective floor, taped barriers on both edges, drifting dust, far glow. */

type Three = typeof import('three');

const LENGTH = 80;
const HALF_WIDTH = 5.4;
/** World length of one tape texture tile and of one floor tile pair — the snap step. */
const TILE = 5;
const TAPE_HEIGHT = 0.18;
const TAPE_Y = FLOOR_Y + 0.55;
const DUST_COUNT = 380;
const DUST_DEPTH = 52;

const snap = (z: number): number => Math.ceil(z / TILE) * TILE;

function buildFloor(THREE: Three): T.Mesh {
  const map = createFloorTexture(THREE);
  map.repeat.set((HALF_WIDTH * 4) / (TILE / 2), LENGTH / (TILE / 2));
  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(HALF_WIDTH * 4, LENGTH),
    new THREE.MeshBasicMaterial({ map, transparent: true, depthWrite: false }),
  );
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = FLOOR_Y;
  floor.renderOrder = 1;
  return floor;
}

function buildBarrier(THREE: Three, map: T.Texture): T.Group {
  const group = new THREE.Group();
  const material = new THREE.MeshBasicMaterial({ map, side: THREE.DoubleSide });
  const posts: number[] = [];
  for (let z = 0; z <= LENGTH; z += TILE)
    [-1, 1].forEach((side) =>
      posts.push(side * HALF_WIDTH, FLOOR_Y, -z, side * HALF_WIDTH, TAPE_Y + 0.2, -z),
    );
  const postGeometry = new THREE.BufferGeometry();
  postGeometry.setAttribute('position', new THREE.Float32BufferAttribute(posts, 3));
  const postMaterial = new THREE.LineBasicMaterial({
    color: '#c9a033',
    transparent: true,
    opacity: 0.45,
  });
  group.add(new THREE.LineSegments(postGeometry, postMaterial));
  const tapeGeometry = new THREE.PlaneGeometry(LENGTH, TAPE_HEIGHT);
  [-1, 1].forEach((side) => {
    const tape = new THREE.Mesh(tapeGeometry, material);
    tape.position.set(side * (HALF_WIDTH - 0.02), TAPE_Y, -LENGTH / 2);
    tape.rotation.y = (-side * Math.PI) / 2;
    group.add(tape);
  });
  return group;
}

function buildDust(THREE: Three, map: T.Texture): T.Points {
  const rand = seededRandom(23);
  const positions = Array.from({ length: DUST_COUNT * 3 }, (_, n) => {
    const axis = n % 3;
    if (axis === 0) return (rand() - 0.5) * HALF_WIDTH * 2.2;
    if (axis === 1) return FLOOR_Y + rand() * 4;
    return 2 - rand() * DUST_DEPTH;
  });
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  const material = new THREE.PointsMaterial({
    size: 0.045,
    map,
    color: '#f0d98a',
    transparent: true,
    opacity: 0.4,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  const dust = new THREE.Points(geometry, material);
  dust.frustumCulled = false;
  dust.renderOrder = 3;
  return dust;
}

function driftDust(dust: T.Points, camZ: number, dt: number): void {
  const attribute = dust.geometry.getAttribute('position');
  for (let i = 0; i < attribute.count; i++) {
    const y = attribute.getY(i) + dt * (0.04 + (i % 7) * 0.008);
    attribute.setY(i, y > FLOOR_Y + 4 ? FLOOR_Y : y);
    const z = attribute.getZ(i);
    if (z > camZ + 2) attribute.setZ(i, z - DUST_DEPTH);
  }
  attribute.needsUpdate = true;
}

function buildGlow(THREE: Three, map: T.Texture): T.Sprite {
  const material = new THREE.SpriteMaterial({
    map,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    fog: false,
    transparent: true,
    opacity: 0.22,
  });
  const glow = new THREE.Sprite(material);
  glow.scale.set(34, 22, 1);
  return glow;
}

export interface Corridor {
  update: (camZ: number, dt: number, motion: number) => void;
  tapeMap: T.Texture;
  floorMap: T.Texture;
}

export function createCorridor(
  THREE: Three,
  scene: T.Scene,
  opts: { dot: T.Texture; glow: T.Texture; anisotropy: number },
): Corridor {
  const floor = buildFloor(THREE);
  const tapeMap = createTapeTexture(THREE, opts.anisotropy);
  tapeMap.repeat.x = LENGTH / TILE;
  const barrier = buildBarrier(THREE, tapeMap);
  const dust = buildDust(THREE, opts.dot);
  const glow = buildGlow(THREE, opts.glow);
  scene.add(floor, barrier, dust, glow);
  const floorMap = (floor.material as T.MeshBasicMaterial).map as T.Texture;

  const update = (camZ: number, dt: number, motion: number): void => {
    const near = snap(camZ) + TILE;
    floor.position.z = near - LENGTH / 2;
    barrier.position.z = near;
    tapeMap.offset.x -= dt * 0.04 * motion;
    glow.position.set(0, 0.8, camZ - 46);
    if (motion > 0) driftDust(dust, camZ, dt);
  };
  return { update, tapeMap, floorMap };
}
