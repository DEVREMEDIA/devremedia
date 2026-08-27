import Link from 'next/link';
import { CinematicLogo } from '@/components/shared/cinematic-logo';
import { getTranslations } from 'next-intl/server';
import { LanguageSwitcher } from '@/components/shared/language-switcher';
import { PublicBookingForm } from '@/components/shared/public-booking-form';

export default async function PublicBookingPage() {
  const t = await getTranslations('publicBooking');

  return (
    <div className="min-h-screen bg-background text-foreground selection:bg-primary/20">
      {/* Minimal nav */}
      <nav className="border-b border-border bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex h-24 max-w-4xl items-center justify-between px-6">
          <Link href="/" className="flex items-center">
            <CinematicLogo className="h-16" priority />
          </Link>
          <LanguageSwitcher />
        </div>
      </nav>

      {/* Content */}
      <main className="mx-auto max-w-4xl px-6 py-12">
        <div className="mb-10 text-center">
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">{t('pageTitle')}</h1>
          <p className="mt-3 text-lg text-muted-foreground">{t('pageDescription')}</p>
        </div>

        <div className="rounded-2xl border border-border bg-card p-6 sm:p-10">
          <PublicBookingForm />
        </div>
      </main>
    </div>
  );
}
