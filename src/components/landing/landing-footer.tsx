import { getTranslations } from 'next-intl/server';
import Image from 'next/image';
import Link from 'next/link';
import { Instagram, Youtube, Linkedin } from 'lucide-react';
import { SOCIAL_LINKS } from './constants';

function getFooterSocialIcon(platform: string) {
  switch (platform) {
    case 'instagram':
      return <Instagram className="h-5 w-5" aria-hidden="true" />;
    case 'linkedin':
      return <Linkedin className="h-5 w-5" aria-hidden="true" />;
    case 'youtube':
      return <Youtube className="h-5 w-5" aria-hidden="true" />;
    default:
      return null;
  }
}

export async function LandingFooter() {
  const t = await getTranslations('landing');

  return (
    <footer className="relative pt-12 sm:pt-16 pb-8 sm:pb-12" role="contentinfo">
      {/* Gold gradient line at top instead of border */}
      <div
        className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-gold-500/20 to-transparent"
        aria-hidden="true"
      />

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-8 sm:gap-12 mb-10 sm:mb-12">
          {/* Brand */}
          <div className="sm:col-span-2 lg:col-span-2">
            <Link href="/" className="inline-block mb-4" aria-label="Devre Media - Home">
              <Image
                src="/images/Logo_Horizontal_Transparent.png"
                alt="Devre Media"
                width={120}
                height={32}
                className="h-6 w-auto"
              />
            </Link>
            <p className="text-zinc-400 text-sm mb-4 sm:mb-6 max-w-xs leading-relaxed">
              {t('footer.tagline')}
            </p>
            <div className="flex items-center gap-2">
              {SOCIAL_LINKS.map((social) => (
                <a
                  key={social.platform}
                  href={social.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-12 h-12 rounded-full glass-card inline-flex items-center justify-center text-zinc-400 hover:text-gold-500 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-500"
                  aria-label={`Devre Media on ${social.label}`}
                >
                  {getFooterSocialIcon(social.platform)}
                </a>
              ))}
            </div>
          </div>

          {/* Services */}
          <div>
            <h3 className="text-white text-sm font-bold mb-3 sm:mb-4">
              {t('footer.servicesLabel')}
            </h3>
            <ul className="space-y-0">
              <li>
                <Link
                  href="#services"
                  className="text-zinc-400 hover:text-gold-500 text-sm transition-colors min-h-[48px] inline-flex items-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-500 rounded-sm"
                >
                  {t('services.socialTitle')}
                </Link>
              </li>
              <li>
                <Link
                  href="#services"
                  className="text-zinc-400 hover:text-gold-500 text-sm transition-colors min-h-[48px] inline-flex items-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-500 rounded-sm"
                >
                  {t('services.podcastTitle')}
                </Link>
              </li>
              <li>
                <Link
                  href="#services"
                  className="text-zinc-400 hover:text-gold-500 text-sm transition-colors min-h-[48px] inline-flex items-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-500 rounded-sm"
                >
                  {t('services.eventTitle')}
                </Link>
              </li>
              <li>
                <Link
                  href="#services"
                  className="text-zinc-400 hover:text-gold-500 text-sm transition-colors min-h-[48px] inline-flex items-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-500 rounded-sm"
                >
                  {t('services.corporateTitle')}
                </Link>
              </li>
            </ul>
          </div>

          {/* Company */}
          <div>
            <h3 className="text-white text-sm font-bold mb-3 sm:mb-4">
              {t('footer.companyLabel')}
            </h3>
            <ul className="space-y-0">
              <li>
                <Link
                  href="#about"
                  className="text-zinc-400 hover:text-gold-500 text-sm transition-colors min-h-[48px] inline-flex items-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-500 rounded-sm"
                >
                  {t('footer.aboutUs')}
                </Link>
              </li>
              <li>
                <Link
                  href="#team"
                  className="text-zinc-400 hover:text-gold-500 text-sm transition-colors min-h-[48px] inline-flex items-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-500 rounded-sm"
                >
                  {t('footer.ourTeam')}
                </Link>
              </li>
              <li>
                <Link
                  href="#portfolio"
                  className="text-zinc-400 hover:text-gold-500 text-sm transition-colors min-h-[48px] inline-flex items-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-500 rounded-sm"
                >
                  {t('footer.portfolio')}
                </Link>
              </li>
              <li>
                <Link
                  href="#work"
                  className="text-zinc-400 hover:text-gold-500 text-sm transition-colors min-h-[48px] inline-flex items-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-500 rounded-sm"
                >
                  {t('footer.caseStudies')}
                </Link>
              </li>
            </ul>
          </div>

          {/* Platform */}
          <div>
            <h3 className="text-white text-sm font-bold mb-3 sm:mb-4">
              {t('footer.platformLabel')}
            </h3>
            <ul className="space-y-0">
              <li>
                <Link
                  href="/login"
                  className="text-zinc-400 hover:text-gold-500 text-sm transition-colors min-h-[48px] inline-flex items-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-500 rounded-sm"
                >
                  {t('nav.login')}
                </Link>
              </li>
              <li>
                <Link
                  href="/login"
                  className="text-zinc-400 hover:text-gold-500 text-sm transition-colors min-h-[48px] inline-flex items-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-500 rounded-sm"
                >
                  {t('footer.createAccount')}
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="pt-6 sm:pt-8 border-t border-white/[0.04] flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-4">
          <p className="text-zinc-400 text-xs">
            {t('footer.copyright')} {new Date().getFullYear()} Devre Media. {t('footer.city')}.
          </p>
          <div className="flex flex-wrap items-center justify-center sm:justify-end gap-x-4 gap-y-2 sm:gap-x-6">
            <span className="text-zinc-400 text-xs">{t('footer.impressum')}</span>
            <span className="text-zinc-400 text-xs">{t('footer.privacy')}</span>
            <a
              href="mailto:info@devremedia.com"
              className="text-zinc-400 hover:text-gold-500 text-xs transition-colors min-h-[48px] inline-flex items-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-500 rounded-sm"
            >
              {t('footer.emailAddress')}
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
