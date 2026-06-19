import { getTranslations } from 'next-intl/server';
import Image from 'next/image';
import { richAccent } from './rich';
import { PORTFOLIO_VIDEOS } from './constants';

const CATEGORIES = [
  'Event · 2025',
  'Corporate · 2025',
  'Social · 2025',
  'Event · 2025',
  'Brand · 2026',
  'Commercial · 2026',
];

export async function PortfolioSection() {
  const t = await getTranslations('landing');

  return (
    <section className="section" id="portfolio" aria-labelledby="portfolio-heading">
      <div className="wrap">
        <div className="sec-head">
          <div className="meta">
            <span className="eyebrow">{t('portfolio.label')}</span>
            <h2 id="portfolio-heading" className="sec-title" data-l5-title>
              {t.rich('portfolio.title', richAccent)}
            </h2>
          </div>
          <span className="secnum">04</span>
        </div>

        <p className="sec-lead" data-reveal>
          {t('portfolio.description')}
        </p>

        <div className="pf-grid">
          {PORTFOLIO_VIDEOS.map((video, i) => (
            <a
              key={video.id}
              className="pf-item"
              data-reveal
              href={`https://www.youtube.com/watch?v=${video.id}`}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`${t(`portfolio.${video.key}`)} — YouTube`}
            >
              <Image
                src={`https://img.youtube.com/vi/${video.id}/hqdefault.jpg`}
                alt=""
                fill
                sizes="(max-width: 900px) 100vw, 33vw"
                loading="lazy"
              />
              <span className="play" aria-hidden="true">
                ▶
              </span>
              <span className="cap">
                {t(`portfolio.${video.key}`)}
                <small>{CATEGORIES[i]}</small>
              </span>
            </a>
          ))}
        </div>

        <a
          className="pf-link"
          href="https://www.youtube.com/@DevreMedia"
          target="_blank"
          rel="noopener noreferrer"
        >
          {t('portfolio.watchOnYoutube')} →
        </a>
      </div>
    </section>
  );
}
