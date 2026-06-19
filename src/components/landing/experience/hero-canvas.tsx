'use client';

import { useEffect, useRef } from 'react';
import { canEnhance, hasWebGL } from './gate';

interface HeroCanvasProps {
  /** Real hero photo — kept as the WebGL texture, never replaced. */
  src?: string;
}

const VERT = `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = vec4(position, 1.0);
  }
`;

const FRAG = `
  precision highp float;
  varying vec2 vUv;
  uniform sampler2D uTex;
  uniform vec2 uRes;
  uniform vec2 uImg;
  uniform float uTime;
  uniform vec2 uMouse;   // -1..1 within hero
  uniform float uHover;  // 0..1 eased pointer presence

  // object-cover uv mapping
  vec2 cover(vec2 uv) {
    vec2 ratio = vec2(
      min((uRes.x / uRes.y) / (uImg.x / uImg.y), 1.0),
      min((uRes.y / uRes.x) / (uImg.y / uImg.x), 1.0)
    );
    return vec2(
      uv.x * ratio.x + (1.0 - ratio.x) * 0.5,
      uv.y * ratio.y + (1.0 - ratio.y) * 0.5
    );
  }

  void main() {
    vec2 uv = cover(vUv);

    // ambient flow displacement
    float flow = sin(uv.y * 9.0 + uTime) * 0.0016 + cos(uv.x * 11.0 - uTime * 0.8) * 0.0016;

    // cursor ripple
    vec2 m = uMouse * 0.5 + 0.5;
    float d = distance(vUv, m);
    float ripple = sin(d * 26.0 - uTime * 2.4) * 0.004 * uHover * smoothstep(0.45, 0.0, d);

    vec2 duv = uv + vec2(flow) + vec2(ripple);

    // subtle chromatic split toward the cursor for "emulsion" feel
    float ca = (0.0012 + 0.0022 * uHover);
    vec2 dir = normalize(vUv - m + 0.0001);
    float r = texture2D(uTex, duv + dir * ca).r;
    float g = texture2D(uTex, duv).g;
    float b = texture2D(uTex, duv - dir * ca).b;
    vec3 col = vec3(r, g, b);

    // moving gold emulsion band over highlights
    float lum = dot(col, vec3(0.299, 0.587, 0.114));
    float band = smoothstep(0.0, 0.5, sin(uv.y * 3.0 + uTime * 0.5) * 0.5 + 0.5);
    vec3 gold = vec3(0.79, 0.63, 0.20);
    col = mix(col, mix(col, gold, 0.18), band * smoothstep(0.45, 1.0, lum));

    // gentle cursor glow lift
    col += gold * (0.10 * uHover * smoothstep(0.4, 0.0, d));

    gl_FragColor = vec4(col, 1.0);
  }
`;

/**
 * WebGL treatment applied directly to the real hero photo: a flowing
 * displacement + chromatic "film emulsion" + gold highlight band that reacts to
 * the cursor. Desktop + motion + WebGL only; otherwise renders nothing and the
 * underlying <Image> (with Ken-Burns) shows untouched.
 */
export function HeroCanvas({ src = '/images/hero/home1.jpg' }: HeroCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!canEnhance() || !hasWebGL()) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const host = canvas.parentElement;
    if (!host) return;

    let disposed = false;
    let raf = 0;
    let cleanup = () => {};

    (async () => {
      const THREE = await import('three');
      if (disposed) return;

      const tex = await new Promise<import('three').Texture | null>((resolve) => {
        new THREE.TextureLoader().load(src, resolve, undefined, () => resolve(null));
      });
      if (disposed || !tex) return;
      tex.colorSpace = THREE.SRGBColorSpace;

      const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));

      const scene = new THREE.Scene();
      const camera = new THREE.Camera();

      const img = tex.image as { width: number; height: number };
      const uniforms = {
        uTex: { value: tex },
        uRes: { value: new THREE.Vector2(1, 1) },
        uImg: { value: new THREE.Vector2(img.width, img.height) },
        uTime: { value: 0 },
        uMouse: { value: new THREE.Vector2(0, 0) },
        uHover: { value: 0 },
      };

      const geo = new THREE.PlaneGeometry(2, 2);
      const mat = new THREE.ShaderMaterial({ vertexShader: VERT, fragmentShader: FRAG, uniforms });
      const quad = new THREE.Mesh(geo, mat);
      scene.add(quad);

      const resize = () => {
        const w = host.clientWidth;
        const h = host.clientHeight;
        renderer.setSize(w, h, false);
        uniforms.uRes.value.set(w, h);
      };
      resize();
      const ro = new ResizeObserver(resize);
      ro.observe(host);

      const target = { x: 0, y: 0, hover: 0 };
      const onMove = (e: MouseEvent) => {
        const r = host.getBoundingClientRect();
        target.x = ((e.clientX - r.left) / r.width - 0.5) * 2;
        target.y = -((e.clientY - r.top) / r.height - 0.5) * 2;
        target.hover = 1;
      };
      const onLeave = () => {
        target.hover = 0;
      };
      host.addEventListener('mousemove', onMove, { passive: true });
      host.addEventListener('mouseleave', onLeave);

      // photo is now drawn by WebGL — hide the static <img> to avoid double
      document.documentElement.classList.add('hero-gl-on');

      const start = performance.now();
      const loop = () => {
        if (disposed) return;
        uniforms.uTime.value = (performance.now() - start) / 1000;
        uniforms.uMouse.value.x += (target.x - uniforms.uMouse.value.x) * 0.06;
        uniforms.uMouse.value.y += (target.y - uniforms.uMouse.value.y) * 0.06;
        uniforms.uHover.value += (target.hover - uniforms.uHover.value) * 0.05;
        renderer.render(scene, camera);
        raf = requestAnimationFrame(loop);
      };
      loop();

      cleanup = () => {
        cancelAnimationFrame(raf);
        ro.disconnect();
        host.removeEventListener('mousemove', onMove);
        host.removeEventListener('mouseleave', onLeave);
        document.documentElement.classList.remove('hero-gl-on');
        geo.dispose();
        mat.dispose();
        tex.dispose();
        renderer.dispose();
      };
    })();

    return () => {
      disposed = true;
      cleanup();
    };
  }, [src]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="absolute inset-0 hidden h-full w-full lg:block"
    />
  );
}
