import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import type { Tone } from '@/lib/status-tone';

interface ToneChipProps {
  tone: Tone;
  children: ReactNode;
  className?: string;
}

// Tailwind δεν βλέπει δυναμικά χτισμένα class names, οπότε ο χάρτης πρέπει
// να μείνει στατικός — αλλά ζει εδώ, μία φορά, όχι σε κάθε call site.
const TONE_CLASSES: Record<Tone, string> = {
  critical: 'bg-tone-critical-bg text-tone-critical',
  caution: 'bg-tone-caution-bg text-tone-caution',
  positive: 'bg-tone-positive-bg text-tone-positive',
  neutral: 'bg-tone-neutral-bg text-tone-neutral',
};

/**
 * Το μοναδικό component που ξέρει πώς μοιάζει ένα tone chip — γεωμετρία και
 * χρώμα. Κάθε σημείο που δείχνει έναν Tone το χρησιμοποιεί αντί να ξαναγράφει
 * τον χάρτη τόνος→class στο δικό του αρχείο.
 */
export function ToneChip({ tone, children, className }: ToneChipProps) {
  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center rounded-sm px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-[0.1em] tabular-nums',
        TONE_CLASSES[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}
