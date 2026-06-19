'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { NAV_LINKS, SOCIAL_LINKS } from './constants';

/**
 * L5 full-screen overlay menu + animated toggle. React owns the open state so
 * it works with zero JS libs (clip-path + stagger are pure CSS); the experience
 * island layers GSAP polish on top when available. Renders the toggle (placed
 * in the nav) and the overlay itself as fixed siblings.
 */
export function LandingMenu() {
  const t = useTranslations('landing');
  const [open, setOpen] = useState(false);

  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [open]);

  return (
    <>
      <button
        type="button"
        className={`menu-toggle${open ? ' is-open' : ''}`}
        aria-expanded={open}
        aria-controls="l5-overlay-menu"
        aria-label={open ? t('nav.closeMenu') : t('nav.openMenu')}
        onClick={() => setOpen((v) => !v)}
      >
        <span className="bars" aria-hidden="true">
          <i />
          <i />
        </span>
        Menu
      </button>

      <div
        id="l5-overlay-menu"
        className={`overlay-menu${open ? ' open' : ''}`}
        aria-hidden={!open}
      >
        <div className="om-grain" aria-hidden="true" />
        <div className="wrap om-inner">
          <span className="eyebrow om-eyebrow">{t('nav.navigate')}</span>
          <ul className="om-list">
            {NAV_LINKS.map((link, i) => (
              <li key={link.href}>
                <a href={link.href} onClick={() => setOpen(false)}>
                  <span className="oi">{String(i + 1).padStart(2, '0')}</span>
                  {t(link.labelKey)}
                </a>
              </li>
            ))}
          </ul>
          <div className="om-foot">
            <a href="mailto:info@devremedia.com">info@devremedia.com</a>
            <span>{t('footer.city')}</span>
            {SOCIAL_LINKS.map((s) => (
              <a key={s.platform} href={s.href} target="_blank" rel="noopener noreferrer">
                {s.label}
              </a>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
