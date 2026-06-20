import { getTranslations } from 'next-intl/server';
import { richAccent } from './rich';

export async function ServicesSection() {
  const t = await getTranslations('landing');

  const services = [
    {
      title: t('services.socialTitle'),
      desc: t('services.socialDesc'),
      tag: t('services.socialTag'),
    },
    {
      title: t('services.podcastTitle'),
      desc: t('services.podcastDesc'),
      tag: t('services.podcastTag'),
    },
    { title: t('services.eventTitle'), desc: t('services.eventDesc'), tag: t('services.eventTag') },
    {
      title: t('services.corporateTitle'),
      desc: t('services.corporateDesc'),
      tag: t('services.corporateTag'),
    },
    {
      title: t('services.graphicTitle'),
      desc: t('services.graphicDesc'),
      tag: t('services.graphicTag'),
    },
    { title: t('services.copyTitle'), desc: t('services.copyDesc'), tag: t('services.copyTag') },
  ];

  return (
    <section className="section chapter" id="services" aria-labelledby="services-heading">
      <div className="wrap">
        <div className="sec-head">
          <div className="meta">
            <span className="eyebrow">{t('services.label')}</span>
            <h2 id="services-heading" className="sec-title" data-l5-title>
              {t.rich('services.title', richAccent)}
            </h2>
          </div>
          <span className="secnum">03</span>
        </div>

        <div className="svc-list">
          {services.map((s, i) => (
            <div className="svc" key={s.title} data-reveal>
              <span className="num">{String(i + 1).padStart(2, '0')}</span>
              <h3>{s.title}</h3>
              <p className="desc">{s.desc}</p>
              <span className="tag">{s.tag}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
