import { getTranslations } from 'next-intl/server';
import { richAccent } from './rich';

export async function WhyUsSection() {
  const t = await getTranslations('landing');

  const items = [
    { title: t('whyUs.cinematicTitle'), desc: t('whyUs.cinematicDesc') },
    { title: t('whyUs.speedTitle'), desc: t('whyUs.speedDesc') },
    { title: t('whyUs.partnershipTitle'), desc: t('whyUs.partnershipDesc') },
    { title: t('whyUs.termsTitle'), desc: t('whyUs.termsDesc') },
    { title: t('whyUs.strategyTitle'), desc: t('whyUs.strategyDesc') },
    { title: t('whyUs.droneTitle'), desc: t('whyUs.droneDesc') },
  ];

  return (
    <section className="section" id="why" aria-labelledby="whyus-heading">
      <div className="wrap">
        <div className="sec-head">
          <div className="meta">
            <span className="eyebrow">{t('whyUs.label')}</span>
            <h2 id="whyus-heading" className="sec-title" data-l5-title>
              {t.rich('whyUs.title', richAccent)}
            </h2>
          </div>
          <span className="secnum">09</span>
        </div>

        <p className="sec-lead" data-reveal>
          {t('whyUs.description')}
        </p>

        <div className="why-grid">
          {items.map((item, i) => (
            <div className="why" key={item.title} data-reveal>
              <div className="wn">{String(i + 1).padStart(2, '0')}</div>
              <h3>{item.title}</h3>
              <p>{item.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
