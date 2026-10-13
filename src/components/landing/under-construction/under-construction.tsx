'use client';

import { useEffect, useRef, useState, type RefObject } from 'react';
import Image from 'next/image';
import type { CorridorStatus } from './scene';

const IVORY = '#f5eedb';
const GOLD = '#c9a033';
const LIGHT_GOLD = '#f0d98a';

const mono = { fontFamily: 'var(--font-data), ui-monospace, monospace' } as const;

interface HudRefs {
  readoutRef: RefObject<HTMLSpanElement | null>;
  phaseRef: RefObject<HTMLSpanElement | null>;
  barRef: RefObject<HTMLSpanElement | null>;
}

function writeHud(refs: HudRefs, status: CorridorStatus): void {
  const index = String(Math.max(0, status.index)).padStart(2, '0');
  if (refs.readoutRef.current)
    refs.readoutRef.current.textContent = `ΜΟΝΟΛΙΘΟΣ ${index} · ΚΑΤΑΣΚΕΥΗ ${status.percent}%`;
  if (refs.phaseRef.current) refs.phaseRef.current.textContent = status.phase;
  if (refs.barRef.current) refs.barRef.current.style.transform = `scaleX(${status.percent / 100})`;
}

function useCorridor() {
  const hostRef = useRef<HTMLDivElement>(null);
  const readoutRef = useRef<HTMLSpanElement>(null);
  const phaseRef = useRef<HTMLSpanElement>(null);
  const barRef = useRef<HTMLSpanElement>(null);
  const [isFallback, setIsFallback] = useState(false);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    let dispose: (() => void) | null = null;
    let isCancelled = false;
    const isReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const refs = { readoutRef, phaseRef, barRef };
    const start = async (): Promise<void> => {
      try {
        const [THREE, { mountCorridor }] = await Promise.all([
          import('three'),
          import('./scene'),
        ]);
        await document.fonts.ready;
        if (isCancelled) return;
        dispose = mountCorridor(THREE, host, {
          isReducedMotion,
          onStatus: (status) => writeHud(refs, status),
        });
      } catch (error) {
        console.warn('Διάδρομος μονόλιθων: falling back to static logo', error);
        if (!isCancelled) setIsFallback(true);
      }
    };
    void start();
    return () => {
      isCancelled = true;
      dispose?.();
    };
  }, []);

  return { hostRef, readoutRef, phaseRef, barRef, isFallback };
}

export function UnderConstruction() {
  const { hostRef, readoutRef, phaseRef, barRef, isFallback } = useCorridor();

  return (
    <div className="fixed inset-0 overflow-hidden" style={{ background: '#0a0908' }} lang="el">
      <div ref={hostRef} className="absolute inset-0" aria-hidden />
      {isFallback && (
        <div className="absolute inset-0 flex items-center justify-center pb-40">
          <Image
            src="/images/Logo_Horizontal_Transparent.png"
            alt="Devre Media"
            width={1000}
            height={500}
            className="w-[min(78vw,520px)]"
            priority
          />
        </div>
      )}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse 90% 80% at 50% 40%, transparent 55%, rgba(10,9,8,0.85) 100%), linear-gradient(to top, rgba(10,9,8,0.85), transparent 34%)',
        }}
      />
      <TopBar readoutRef={readoutRef} phaseRef={phaseRef} barRef={barRef} />
      <BottomCopy />
    </div>
  );
}

function TopBar({ readoutRef, phaseRef, barRef }: HudRefs) {
  return (
    <div className="pointer-events-none absolute inset-x-0 top-0 flex items-start justify-between gap-4 px-4 pt-5 sm:px-8 sm:pt-7">
      <div
        className="flex w-52 flex-col gap-1.5 text-[10px] tracking-[0.16em] sm:w-72 sm:text-[11px]"
        style={{ ...mono, color: LIGHT_GOLD }}
      >
        <span ref={readoutRef}>ΜΟΝΟΛΙΘΟΣ 01 · ΚΑΤΑΣΚΕΥΗ 0%</span>
        <span
          className="relative block h-px w-full"
          style={{ background: 'rgba(245,238,219,0.14)' }}
        >
          <span
            ref={barRef}
            className="absolute inset-0 origin-left"
            style={{ background: GOLD, transform: 'scaleX(0)' }}
          />
        </span>
        <span ref={phaseRef} style={{ color: 'rgba(245,238,219,0.45)' }}>
          ΣΚΑΛΩΣΙΑ
        </span>
      </div>
      <div className="hidden items-center gap-3 pt-0.5 sm:flex" style={{ color: GOLD }}>
        <span className="h-px w-8" style={{ background: GOLD, opacity: 0.6 }} />
        <span
          className="text-[13px] uppercase tracking-[0.38em]"
          style={{ fontFamily: 'var(--font-serif-display), serif' }}
        >
          Υπό κατασκευή
        </span>
        <span className="h-px w-8" style={{ background: GOLD, opacity: 0.6 }} />
      </div>
      <span
        className="w-24 text-right text-[10px] tracking-[0.22em] sm:w-72 sm:text-[11px]"
        style={{ ...mono, color: 'rgba(245,238,219,0.45)' }}
      >
        UNDER CONSTRUCTION
      </span>
    </div>
  );
}

function BottomCopy() {
  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-12 flex flex-col items-center gap-4 px-4 text-center sm:bottom-16">
      <h1
        className="max-w-[18ch] text-[clamp(1.6rem,4.4vw,2.9rem)] leading-[1.08] font-normal sm:max-w-none"
        style={{ fontFamily: 'var(--font-serif-display), serif', color: IVORY }}
      >
        Χτίζουμε την επόμενη εκδοχή μας.
      </h1>
      <span className="text-[10px] tracking-[0.3em]" style={{ ...mono, color: 'rgba(245,238,219,0.3)' }}>
        ΣΥΡΕ ΓΙΑ ΠΕΡΙΣΤΡΟΦΗ
      </span>
    </div>
  );
}
