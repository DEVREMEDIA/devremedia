/**
 * Panel GLSL for «Διάδρομος μονόλιθων». Unlike variant E, presence is computed on the GPU from
 * two per-monolith uniforms — uBuild (panels flying in) and uDemolish (panels tearing off and
 * falling with gravity) — so every monolith shares one geometry.
 */

export const PANEL_VERTEX = /* glsl */ `
attribute vec3 aCenter;
attribute vec3 aAxis;
attribute vec2 aUv;
attribute vec2 aLocal;
attribute vec2 aDim;
attribute float aFace;
attribute float aSeed;
attribute float aDelay;
uniform float uBuild;
uniform float uDemolish;
uniform float uVariant;
uniform float uFloorY;
varying vec3 vWorldPos;
varying vec3 vNormal;
varying vec2 vUv;
varying vec2 vLocal;
varying vec2 vDim;
varying float vFace;
varying float vMoving;
varying float vDepth;

vec3 rotateAround(vec3 v, vec3 k, float a) {
  float c = cos(a);
  float s = sin(a);
  return v * c + cross(k, v) * s + k * dot(k, v) * (1.0 - c);
}

float easeOutBack(float x) {
  float y = x - 1.0;
  return 1.0 + 2.2 * y * y * y + 1.2 * y * y;
}

void main() {
  float r = fract(aSeed * 7.31 + uVariant);
  float arrive = clamp((uBuild - aDelay * 0.8) / 0.2, 0.0, 1.0);
  float presence = easeOutBack(arrive);
  float hidden = 1.0 - presence;
  float height = clamp(aCenter.y / 1.8 + 0.5, 0.0, 1.0);
  float start = (r * 0.55 + (1.0 - height) * 0.4) * 0.6;
  float fall = clamp((uDemolish - start) / 0.4, 0.0, 1.0);
  float tf = fall * 1.3;
  float dir = aSeed > 0.5 ? 1.0 : -1.0;
  float angle = (hidden * 2.2 + tf * tf * (3.0 + r * 5.0)) * dir;
  float grow = smoothstep(0.0, 0.35, presence) * (1.0 - smoothstep(0.72, 1.0, fall));
  vec3 local = rotateAround(position - aCenter, aAxis, angle) * grow;
  vec3 n = rotateAround(normal, aAxis, angle);
  vec3 c = aCenter + normal * (hidden * 2.4 + tf * (0.7 + r)) + vec3(0.0, hidden * 1.2, 0.0);
  c.x += (r - 0.5) * tf * 1.4;
  c.y += 0.9 * tf - 4.9 * tf * tf;
  c.y = max(c.y, uFloorY + 0.04);
  vec4 world = modelMatrix * vec4(c + local, 1.0);
  vec4 view = viewMatrix * world;
  vWorldPos = world.xyz;
  vNormal = normalize(mat3(modelMatrix) * n);
  vUv = aUv;
  vLocal = aLocal;
  vDim = aDim;
  vFace = aFace;
  vMoving = max(clamp(abs(hidden) * 3.0, 0.0, 1.0), clamp(fall * 4.0, 0.0, 1.0));
  vDepth = -view.z;
  gl_Position = projectionMatrix * view;
}
`;

export const PANEL_FRAGMENT = /* glsl */ `
uniform sampler2D uLogo;
uniform sampler2D uHoard;
uniform float uHoardAspect;
uniform float uTime;
uniform float uSweep;
uniform float uReveal;
uniform vec3 uBase;
uniform vec3 uGold;
uniform vec3 uLightGold;
uniform vec3 uIvory;
uniform vec3 uKeyDir;
uniform vec3 uKeyCol;
uniform vec3 uRimDir;
uniform vec3 uRimCol;
uniform vec3 uInk;
uniform vec2 uFog;
varying vec3 vWorldPos;
varying vec3 vNormal;
varying vec2 vUv;
varying vec2 vLocal;
varying vec2 vDim;
varying float vFace;
varying float vMoving;
varying float vDepth;

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
}

vec3 applyLogo(vec3 col, float diffuse) {
  vec2 luv = vec2((vUv.x - 0.5) * vDim.x / 3.0 + 0.5, (vUv.y - 0.5) * vDim.y / 1.5 + 0.5);
  float inside = step(0.0, luv.x) * step(luv.x, 1.0) * step(0.0, luv.y) * step(luv.y, 1.0);
  float alpha = texture2D(uLogo, clamp(luv, 0.0, 1.0)).a * inside;
  float diag = vUv.x * 0.8 + vUv.y * 0.2;
  float front = uSweep * 1.3 - 0.15;
  float revealed = max(uReveal, 1.0 - smoothstep(front - 0.06, front, diag));
  float sweeping = step(0.001, uSweep) * step(uSweep, 0.999);
  float band = exp(-pow((diag - front) * 12.0, 2.0)) * sweeping;
  col = mix(col, uIvory * (0.62 + 0.45 * diffuse), alpha * revealed);
  return col + band * (uLightGold * 0.22 + alpha * uLightGold * 1.4);
}

vec3 applyHoarding(vec3 col, float diffuse) {
  vec2 w = vUv * vDim;
  bool vertical = vDim.x < vDim.y * 0.5;
  vec2 q = vertical ? vec2(w.y, w.x) : w;
  float span = vertical ? vDim.x : vDim.y;
  float bandH = 0.1;
  float period = span / max(floor(span / 0.42), 1.0);
  float lc = mod(q.y, period) - (period - bandH) * 0.5;
  if (lc < 0.0 || lc > bandH) return col;
  float dir = mod(floor(q.y / period), 2.0) * 2.0 - 1.0;
  vec2 tuv = vec2(q.x / (bandH * uHoardAspect) + uTime * 0.035 * dir, lc / bandH);
  vec3 tex = texture2D(uHoard, tuv).rgb;
  return mix(col, tex * (0.5 + 0.6 * diffuse), 0.92);
}

void main() {
  vec3 N = normalize(vNormal);
  if (!gl_FrontFacing) N = -N;
  vec3 V = normalize(cameraPosition - vWorldPos);
  float diffuse = max(dot(N, uKeyDir), 0.0);
  float grain = hash(floor(vUv * vDim * 220.0)) * 0.08;
  vec3 H = normalize(uKeyDir + V);
  float spec = pow(max(dot(N, H), 0.0), 48.0);
  float rim = pow(1.0 - max(dot(N, V), 0.0), 3.0) * (0.5 + 0.5 * dot(N, uRimDir));
  vec3 col = uBase * (0.92 + grain) * (0.22 + diffuse * uKeyCol) + spec * uKeyCol * 0.2 + rim * uRimCol;
  if (vFace < 0.5) col = applyLogo(col, diffuse);
  else if (vFace < 1.5) col = applyHoarding(col, diffuse);
  vec2 edge = min(vLocal, 1.0 - vLocal);
  float seam = 1.0 - smoothstep(0.0, 0.03, min(edge.x, edge.y));
  col *= 1.0 - seam * 0.55;
  col += uGold * seam * 0.08 + uLightGold * vMoving * (0.08 + seam * 1.2);
  col = mix(col, uInk, smoothstep(uFog.x, uFog.y, vDepth));
  gl_FragColor = vec4(col, 1.0);
  #include <colorspace_fragment>
}
`;
