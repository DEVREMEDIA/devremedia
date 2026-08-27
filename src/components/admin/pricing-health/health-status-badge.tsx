'use client';

import { cn } from '@/lib/utils';
import { useTranslations } from 'next-intl';
import type { PricingHealthStatus } from '@/types/index';
import type { Tone } from '@/lib/status-tone';

interface Props {
  status: PricingHealthStatus;
  className?: string;
}

// None of these five statuses appear in `TONE_RULES` (src/lib/status-tone.ts,
// owned by issue #128), so this maps straight to a tone instead of going
// through statusTone(). `healthy` and `premium` both land on `positive` —
// the tone system has no fifth "exceptional" bucket, and neither state needs
// the viewer to act, which is what the tone actually encodes.
const STATUS_TONE: Record<PricingHealthStatus, Tone> = {
  loss: 'critical',
  underpriced: 'caution',
  healthy: 'positive',
  premium: 'positive',
  unpriced: 'neutral',
};

const TONE_BADGE: Record<Tone, string> = {
  critical: 'bg-tone-critical-bg text-tone-critical border-tone-critical',
  caution: 'bg-tone-caution-bg text-tone-caution border-tone-caution',
  positive: 'bg-tone-positive-bg text-tone-positive border-tone-positive',
  neutral: 'bg-tone-neutral-bg text-tone-neutral border-tone-neutral',
};

const styles: Record<PricingHealthStatus, string> = {
  loss: TONE_BADGE[STATUS_TONE.loss],
  underpriced: TONE_BADGE[STATUS_TONE.underpriced],
  healthy: TONE_BADGE[STATUS_TONE.healthy],
  premium: TONE_BADGE[STATUS_TONE.premium],
  unpriced: TONE_BADGE[STATUS_TONE.unpriced],
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
