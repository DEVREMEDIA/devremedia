import { getTranslations } from 'next-intl/server';
import { richAccent } from './rich';

export async function CaseStudiesSection() {
  const t = await getTranslations('landing');

  const studies = [
    { name: 'Μαύρη Θάλασσα', tag: t('work.mavriTag'), desc: t('work.mavriDesc') },
    { name: 'Technomat', tag: t('work.technomatTag'), desc: t('work.technomatDesc') },
    { name: 'Ophthalmica', tag: t('work.ophthalmicaTag'), desc: t('work.ophthalmicaDesc') },
  ];

  return (
    <section className="section" id="work" aria-labelledby="work-heading">
      <div className="wrap">
        <div className="sec-head">
          <div className="meta">
            <span className="eyebrow">{t('work.label')}</span>
            <h2 id="work-heading" className="sec-title" data-l5-title>
              {t.rich('work.title', richAccent)}
            </h2>
          </div>
          <span className="secnum">06</span>
        </div>

        <div className="case-grid">
          {studies.map((s, i) => (
            <article className="case" key={s.name} data-reveal>
              <div className="case-img">
                <span className="frame-label">Case · {String(i + 1).padStart(2, '0')}</span>
              </div>
              <div className="case-body">
                <span className="tag">{s.tag}</span>
                <h3>{s.name}</h3>
                <p>{s.desc}</p>
              </div>
            </article>
          ))}
        </div>

        <p className="price-note" data-reveal>
          {t('work.alsoWorking')}
        </p>
      </div>
    </section>
  );
}
