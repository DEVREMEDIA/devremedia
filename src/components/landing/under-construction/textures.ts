import type * as T from 'three';

/** Canvas-drawn textures for «Διάδρομος μονόλιθων» (adapted from variants B and E). */

type Three = typeof import('three');

const LOGO_SRC = '/images/Logo_Horizontal_Transparent.png';
const HOARDING_PHRASE = 'UNDER CONSTRUCTION  ✦  ΥΠΟ ΚΑΤΑΣΚΕΥΗ  ✦  ';
const TAPE_PHRASE = 'UNDER CONSTRUCTION   ✦   ΥΠΟ ΚΑΤΑΣΚΕΥΗ   ✦   ';
const INK = '#0a0908';
const GOLD = '#c9a033';
const LIGHT_GOLD = '#f0d98a';

function context2d(canvas: HTMLCanvasElement): CanvasRenderingContext2D {
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('2D canvas unavailable');
  return ctx;
}

function makeCanvas(width: number, height: number): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  return canvas;
}

function cssFamily(variable: string, fallback: string): string {
  const custom = getComputedStyle(document.documentElement).getPropertyValue(variable).trim();
  return custom ? `${custom}, ${fallback}` : fallback;
}

function srgb<X extends T.Texture>(THREE: Three, texture: X): X {
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

export function createHoardingTexture(THREE: Three): { texture: T.CanvasTexture; aspect: number } {
  const height = 64;
  const font = `500 26px ${cssFamily('--font-data', 'ui-monospace, Menlo, monospace')}`;
  const probe = context2d(makeCanvas(8, 8));
  probe.font = font;
  const unit = Math.ceil(probe.measureText(HOARDING_PHRASE).width);
  const canvas = makeCanvas(unit * 2, height);
  const ctx = context2d(canvas);
  ctx.fillStyle = '#100e0b';
  ctx.fillRect(0, 0, canvas.width, height);
  ctx.fillStyle = 'rgba(201,160,51,0.85)';
  ctx.fillRect(0, 6, canvas.width, 2);
  ctx.fillRect(0, height - 8, canvas.width, 2);
  ctx.font = font;
  ctx.textBaseline = 'middle';
  ctx.fillStyle = LIGHT_GOLD;
  ctx.fillText(HOARDING_PHRASE, 0, height / 2 + 1);
  ctx.fillText(HOARDING_PHRASE, unit, height / 2 + 1);
  const texture = srgb(THREE, new THREE.CanvasTexture(canvas));
  texture.wrapS = THREE.RepeatWrapping;
  texture.anisotropy = 8;
  return { texture, aspect: canvas.width / height };
}

function drawHazardEdge(ctx: CanvasRenderingContext2D, width: number, y: number, h: number): void {
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, y, width, h);
  ctx.clip();
  for (let x = -h; x < width + h; x += h * 2) {
    ctx.beginPath();
    ctx.moveTo(x, y + h);
    ctx.lineTo(x + h, y);
    ctx.lineTo(x + h * 2, y);
    ctx.lineTo(x + h, y + h);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
}

/** Gold hazard tape with ink lettering; one canvas = two phrases, tiles seamlessly along U. */
export function createTapeTexture(THREE: Three, anisotropy: number): T.CanvasTexture {
  const height = 128;
  const edge = 16;
  const font = `600 52px ${cssFamily('--font-grotesk', 'Inter, system-ui, sans-serif')}`;
  const probe = context2d(makeCanvas(8, 8));
  probe.font = font;
  const segment = probe.measureText(TAPE_PHRASE).width;
  const width = Math.ceil((segment * 2) / (edge * 2)) * edge * 2;
  const canvas = makeCanvas(width, height);
  const ctx = context2d(canvas);
  ctx.fillStyle = GOLD;
  ctx.fillRect(0, 0, width, height);
  ctx.fillStyle = INK;
  drawHazardEdge(ctx, width, 0, edge);
  drawHazardEdge(ctx, width, height - edge, edge);
  ctx.font = font;
  ctx.textBaseline = 'middle';
  ctx.fillText(TAPE_PHRASE, 0, height / 2 + 2);
  ctx.fillText(TAPE_PHRASE, width / 2, height / 2 + 2);
  const texture = srgb(THREE, new THREE.CanvasTexture(canvas));
  texture.wrapS = THREE.RepeatWrapping;
  texture.anisotropy = anisotropy;
  return texture;
}

export function createDotTexture(THREE: Three): T.CanvasTexture {
  const canvas = makeCanvas(64, 64);
  const ctx = context2d(canvas);
  const gradient = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
  gradient.addColorStop(0, 'rgba(255,255,255,1)');
  gradient.addColorStop(0.35, 'rgba(255,255,255,0.35)');
  gradient.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 64, 64);
  return new THREE.CanvasTexture(canvas);
}

/** Warm radial pool: used for light under each monolith and the far glow down the avenue. */
export function createGlowTexture(THREE: Three): T.CanvasTexture {
  const canvas = makeCanvas(256, 256);
  const ctx = context2d(canvas);
  const g = ctx.createRadialGradient(128, 128, 0, 128, 128, 128);
  g.addColorStop(0, 'rgba(240,217,138,0.85)');
  g.addColorStop(0.3, 'rgba(201,160,51,0.3)');
  g.addColorStop(1, 'rgba(201,160,51,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 256, 256);
  return srgb(THREE, new THREE.CanvasTexture(canvas));
}

/** Semi-opaque dark floor tile with faint expansion joints; the mirrored world shows through. */
export function createFloorTexture(THREE: Three): T.CanvasTexture {
  const canvas = makeCanvas(256, 256);
  const ctx = context2d(canvas);
  ctx.fillStyle = 'rgba(10,9,8,0.86)';
  ctx.fillRect(0, 0, 256, 256);
  ctx.fillStyle = 'rgba(201,160,51,0.14)';
  ctx.fillRect(0, 0, 256, 2);
  ctx.fillRect(0, 0, 2, 256);
  const texture = srgb(THREE, new THREE.CanvasTexture(canvas));
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.anisotropy = 8;
  return texture;
}

export function loadLogoTexture(THREE: Three): T.Texture {
  const texture = srgb(THREE, new THREE.TextureLoader().load(LOGO_SRC));
  texture.anisotropy = 8;
  return texture;
}
