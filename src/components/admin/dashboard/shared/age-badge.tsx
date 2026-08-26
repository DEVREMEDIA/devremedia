import { ToneChip } from '@/components/shared/tone-chip';
import type { Tone } from '@/lib/status-tone';

type Props = { days: number; className?: string };

/**
 * Ζώνες ηλικίας πάνω στη ράμπα τόνων: κρίσιμο (≥30d) → προσοχή (≥7d) → ουδέτερο.
 * Πριν υπήρχαν τέσσερα ωμά χρώματα (red ≥30 / orange ≥14 / yellow ≥7 / slate).
 *
 * Δύο συνειδητές απώλειες, και οι δύο υπέρ της ειλικρίνειας του σήματος:
 * το `positive` λείπει επειδή το πλακίδιο κάθεται δίπλα σε στοιχείο που ήδη
 * βρίσκεται στο ραντάρ κινδύνου — ένα πράσινο σήμα θα ανέτρεπε τον λόγο που
 * το στοιχείο είναι εκεί· και τα δύο επίπεδα προειδοποίησης (orange/yellow)
 * γίνονται ένα, γιατί η ράμπα έχει έναν τόνο προσοχής. Το κατώφλι μένει στις
 * 7 ημέρες, όπου ξεκινούσε και πριν η προειδοποίηση, ώστε να μην υποβαθμιστεί
 * σιωπηλά ό,τι έχει 7-13 ημέρες. Τη λεπτότερη διαβάθμιση την κουβαλάει πλέον
 * ο ίδιος ο αριθμός των ημερών, που τυπώνεται πάντα.
 */
function ageTone(days: number): Tone {
  if (days >= 30) return 'critical';
  if (days >= 7) return 'caution';
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
