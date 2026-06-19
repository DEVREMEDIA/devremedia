import { getTranslations } from 'next-intl/server';
import Link from 'next/link';
import { SOCIAL_LINKS } from './constants';

export async function LandingFooter() {
  const t = await getTranslations('landing');
  const year = 2026;

  const cols = [
    {
      heading: t('footer.servicesLabel'),
      links: [
        { label: t('services.socialTitle'), href: '#services' },
        { label: t('services.podcastTitle'), href: '#services' },
        { label: t('services.eventTitle'), href: '#services' },
        { label: t('services.corporateTitle'), href: '#services' },
      ],
    },
    {
      heading: t('footer.companyLabel'),
      links: [
        { label: t('footer.aboutUs'), href: '#about' },
        { label: t('footer.ourTeam'), href: '#team' },
        { label: t('footer.portfolio'), href: '#portfolio' },
        { label: t('nav.contact'), href: '#contact' },
      ],
    },
    {
      heading: t('footer.platformLabel'),
      links: [
        { label: t('nav.pricing'), href: '#pricing' },
        { label: t('process.label'), href: '#process' },
        { label: t('footer.caseStudies'), href: '#work' },
        { label: t('whyUs.label'), href: '#why' },
      ],
    },
    {
      heading: t('footer.connectLabel'),
      links: [
        { label: t('nav.login'), href: '/login' },
        { label: t('footer.createAccount'), href: '/login' },
        { label: t('footer.city'), href: '#contact' },
      ],
    },
  ];

  return (
    <footer className="l5-footer" role="contentinfo">
      <div className="wrap">
        <div className="foot-top">
          <div className="foot-brand">
            <Link href="/" className="logo" aria-label="Devre Media — Home">
              DEVRE<span>&nbsp;·</span>&nbsp;MEDIA
            </Link>
            <p>{t('footer.tagline')}</p>
          </div>
          {cols.map((col) => (
            <div className="foot-col" key={col.heading}>
              <h4>{col.heading}</h4>
              {col.links.map((l) => (
                <Link key={l.label} href={l.href}>
                  {l.label}
                </Link>
              ))}
            </div>
          ))}
        </div>

        <div className="foot-bot">
          <span>
            © {year} Devre Media. {t('footer.copyright')}
          </span>
          <div className="foot-socials">
            {SOCIAL_LINKS.map((s) => (
              <a key={s.platform} href={s.href} target="_blank" rel="noopener noreferrer">
                {s.label}
              </a>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
