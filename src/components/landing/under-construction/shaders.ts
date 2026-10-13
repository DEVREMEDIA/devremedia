/**
 * Scaffold + dust GLSL for «Διάδρομος μονόλιθων»: lines draw themselves in (uProgress) and
 * later slump flat onto the floor (uCollapse); a dust burst blooms while a monolith is torn down.
 */

const COLLAPSE = /* glsl */ `
vec3 collapsed(vec3 p, float order) {
  float f = clamp((uCollapse - (1.0 - order) * 0.5) / 0.5, 0.0, 1.0);
  float fallen = f * f;
  p.y = mix(p.y, uFloorY + 0.02, fallen);
  p.xz *= 1.0 + fallen * 0.35;
  return p;
}
float fogFade(float depth) {
  return 1.0 - smoothstep(uFog.x, uFog.y, depth);
}
`;

export const LINE_VERTEX = /* glsl */ `
attribute float aOrder;
attribute float aEnd;
uniform float uProgress;
uniform float uCollapse;
uniform float uFloorY;
uniform vec2 uFog;
varying float vEnd;
varying float vGrow;
varying float vFade;
${COLLAPSE}
void main() {
  vEnd = aEnd;
  vGrow = clamp((uProgress * 1.08 - aOrder) / 0.08, 0.0, 1.0);
  vec4 mv = modelViewMatrix * vec4(collapsed(position, aOrder), 1.0);
  vFade = fogFade(-mv.z) * (1.0 - smoothstep(0.75, 1.0, uCollapse));
  gl_Position = projectionMatrix * mv;
}
`;

export const LINE_FRAGMENT = /* glsl */ `
uniform vec3 uGold;
uniform vec3 uLightGold;
uniform float uOpacity;
varying float vEnd;
varying float vGrow;
varying float vFade;
void main() {
  if (vEnd > vGrow) discard;
  float tip = vGrow < 1.0 ? smoothstep(vGrow - 0.2, vGrow, vEnd) : 0.0;
  gl_FragColor = vec4(mix(uGold, uLightGold * 1.6, tip), (uOpacity + tip * 0.6) * vFade);
  #include <colorspace_fragment>
}
`;

export const NODE_VERTEX = /* glsl */ `
attribute float aOrder;
uniform float uProgress;
uniform float uCollapse;
uniform float uFloorY;
uniform float uPixelRatio;
uniform vec2 uFog;
varying float vShow;
${COLLAPSE}
void main() {
  vec4 mv = modelViewMatrix * vec4(collapsed(position, aOrder), 1.0);
  vShow = step(aOrder + 0.04, uProgress * 1.08) * fogFade(-mv.z) * (1.0 - smoothstep(0.6, 0.9, uCollapse));
  gl_PointSize = uPixelRatio * max(2.0, 22.0 / -mv.z);
  gl_Position = projectionMatrix * mv;
}
`;

export const NODE_FRAGMENT = /* glsl */ `
uniform vec3 uLightGold;
varying float vShow;
void main() {
  if (vShow < 0.02) discard;
  vec2 d = abs(gl_PointCoord - 0.5);
  if (max(d.x, d.y) > 0.32) discard;
  gl_FragColor = vec4(uLightGold, 0.9 * vShow);
  #include <colorspace_fragment>
}
`;

export const BURST_VERTEX = /* glsl */ `
attribute vec3 aDir;
attribute float aSeed;
uniform float uBurst;
uniform float uPixelRatio;
uniform vec2 uFog;
varying float vAlpha;
void main() {
  float b = clamp((uBurst - aSeed * 0.3) / 0.7, 0.0, 1.0);
  float out1 = 1.0 - (1.0 - b) * (1.0 - b);
  vec3 p = position + vec3(aDir.x * 1.9, aDir.y * 0.9, aDir.z * 1.4) * out1;
  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  vAlpha = sin(3.14159 * b) * 0.5 * (1.0 - smoothstep(uFog.x, uFog.y, -mv.z));
  gl_PointSize = uPixelRatio * (10.0 + 34.0 * out1) / max(-mv.z, 0.5);
  gl_Position = projectionMatrix * mv;
}
`;

export const BURST_FRAGMENT = /* glsl */ `
uniform sampler2D uDot;
uniform vec3 uLightGold;
varying float vAlpha;
void main() {
  if (vAlpha < 0.005) discard;
  float a = texture2D(uDot, gl_PointCoord).a * vAlpha;
  gl_FragColor = vec4(uLightGold * 0.8, a);
  #include <colorspace_fragment>
}
`;
