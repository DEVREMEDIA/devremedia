import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { CinematicLogo } from '@/components/shared/cinematic-logo';

export default async function AuthLayout({ children }: { children: React.ReactNode }) {
  const t = await getTranslations('auth');
  const tc = await getTranslations('common');
  return (
    <div className="flex min-h-screen">
      {/* Brand Panel - Left (hidden on mobile). Forced into the dark edition's
          token scope: this panel is the identity's cover page and stays on the
          native dark ground regardless of the visitor's light/dark preference,
          same as the original always-dark zinc-900 it replaces. */}
      <div className="dark hidden lg:flex lg:w-1/2 relative bg-background text-foreground flex-col items-center justify-center p-12">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_-10%,color-mix(in_oklab,var(--primary)_15%,transparent),transparent)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_50%_50%_at_80%_80%,color-mix(in_oklab,var(--primary)_10%,transparent),transparent)]" />

        <div className="relative z-10 flex flex-col items-center text-center max-w-md">
          <div className="mb-10">
            <CinematicLogo className="h-24" priority />
          </div>
          <h2 className="text-3xl font-bold tracking-tight mb-4">{t('brandTagline')}</h2>
          <p className="text-muted-foreground text-lg leading-relaxed">{t('brandDescription')}</p>
          <div className="mt-12 flex items-center gap-3 text-muted-foreground text-sm">
            <span
              className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse"
              aria-hidden="true"
            />
            <span>{t('trustedBy')}</span>
          </div>
        </div>
      </div>

      {/* Form Panel - Right */}
      <div className="relative flex flex-1 items-center justify-center bg-background p-4 sm:p-8">
        <div className="w-full max-w-md space-y-6">
          {/* Logo (mobile only) */}
          <div className="text-center lg:hidden">
            <Link href="/" className="inline-block mb-2">
              <CinematicLogo className="h-20" invert priority />
            </Link>
            <p className="text-sm text-muted-foreground">{t('tagline')}</p>
          </div>
          {children}
        </div>
      </div>
    </div>
  );
}
