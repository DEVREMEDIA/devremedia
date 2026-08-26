import { ToneChip } from '@/components/shared/tone-chip';
import type { Tone } from '@/lib/status-tone';

type Props = { days: number; className?: string };

/**
 * Ζώνες ηλικίας πάνω στη ράμπα τόνων: κρίσιμο (≥30d) → προσοχή (≥14d) →
 * ουδέτερο. Πριν υπήρχαν τέσσερα ωμά χρώματα (red/orange/yellow/slate).
 *
 * Το `positive` λείπει επίτηδες: το σήμα κάθεται δίπλα σε στοιχείο που ήδη
 * βρίσκεται στο ραντάρ κινδύνου, οπότε ένα πράσινο πλακίδιο θα ανέτρεπε τον
 * λόγο που το στοιχείο είναι εκεί. Την πιο λεπτή διαβάθμιση που κουβαλούσε
 * η παλιά τετράχρωμη ράμπα την κουβαλάει τώρα ο ίδιος ο αριθμός των ημερών.
 */
function ageTone(days: number): Tone {
  if (days >= 30) return 'critical';
  if (days >= 14) return 'caution';
  return 'neutral';
}

export function AgeBadge({ days, className }: Props) {
  const label = days < 1 ? '<1d' : `${days}d`;
  return (
    <ToneChip tone={ageTone(days)} className={className}>
      {label}
    </ToneChip>
  );
}
