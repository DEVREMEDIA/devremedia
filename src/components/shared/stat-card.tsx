import type { ReactNode } from 'react';
import Link from 'next/link';
import type { LucideIcon } from 'lucide-react';
import { DeltaBadge } from '@/components/shared/delta-badge';
import { Sparkline } from '@/components/shared/sparkline';
import { cn } from '@/lib/utils';
import type { Tone } from '@/lib/status-tone';

export interface StatCardProps {
  label: string;
  value: ReactNode;
  tone?: Tone;
  caption?: ReactNode;
  icon?: LucideIcon;
  href?: string;
  deltaPct?: number | null;
  invertDelta?: boolean;
  sparkline?: number[];
  exception?: boolean;
}

// Χωρίς τόνο ο αριθμός είναι απλός· με τόνο βάφεται. Το `neutral` ΔΕΝ είναι
// το ίδιο με «χωρίς τόνο» — είναι ρητά σβησμένος αριθμός (π.χ. μηδενικό
// πλήθος), και έτσι κρατιέται η σημερινή συμπεριφορά του ραντάρ κινδύνων.
const VALUE_TONE: Record<Tone, string> = {
  critical: 'text-tone-critical',
  caution: 'text-tone-caution',
  positive: 'text-tone-positive',
  neutral: 'text-tone-neutral',
};

const TILE = 'flex flex-col bg-card p-4';

/**
 * Ένας αριθμός, με τον ίδιο τρόπο παντού. Ό,τι χρειάστηκε κάποια από τις
 * παλιές παραλλαγές ζει εδώ ως επιλογή, ώστε καμία να μη χρειάζεται να μείνει.
 */
export function StatCard({
  label,
  value,
  tone,
  caption,
  icon: Icon,
  href,
  deltaPct,
  invertDelta,
  sparkline,
  exception,
}: StatCardProps) {
  const content = (
    <>
      <div className="flex items-start justify-between gap-2">
        <span className="font-mono text-[10px] leading-tight uppercase tracking-[0.14em] text-muted-foreground">
          {label}
        </span>
        <span className="flex shrink-0 items-center gap-1.5">
          {exception ? (
            <span className="h-2 w-2 rounded-full bg-tone-critical" aria-label="Exception" />
          ) : null}
          {Icon ? <Icon className="h-3.5 w-3.5 text-muted-foreground" aria-hidden /> : null}
        </span>
      </div>

      <div className="mt-2 flex items-baseline justify-between gap-2">
        <span
          data-slot="stat-card-value"
          className={cn(
            'font-display text-3xl leading-none tabular-nums',
            tone ? VALUE_TONE[tone] : 'text-foreground',
          )}
        >
          {value}
        </span>
        {deltaPct !== undefined ? (
          <DeltaBadge deltaPct={deltaPct} invertColors={invertDelta} />
        ) : null}
      </div>

      {caption ? (
        <p className="mt-1.5 text-[11px] leading-tight text-muted-foreground">{caption}</p>
      ) : null}

      {/* Ένας άδειος πίνακας κρατά τη θέση, ώστε πλακίδια με και χωρίς
          καμπύλη να μένουν στο ίδιο ύψος μέσα στην ίδια λωρίδα. */}
      {sparkline ? (
        <div className="mt-2">
          {sparkline.length > 0 ? <Sparkline data={sparkline} /> : <div className="h-8" />}
        </div>
      ) : null}
    </>
  );

  if (href) {
    return (
      <Link
        href={href}
        data-slot="stat-card"
        className={cn(
          TILE,
          'transition-colors hover:bg-accent',
          'focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset focus-visible:outline-none',
        )}
      >
        {content}
      </Link>
    );
  }

  return (
    <div data-slot="stat-card" className={TILE}>
      {content}
    </div>
  );
}
