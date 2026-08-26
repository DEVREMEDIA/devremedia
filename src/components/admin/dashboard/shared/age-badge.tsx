import { ToneChip } from '@/components/shared/tone-chip';
import type { Tone } from '@/lib/status-tone';

type Props = { days: number; className?: string };

/**
 * Τέσσερις ζώνες ηλικίας πάνω στη ράμπα τόνων: πρόσφατο (positive) →
 * ήπια εκκρεμότητα (neutral) → προσοχή (caution, ≥14d) → κρίσιμο (critical, ≥30d).
 * Πριν αυτό υπήρχαν τέσσερις ζώνες με ωμά χρώματα (red/orange/yellow/slate);
 * εδώ η ίδια διαβάθμιση εκφράζεται μόνο με τα tokens της ράμπας.
 */
function ageTone(days: number): Tone {
  if (days >= 30) return 'critical';
  if (days >= 14) return 'caution';
  if (days >= 7) return 'neutral';
  return 'positive';
}

export function AgeBadge({ days, className }: Props) {
  const label = days < 1 ? '<1d' : `${days}d`;
  return (
    <ToneChip tone={ageTone(days)} className={className}>
      {label}
    </ToneChip>
  );
}
