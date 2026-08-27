'use client';

import { cn } from '@/lib/utils';
import { useTranslations } from 'next-intl';
import type { PricingHealthStatus } from '@/types/index';

// Δύο διαφορετικά πράγματα ζωγραφίζονται εδώ και δεν ακολουθούν τον ίδιο
// κανόνα:
//
//   • Η καρφίτσα είναι ΚΑΤΑΣΤΑΣΗ. Ακολουθεί ακριβώς το
//     health-status-badge.tsx δίπλα — `premium` και `healthy` πέφτουν και τα
//     δύο στο `positive`, γιατί ο τόνος κωδικοποιεί «χρειάζεται να κάνω
//     κάτι;» και καμία από τις δύο δεν το χρειάζεται. Δύο αρχεία που
//     κάθονται δίπλα-δίπλα δεν επιτρέπεται να δίνουν δύο απαντήσεις στο ίδιο
//     ερώτημα· αυτή η ασυμφωνία είναι το ίδιο το ελάττωμα που κλείνει η φέτα.
//
//   • Οι ζώνες είναι ΓΕΩΓΡΑΦΙΑ της κλίμακας, όχι κατάσταση. Το σύνορο στο
//     `max` φαίνεται από το σκαλοπάτι διαφάνειας (40% → 60%) στον ίδιο τόνο,
//     όχι από δεύτερη απόχρωση. Ο χρυσός (`primary`) σημαίνει «πατιέται» σε
//     όλο το προϊόν — μια ζώνη δεν πατιέται, οπότε δεν τον παίρνει.
//
// Καμία από τις πέντε καταστάσεις δεν έχει εγγραφή στο `TONE_RULES`
// (status-tone.ts, το κατέχει το #128)· η αντιστοίχιση γίνεται απευθείας σε
// tokens αντί να προστεθεί κανόνας εκεί.

interface Props {
  cost: number;
  min: number;
  target: number;
  max: number;
  quoted: number | null;
  status: PricingHealthStatus;
  compact?: boolean;
}

function fmt(n: number) {
  return new Intl.NumberFormat('el-GR', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 0,
  }).format(n);
}

/**
 * Bullet-style price range visualization.
 *
 * Horizontal scale anchored on `cost` (left) and `max * 1.25` (right)
 * so the cost → max range always fits with headroom for premium pricing.
 * Four toned bands: critical (< cost), caution (cost → min), positive
 * (min → max), positive at greater depth (> max). The quoted price is a
 * vertical pin, toned by status exactly as the badge beside it tones it.
 */
export function PriceRangeBar({ cost, min, target, max, quoted, status, compact = false }: Props) {
  const t = useTranslations('pricingHealth.chart');
  const scaleMax = Math.max(max * 1.25, quoted ?? 0, 1);
  const pct = (v: number) => Math.min(100, Math.max(0, (v / scaleMax) * 100));

  const costPct = pct(cost);
  const minPct = pct(min);
  const targetPct = pct(target);
  const maxPct = pct(max);
  const quotedPct = quoted != null ? pct(quoted) : null;

  const pinColor: Record<PricingHealthStatus, string> = {
    loss: 'bg-tone-critical border-tone-critical/30',
    underpriced: 'bg-tone-caution border-tone-caution/30',
    healthy: 'bg-tone-positive border-tone-positive/30',
    premium: 'bg-tone-positive border-tone-positive/30',
    unpriced: 'bg-tone-neutral border-tone-neutral/30',
  };

  return (
    <div className={cn('w-full', compact ? 'py-1' : 'py-2')}>
      {/* Track */}
      <div className="relative h-3 rounded-full bg-secondary overflow-hidden">
        {/* Loss zone: 0 → cost (critical tint) */}
        <div
          className="absolute inset-y-0 left-0 bg-tone-critical/25"
          style={{ width: `${costPct}%` }}
        />
        {/* Below-min zone: cost → min (caution tint) */}
        <div
          className="absolute inset-y-0 bg-tone-caution/30"
          style={{ left: `${costPct}%`, width: `${Math.max(0, minPct - costPct)}%` }}
        />
        {/* Healthy zone: min → max (positive tint) */}
        <div
          className="absolute inset-y-0 bg-tone-positive/40"
          style={{ left: `${minPct}%`, width: `${Math.max(0, maxPct - minPct)}%` }}
        />
        {/* Premium zone: max → scaleMax (deeper positive — the step from 40% to
            60% is what marks the boundary at `max`, not a second hue) */}
        <div
          className="absolute inset-y-0 bg-tone-positive/60"
          style={{ left: `${maxPct}%`, right: 0 }}
        />

        {/* Ticks */}
        <Tick pct={costPct} label={t('costLabel')} />
        <Tick pct={targetPct} label={t('targetLabel')} emphasized />

        {/* Quoted pin */}
        {quotedPct != null && (
          <div
            className={cn(
              'absolute top-[-3px] bottom-[-3px] w-[3px] rounded-full border shadow-md',
              pinColor[status],
            )}
            style={{ left: `calc(${quotedPct}% - 1.5px)` }}
            aria-label={t('quotedPriceLabel')}
          />
        )}
      </div>

      {!compact && (
        <div className="mt-2 flex justify-between text-[11px] tabular-nums text-muted-foreground">
          <span>{fmt(cost)}</span>
          <span>{fmt(min)}</span>
          <span className="font-medium text-foreground">{fmt(target)}</span>
          <span>{fmt(max)}</span>
        </div>
      )}
    </div>
  );
}

function Tick({ pct, label, emphasized }: { pct: number; label: string; emphasized?: boolean }) {
  return (
    <div
      className={cn(
        'absolute top-0 bottom-0 w-px',
        emphasized ? 'bg-foreground/80' : 'bg-foreground/30',
      )}
      style={{ left: `${pct}%` }}
      aria-label={label}
    />
  );
}
