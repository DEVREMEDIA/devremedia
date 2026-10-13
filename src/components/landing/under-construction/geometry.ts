import type * as T from 'three';

/** Shared geometry for «Διάδρομος μονόλιθων» — built once, reused by every monolith. */

type Three = typeof import('three');
type Vec3 = readonly [number, number, number];

export const MONOLITH = { width: 3.2, height: 1.8, depth: 0.32 } as const;
const SCAFFOLD_SIZE: Vec3 = [MONOLITH.width + 0.28, MONOLITH.height + 0.26, MONOLITH.depth + 0.5];
const SCAFFOLD_DIV: Vec3 = [8, 5, 2];
export const FLOOR_Y = -SCAFFOLD_SIZE[1] / 2;

export function seededRandom(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const add = (a: Vec3, b: Vec3, s: number): Vec3 => [
  a[0] + b[0] * s,
  a[1] + b[1] * s,
  a[2] + b[2] * s,
];
const cross = (a: Vec3, b: Vec3): Vec3 => [
  a[1] * b[2] - a[2] * b[1],
  a[2] * b[0] - a[0] * b[2],
  a[0] * b[1] - a[1] * b[0],
];

/* ---------- panels ---------- */

interface FaceSpec {
  center: Vec3;
  u: Vec3;
  v: Vec3;
  dims: readonly [number, number];
  grid: readonly [number, number];
  kind: number;
}

function faceSpecs(): FaceSpec[] {
  const { width: w, height: h, depth: d } = MONOLITH;
  return [
    { center: [0, 0, d / 2], u: [1, 0, 0], v: [0, 1, 0], dims: [w, h], grid: [12, 7], kind: 0 },
    { center: [0, 0, -d / 2], u: [-1, 0, 0], v: [0, 1, 0], dims: [w, h], grid: [12, 7], kind: 1 },
    { center: [-w / 2, 0, 0], u: [0, 0, 1], v: [0, 1, 0], dims: [d, h], grid: [1, 7], kind: 1 },
    { center: [w / 2, 0, 0], u: [0, 0, -1], v: [0, 1, 0], dims: [d, h], grid: [1, 7], kind: 1 },
    { center: [0, h / 2, 0], u: [1, 0, 0], v: [0, 0, -1], dims: [w, d], grid: [12, 1], kind: 1 },
    { center: [0, -h / 2, 0], u: [1, 0, 0], v: [0, 0, 1], dims: [w, d], grid: [12, 1], kind: 2 },
  ];
}

const ITEM_SIZE = {
  position: 3,
  normal: 3,
  aCenter: 3,
  aAxis: 3,
  aUv: 2,
  aLocal: 2,
  aDim: 2,
  aFace: 1,
  aSeed: 1,
  aDelay: 1,
} as const;
type BufferName = keyof typeof ITEM_SIZE;
type PanelBuffers = Record<BufferName | 'index', number[]>;

const CORNERS: ReadonlyArray<readonly [number, number]> = [
  [0, 0],
  [1, 0],
  [1, 1],
  [0, 1],
];

function pushTile(
  b: PanelBuffers,
  f: FaceSpec,
  cell: readonly [number, number],
  rand: () => number,
): void {
  const [cols, rows] = f.grid;
  const [col, row] = cell;
  const normal = cross(f.u, f.v);
  const at = (s: number, t: number): Vec3 =>
    add(add(f.center, f.u, (s - 0.5) * f.dims[0]), f.v, (t - 0.5) * f.dims[1]);
  const mid = at((col + 0.5) / cols, (row + 0.5) / rows);
  const seed = rand();
  const order = ((col + 0.5) / cols) * 0.65 + ((row + 0.5) / rows) * 0.35;
  const delay = Math.min(1, order * 0.85 + rand() * 0.15);
  const base = b.position.length / 3;
  CORNERS.forEach(([lx, ly]) => {
    const s = (col + lx) / cols;
    const t = (row + ly) / rows;
    b.position.push(...at(s, t));
    b.normal.push(...normal);
    b.aCenter.push(...mid);
    b.aAxis.push(...f.u);
    b.aUv.push(s, t);
    b.aLocal.push(lx, ly);
    b.aDim.push(f.dims[0], f.dims[1]);
    b.aFace.push(f.kind);
    b.aSeed.push(seed);
    b.aDelay.push(delay);
  });
  b.index.push(base, base + 1, base + 2, base, base + 2, base + 3);
}

export function buildPanels(THREE: Three): T.BufferGeometry {
  const rand = seededRandom(7);
  const names = Object.keys(ITEM_SIZE) as BufferName[];
  const b = { index: [] } as unknown as PanelBuffers;
  names.forEach((n) => {
    b[n] = [];
  });
  faceSpecs().forEach((f) => {
    for (let row = 0; row < f.grid[1]; row++)
      for (let col = 0; col < f.grid[0]; col++) pushTile(b, f, [col, row], rand);
  });
  const g = new THREE.BufferGeometry();
  names.forEach((n) => g.setAttribute(n, new THREE.Float32BufferAttribute(b[n], ITEM_SIZE[n])));
  g.setIndex(b.index);
  return g;
}

/* ---------- scaffold ---------- */

const latticeCoord = (idx: number, axis: number): number =>
  -SCAFFOLD_SIZE[axis] / 2 + (idx * SCAFFOLD_SIZE[axis]) / SCAFFOLD_DIV[axis];

const latticePoint = (i: number, j: number, k: number): Vec3 => [
  latticeCoord(i, 0),
  latticeCoord(j, 1),
  latticeCoord(k, 2),
];

const isEdge = (idx: number, axis: number): boolean => idx === 0 || idx === SCAFFOLD_DIV[axis];

function scaffoldSegments(): Array<[Vec3, Vec3]> {
  const [nx, ny, nz] = SCAFFOLD_DIV;
  const segs: Array<[Vec3, Vec3]> = [];
  for (let i = 0; i <= nx; i++)
    for (let j = 0; j <= ny; j++)
      for (let k = 0; k <= nz; k++) {
        const p = latticePoint(i, j, k);
        if (i < nx && (isEdge(j, 1) || isEdge(k, 2))) segs.push([p, latticePoint(i + 1, j, k)]);
        if (j < ny && (isEdge(i, 0) || isEdge(k, 2))) segs.push([p, latticePoint(i, j + 1, k)]);
        if (k < nz && (isEdge(i, 0) || isEdge(j, 1))) segs.push([p, latticePoint(i, j, k + 1)]);
        if (isEdge(k, 2) && i < nx && j < ny && (i + j) % 2 === 0)
          segs.push([p, latticePoint(i + 1, j + 1, k)]);
      }
  return segs;
}

function sortByHeight<V>(items: V[], height: (item: V) => number, rand: () => number): V[] {
  return items
    .map((item) => ({ item, key: height(item) + rand() * 0.35 }))
    .sort((a, b) => a.key - b.key)
    .map(({ item }) => item);
}

export function buildScaffoldLines(THREE: Three): T.BufferGeometry {
  const rand = seededRandom(11);
  const segs = sortByHeight(scaffoldSegments(), ([a, b]) => Math.min(a[1], b[1]), rand);
  const attr = (data: number[], size: number) => new THREE.Float32BufferAttribute(data, size);
  const g = new THREE.BufferGeometry();
  g.setAttribute(
    'position',
    attr(
      segs.flatMap(([a, b]) => [...a, ...b]),
      3,
    ),
  );
  g.setAttribute(
    'aOrder',
    attr(
      segs.flatMap((_, n) => [n / segs.length, n / segs.length]),
      1,
    ),
  );
  g.setAttribute(
    'aEnd',
    attr(
      segs.flatMap(() => [0, 1]),
      1,
    ),
  );
  return g;
}

export function buildScaffoldNodes(THREE: Three): T.BufferGeometry {
  const rand = seededRandom(13);
  const [nx, ny, nz] = SCAFFOLD_DIV;
  const points: Vec3[] = [];
  for (let i = 0; i <= nx; i++)
    for (let j = 0; j <= ny; j++)
      for (let k = 0; k <= nz; k++) {
        if (isEdge(i, 0) || isEdge(j, 1) || isEdge(k, 2)) points.push(latticePoint(i, j, k));
      }
  const sorted = sortByHeight(points, (p) => p[1], rand);
  const attr = (data: number[], size: number) => new THREE.Float32BufferAttribute(data, size);
  const g = new THREE.BufferGeometry();
  g.setAttribute(
    'position',
    attr(
      sorted.flatMap((p) => [...p]),
      3,
    ),
  );
  g.setAttribute(
    'aOrder',
    attr(
      sorted.map((_, n) => n / sorted.length),
      1,
    ),
  );
  return g;
}

/* ---------- demolition dust ---------- */

export function buildBurst(THREE: Three, count: number): T.BufferGeometry {
  const rand = seededRandom(29);
  const { width: w, height: h } = MONOLITH;
  const start: number[] = [];
  const dir: number[] = [];
  const seed: number[] = [];
  for (let i = 0; i < count; i++) {
    start.push((rand() - 0.5) * w, FLOOR_Y + rand() * rand() * h, (rand() - 0.5) * 0.8);
    const angle = rand() * Math.PI * 2;
    dir.push(Math.cos(angle), 0.3 + rand() * 0.9, Math.sin(angle));
    seed.push(rand());
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(start, 3));
  g.setAttribute('aDir', new THREE.Float32BufferAttribute(dir, 3));
  g.setAttribute('aSeed', new THREE.Float32BufferAttribute(seed, 1));
  return g;
}
