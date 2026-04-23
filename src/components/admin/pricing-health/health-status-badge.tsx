'use client';

import { cn } from '@/lib/utils';
import { useTranslations } from 'next-intl';
import type { PricingHealthStatus } from '@/types/index';

interface Props {
  status: PricingHealthStatus;
  className?: string;
}

const styles: Record<PricingHealthStatus, string> = {
  loss: 'bg-red-500/15 text-red-400 border-red-500/30',
  underpriced: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
  healthy: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
  premium: 'bg-sky-500/15 text-sky-400 border-sky-500/30',
  unpriced: 'bg-zinc-500/15 text-zinc-400 border-zinc-500/30',
};

export function HealthStatusBadge({ status, className }: Props) {
  const t = useTranslations('pricingHealth.status');
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium whitespace-nowrap',
        styles[status],
        className,
      )}
    >
      {t(status)}
    </span>
  );
}
