// Φύλακας όψης: στις περιοχές που έχουν ήδη περάσει στη νέα γλώσσα,
// κανένα component δεν γράφει χρώμα στο χέρι — όλα από τα σύμβολα.
// Τρέχει από τη ρίζα: node scripts/check-design.mjs
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

// Περιοχές που έχουν μεταναστεύσει. Σαρώνονται ολόκληρες — ένα νέο component
// σε καλυμμένο φάκελο φυλάσσεται αυτόματα, χωρίς να χρειάζεται να προστεθεί
// ρητά εδώ. Ό,τι δεν έχει μεταναστεύσει ακόμα πάει στο PENDING από κάτω.
const COVERED = [
  'src/app/admin/today',
  'src/components/admin/dashboard',
  'src/components/shared/page-heading.tsx',
  // Εδώ ζει ΟΛΟΣ ο χάρτης τόνου→κλάσης. Αν ξεφύγει αυτό, ξεβάφει κάθε
  // πλακίδιο της μεταναστευμένης οθόνης — πρέπει να φυλάσσεται.
  'src/components/shared/tone-chip.tsx',
];

// Αρχεία μέσα σε καλυμμένους φακέλους που όντως γράφουν ακόμα ωμό χρώμα.
// Κάθε επόμενη φέτα αφαιρεί από εδώ ό,τι μεταναστεύει. Μπαίνει εδώ μόνο
// ό,τι πραγματικά παραβιάζει — ένα καθαρό αρχείο δεν έχει λόγο να εξαιρεθεί.
const PENDING = [
  'src/components/admin/dashboard/production/crew-load-heatmap.tsx',
  'src/components/admin/dashboard/risk/risk-panel.tsx',
  'src/components/admin/dashboard/sales/revenue-forecast-card.tsx',
];

const RAW_COLOUR =
  /#[0-9a-fA-F]{3,8}\b|\b(?:rgb|rgba|hsl|hsla|oklch)\s*\(|\b(?:bg|text|border|ring|fill|stroke|from|via|to|divide|outline|shadow|decoration|accent|caret)-(?:white|black|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose|slate|gray|grey|zinc|neutral|stone)(?:-\d{2,3})?\b/;

function walk(target, out = []) {
  let stat;
  try {
    stat = statSync(target);
  } catch {
    console.error(`check:design — cannot stat "${target}" (renamed or deleted?)`);
    process.exit(1);
  }
  if (!stat.isDirectory()) {
    if (/\.(tsx|ts)$/.test(target)) out.push(target);
    return out;
  }
  for (const name of readdirSync(target)) walk(join(target, name), out);
  return out;
}

/**
 * Βγάζει τα σχόλια, ώστε αναφορές σε issue («// see #101») να μη μοιάζουν με hex.
 * Δύο παγίδες: το `//` του `https://` δεν είναι σχόλιο, και τα μπλοκ σχόλια
 * (JSDoc) ξεκινούν με `*` — αυτό το repo τα χρησιμοποιεί παντού.
 */
function stripComments(line) {
  const trimmed = line.trim();
  if (trimmed.startsWith('*') || trimmed.startsWith('/*')) return '';
  const i = line.search(/(?<!:)\/\//);
  return i === -1 ? line : line.slice(0, i);
}

const pendingSet = new Set(PENDING.map((p) => p.replaceAll('\\', '/')));

const files = new Set();
for (const target of COVERED) {
  for (const file of walk(target)) files.add(file.replaceAll('\\', '/'));
}
for (const pending of pendingSet) files.delete(pending);

const violations = [];
for (const file of files) {
  const lines = readFileSync(file, 'utf8').split('\n');
  lines.forEach((line, i) => {
    if (RAW_COLOUR.test(stripComments(line))) {
      violations.push(`${file}:${i + 1}  ${line.trim()}`);
    }
  });
}

if (violations.length > 0) {
  console.error(`check:design — ${violations.length} raw colour(s) outside the token layer:\n`);
  for (const v of violations) console.error(`  ${v}`);
  console.error('\nUse a token (bg-card, text-muted-foreground, text-tone-critical, …) instead.');
  process.exit(1);
}

console.log(`ok — ${files.size} file(s) covered, no raw colours`);
