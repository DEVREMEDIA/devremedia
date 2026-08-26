// Φύλακας όψης: στις περιοχές που έχουν ήδη περάσει στη νέα γλώσσα,
// κανένα component δεν γράφει χρώμα στο χέρι — όλα από τα σύμβολα.
// Τρέχει από τη ρίζα: node scripts/check-design.mjs
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

// Αρχεία που έχουν μεταναστεύσει. Κάθε επόμενη φέτα προσθέτει εδώ ρητά
// αρχεία, όχι φακέλους — ένας φάκελος-καταχώρηση θα απέτυχε το build για
// αδέρφια components που δεν έχουν μεταναστεύσει ακόμα.
const MIGRATED = [
  'src/app/admin/today/page.tsx',
  'src/components/admin/dashboard/activity-feed.tsx',
  'src/components/admin/dashboard/hero/kpi-card.tsx',
  'src/components/admin/dashboard/hero/kpi-strip.tsx',
  'src/components/admin/dashboard/risk/risk-item.tsx',
  'src/components/admin/dashboard/shared/age-badge.tsx',
  'src/components/admin/dashboard/shared/card-skeletons.tsx',
  'src/components/admin/dashboard/shared/delta-badge.tsx',
  'src/components/admin/dashboard/shared/exception-badge.tsx',
  'src/components/admin/dashboard/shared/sparkline.tsx',
  'src/components/admin/dashboard/today/today-agenda.tsx',
  'src/components/admin/dashboard/today/today-item.tsx',
  'src/components/admin/dashboard/velocity/business-velocity.tsx',
  'src/components/shared/page-heading.tsx',
];

const RAW_COLOUR =
  /#[0-9a-fA-F]{3,8}\b|\b(?:rgb|rgba|hsl|hsla|oklch)\s*\(|\b(?:bg|text|border|ring|fill|stroke|from|via|to)-(?:red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose|slate|gray|grey|zinc|neutral|stone)-\d{2,3}\b/;

function walk(target, out = []) {
  if (!statSync(target).isDirectory()) {
    if (/\.(tsx|ts)$/.test(target)) out.push(target);
    return out;
  }
  for (const name of readdirSync(target)) walk(join(target, name), out);
  return out;
}

const files = new Set();
for (const target of MIGRATED) {
  for (const file of walk(target)) files.add(file);
}

const violations = [];
for (const file of files) {
  const lines = readFileSync(file, 'utf8').split('\n');
  lines.forEach((line, i) => {
    if (RAW_COLOUR.test(line)) {
      violations.push(`${file.replaceAll('\\', '/')}:${i + 1}  ${line.trim()}`);
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
