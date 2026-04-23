'use client';

import { cn } from '@/lib/utils';
import type { PricingHealthStatus } from '@/types/index';

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
 * Three colored bands: red (< min), green (min→max), blue (> max).
 * The quoted price is a vertical pin.
 */
export function PriceRangeBar({ cost, min, target, max, quoted, status, compact = false }: Props) {
  const scaleMax = Math.max(max * 1.25, quoted ?? 0, 1);
  const pct = (v: number) => Math.min(100, Math.max(0, (v / scaleMax) * 100));

  const costPct = pct(cost);
  const minPct = pct(min);
  const targetPct = pct(target);
  const maxPct = pct(max);
  const quotedPct = quoted != null ? pct(quoted) : null;

  const pinColor: Record<PricingHealthStatus, string> = {
    loss: 'bg-red-500 border-red-200',
    underpriced: 'bg-amber-500 border-amber-100',
    healthy: 'bg-emerald-500 border-emerald-100',
    premium: 'bg-sky-500 border-sky-100',
    unpriced: 'bg-zinc-500 border-zinc-300',
  };

  return (
    <div className={cn('w-full', compact ? 'py-1' : 'py-2')}>
      {/* Track */}
      <div className="relative h-3 rounded-full bg-zinc-800 overflow-hidden">
        {/* Loss zone: 0 → cost (red tint) */}
        <div className="absolute inset-y-0 left-0 bg-red-500/25" style={{ width: `${costPct}%` }} />
        {/* Below-min zone: cost → min (amber tint) */}
        <div
          className="absolute inset-y-0 bg-amber-500/30"
          style={{ left: `${costPct}%`, width: `${Math.max(0, minPct - costPct)}%` }}
        />
        {/* Healthy zone: min → max (emerald) */}
        <div
          className="absolute inset-y-0 bg-emerald-500/40"
          style={{ left: `${minPct}%`, width: `${Math.max(0, maxPct - minPct)}%` }}
        />
        {/* Premium zone: max → scaleMax (sky tint) */}
        <div
          className="absolute inset-y-0 bg-sky-500/25"
          style={{ left: `${maxPct}%`, right: 0 }}
        />

        {/* Ticks */}
        <Tick pct={costPct} label="Cost" />
        <Tick pct={targetPct} label="Target" emphasized />

        {/* Quoted pin */}
        {quotedPct != null && (
          <div
            className={cn(
              'absolute top-[-3px] bottom-[-3px] w-[3px] rounded-full border shadow-md',
              pinColor[status],
            )}
            style={{ left: `calc(${quotedPct}% - 1.5px)` }}
            aria-label="Quoted price"
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
