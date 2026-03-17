import { getTranslations } from 'next-intl/server';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';

export async function HeroSection() {
  const t = await getTranslations('landing');

  return (
    <section
      className="relative h-screen min-h-[600px] sm:min-h-[700px] overflow-hidden film-grain"
      aria-label={t('hero.sectionLabel')}
    >
      {/* Background image */}
      <div className="absolute inset-0" aria-hidden="true">
        <Image
          src="/images/hero/home1.jpg"
          alt=""
          fill
          sizes="100vw"
          className="object-cover object-top hero-ken-burns"
          priority
        />
      </div>

      {/* Cinematic overlays — radial focus from center */}
      <div className="absolute inset-0 bg-zinc-950/70" aria-hidden="true" />
      <div
        className="absolute inset-0 bg-[radial-gradient(ellipse_60%_60%_at_50%_50%,transparent,rgba(9,9,11,0.6)_70%,rgba(9,9,11,0.9))]"
        aria-hidden="true"
      />
      <div
        className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-transparent to-zinc-950/40"
        aria-hidden="true"
      />

      {/* Single ambient orb — top-right */}
      <div
        className="hero-orb absolute -top-32 -right-32 w-[300px] sm:w-[500px] h-[300px] sm:h-[500px] rounded-full bg-gold-500/10 blur-[120px] pointer-events-none"
        aria-hidden="true"
      />

      {/* Content — center-aligned, vertically centered */}
      <div className="relative z-10 h-full flex flex-col items-center justify-center text-center px-4 sm:px-6">
        {/* Gold accent line above */}
        <div
          className="hero-line-expand h-px w-16 sm:w-24 bg-gradient-to-r from-transparent via-gold-500 to-transparent mb-8 sm:mb-12"
          aria-hidden="true"
          style={{ transformOrigin: 'center' }}
        />

        {/* Main headline */}
        <h1 className="hero-clip-reveal hero-text-glow-pulse" style={{ animationDelay: '0.6s' }}>
          <span className="block text-[clamp(2rem,7vw,8rem)] font-black text-white leading-[0.95] tracking-[-0.03em]">
            {t('hero.titleLine1')}
          </span>
          <span className="block text-[clamp(2rem,7vw,8rem)] font-black leading-[0.95] tracking-[-0.03em] text-shimmer">
            {t('hero.titleLine2')}
          </span>
        </h1>

        {/* Gold accent line below */}
        <div
          className="hero-line-expand mt-8 sm:mt-12 h-px w-16 sm:w-24 bg-gradient-to-r from-transparent via-gold-500 to-transparent"
          aria-hidden="true"
          style={{ transformOrigin: 'center', animationDelay: '1.4s' }}
        />

        {/* Description */}
        <div className="hero-content-reveal">
          <p className="mt-6 sm:mt-8 text-base sm:text-lg md:text-xl text-zinc-300 max-w-2xl mx-auto leading-relaxed font-light">
            {t('hero.description')}
          </p>

          {/* Single gold CTA */}
          <div className="mt-8 sm:mt-10">
            <Button
              asChild
              size="lg"
              className="bg-gold-500 hover:bg-gold-400 text-black font-bold text-base sm:text-lg px-10 py-6 h-auto shadow-[0_0_40px_rgba(201,160,51,0.25)] hover:shadow-[0_0_60px_rgba(201,160,51,0.35)] transition-all duration-300"
            >
              <Link href="/book">
                {t('hero.ctaPrimary')}
                <ArrowRight className="ml-2 h-4 w-4 sm:h-5 sm:w-5" aria-hidden="true" />
              </Link>
            </Button>
          </div>
        </div>
      </div>

      {/* Scroll indicator */}
      <div
        className="absolute bottom-6 sm:bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 sm:gap-3 animate-scroll-bounce z-10"
        aria-hidden="true"
      >
        <span className="text-zinc-400 text-[10px] tracking-[0.3em] uppercase">
          {t('hero.scrollDown')}
        </span>
        <ChevronDown className="h-4 w-4 text-zinc-400" />
      </div>

      {/* Bottom gradient fade */}
      <div
        className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-zinc-950 to-transparent z-[5]"
        aria-hidden="true"
      />
    </section>
  );
}
