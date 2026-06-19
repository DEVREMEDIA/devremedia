import { getTranslations } from 'next-intl/server';

export async function StatsSection() {
  const t = await getTranslations('landing');

  const stats = [
    { num: 200, suffix: '+', label: t('stats.projects') },
    { num: 50, suffix: '+', label: t('stats.brands') },
    { num: 24, suffix: 'h', label: t('stats.turnaround') },
    { num: 3, suffix: '+', label: t('stats.years') },
  ];

  return (
    <section
      className="section"
      style={{ padding: 0, borderBottom: 'none' }}
      aria-label={t('stats.sectionLabel')}
    >
      <div className="wrap">
        <div className="stats">
          {stats.map((s) => (
            <div className="stat" key={s.label} data-reveal>
              <div className="num" data-countup>
                {s.num}
                <span className="gold">{s.suffix}</span>
              </div>
              <div className="lbl">{s.label}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
