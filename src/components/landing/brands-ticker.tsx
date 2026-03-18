'use client';

import { useRef, useState, useCallback, useEffect } from 'react';
import Image from 'next/image';

interface BrandLogo {
  readonly name: string;
  readonly src: string;
  readonly solidBg: boolean;
}

interface BrandsTickerProps {
  logos: readonly BrandLogo[];
}

export function BrandsTicker({ logos }: BrandsTickerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const dragState = useRef({ startX: 0, scrollLeft: 0 });

  // Duplicate logos 3x for seamless looping with drag
  const allLogos = [...logos, ...logos, ...logos];

  // Reset scroll to middle set when reaching edges (seamless loop)
  const handleScroll = useCallback(() => {
    const container = containerRef.current;
    if (!container || isDragging) return;

    const singleSetWidth = container.scrollWidth / 3;
    if (container.scrollLeft <= 0) {
      container.scrollLeft = singleSetWidth;
    } else if (container.scrollLeft >= singleSetWidth * 2) {
      container.scrollLeft = singleSetWidth;
    }
  }, [isDragging]);

  // Initialize scroll position to middle set
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const singleSetWidth = container.scrollWidth / 3;
    container.scrollLeft = singleSetWidth;
  }, []);

  // Mouse drag handlers
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    const container = containerRef.current;
    if (!container) return;
    setIsDragging(true);
    dragState.current = {
      startX: e.pageX - container.offsetLeft,
      scrollLeft: container.scrollLeft,
    };
  }, []);

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!isDragging || !containerRef.current) return;
      e.preventDefault();
      const x = e.pageX - containerRef.current.offsetLeft;
      const walk = (x - dragState.current.startX) * 1.5;
      containerRef.current.scrollLeft = dragState.current.scrollLeft - walk;
    },
    [isDragging],
  );

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  // Touch drag handlers
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    const container = containerRef.current;
    if (!container) return;
    setIsDragging(true);
    dragState.current = {
      startX: e.touches[0].pageX - container.offsetLeft,
      scrollLeft: container.scrollLeft,
    };
  }, []);

  const handleTouchMove = useCallback(
    (e: React.TouchEvent) => {
      if (!isDragging || !containerRef.current) return;
      const x = e.touches[0].pageX - containerRef.current.offsetLeft;
      const walk = (x - dragState.current.startX) * 1.5;
      containerRef.current.scrollLeft = dragState.current.scrollLeft - walk;
    },
    [isDragging],
  );

  const handleTouchEnd = useCallback(() => {
    setIsDragging(false);
  }, []);

  // Auto-scroll animation
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let animationId: number;
    // Faster on mobile: ~1.2px/frame, desktop: ~0.6px/frame
    const isMobile = window.innerWidth < 640;
    const speed = isMobile ? 1.2 : 0.6;

    const animate = () => {
      if (!isDragging && container) {
        container.scrollLeft += speed;

        // Loop back to middle when reaching end of 2nd set
        const singleSetWidth = container.scrollWidth / 3;
        if (container.scrollLeft >= singleSetWidth * 2) {
          container.scrollLeft = singleSetWidth;
        }
      }
      animationId = requestAnimationFrame(animate);
    };

    animationId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationId);
  }, [isDragging]);

  return (
    <div
      ref={containerRef}
      className="relative overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_10%,black_90%,transparent)] scrollbar-hide"
      style={{
        cursor: isDragging ? 'grabbing' : 'grab',
        overflow: 'hidden',
        WebkitOverflowScrolling: 'touch',
      }}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onScroll={handleScroll}
    >
      <div
        ref={trackRef}
        className="flex items-center gap-6 sm:gap-12 md:gap-20 w-max select-none"
        aria-hidden="true"
      >
        {allLogos.map((brand, i) => (
          <div
            key={`${brand.name}-${i}`}
            className={`flex-shrink-0 rounded-lg px-4 sm:px-6 py-2 sm:py-3 overflow-hidden border border-gold-500/30 hover:border-gold-500/60 hover:shadow-[0_0_14px_rgba(201,160,51,0.2)] hover:scale-105 transition-all duration-300 ${
              brand.solidBg
                ? 'bg-white/90 hover:bg-white'
                : 'bg-white/5 backdrop-blur-sm hover:bg-white/10'
            }`}
          >
            <Image
              src={brand.src}
              alt={brand.name}
              width={100}
              height={40}
              draggable={false}
              className={`h-5 sm:h-8 w-auto object-contain transition-opacity duration-300 pointer-events-none ${
                brand.solidBg
                  ? 'grayscale opacity-80 hover:opacity-100 hover:grayscale-0'
                  : 'opacity-70 hover:opacity-100'
              }`}
              style={brand.solidBg ? undefined : { filter: 'brightness(0) invert(1)' }}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
