'use client';

import { useEffect } from 'react';
import { canEnhance, prefersReducedMotion } from './gate';

/**
 * L5 "Editorial Noir" motion controller — progressive enhancement over the
 * server-rendered sections. Mobile / reduced-motion / lib-load-failure all fall
 * back to a plain IntersectionObserver reveal (and CSS marquees), so content is
 * always visible and the page never depends on JS to be usable.
 */
export function LandingExperience() {
  useEffect(() => {
    const reveals = Array.from(document.querySelectorAll<HTMLElement>('[data-reveal]'));
    const revealAll = () => reveals.forEach((el) => el.classList.add('revealed'));

    if (prefersReducedMotion()) {
      revealAll();
      return;
    }

    // ── Base path (mobile/tablet): observer reveal, CSS marquees, static grid ──
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
        { threshold: 0.12, rootMargin: '0px 0px -8% 0px' },
      );
      reveals.forEach((el) => io.observe(el));
      return () => io.disconnect();
    }

    // ── Enhanced path (capable desktop): GSAP + Lenis ──
    let cancelled = false;
    let cleanup = () => {};

    (async () => {
      let gsap: typeof import('gsap').gsap;
      let ScrollTrigger: typeof import('gsap/ScrollTrigger').ScrollTrigger;
      let Lenis: typeof import('lenis').default;
      try {
        const g = await import('gsap');
        gsap = g.gsap ?? g.default;
        ScrollTrigger = (await import('gsap/ScrollTrigger')).ScrollTrigger;
        Lenis = (await import('lenis')).default;
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
      const ease = 'power3.out';

      // ── Lenis smooth scroll, synced to ScrollTrigger ──
      const lenis = new Lenis({ duration: 1.15, smoothWheel: true });
      lenis.on('scroll', ScrollTrigger.update);
      const ticker = (time: number) => lenis.raf(time * 1000);
      gsap.ticker.add(ticker);
      gsap.ticker.lagSmoothing(0);
      disposers.push(() => {
        gsap.ticker.remove(ticker);
        lenis.destroy();
      });

      // anchor links → Lenis smooth scroll
      const anchorHandlers: Array<[HTMLAnchorElement, (e: Event) => void]> = [];
      document.querySelectorAll<HTMLAnchorElement>('a[href^="#"]').forEach((a) => {
        const href = a.getAttribute('href') ?? '';
        if (href.length <= 1) return;
        const handler = (e: Event) => {
          const el = document.querySelector(href);
          if (el) {
            e.preventDefault();
            lenis.scrollTo(el as HTMLElement, { offset: -60 });
          }
        };
        a.addEventListener('click', handler);
        anchorHandlers.push([a, handler]);
      });
      disposers.push(() => anchorHandlers.forEach(([a, h]) => a.removeEventListener('click', h)));

      // ── Nav scrolled state + scroll-progress hairline ──
      const nav = document.querySelector<HTMLElement>('.l5-nav');
      const progress = document.querySelector<HTMLElement>('[data-scroll-progress]');
      const onScroll = () => {
        const y = window.scrollY || window.pageYOffset;
        nav?.classList.toggle('scrolled', y > 40);
        if (progress) {
          const h = document.documentElement.scrollHeight - window.innerHeight;
          progress.style.width = `${h > 0 ? (y / h) * 100 : 0}%`;
        }
      };
      onScroll();
      window.addEventListener('scroll', onScroll, { passive: true });
      disposers.push(() => window.removeEventListener('scroll', onScroll));

      // ── Scroll reveals (batched) ──
      gsap.set(reveals, { autoAlpha: 0, y: 30 });
      ScrollTrigger.batch(reveals, {
        start: 'top 88%',
        onEnter: (els) =>
          gsap.to(els, {
            autoAlpha: 1,
            y: 0,
            duration: 0.9,
            ease,
            stagger: 0.08,
            overwrite: true,
          }),
      });

      // ── Section / hero titles: rise + fade (keeps nested accent markup intact) ──
      document.querySelectorAll<HTMLElement>('[data-l5-title]').forEach((tEl) => {
        gsap.from(tEl, {
          scrollTrigger: { trigger: tEl, start: 'top 86%' },
          yPercent: 14,
          autoAlpha: 0,
          duration: 1,
          ease,
        });
      });

      // ── Count-up stats ──
      document.querySelectorAll<HTMLElement>('[data-countup]').forEach((numEl) => {
        const target = parseInt(numEl.textContent ?? '', 10);
        if (Number.isNaN(target)) return;
        const suffix = numEl.querySelector('.gold')?.outerHTML ?? '';
        const obj = { v: 0 };
        gsap.to(obj, {
          v: target,
          duration: 1.6,
          ease: 'power2.out',
          scrollTrigger: { trigger: numEl, start: 'top 82%', once: true },
          onUpdate: () => {
            numEl.innerHTML = Math.round(obj.v) + suffix;
          },
        });
      });

      // ── Kinetic brands marquee (velocity-aware) ──
      const brandsTrack = document.querySelector<HTMLElement>('[data-marquee]');
      if (brandsTrack) {
        const loop = gsap.to(brandsTrack, {
          xPercent: -50,
          duration: 42,
          ease: 'none',
          repeat: -1,
        });
        const mq = brandsTrack.closest('.brands-marquee');
        const enter = () => gsap.to(loop, { timeScale: 0, duration: 0.4 });
        const leave = () => gsap.to(loop, { timeScale: 1, duration: 0.4 });
        mq?.addEventListener('mouseenter', enter);
        mq?.addEventListener('mouseleave', leave);
        ScrollTrigger.create({
          trigger: '.brands',
          start: 'top bottom',
          end: 'bottom top',
          onUpdate: (self) => {
            const v = Math.min(Math.abs(self.getVelocity()) / 300, 6);
            gsap.to(loop, { timeScale: 1 + v, duration: 0.3, overwrite: true });
          },
        });
        disposers.push(() => {
          mq?.removeEventListener('mouseenter', enter);
          mq?.removeEventListener('mouseleave', leave);
          loop.kill();
        });
      }

      // ── Velocity marquee strip (direction + speed from scroll) ──
      const vtrack = document.querySelector<HTMLElement>('[data-marquee-v]');
      if (vtrack) {
        const loop = gsap.to(vtrack, { xPercent: -50, duration: 30, ease: 'none', repeat: -1 });
        ScrollTrigger.create({
          onUpdate: (self) => {
            const v = Math.min(Math.abs(self.getVelocity()) / 260, 7);
            gsap.to(loop, { timeScale: self.direction * (1 + v), duration: 0.4, overwrite: true });
          },
        });
        disposers.push(() => loop.kill());
      }

      // ── Pinned horizontal Process chapter (built from the static grid) ──
      const mount = document.querySelector<HTMLElement>('[data-proc-mount]');
      const grid = document.querySelector<HTMLElement>('[data-proc-grid]');
      if (mount && grid && window.innerWidth >= 900) {
        const cells = Array.from(grid.querySelectorAll<HTMLElement>('.proc-cell'));
        const pin = document.createElement('div');
        pin.className = 'proc-pin';
        const track = document.createElement('div');
        track.className = 'proc-track';
        cells.forEach((cell) => {
          const step = document.createElement('div');
          step.className = 'proc-step';
          step.innerHTML = cell.innerHTML;
          track.appendChild(step);
        });
        const prog = document.createElement('div');
        prog.className = 'proc-progress';
        prog.innerHTML = '<i></i>';
        const count = document.createElement('div');
        count.className = 'proc-count';
        const total = String(cells.length).padStart(2, '0');
        count.textContent = `01 / ${total}`;
        pin.append(track, prog, count);
        grid.style.display = 'none';
        mount.appendChild(pin);
        const fill = prog.querySelector<HTMLElement>('i');

        const tween = gsap.to(track, {
          x: () => -(track.scrollWidth - mount.offsetWidth),
          ease: 'none',
          scrollTrigger: {
            trigger: pin,
            start: 'top top',
            end: () => `+=${track.scrollWidth - mount.offsetWidth}`,
            pin: true,
            scrub: 1,
            invalidateOnRefresh: true,
            onUpdate: (self) => {
              if (fill) fill.style.width = `${self.progress * 100}%`;
              const idx = Math.min(cells.length, Math.floor(self.progress * cells.length) + 1);
              count.textContent = `${String(idx).padStart(2, '0')} / ${total}`;
            },
          },
        });
        disposers.push(() => {
          tween.scrollTrigger?.kill();
          tween.kill();
          pin.remove();
          grid.style.display = '';
        });
      }

      // ── Chapter / curtain reveal on major sections ──
      document.querySelectorAll<HTMLElement>('.chapter').forEach((sec) => {
        gsap.fromTo(
          sec,
          { clipPath: 'inset(6% 0 0 0)' },
          {
            clipPath: 'inset(0% 0 0 0)',
            ease,
            scrollTrigger: { trigger: sec, start: 'top 92%', end: 'top 60%', scrub: 0.4 },
          },
        );
      });

      // ── Scroll-velocity skew on portfolio + case media ──
      const skewEls = Array.from(document.querySelectorAll<HTMLElement>('.pf-item, .case-img'));
      if (skewEls.length) {
        const setters = skewEls.map((el) => gsap.quickSetter(el, 'skewY', 'deg'));
        ScrollTrigger.create({
          onUpdate: (self) => {
            const v = gsap.utils.clamp(-6, 6, self.getVelocity() / -420);
            setters.forEach((s) => s(v));
          },
        });
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
      document.querySelectorAll<HTMLElement>('.btn-gold').forEach((btn) => {
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

      // ── Nav link skew on hover ──
      document.querySelectorAll<HTMLElement>('.nav-links a').forEach((a) => {
        const enter = () => gsap.to(a, { skewX: -8, x: 2, duration: 0.3, ease: 'power2.out' });
        const leave = () => gsap.to(a, { skewX: 0, x: 0, duration: 0.4, ease: 'power2.out' });
        a.addEventListener('mouseenter', enter);
        a.addEventListener('mouseleave', leave);
        disposers.push(() => {
          a.removeEventListener('mouseenter', enter);
          a.removeEventListener('mouseleave', leave);
        });
      });

      // settle layout (fonts/images/preloader) then recompute triggers
      const refresh = () => ScrollTrigger.refresh();
      window.addEventListener('load', refresh);
      window.addEventListener('l5:revealed', refresh);
      const t1 = window.setTimeout(refresh, 700);
      const t2 = window.setTimeout(refresh, 1800);
      disposers.push(() => {
        window.removeEventListener('load', refresh);
        window.removeEventListener('l5:revealed', refresh);
        clearTimeout(t1);
        clearTimeout(t2);
      });
      ScrollTrigger.refresh();

      cleanup = () => {
        disposers.forEach((d) => d());
        ScrollTrigger.getAll().forEach((s) => s.kill());
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
