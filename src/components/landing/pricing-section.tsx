import { getTranslations } from 'next-intl/server';
import Link from 'next/link';
import { richAccent } from './rich';

export async function PricingSection() {
  const t = await getTranslations('landing');

  const tiers = [
    {
      name: t('pricing.starter'),
      amount: '4',
      featured: false,
      features: [
        t('pricing.feature1filming'),
        t('pricing.featureEditing'),
        t('pricing.featureBrief'),
        t('pricing.featureRevision'),
      ],
    },
    {
      name: t('pricing.growth'),
      amount: '8',
      featured: true,
      features: [
        t('pricing.feature2filming'),
        t('pricing.featureEditing'),
        t('pricing.featureBrief'),
        t('pricing.featureDrone'),
      ],
    },
    {
      name: t('pricing.scale'),
      amount: '12+',
      featured: false,
      features: [
        t('pricing.feature2filming'),
        t('pricing.featureEditing'),
        t('services.featureStrategy'),
        t('pricing.featureDrone'),
      ],
    },
  ];

  return (
    <section className="section" id="pricing" aria-labelledby="pricing-heading">
      <div className="wrap">
        <div className="sec-head">
          <div className="meta">
            <span className="eyebrow">{t('pricing.label')}</span>
            <h2 id="pricing-heading" className="sec-title" data-l5-title>
              {t.rich('pricing.title', richAccent)}
            </h2>
          </div>
          <span className="secnum">08</span>
        </div>

        <p className="sec-lead" data-reveal>
          {t('pricing.description')}
        </p>

        <div className="price-grid">
          {tiers.map((tier) => (
            <div className={`price${tier.featured ? ' featured' : ''}`} key={tier.name} data-reveal>
              {tier.featured && <div className="pbadge">{t('pricing.mostPopular')}</div>}
              <div className="pname">{tier.name}</div>
              <div className="pamt">
                {tier.amount} <span className="gold">{t('pricing.videosMonth')}</span>
              </div>
              <ul>
                {tier.features.map((f) => (
                  <li key={f}>{f}</li>
                ))}
              </ul>
              <Link href="/book" className={`btn ${tier.featured ? 'btn-gold' : 'btn-line'}`}>
                {t('pricing.getQuote')}
              </Link>
            </div>
          ))}
        </div>

        <p className="price-note" data-reveal>
          {t('pricing.customNote')}
        </p>
      </div>
    </section>
  );
}
