import { getTranslations } from 'next-intl/server';
import Link from 'next/link';
import { richAccent } from './rich';

export async function CtaSection() {
  const t = await getTranslations('landing');

  return (
    <section className="cta" aria-labelledby="cta-heading">
      <div className="wrap">
        <div className="credits-roll" data-reveal>
          — Fin —
        </div>
        <span
          className="eyebrow"
          style={{ justifyContent: 'center', marginBottom: 30 }}
          data-reveal
        >
          Discovery Call
        </span>
        <h2 id="cta-heading" data-l5-title>
          {t('cta.title1')} {t.rich('cta.title2', richAccent)}
        </h2>
        <p data-reveal>{t('cta.description')}</p>
        <div data-reveal>
          <Link href="/book" className="btn btn-gold">
            {t('cta.button')}
          </Link>
        </div>
        <div className="loc" data-reveal>
          {t('cta.location')}
        </div>
      </div>
    </section>
  );
}
