import { getTranslations } from 'next-intl/server';
import { richAccent } from './rich';

export async function ApproachSection() {
  const t = await getTranslations('landing');

  const cards = [
    { cn: 'α.', title: t('approach.card1Title'), desc: t('approach.card1Desc') },
    { cn: 'β.', title: t('approach.card2Title'), desc: t('approach.card2Desc') },
    { cn: 'γ.', title: t('approach.card3Title'), desc: t('approach.card3Desc') },
  ];

  return (
    <section className="section" id="approach" aria-labelledby="approach-heading">
      <div className="wrap">
        <div className="sec-head">
          <div className="meta">
            <span className="eyebrow">{t('approach.label')}</span>
            <h2 id="approach-heading" className="sec-title" data-l5-title>
              {t.rich('approach.title', richAccent)}
            </h2>
          </div>
          <span className="secnum">02</span>
        </div>

        <p className="sec-lead" data-reveal>
          {t('approach.description')}
        </p>

        <div className="appr-cards" data-reveal>
          {cards.map((c) => (
            <div className="appr-card" key={c.cn}>
              <div className="cn">{c.cn}</div>
              <h3>{c.title}</h3>
              <p>{c.desc}</p>
            </div>
          ))}
        </div>

        <div className="quote" data-reveal="scale">
          <span className="mark" aria-hidden="true">
            &ldquo;
          </span>
          <p>{t('approach.quote')}</p>
        </div>
      </div>
    </section>
  );
}
