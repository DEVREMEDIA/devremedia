import { getTranslations } from 'next-intl/server';
import { richAccent } from './rich';

export async function ProcessSection() {
  const t = await getTranslations('landing');
  const steps = [1, 2, 3, 4] as const;

  return (
    <section className="section chapter" id="process" aria-labelledby="process-heading">
      <div className="wrap">
        <div className="sec-head">
          <div className="meta">
            <span className="eyebrow">{t('process.label')}</span>
            <h2 id="process-heading" className="sec-title" data-l5-title>
              {t.rich('process.title', richAccent)}
            </h2>
          </div>
          <span className="secnum">05</span>
        </div>

        <p className="sec-lead" data-reveal>
          {t('process.description')}
        </p>
      </div>

      {/* Static grid — the experience island upgrades this to a pinned
          horizontal scroller on capable desktops by reading these cells. */}
      <div className="wrap" data-proc-mount>
        <div className="proc-grid" data-proc-grid data-reveal>
          {steps.map((step) => (
            <div className="proc-cell" key={step}>
              <div className="pn">{String(step).padStart(2, '0')}</div>
              <h3>{t(`process.step${step}Title`)}</h3>
              <p>{t(`process.step${step}Desc`)}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
