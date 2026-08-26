/**
 * Καταστάσεις είναι δεδομένα, όχι enum: ο πίνακας από κάτω είναι
 * λέξεις-κλειδιά, ώστε μια νέα κατάσταση να μη χρειάζεται κώδικα.
 * Ό,τι δεν ταιριάζει πουθενά παίρνει ουδέτερο τόνο αντί να σπάσει.
 */
export type Tone = 'critical' | 'caution' | 'positive' | 'neutral';

export const TONE_RULES: ReadonlyArray<{ tone: Tone; match: readonly string[] }> = [
  {
    tone: 'critical',
    match: ['overdue', 'failed', 'rejected', 'cancelled', 'canceled', 'blocked', 'expired'],
  },
  {
    tone: 'caution',
    match: ['pending', 'awaiting', 'review', 'draft', 'sent', 'progress', 'hold', 'unsigned'],
  },
  {
    tone: 'positive',
    match: ['paid', 'signed', 'approved', 'completed', 'complete', 'delivered', 'active', 'done'],
  },
];

function tokenize(status: string): string[] {
  return status
    .trim()
    .toLowerCase()
    .split(/[^a-z]+/)
    .filter(Boolean);
}

export function statusTone(status: string | null | undefined): Tone {
  if (!status) return 'neutral';
  const tokens = tokenize(status);
  if (tokens.length === 0) return 'neutral';

  for (const rule of TONE_RULES) {
    if (tokens.some((token) => rule.match.includes(token))) return rule.tone;
  }
  return 'neutral';
}
