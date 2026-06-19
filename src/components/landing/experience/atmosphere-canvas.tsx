'use client';

import { useEffect, useRef } from 'react';
import { canEnhance, hasWebGL } from './gate';

/**
 * L5 atmosphere — slow-drifting gold "dust" particle field rendered in WebGL.
 * Replaces the old particle-network CinematicBackground. Desktop + motion only;
 * Three.js is lazy-imported so it never ships to mobile/reduced-motion visitors.
 * A static dark backdrop is rendered server-side in page.tsx, so this is purely additive.
 */
export function AtmosphereCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!canEnhance() || !hasWebGL()) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    let disposed = false;
    let raf = 0;
    let cleanup = () => {};

    (async () => {
      const THREE = await import('three');
      if (disposed) return;

      const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
      renderer.setClearColor(0x000000, 0);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));

      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(60, 1, 0.1, 2000);
      camera.position.z = 600;

      // round soft gold sprite
      const sprite = (() => {
        const s = 64;
        const cv = document.createElement('canvas');
        cv.width = cv.height = s;
        const g = cv.getContext('2d')!;
        const grd = g.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
        grd.addColorStop(0, 'rgba(240,217,138,0.9)');
        grd.addColorStop(0.4, 'rgba(201,160,51,0.5)');
        grd.addColorStop(1, 'rgba(201,160,51,0)');
        g.fillStyle = grd;
        g.fillRect(0, 0, s, s);
        const tex = new THREE.CanvasTexture(cv);
        return tex;
      })();

      const COUNT = 240;
      const positions = new Float32Array(COUNT * 3);
      const speeds = new Float32Array(COUNT);
      for (let i = 0; i < COUNT; i++) {
        positions[i * 3] = (Math.random() - 0.5) * 1600;
        positions[i * 3 + 1] = (Math.random() - 0.5) * 1000;
        positions[i * 3 + 2] = (Math.random() - 0.5) * 800;
        speeds[i] = Math.random() * 0.4 + 0.15;
      }
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));

      const mat = new THREE.PointsMaterial({
        size: 7,
        map: sprite,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        opacity: 0.7,
        sizeAttenuation: true,
      });
      const points = new THREE.Points(geo, mat);
      scene.add(points);

      const mouse = { x: 0, y: 0 };
      const onMove = (e: MouseEvent) => {
        mouse.x = (e.clientX / window.innerWidth - 0.5) * 2;
        mouse.y = (e.clientY / window.innerHeight - 0.5) * 2;
      };
      window.addEventListener('mousemove', onMove, { passive: true });

      const resize = () => {
        const w = window.innerWidth;
        const h = window.innerHeight;
        renderer.setSize(w, h, false);
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
      };
      resize();
      window.addEventListener('resize', resize);

      let t = 0;
      let visible = true;
      const onVis = () => {
        visible = !document.hidden;
        if (visible) loop();
      };
      document.addEventListener('visibilitychange', onVis);

      const pos = geo.getAttribute('position') as import('three').BufferAttribute;
      const loop = () => {
        if (disposed || !visible) return;
        t += 0.0016;
        const arr = pos.array as Float32Array;
        for (let i = 0; i < COUNT; i++) {
          arr[i * 3 + 1] += speeds[i]; // drift upward
          if (arr[i * 3 + 1] > 520) arr[i * 3 + 1] = -520;
          arr[i * 3] += Math.sin(t + i) * 0.18;
        }
        pos.needsUpdate = true;
        points.rotation.y = mouse.x * 0.18;
        points.rotation.x = mouse.y * 0.12;
        camera.position.x += (mouse.x * 60 - camera.position.x) * 0.03;
        camera.position.y += (-mouse.y * 40 - camera.position.y) * 0.03;
        camera.lookAt(scene.position);
        renderer.render(scene, camera);
        raf = requestAnimationFrame(loop);
      };
      loop();

      cleanup = () => {
        cancelAnimationFrame(raf);
        window.removeEventListener('mousemove', onMove);
        window.removeEventListener('resize', resize);
        document.removeEventListener('visibilitychange', onVis);
        geo.dispose();
        mat.dispose();
        sprite.dispose();
        renderer.dispose();
      };
    })();

    return () => {
      disposed = true;
      cleanup();
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-0 hidden lg:block"
    />
  );
}
