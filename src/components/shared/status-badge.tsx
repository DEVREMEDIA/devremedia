'use client';

import { useMessages } from 'next-intl';
import { ToneChip } from '@/components/shared/tone-chip';
import { statusTone } from '@/lib/status-tone';

interface StatusBadgeProps {
  status: string;
  className?: string;
}

// Ό,τι δεν βρεθεί πουθενά στον κατάλογο ξαναγίνεται όπως ήταν πάντα: ωραιοποιημένη
// ωμή τιμή. Μια κατάσταση που πρόσθεσε ένας διαχειριστής χωρίς μετάφραση πρέπει να
// παραμείνει αναγνώσιμη — ποτέ σφάλμα λείπουσας μετάφρασης, ποτέ κενό chip.
function prettify(status: string): string {
  return status.replace(/_/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase());
}

// Οι μεταφράσεις ζουν σε δεκαέξι namespaces κάτω από `statuses.*`
// (`statuses.projectStatus.review`, `statuses.taskStatus.review`, ...) επειδή το ίδιο
// κλειδί (π.χ. `review`, `sent`, `cancelled`) εμφανίζεται σε πάνω από μία κατηγορία
// με το ίδιο ελληνικό κείμενο και στις δύο γλώσσες — γι' αυτό ένα επίπεδο,
// συγχωνευμένο lookup είναι ασφαλές. Το component δεν ξέρει (ούτε χρειάζεται να
// ξέρει) σε ποιο namespace ανήκει η ωμή τιμή· απλώς ψάχνει σε όλα.
type StatusCatalogue = Record<string, Record<string, string> | undefined>;

/**
 * Ψάχνει μια ωμή τιμή κατάστασης σε κάθε namespace `statuses.*` του ενεργού
 * καταλόγου. Καμία αντιστοιχία δεν είναι σφάλμα — γυρίζει την ωραιοποιημένη ωμή
 * τιμή, ακριβώς όπως συμπεριφερόταν το component πριν αυτή τη φέτα.
 */
export function resolveStatusLabel(status: string, catalogue: StatusCatalogue | undefined): string {
  const normalizedStatus = status.toLowerCase().replace(/\s+/g, '_');
  if (catalogue) {
    for (const namespace of Object.values(catalogue)) {
      if (namespace && typeof namespace === 'object' && normalizedStatus in namespace) {
        return namespace[normalizedStatus];
      }
    }
  }
  return prettify(status);
}

/**
 * Το κελί κατάστασης όλου του προϊόντος. Δέχεται πάντα την ωμή τιμή —
 * `statusTone()` δεν καταλαβαίνει μεταφρασμένο κείμενο (βλ. το header του
 * `src/lib/status-tone.ts`) — και ψάχνει το κείμενο στον μεταφρασμένο κατάλογο,
 * με fallback στην ωραιοποιημένη ωμή τιμή όταν δεν υπάρχει κλειδί. Οι
 * καταστάσεις είναι δεδομένα, όχι enum: μια νέα τιμή που πρόσθεσε ένας
 * διαχειριστής πρέπει να αποδίδεται σωστά, με σωστό τόνο, χωρίς αλλαγή κώδικα.
 */
export function StatusBadge({ status, className }: StatusBadgeProps) {
  const normalizedStatus = status.toLowerCase().replace(/\s+/g, '_');
  const messages = useMessages();
  const catalogue = messages?.statuses as StatusCatalogue | undefined;
  const displayText = resolveStatusLabel(status, catalogue);

  return (
    <ToneChip tone={statusTone(normalizedStatus)} className={className}>
      {displayText}
    </ToneChip>
  );
}
