import { getTranslations } from 'next-intl/server';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollReveal } from '@/components/shared/scroll-reveal';

export async function CtaSection() {
  const t = await getTranslations('landing');

  return (
    <section
      className="relative py-24 sm:py-32 md:py-40 overflow-hidden"
      aria-labelledby="cta-heading"
    >
      {/* Pure radial gold gradient — no background image */}
      <div
        className="absolute inset-0 bg-[radial-gradient(ellipse_60%_50%_at_50%_50%,rgba(201,160,51,0.08),transparent)]"
        aria-hidden="true"
      />

      <div className="relative z-10 mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 text-center">
        <ScrollReveal>
          <h2
            id="cta-heading"
            className="text-3xl sm:text-4xl md:text-6xl lg:text-7xl font-black text-white leading-[1.05] mb-4 sm:mb-6"
          >
            {t('cta.title1')} <span className="text-gold-500">{t('cta.title2')}</span>
          </h2>
        </ScrollReveal>

        <ScrollReveal delay={200}>
          <p className="text-base sm:text-lg text-zinc-400 mb-8 sm:mb-10 max-w-2xl mx-auto">
            {t('cta.description')}
          </p>
        </ScrollReveal>

        <ScrollReveal delay={400}>
          <Button
            asChild
            size="lg"
            className="bg-gold-500 hover:bg-gold-400 text-black font-bold text-base sm:text-lg px-8 sm:px-10 py-6 sm:py-7 h-auto shadow-[0_0_60px_rgba(201,160,51,0.25)] animate-glow-pulse"
          >
            <Link href="/book">
              {t('cta.button')}
              <ArrowRight className="ml-2 h-5 w-5" aria-hidden="true" />
            </Link>
          </Button>
        </ScrollReveal>

        <ScrollReveal delay={500}>
          <p className="text-zinc-400 mt-6 sm:mt-8 text-xs sm:text-sm">{t('cta.location')}</p>
        </ScrollReveal>
      </div>
    </section>
  );
}
