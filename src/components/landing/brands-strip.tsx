import { getTranslations } from 'next-intl/server';
import { CLIENT_LOGOS } from './constants';

export async function BrandsStrip() {
  const t = await getTranslations('landing');
  const names = CLIENT_LOGOS.map((c) => c.name);

  return (
    <section className="brands" aria-label={t('hero.trustedBy')}>
      <div className="wrap">
        <p className="brands-label">{t('hero.trustedBy')}</p>
      </div>
      <div className="brands-marquee">
        <div className="brands-track" data-marquee>
          {names.map((name, i) => (
            <span className="brand-chip" key={`a-${i}`}>
              {name}
            </span>
          ))}
          {names.map((name, i) => (
            <span className="brand-chip" key={`b-${i}`} aria-hidden="true">
              {name}
            </span>
          ))}
        </div>
      </div>
      <ul className="sr-only">
        {names.map((name) => (
          <li key={name}>{name}</li>
        ))}
      </ul>
    </section>
  );
}
