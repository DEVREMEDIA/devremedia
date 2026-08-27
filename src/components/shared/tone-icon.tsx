import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import type { Tone } from '@/lib/status-tone';

interface ToneIconProps {
  tone: Tone;
  children: ReactNode;
  className?: string;
}

// Ο ίδιος χάρτης που ζει στο `ToneChip`, για άλλη γεωμετρία: τετράγωνο πλακίδιο
// εικονιδίου αντί για πλακίδιο κειμένου. Γεννήθηκε επειδή τρία αρχεία του
// portal τον είχαν αντιγράψει byte-για-byte στο δικό τους — ο κανόνας των τριών
// καταναλωτών ικανοποιήθηκε, οπότε ο χάρτης μετακόμισε εδώ αντί να ξαναγραφτεί
// τέταρτη φορά.
//
// Το χρώμα μόνο του δεν αρκεί: ο τόνος πρέπει να διαβάζεται και από το
// περίγραμμα, όχι μόνο από την απόχρωση. Τρεις καταναλωτές διαλέγουν ήδη το
// δικό τους lucide εικονίδιο ανά status — αυτό μένει ακριβώς όπως είναι,
// αφού είναι το `children` και δεν το αγγίζουμε. Αυτό εδώ είναι η εγγύηση
// που δεν εξαρτάται από τον καταναλωτή: ένας τέταρτος καταναλωτής που θα
// περνούσε το ίδιο εικονίδιο σε όλους τους τόνους θα εξακολουθούσε να
// βλέπει τέσσερα διαφορετικά σχήματα.
const TONE_CLASSES: Record<Tone, string> = {
  critical: 'bg-tone-critical-bg text-tone-critical border-2 border-tone-critical',
  caution: 'bg-tone-caution-bg text-tone-caution border-2 border-dashed border-tone-caution',
  positive: 'bg-tone-positive-bg text-tone-positive rounded-full',
  neutral: 'bg-tone-neutral-bg text-tone-neutral',
};

/**
 * Το εικονίδιο κατάστασης μιας γραμμής, βαμμένο από τον τόνο της — και πλέον
 * και σχηματισμένο απ' αυτήν: critical = συμπαγές περίγραμμα, caution =
 * διακεκομμένο, positive = κύκλος, neutral = το προεπιλεγμένο τετράγωνο.
 * Ο καλών μπορεί ακόμη να παρακάμψει το σχήμα μέσω `className` (π.χ. να
 * ορίσει δική του ακτίνα) — το ίδιο δικαίωμα που είχε ήδη πριν, για το
 * χρώμα.
 */
export function ToneIcon({ tone, children, className }: ToneIconProps) {
  return (
    <span className={cn('shrink-0 rounded-xl p-2.5', TONE_CLASSES[tone], className)}>
      {children}
    </span>
  );
}
