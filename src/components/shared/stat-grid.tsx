import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface StatGridProps {
  /** Πόσες στήλες στο μεγάλο πλάτος. Σε στενή οθόνη πέφτουν πάντα σε δύο. */
  columns?: 2 | 3 | 4 | 5 | 6 | 7;
  children: ReactNode;
}

// Το Tailwind δεν βλέπει class names που χτίζονται δυναμικά, οπότε ο χάρτης
// μένει στατικός — αλλά ζει εδώ, μία φορά, όχι σε κάθε πλέγμα του προϊόντος.
const COLUMN_CLASSES: Record<NonNullable<StatGridProps['columns']>, string> = {
  2: 'grid-cols-2',
  3: 'grid-cols-2 sm:grid-cols-3',
  4: 'grid-cols-2 lg:grid-cols-4',
  5: 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-5',
  6: 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-6',
  7: 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-7',
};

/**
 * Ένα πλέγμα αριθμών, χαραγμένο με τρίχινες γραμμές αντί για αιωρούμενες
 * κάρτες: το `gap-px` πάνω σε `bg-border` αφήνει το φόντο να φανεί ανάμεσα
 * στα πλακίδια. Ένα μπλοκ, όχι επτά αντικείμενα.
 */
export function StatGrid({ columns = 4, children }: StatGridProps) {
  return (
    <div
      data-slot="stat-grid"
      className={cn('grid gap-px border border-border bg-border', COLUMN_CLASSES[columns])}
    >
      {children}
    </div>
  );
}
