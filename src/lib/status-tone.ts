/**
 * Καταστάσεις είναι δεδομένα, όχι enum: ο πίνακας από κάτω είναι
 * λέξεις-κλειδιά, ώστε μια νέα κατάσταση να μη χρειάζεται κώδικα.
 * Ό,τι δεν ταιριάζει πουθενά παίρνει ουδέτερο τόνο αντί να σπάσει.
 *
 * This resolver expects a raw database status value, never a translated
 * display label. The tokenizer strips every non-ASCII character, so any
 * Greek string (e.g. the output of `t('...')`) silently returns 'neutral'
 * with no error — pass it the underlying enum/status value, not i18n text.
 */
export type Tone = 'critical' | 'caution' | 'positive' | 'neutral';

export const TONE_RULES: ReadonlyArray<{ tone: Tone; match: readonly string[] }> = [
  {
    tone: 'critical',
    match: [
      'overdue',
      'failed',
      'rejected',
      'declined',
      'cancelled',
      'canceled',
      'blocked',
      'expired',
      'urgent',
    ],
  },
  {
    tone: 'caution',
    match: [
      'pending',
      'awaiting',
      'review',
      'reviewed',
      'revision',
      'revisions',
      'draft',
      'sent',
      'progress',
      'hold',
      'unsigned',
      'high',
    ],
  },
  {
    tone: 'positive',
    match: [
      'paid',
      'signed',
      'approved',
      'accepted',
      'completed',
      'complete',
      'delivered',
      'active',
      'done',
      'converted',
      'final',
      'published',
    ],
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
