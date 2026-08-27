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
    // Κρίσιμο σημαίνει «κάτι πάει στραβά, κάποιος πρέπει να δράσει». Το
    // `cancelled` ΔΕΝ είναι εδώ: ένα ακυρωμένο παραστατικό δεν ζητά τίποτα
    // από κανέναν — κάποιος το έκλεισε επίτηδες, και η υπόθεση τελείωσε.
    // Κόκκινο πάνω σε κλειστή υπόθεση εκπαιδεύει το μάτι να αγνοεί το
    // κόκκινο, και τότε χάνονται και τα πραγματικά επείγοντα.
    // Το `rejected` και το `declined` μένουν: εκεί κάποιος ΑΛΛΟΣ είπε όχι,
    // και συνήθως θέλει απάντηση.
    tone: 'critical',
    match: ['overdue', 'failed', 'rejected', 'declined', 'blocked', 'expired', 'urgent', 'danger'],
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
      'warning',
      'viewed',
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
      'success',
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
