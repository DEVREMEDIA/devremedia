'use client';

import { useEffect } from 'react';
import { canEnhance, prefersReducedMotion } from './gate';

/**
 * L5 motion controller — progressive enhancement over the existing Server
 * Components. Mobile / reduced-motion / lib-load-failure all fall back to a
 * plain IntersectionObserver reveal so content is always visible.
 *
 * Replaces <ScrollRevealInit/> (it owns [data-reveal] reveal in every path).
 */
export function LandingExperience() {
  useEffect(() => {
    const reveals = Array.from(document.querySelectorAll<HTMLElement>('[data-reveal]'));
    const revealAll = () => reveals.forEach((el) => el.classList.add('revealed'));

    if (prefersReducedMotion()) {
      revealAll();
      return;
    }

    // ── Base path (mobile/tablet): simple observer reveal, no heavy libs ──
    if (!canEnhance()) {
      const io = new IntersectionObserver(
        (entries) => {
          entries.forEach((e) => {
            if (e.isIntersecting) {
              e.target.classList.add('revealed');
              io.unobserve(e.target);
            }
          });
        },
        { threshold: 0.15, rootMargin: '0px 0px -40px 0px' },
      );
      reveals.forEach((el) => io.observe(el));
      return () => io.disconnect();
    }

    // ── Enhanced path (desktop): GSAP + Lenis + SplitType ──
    let cancelled = false;
    let cleanup = () => {};

    (async () => {
      let gsap: typeof import('gsap').gsap;
      let ScrollTrigger: typeof import('gsap/ScrollTrigger').ScrollTrigger;
      let Lenis: typeof import('lenis').default;
      let SplitType: typeof import('split-type').default;
      try {
        const g = await import('gsap');
        gsap = g.gsap ?? g.default;
        ScrollTrigger = (await import('gsap/ScrollTrigger')).ScrollTrigger;
        Lenis = (await import('lenis')).default;
        SplitType = (await import('split-type')).default;
      } catch {
        revealAll();
        return;
      }
      if (cancelled) {
        revealAll();
        return;
      }

      gsap.registerPlugin(ScrollTrigger);
      document.documentElement.classList.add('l5-on');

      const disposers: Array<() => void> = [];

      // ── Lenis smooth scroll, synced to ScrollTrigger ──
      const lenis = new Lenis({ duration: 1.1, smoothWheel: true });
      lenis.on('scroll', ScrollTrigger.update);
      const ticker = (time: number) => lenis.raf(time * 1000);
      gsap.ticker.add(ticker);
      gsap.ticker.lagSmoothing(0);
      disposers.push(() => {
        gsap.ticker.remove(ticker);
        lenis.destroy();
      });

      // ── Scroll reveals (GSAP-driven, replaces CSS reveal) ──
      gsap.set(reveals, { autoAlpha: 0, y: 30 });
      ScrollTrigger.batch(reveals, {
        start: 'top 88%',
        onEnter: (els) =>
          gsap.to(els, {
            autoAlpha: 1,
            y: 0,
            duration: 0.9,
            ease: 'power3.out',
            stagger: 0.08,
            overwrite: true,
          }),
      });

      // ── Masked line reveals on headings ──
      const heads = Array.from(document.querySelectorAll<HTMLElement>('main h2, [data-l5-title]'));
      const splits: import('split-type').default[] = [];
      heads.forEach((h) => {
        const split = new SplitType(h, { types: 'lines' });
        splits.push(split);
        const inners: HTMLElement[] = [];
        (split.lines ?? []).forEach((line) => {
          const inner = document.createElement('span');
          inner.className = 'l5-line-inner';
          while (line.firstChild) inner.appendChild(line.firstChild);
          line.appendChild(inner);
          line.style.overflow = 'hidden';
          line.style.display = 'block';
          inners.push(inner);
        });
        if (!inners.length) return;
        gsap.set(inners, { yPercent: 110 });
        gsap.to(inners, {
          yPercent: 0,
          duration: 1,
          ease: 'power4.out',
          stagger: 0.08,
          scrollTrigger: { trigger: h, start: 'top 85%' },
        });
      });
      disposers.push(() => splits.forEach((s) => s.revert()));

      // ── Process connecting line draws on scroll ──
      const procLine = document.querySelector<HTMLElement>('[data-process-line]');
      const procEl = procLine?.closest('#process');
      if (procLine && procEl) {
        gsap.fromTo(
          procLine,
          { scaleX: 0, transformOrigin: 'left center' },
          {
            scaleX: 1,
            ease: 'none',
            scrollTrigger: { trigger: procEl, start: 'top 70%', end: 'bottom 70%', scrub: 0.8 },
          },
        );
      }

      // ── Cursor light + dot ──
      const light = document.createElement('div');
      light.className = 'l5-cursor-light';
      const dot = document.createElement('div');
      dot.className = 'l5-cursor-dot';
      document.body.append(light, dot);
      const lx = gsap.quickTo(light, 'x', { duration: 0.55, ease: 'power3' });
      const ly = gsap.quickTo(light, 'y', { duration: 0.55, ease: 'power3' });
      const dx = gsap.quickTo(dot, 'x', { duration: 0.12, ease: 'power3' });
      const dy = gsap.quickTo(dot, 'y', { duration: 0.12, ease: 'power3' });
      const onMove = (e: MouseEvent) => {
        lx(e.clientX);
        ly(e.clientY);
        dx(e.clientX);
        dy(e.clientY);
        light.classList.add('on');
        dot.classList.add('on');
      };
      window.addEventListener('mousemove', onMove, { passive: true });
      disposers.push(() => {
        window.removeEventListener('mousemove', onMove);
        light.remove();
        dot.remove();
      });

      // ── Magnetic gold buttons ──
      const magnetics = Array.from(document.querySelectorAll<HTMLElement>('a, button')).filter(
        (el) => typeof el.className === 'string' && el.className.includes('bg-gold-500'),
      );
      magnetics.forEach((btn) => {
        const qx = gsap.quickTo(btn, 'x', { duration: 0.4, ease: 'power3' });
        const qy = gsap.quickTo(btn, 'y', { duration: 0.4, ease: 'power3' });
        const move = (e: MouseEvent) => {
          const r = btn.getBoundingClientRect();
          qx((e.clientX - r.left - r.width / 2) * 0.3);
          qy((e.clientY - r.top - r.height / 2) * 0.45);
        };
        const leave = () => {
          qx(0);
          qy(0);
        };
        btn.addEventListener('mousemove', move);
        btn.addEventListener('mouseleave', leave);
        disposers.push(() => {
          btn.removeEventListener('mousemove', move);
          btn.removeEventListener('mouseleave', leave);
        });
      });

      // ── Nav link text scramble on hover ──
      const SCR = 'ABCDEFGHIJKLMNOPQRSTUVWXYZΑΒΓΔΕΖΗΘ0123456789';
      const navLinks = Array.from(document.querySelectorAll<HTMLElement>('nav a'));
      navLinks.forEach((a) => {
        const original = a.textContent ?? '';
        if (!original.trim() || original.length > 24) return;
        let frame = 0;
        let id = 0;
        const run = () => {
          let iter = 0;
          cancelAnimationFrame(id);
          const step = () => {
            a.textContent = original
              .split('')
              .map((ch, idx) => {
                if (ch === ' ') return ' ';
                return idx < iter ? original[idx] : SCR[Math.floor(Math.random() * SCR.length)];
              })
              .join('');
            iter += 1 / 2;
            frame++;
            if (iter < original.length) {
              id = requestAnimationFrame(step);
            } else {
              a.textContent = original;
            }
          };
          step();
        };
        a.addEventListener('mouseenter', run);
        disposers.push(() => {
          a.removeEventListener('mouseenter', run);
          cancelAnimationFrame(id);
          a.textContent = original;
          void frame;
        });
      });

      // settle layout (fonts/images) then recompute triggers
      const refresh = () => ScrollTrigger.refresh();
      window.addEventListener('load', refresh);
      const refreshTimer = window.setTimeout(refresh, 600);
      disposers.push(() => {
        window.removeEventListener('load', refresh);
        clearTimeout(refreshTimer);
      });
      ScrollTrigger.refresh();

      cleanup = () => {
        disposers.forEach((d) => d());
        ScrollTrigger.getAll().forEach((t) => t.kill());
        document.documentElement.classList.remove('l5-on');
      };
    })();

    return () => {
      cancelled = true;
      cleanup();
    };
  }, []);

  return null;
}
