import { getTranslations } from 'next-intl/server';
import { CLIENT_LOGOS } from './constants';
import { BrandsTicker } from './brands-ticker';

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

      <BrandsTicker logos={CLIENT_LOGOS} />

      {/* Screen reader list of clients */}
      <ul className="sr-only">
        {CLIENT_LOGOS.map((brand) => (
          <li key={brand.name}>{brand.name}</li>
        ))}
      </ul>
    </div>
  );
}
