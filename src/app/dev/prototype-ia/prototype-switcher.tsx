'use client';

// PROTOTYPE — throwaway. Floating variant switcher. Hidden in production builds.

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface PrototypeSwitcherProps {
  variants: { key: string; name: string }[];
  current: string;
}

export function PrototypeSwitcher({ variants, current }: PrototypeSwitcherProps) {
  const router = useRouter();
  const pathname = usePathname();

  const index = Math.max(
    0,
    variants.findIndex((v) => v.key === current),
  );

  useEffect(() => {
    const go = (delta: number) => {
      const next = variants[(index + delta + variants.length) % variants.length];
      router.replace(`${pathname}?variant=${next.key}`, { scroll: false });
    };

    const onKey = (e: KeyboardEvent) => {
      const el = document.activeElement;
      if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) return;
      if (el instanceof HTMLElement && el.isContentEditable) return;
      if (e.key === 'ArrowLeft') go(-1);
      if (e.key === 'ArrowRight') go(1);
    };

    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [index, pathname, router, variants]);

  if (process.env.NODE_ENV === 'production') return null;

  const move = (delta: number) => {
    const next = variants[(index + delta + variants.length) % variants.length];
    router.replace(`${pathname}?variant=${next.key}`, { scroll: false });
  };

  return (
    <div className="fixed bottom-5 left-1/2 z-[100] -translate-x-1/2">
      <div className="flex items-center gap-1 rounded-full border border-white/15 bg-black/90 px-2 py-1.5 text-white shadow-2xl backdrop-blur">
        <button
          onClick={() => move(-1)}
          className="rounded-full p-2 transition hover:bg-white/15"
          aria-label="Προηγούμενη παραλλαγή"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <div className="min-w-[16rem] px-3 text-center text-sm font-medium tracking-tight">
          <span className="text-gold-300">{variants[index].key}</span>
          <span className="mx-2 text-white/25">·</span>
          {variants[index].name}
        </div>
        <button
          onClick={() => move(1)}
          className="rounded-full p-2 transition hover:bg-white/15"
          aria-label="Επόμενη παραλλαγή"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
      <p className="mt-2 text-center text-[11px] text-muted-foreground">
        PROTOTYPE — βέλη ← → ή κλικ · {variants.length} παραλλαγές
      </p>
    </div>
  );
}
