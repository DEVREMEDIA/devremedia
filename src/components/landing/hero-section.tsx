import { getTranslations } from 'next-intl/server';
import Image from 'next/image';
import Link from 'next/link';
import { HeroCanvas } from './experience/hero-canvas';
import { richAccent } from './rich';

export async function HeroSection() {
  const t = await getTranslations('landing');

  return (
    <header className="hero" aria-label={t('hero.sectionLabel')}>
      <div className="wrap">
        <div className="hero-badge" data-reveal>
          <span className="eyebrow">{t('hero.badge')}</span>
        </div>

        <h1 data-l5-title>
          <span className="block">{t('hero.titleLine1')}</span>
          <span className="block">{t.rich('hero.titleLine2', richAccent)}</span>
        </h1>

        <div className="hero-grid">
          <div data-reveal>
            <p className="hero-desc">{t('hero.description')}</p>
            <div className="hero-actions">
              <Link href="/book" className="btn btn-gold">
                {t('hero.ctaPrimary')}
              </Link>
              <a
                href="https://www.youtube.com/@DevreMedia"
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-line"
              >
                {t('hero.ctaSecondary')}
              </a>
            </div>
          </div>

          <div className="hero-frame" data-reveal="scale">
            <Image
              src="/images/hero/home1.jpg"
              alt=""
              fill
              priority
              sizes="(max-width: 900px) 100vw, 35vw"
              className="frame-img"
            />
            <HeroCanvas src="/images/hero/home1.jpg" />
            <span className="play" aria-hidden="true">
              ▶
            </span>
            <span className="frame-label">Showreel — 2026</span>
          </div>
        </div>

        <div className="hero-foot" data-reveal>
          <span className="scroll-cue">
            <span className="dot" aria-hidden="true" />
            {t('hero.scrollDown')}
          </span>
          <span>{t('hero.trustedBy')}</span>
        </div>
      </div>
    </header>
  );
}
