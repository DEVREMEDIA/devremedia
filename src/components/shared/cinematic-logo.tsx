'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { cn } from '@/lib/utils';

interface CinematicLogoProps {
  width?: number;
  height?: number;
  className?: string;
  invert?: boolean;
  priority?: boolean;
}

export function CinematicLogo({
  width = 320,
  height = 80,
  className,
  invert = false,
  priority = false,
}: CinematicLogoProps) {
  const [phase, setPhase] = useState<'hidden' | 'revealing' | 'glowing'>('hidden');

  useEffect(() => {
    // Phase 1: Start the reveal (blur-to-sharp + Y-axis rotation)
    const revealTimer = setTimeout(() => setPhase('revealing'), 100);
    // Phase 2: After reveal completes, enable the subtle gold glow pulse
    const glowTimer = setTimeout(() => setPhase('glowing'), 1400);
    return () => {
      clearTimeout(revealTimer);
      clearTimeout(glowTimer);
    };
  }, []);

  return (
    <div className="relative" style={{ perspective: '800px' }}>
      <Image
        src="/images/Logo_Horizontal_Transparent.png"
        alt="Devre Media"
        width={width}
        height={height}
        className={cn(
          'w-auto cinematic-logo',
          phase === 'hidden' && 'cinematic-logo-hidden',
          phase === 'revealing' && 'cinematic-logo-reveal',
          phase === 'glowing' && 'cinematic-logo-glow',
          invert && 'invert dark:invert-0',
          className,
        )}
        priority={priority}
      />
      {/* Gold flash overlay during reveal */}
      <div
        className={cn(
          'absolute inset-0 bg-gradient-to-r from-transparent via-primary/30 to-transparent pointer-events-none transition-opacity duration-500',
          phase === 'revealing' ? 'opacity-100 delay-500' : 'opacity-0',
        )}
      />
    </div>
  );
}
