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
const TONE_CLASSES: Record<Tone, string> = {
  critical: 'bg-tone-critical-bg text-tone-critical',
  caution: 'bg-tone-caution-bg text-tone-caution',
  positive: 'bg-tone-positive-bg text-tone-positive',
  neutral: 'bg-tone-neutral-bg text-tone-neutral',
};

/** Το εικονίδιο κατάστασης μιας γραμμής, βαμμένο από τον τόνο της. */
export function ToneIcon({ tone, children, className }: ToneIconProps) {
  return (
    <span className={cn('shrink-0 rounded-xl p-2.5', TONE_CLASSES[tone], className)}>
      {children}
    </span>
  );
}
