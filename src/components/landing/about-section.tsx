import { getTranslations } from 'next-intl/server';
import Image from 'next/image';
import { richAccent } from './rich';

export async function AboutSection() {
  const t = await getTranslations('landing');

  const highlights = [
    { n: 'i.', title: t('about.highlight1Title'), desc: t('about.highlight1Desc') },
    { n: 'ii.', title: t('about.highlight2Title'), desc: t('about.highlight2Desc') },
    { n: 'iii.', title: t('about.highlight3Title'), desc: t('about.highlight3Desc') },
  ];

  return (
    <section className="section chapter" id="about" aria-labelledby="about-heading">
      <div className="wrap">
        <div className="sec-head">
          <div className="meta">
            <span className="eyebrow">{t('about.label')}</span>
            <h2 id="about-heading" className="sec-title" data-l5-title>
              {t.rich('about.title', richAccent)}
            </h2>
          </div>
          <span className="secnum">01</span>
        </div>

        <div className="about-grid">
          <div data-reveal>
            <p className="about-lead">{t('about.description')}</p>
            <div className="about-cols">
              <p>{t('about.text1')}</p>
              <p>{t('about.text2')}</p>
            </div>
            <div className="highlights">
              {highlights.map((h) => (
                <div className="hl" key={h.n}>
                  <span className="n">{h.n}</span>
                  <span className="t">{h.title}</span>
                  <span className="d">{h.desc}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="about-frame" data-reveal="scale">
            <Image
              src="/images/hero/home2.jpg"
              alt={t('about.imageAlt')}
              fill
              sizes="(max-width: 900px) 100vw, 40vw"
            />
            <span className="frame-label">On Set — Thessaloniki</span>
          </div>
        </div>
      </div>
    </section>
  );
}
