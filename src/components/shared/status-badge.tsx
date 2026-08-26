import { ToneChip } from '@/components/shared/tone-chip';
import { statusTone } from '@/lib/status-tone';

interface StatusBadgeProps {
  status: string;
  className?: string;
}

/**
 * Το κελί κατάστασης όλου του προϊόντος. Έως αυτή τη φέτα κουβαλούσε δικό του
 * λεξικό τριάντα χρωμάτων — φτιαγμένο για φωτεινό φόντο, χωρίς σκούρα έκδοση,
 * και χωρίς καμία σχέση με τον resolver που κρίνει τον τόνο παντού αλλού.
 * Τώρα ρωτά τον resolver, όπως κάθε άλλο σημείο.
 *
 * Το κείμενο παράγεται ακόμα από την ωμή τιμή της κατάστασης, άρα είναι
 * αγγλικό. Είναι πραγματικό πρόβλημα και ανήκει στη φέτα του κειμένου, όχι εδώ.
 */
export function StatusBadge({ status, className }: StatusBadgeProps) {
  const normalizedStatus = status.toLowerCase().replace(/\s+/g, '_');
  const displayText = status.replace(/_/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase());

  return (
    <ToneChip tone={statusTone(normalizedStatus)} className={className}>
      {displayText}
    </ToneChip>
  );
}
