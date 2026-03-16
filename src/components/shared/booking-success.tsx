'use client';

import Link from 'next/link';
import { CheckCircle2 } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { Button } from '@/components/ui/button';

export function BookingSuccess() {
  const t = useTranslations('publicBooking');

  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      <CheckCircle2 className="h-16 w-16 text-amber-500 mb-6" />
      <h2 className="text-2xl font-bold text-white mb-2">{t('successTitle')}</h2>
      <p className="text-zinc-400 mb-8 max-w-md">{t('successDescription')}</p>
      <Button asChild className="bg-amber-500 hover:bg-amber-400 text-zinc-950">
        <Link href="/">{t('backToHome')}</Link>
      </Button>
    </div>
  );
}
