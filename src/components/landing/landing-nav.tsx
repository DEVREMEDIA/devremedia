import { getTranslations } from 'next-intl/server';
import Link from 'next/link';
import { LanguageSwitcher } from '@/components/shared/language-switcher';
import { LandingMenu } from './landing-menu';
import { NAV_LINKS } from './constants';

export async function LandingNav() {
  const t = await getTranslations('landing');

  return (
    <nav className="l5-nav" aria-label={t('nav.mainNavigation')}>
      <div className="wrap nav-inner">
        <Link href="/" className="logo" aria-label="Devre Media — Home">
          DEVRE<span>&nbsp;·</span>&nbsp;MEDIA
        </Link>

        <ul className="nav-links">
          {NAV_LINKS.map((link) => (
            <li key={link.href}>
              <a href={link.href}>{t(link.labelKey)}</a>
            </li>
          ))}
        </ul>

        <div className="nav-cta">
          <LanguageSwitcher />
          <Link href="/login" className="btn btn-ghost">
            {t('nav.login')}
          </Link>
          <Link href="/book" className="btn btn-gold">
            {t('nav.bookCall')}
          </Link>
          <LandingMenu />
        </div>
      </div>
    </nav>
  );
}
