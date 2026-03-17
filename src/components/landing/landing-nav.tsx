import { getTranslations } from 'next-intl/server';
import Link from 'next/link';
import { CinematicLogo } from '@/components/shared/cinematic-logo';
import { ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { LandingMobileNav } from '@/components/shared/landing-mobile-nav';
import { LanguageSwitcher } from '@/components/shared/language-switcher';
import { NAV_LINKS } from './constants';

export async function LandingNav() {
  const t = await getTranslations('landing');

  return (
    <nav
      className="fixed top-0 left-0 right-0 z-50 bg-zinc-950/80 backdrop-blur-xl after:absolute after:bottom-0 after:left-0 after:right-0 after:h-px after:bg-gradient-to-r after:from-transparent after:via-gold-500/20 after:to-transparent"
      aria-label={t('nav.mainNavigation')}
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-24 sm:h-28">
          <Link
            href="/"
            className="flex items-center gap-2 sm:gap-3 hover:opacity-80 transition-opacity"
            aria-label="Devre Media - Home"
          >
            <CinematicLogo className="h-18" priority />
          </Link>

          <div className="hidden lg:flex items-center gap-6 xl:gap-10">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-[13px] text-zinc-400 hover:text-white transition-colors font-medium min-h-[48px] inline-flex items-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-500 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950 rounded-sm"
              >
                {t(link.labelKey)}
              </Link>
            ))}
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <LanguageSwitcher />
            <Button
              asChild
              variant="ghost"
              size="sm"
              className="hidden lg:inline-flex text-zinc-400 hover:text-white hover:bg-white/5 text-[13px] h-12"
            >
              <Link href="/login">{t('nav.clientPortal')}</Link>
            </Button>
            <Button
              asChild
              size="sm"
              className="hidden lg:inline-flex bg-gold-500 hover:bg-gold-400 text-black font-semibold text-[13px] h-12"
            >
              <Link href="/book">
                {t('nav.bookCall')}
                <ArrowRight className="ml-1.5 h-3.5 w-3.5" aria-hidden="true" />
              </Link>
            </Button>
            <div className="lg:hidden">
              <LandingMobileNav />
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
}
