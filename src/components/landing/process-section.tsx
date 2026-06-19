import { getTranslations } from 'next-intl/server';
import { ScrollReveal } from '@/components/shared/scroll-reveal';

export async function ProcessSection() {
  const t = await getTranslations('landing');

  const steps = [1, 2, 3, 4] as const;

  return (
    <section
      id="process"
      className="relative py-24 sm:py-32 md:py-40"
      aria-labelledby="process-heading"
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <ScrollReveal>
          <div className="text-center mb-14 sm:mb-20">
            <span className="text-gold-500 text-xs font-semibold tracking-[0.2em] uppercase">
              {t('process.label')}
            </span>
            <h2
              id="process-heading"
              className="mt-3 sm:mt-4 text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-black text-white leading-[1.05]"
            >
              {t('process.title')}
            </h2>
            <p className="mt-4 sm:mt-6 text-base sm:text-lg text-zinc-400 max-w-2xl mx-auto">
              {t('process.description')}
            </p>
          </div>
        </ScrollReveal>

        <div className="relative">
          {/* Connecting gold line (desktop only) */}
          <div
            data-process-line
            className="hidden lg:block absolute top-5 left-[12.5%] right-[12.5%] h-px bg-gradient-to-r from-gold-500/20 via-gold-500/30 to-gold-500/20 z-0"
            aria-hidden="true"
          />

          <ol className="relative grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 sm:gap-6 lg:gap-4">
            {steps.map((step, i) => (
              <ScrollReveal key={step} as="li" delay={i * 150} className="relative text-center">
                {/* Step circle */}
                <div className="relative z-10 mx-auto w-10 h-10 rounded-full bg-gold-500/10 border border-gold-500/30 flex items-center justify-center mb-4 sm:mb-5">
                  <span className="text-gold-500 font-bold text-sm">0{step}</span>
                </div>
                <h3 className="text-lg sm:text-xl font-bold text-white mb-2 sm:mb-3">
                  {t(`process.step${step}Title`)}
                </h3>
                <p className="text-zinc-400 leading-relaxed text-sm max-w-xs mx-auto">
                  {t(`process.step${step}Desc`)}
                </p>
              </ScrollReveal>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}
