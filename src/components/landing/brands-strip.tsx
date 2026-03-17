import { getTranslations } from 'next-intl/server';
import Image from 'next/image';
import { CLIENT_LOGOS } from './constants';

export async function BrandsStrip() {
  const t = await getTranslations('landing');

  return (
    <div className="relative py-10 sm:py-14" role="region" aria-label={t('hero.trustedBy')}>
      {/* Top gold gradient line */}
      <div
        className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-gold-500/20 to-transparent"
        aria-hidden="true"
      />
      {/* Bottom gold gradient line */}
      <div
        className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-gold-500/20 to-transparent"
        aria-hidden="true"
      />

      <p className="text-center text-zinc-400 text-xs tracking-[0.3em] uppercase mb-6 sm:mb-8">
        {t('hero.trustedBy')}
      </p>
      <div className="relative overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_10%,black_90%,transparent)]">
        <div
          className="flex items-center gap-12 sm:gap-20 animate-[marquee_50s_linear_infinite]"
          aria-hidden="true"
        >
          {[...CLIENT_LOGOS, ...CLIENT_LOGOS].map((brand, i) => (
            <div
              key={`${brand.name}-${i}`}
              className="flex-shrink-0 bg-white/5 border border-gold-500/30 rounded-lg px-6 py-3 backdrop-blur-sm hover:bg-white/10 hover:border-gold-500/60 hover:shadow-[0_0_12px_rgba(201,160,51,0.25)] hover:scale-105 transition-all duration-300"
            >
              <Image
                src={brand.src}
                alt={brand.name}
                width={100}
                height={40}
                className="h-6 sm:h-8 w-auto object-contain opacity-60 hover:opacity-100 transition-opacity duration-300"
              />
            </div>
          ))}
        </div>
      </div>
      {/* Screen reader list of clients */}
      <ul className="sr-only">
        {CLIENT_LOGOS.map((brand) => (
          <li key={brand.name}>{brand.name}</li>
        ))}
      </ul>
    </div>
  );
}
