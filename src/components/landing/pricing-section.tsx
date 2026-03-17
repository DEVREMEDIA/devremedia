import { getTranslations } from 'next-intl/server';
import Link from 'next/link';
import { CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollReveal } from '@/components/shared/scroll-reveal';

export async function PricingSection() {
  const t = await getTranslations('landing');

  return (
    <section
      id="pricing"
      className="relative py-24 sm:py-32 md:py-40"
      aria-labelledby="pricing-heading"
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <ScrollReveal>
          <div className="text-center mb-12 sm:mb-16">
            <span className="text-gold-500 text-xs font-semibold tracking-[0.2em] uppercase">
              {t('pricing.label')}
            </span>
            <h2
              id="pricing-heading"
              className="mt-3 sm:mt-4 text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-black text-white leading-[1.05]"
            >
              {t('pricing.title')}
            </h2>
            <p className="mt-4 sm:mt-6 text-base sm:text-lg text-zinc-400 max-w-2xl mx-auto">
              {t('pricing.description')}
            </p>
          </div>
        </ScrollReveal>

        <ScrollReveal>
          <h3 className="text-lg sm:text-xl font-bold text-white mb-6 sm:mb-8 text-center">
            {t('pricing.socialLabel')}
          </h3>
        </ScrollReveal>

        {/* Social Media Plans */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5 max-w-6xl mx-auto mb-10 sm:mb-12">
          {/* Starter */}
          <ScrollReveal delay={0}>
            <div className="glass-card rounded-2xl p-8 sm:p-10 h-full">
              <h4 className="text-lg font-bold text-white mb-2">{t('pricing.starter')}</h4>
              <div className="mb-6 sm:mb-8">
                <span className="text-4xl sm:text-5xl font-black text-white">4</span>
                <span className="text-zinc-400 ml-1 text-sm">{t('pricing.videosMonth')}</span>
              </div>
              <ul className="space-y-3 sm:space-y-4 mb-8 sm:mb-10">
                {[
                  t('pricing.feature1filming'),
                  t('pricing.featureEditing'),
                  t('pricing.featureBrief'),
                  t('pricing.featureRevision'),
                ].map((feat, i) => (
                  <li key={i} className="flex items-start gap-2.5">
                    <CheckCircle2
                      className="h-4 w-4 text-gold-500 flex-shrink-0 mt-0.5"
                      aria-hidden="true"
                    />
                    <span className="text-zinc-400 text-sm">{feat}</span>
                  </li>
                ))}
              </ul>
              <Button
                asChild
                variant="outline"
                className="w-full border-white/10 text-zinc-300 hover:text-white hover:bg-white/5 h-12"
              >
                <Link href="/book">{t('pricing.getQuote')}</Link>
              </Button>
            </div>
          </ScrollReveal>

          {/* Growth (Featured) — gold gradient border + subtle gold bg tint */}
          <ScrollReveal delay={150}>
            <div className="relative glass-card rounded-2xl p-8 sm:p-10 h-full gold-accent-top bg-gold-500/[0.02] overflow-hidden">
              <h4 className="text-lg font-bold text-white mb-2">{t('pricing.growth')}</h4>
              <div className="mb-6 sm:mb-8">
                <span className="text-4xl sm:text-5xl font-black text-gold-500">8</span>
                <span className="text-zinc-400 ml-1 text-sm">{t('pricing.videosMonth')}</span>
              </div>
              <ul className="space-y-3 sm:space-y-4 mb-8 sm:mb-10">
                {[
                  t('pricing.feature2filming'),
                  t('pricing.featureEditing'),
                  t('pricing.featureBrief'),
                  t('pricing.featureRevision'),
                  t('pricing.featureDrone'),
                ].map((feat, i) => (
                  <li key={i} className="flex items-start gap-2.5">
                    <CheckCircle2
                      className="h-4 w-4 text-gold-500 flex-shrink-0 mt-0.5"
                      aria-hidden="true"
                    />
                    <span className="text-zinc-400 text-sm">{feat}</span>
                  </li>
                ))}
              </ul>
              <Button
                asChild
                className="w-full bg-gold-500 hover:bg-gold-400 text-black font-bold h-12"
              >
                <Link href="/book">{t('pricing.getQuote')}</Link>
              </Button>
            </div>
          </ScrollReveal>

          {/* Scale */}
          <ScrollReveal delay={300}>
            <div className="glass-card rounded-2xl p-8 sm:p-10 h-full">
              <h4 className="text-lg font-bold text-white mb-2">{t('pricing.scale')}</h4>
              <div className="mb-6 sm:mb-8">
                <span className="text-4xl sm:text-5xl font-black text-white">12</span>
                <span className="text-zinc-400 ml-1 text-sm">{t('pricing.videosMonth')}</span>
              </div>
              <ul className="space-y-3 sm:space-y-4 mb-8 sm:mb-10">
                {[
                  t('pricing.feature2filming'),
                  t('pricing.featureEditing'),
                  t('pricing.featureBrief'),
                  t('pricing.featureRevision'),
                  t('pricing.featureDrone'),
                  t('pricing.sameDayDelivery'),
                ].map((feat, i) => (
                  <li key={i} className="flex items-start gap-2.5">
                    <CheckCircle2
                      className="h-4 w-4 text-gold-500 flex-shrink-0 mt-0.5"
                      aria-hidden="true"
                    />
                    <span className="text-zinc-400 text-sm">{feat}</span>
                  </li>
                ))}
              </ul>
              <Button
                asChild
                variant="outline"
                className="w-full border-white/10 text-zinc-300 hover:text-white hover:bg-white/5 h-12"
              >
                <Link href="/book">{t('pricing.getQuote')}</Link>
              </Button>
            </div>
          </ScrollReveal>
        </div>

        {/* Podcast + Events */}
        <div className="grid sm:grid-cols-2 gap-4 sm:gap-5 max-w-4xl mx-auto">
          <ScrollReveal delay={0}>
            <div className="glass-card rounded-2xl p-8 sm:p-10">
              <h4 className="text-lg sm:text-xl font-bold text-white mb-2">
                {t('pricing.podcastLabel')}
              </h4>
              <div className="mb-4 sm:mb-5">
                <span className="text-2xl sm:text-3xl font-black text-white">4-8</span>
                <span className="text-zinc-400 ml-1 text-sm">{t('pricing.epMonth')}</span>
              </div>
              <p className="text-zinc-400 text-sm mb-6 sm:mb-8">{t('pricing.podcastDesc')}</p>
              <Button
                asChild
                variant="outline"
                className="w-full border-white/10 text-zinc-300 hover:text-white hover:bg-white/5 h-12"
              >
                <Link href="/book">{t('pricing.getQuote')}</Link>
              </Button>
            </div>
          </ScrollReveal>
          <ScrollReveal delay={150}>
            <div className="glass-card rounded-2xl p-8 sm:p-10">
              <h4 className="text-lg sm:text-xl font-bold text-white mb-2">
                {t('pricing.eventLabel')}
              </h4>
              <div className="mb-4 sm:mb-5">
                <span className="text-2xl sm:text-3xl font-black text-white">3-6</span>
                <span className="text-zinc-400 ml-1 text-sm">{t('pricing.videos')}</span>
              </div>
              <p className="text-zinc-400 text-sm mb-6 sm:mb-8">{t('pricing.eventDesc')}</p>
              <Button
                asChild
                variant="outline"
                className="w-full border-white/10 text-zinc-300 hover:text-white hover:bg-white/5 h-12"
              >
                <Link href="/book">{t('pricing.getQuote')}</Link>
              </Button>
            </div>
          </ScrollReveal>
        </div>

        <ScrollReveal>
          <p className="text-center text-zinc-400 mt-6 sm:mt-8 text-xs sm:text-sm max-w-2xl mx-auto">
            {t('pricing.customNote')}
          </p>
        </ScrollReveal>
      </div>
    </section>
  );
}
