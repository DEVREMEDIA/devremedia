'use client';

import { useEffect, useRef } from 'react';

interface Particle {
  x: number;
  y: number;
  z: number;
  speed: number;
  phase: number;
  phaseSpeed: number;
}

const DEPTH = 1000;
const TRAVEL_SPEED = 0.8;
const GOLD = { r: 201, g: 160, b: 51 };
const LIGHT_GOLD = { r: 240, g: 217, b: 138 };

// Scale density based on screen area — mobile ~80, 1080p ~180, 1440p ~260, 4K ~400
function getParticleCount(w: number, h: number): number {
  const area = w * h;
  const density = 0.00012; // particles per pixel
  return Math.max(60, Math.min(400, Math.round(area * density)));
}

function getConnectionDistance(w: number): number {
  if (w < 768) return 150;
  if (w < 1440) return 200;
  return 260;
}

function getMouseRadius(w: number): number {
  if (w < 768) return 200;
  if (w < 1440) return 280;
  return 350;
}

function createParticle(w: number, h: number, randomZ = true): Particle {
  // Tighter spread so particles stay denser on screen, especially on large screens
  const spread = Math.min(w, h) < 768 ? 1.5 : 1.2;
  return {
    x: (Math.random() - 0.5) * w * spread,
    y: (Math.random() - 0.5) * h * spread,
    z: randomZ ? Math.random() * DEPTH : DEPTH,
    speed: Math.random() * TRAVEL_SPEED + 0.3,
    phase: Math.random() * Math.PI * 2,
    phaseSpeed: Math.random() * 0.006 + 0.002,
  };
}

function project(p: Particle, cx: number, cy: number): { sx: number; sy: number; scale: number } {
  const perspective = 600;
  const scale = perspective / (perspective + p.z);
  return {
    sx: p.x * scale + cx,
    sy: p.y * scale + cy,
    scale,
  };
}

export function CinematicBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mouseRef = useRef({ x: -9999, y: -9999 });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReduced) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationId: number;
    let particles: Particle[] = [];
    let connectionDist = 200;
    let mouseRadius = 280;

    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      const w = window.innerWidth;
      const h = window.innerHeight;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      const count = getParticleCount(w, h);
      connectionDist = getConnectionDistance(w);
      mouseRadius = getMouseRadius(w);

      particles = Array.from({ length: count }, () => createParticle(w, h));
    };

    const handleMouseMove = (e: MouseEvent) => {
      mouseRef.current = { x: e.clientX, y: e.clientY };
    };

    const handleMouseLeave = () => {
      mouseRef.current = { x: -9999, y: -9999 };
    };

    resize();
    window.addEventListener('resize', resize);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseleave', handleMouseLeave);

    const vw = () => window.innerWidth;
    const vh = () => window.innerHeight;

    const animate = () => {
      const width = vw();
      const height = vh();
      const cx = width / 2;
      const cy = height / 2;

      ctx.clearRect(0, 0, width, height);

      const mouse = mouseRef.current;

      // Projected positions cache for connections
      const projected: Array<{ sx: number; sy: number; scale: number }> = [];

      // Update & draw particles
      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];

        // Move toward camera (z decreases)
        p.z -= p.speed;
        p.phase += p.phaseSpeed;

        // Subtle lateral drift
        p.x += Math.sin(p.phase) * 0.3;
        p.y += Math.cos(p.phase * 0.7) * 0.2;

        // Reset when particle passes camera
        if (p.z <= 1) {
          const newP = createParticle(width, height, false);
          p.x = newP.x;
          p.y = newP.y;
          p.z = DEPTH;
          p.speed = newP.speed;
        }

        const proj = project(p, cx, cy);
        projected[i] = proj;

        // Skip if off screen
        if (proj.sx < -50 || proj.sx > width + 50 || proj.sy < -50 || proj.sy > height + 50) {
          continue;
        }

        // Scale dot size with screen — bigger dots on bigger screens
        const sizeMul = width > 1440 ? 3.5 : width > 1024 ? 3 : 2.5;
        const radius = Math.max(0.5, proj.scale * sizeMul);
        const opacity = Math.min(1, proj.scale * 1.2) * 0.6;

        // Mouse repulsion
        if (mouse.x > 0 && mouse.y > 0) {
          const mdx = proj.sx - mouse.x;
          const mdy = proj.sy - mouse.y;
          const mDist = Math.sqrt(mdx * mdx + mdy * mdy);
          if (mDist < mouseRadius * proj.scale && mDist > 0) {
            const force = (1 - mDist / (mouseRadius * proj.scale)) * 2;
            p.x += ((mdx / mDist) * force) / proj.scale;
            p.y += ((mdy / mDist) * force) / proj.scale;
          }
        }

        // Draw glow
        const glowRadius = radius * 5;
        const gradient = ctx.createRadialGradient(
          proj.sx,
          proj.sy,
          0,
          proj.sx,
          proj.sy,
          glowRadius,
        );
        gradient.addColorStop(
          0,
          `rgba(${LIGHT_GOLD.r}, ${LIGHT_GOLD.g}, ${LIGHT_GOLD.b}, ${opacity * 0.2})`,
        );
        gradient.addColorStop(1, 'transparent');
        ctx.beginPath();
        ctx.arc(proj.sx, proj.sy, glowRadius, 0, Math.PI * 2);
        ctx.fillStyle = gradient;
        ctx.fill();

        // Draw core dot
        ctx.beginPath();
        ctx.arc(proj.sx, proj.sy, radius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${LIGHT_GOLD.r}, ${LIGHT_GOLD.g}, ${LIGHT_GOLD.b}, ${opacity})`;
        ctx.fill();
      }

      // Draw connections between nearby particles
      for (let i = 0; i < particles.length; i++) {
        const pi = projected[i];
        if (!pi) continue;
        for (let j = i + 1; j < particles.length; j++) {
          const pj = projected[j];
          if (!pj) continue;

          const dx = pi.sx - pj.sx;
          const dy = pi.sy - pj.sy;
          const dist = Math.sqrt(dx * dx + dy * dy);

          // Scale connection distance by average depth
          const avgScale = (pi.scale + pj.scale) / 2;
          const maxDist = connectionDist * avgScale;

          if (dist < maxDist) {
            const strength = 1 - dist / maxDist;
            const lineOpacity = strength * avgScale * 0.34;

            ctx.beginPath();
            ctx.moveTo(pi.sx, pi.sy);
            ctx.lineTo(pj.sx, pj.sy);
            ctx.strokeStyle = `rgba(${GOLD.r}, ${GOLD.g}, ${GOLD.b}, ${lineOpacity})`;
            ctx.lineWidth = strength * avgScale * 1.5;
            ctx.stroke();
          }
        }
      }

      // Draw mouse connections
      if (mouse.x > 0 && mouse.y > 0) {
        for (let i = 0; i < particles.length; i++) {
          const pi = projected[i];
          if (!pi) continue;
          const dx = pi.sx - mouse.x;
          const dy = pi.sy - mouse.y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < mouseRadius) {
            const strength = 1 - dist / mouseRadius;
            ctx.beginPath();
            ctx.moveTo(mouse.x, mouse.y);
            ctx.lineTo(pi.sx, pi.sy);
            ctx.strokeStyle = `rgba(${LIGHT_GOLD.r}, ${LIGHT_GOLD.g}, ${LIGHT_GOLD.b}, ${strength * 0.21})`;
            ctx.lineWidth = strength * 1.5;
            ctx.stroke();
          }
        }
      }

      animationId = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener('resize', resize);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 0,
        pointerEvents: 'none',
        backgroundColor: '#09090b',
      }}
      aria-hidden="true"
    />
  );
}
