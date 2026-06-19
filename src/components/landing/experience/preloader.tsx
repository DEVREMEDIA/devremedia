'use client';

import { useEffect, useRef, useState } from 'react';
import { prefersReducedMotion } from './gate';

/**
 * Cinematic preloader: 0 → 100 counter with a gold hairline, then a curtain
 * wipe that reveals the page. SSR-rendered so it covers content immediately (no
 * flash). Hidden via CSS for no-JS and reduced-motion visitors; shown once per
 * session so internal navigation doesn't replay it.
 */
export function Preloader() {
  const rootRef = useRef<HTMLDivElement>(null);
  const [count, setCount] = useState(0);
  const [gone, setGone] = useState(false);

  useEffect(() => {
    const skip = prefersReducedMotion() || sessionStorage.getItem('l5-pre-done') === '1';
    if (skip) {
      setGone(true);
      return;
    }

    document.body.style.overflow = 'hidden';
    const start = performance.now();
    const DUR = 1500;
    let raf = 0;
    let finished = false;

    const finish = () => {
      if (finished) return;
      finished = true;
      sessionStorage.setItem('l5-pre-done', '1');
      rootRef.current?.classList.add('done');
      document.body.style.overflow = '';
      window.dispatchEvent(new Event('l5:revealed'));
      window.setTimeout(() => setGone(true), 950);
    };

    const tick = (now: number) => {
      const p = Math.min((now - start) / DUR, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      setCount(Math.round(eased * 100));
      if (p < 1) {
        raf = requestAnimationFrame(tick);
      } else {
        window.setTimeout(finish, 200);
      }
    };
    raf = requestAnimationFrame(tick);

    const safety = window.setTimeout(finish, 4500);

    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(safety);
      document.body.style.overflow = '';
    };
  }, []);

  if (gone) return null;

  return (
    <div ref={rootRef} className="l5-preloader" aria-hidden="true">
      <div className="l5-preloader__inner">
        <span className="l5-preloader__brand">DEVRE&nbsp;MEDIA</span>
        <span className="l5-preloader__count">{count}</span>
        <span className="l5-preloader__bar">
          <span className="l5-preloader__fill" style={{ transform: `scaleX(${count / 100})` }} />
        </span>
      </div>
    </div>
  );
}
