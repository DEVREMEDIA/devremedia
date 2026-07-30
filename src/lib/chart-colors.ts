/**
 * Παλέτα γραφημάτων — μία πηγή αλήθειας για όλα τα charts.
 *
 * Επικυρωμένη με τον validator παλέτας (OKLCH):
 *  - φωτεινότητα εντός ζώνης και στα δύο θέματα
 *  - chroma >= 0.10 (καμία απόχρωση δεν διαβάζεται ως γκρι)
 *  - διαχωρισμός για αχρωματοψία: χειρότερο γειτονικό ζεύγος ΔE 10.8 (deutan)
 *  - αντίθεση >= 3:1 απέναντι στη σκούρα επιφάνεια
 *
 * Η φωτεινότητα εναλλάσσεται σκόπιμα ανάμεσα σε γειτονικές αποχρώσεις: έτσι τα
 * κόκκινο/πράσινο ζεύγη ξεχωρίζουν και χωρίς αντίληψη χρώματος.
 *
 * ΣΗΜΑΝΤΙΚΟ: τα design tokens του project είναι oklch(). Το `hsl(var(--primary))`
 * είναι άκυρη CSS και αποδίδεται μαύρο — χρησιμοποίησε πάντα `var(--primary)`.
 */
export const CHART_SERIES = [
  '#CC7F00', // κεχριμπάρι (tungsten)
  '#4076DF', // μπλε
  '#D863A0', // τριανταφυλλί
  '#0F944C', // πράσινο
  '#9A6CDF', // βιολετί
  '#00A8B0', // πετρόλ
  '#C94F3A', // κεραμιδί
  '#00A0CC', // γαλάζιο (daylight)
] as const;

/** Χρώμα για γραφήματα μίας σειράς. */
export const CHART_PRIMARY = CHART_SERIES[0];

/**
 * Καταστάσεις — δεσμευμένες, ποτέ ως «σειρά Ν».
 * Συνοδεύονται πάντα από ετικέτα ή εικονίδιο, ποτέ μόνο χρώμα.
 */
export const CHART_STATUS = {
  good: '#0F944C',
  warning: '#CC7F00',
  critical: '#C94F3A',
} as const;

/** Επιστρέφει χρώμα σειράς σε σταθερή σειρά (χωρίς ανακύκλωση αποχρώσεων). */
export function seriesColor(index: number): string {
  return CHART_SERIES[index % CHART_SERIES.length];
}

/** Κοινό στυλ tooltip — χρησιμοποιεί τα πραγματικά tokens, όχι hsl(). */
export const CHART_TOOLTIP_STYLE = {
  backgroundColor: 'var(--card)',
  border: '1px solid var(--border)',
  borderRadius: 'var(--radius)',
  color: 'var(--foreground)',
  fontSize: '12px',
} as const;

export const CHART_TOOLTIP_LABEL_STYLE = { color: 'var(--muted-foreground)' } as const;
export const CHART_TOOLTIP_ITEM_STYLE = { color: 'var(--foreground)' } as const;
export const CHART_AXIS_TICK = { fill: 'var(--muted-foreground)', fontSize: 12 } as const;
export const CHART_GRID_STROKE = 'var(--border)';
