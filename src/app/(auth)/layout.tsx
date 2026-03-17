import Image from 'next/image';
import Link from 'next/link';
import { getTranslations } from 'next-intl/server';

export default async function AuthLayout({ children }: { children: React.ReactNode }) {
  const t = await getTranslations('auth');
  const tc = await getTranslations('common');
  return (
    <div className="flex min-h-screen">
      {/* Brand Panel - Left (hidden on mobile) */}
      <div className="hidden lg:flex lg:w-1/2 relative bg-zinc-900 text-white flex-col items-center justify-center p-12">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_-10%,rgba(245,158,11,0.15),transparent)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_50%_50%_at_80%_80%,rgba(120,53,15,0.1),transparent)]" />

        <div className="relative z-10 flex flex-col items-center text-center max-w-md">
          <Image
            src="/images/Logo_Horizontal_Transparent.png"
            alt="Devre Media"
            width={240}
            height={60}
            className="h-12 w-auto mb-10"
            priority
          />
          <h2 className="text-3xl font-bold tracking-tight mb-4">{t('brandTagline')}</h2>
          <p className="text-zinc-400 text-lg leading-relaxed">{t('brandDescription')}</p>
          <div className="mt-12 flex items-center gap-3 text-zinc-500 text-sm">
            <span
              className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse"
              aria-hidden="true"
            />
            <span>{t('trustedBy')}</span>
          </div>
        </div>
      </div>

      {/* Form Panel - Right */}
      <div className="relative flex flex-1 items-center justify-center bg-stone-50 dark:bg-zinc-950 p-4 sm:p-8">
        <div className="w-full max-w-md space-y-6">
          {/* Logo (mobile only) */}
          <div className="text-center lg:hidden">
            <Link href="/" className="inline-block mb-2">
              <Image
                src="/images/Logo_Horizontal_Transparent.png"
                alt="Devre Media"
                width={200}
                height={50}
                className="h-10 w-auto invert dark:invert-0"
                priority
              />
            </Link>
            <p className="text-sm text-muted-foreground">{t('tagline')}</p>
          </div>
          {children}
        </div>
      </div>
    </div>
  );
}
