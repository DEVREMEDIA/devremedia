// Φύλακας όψης: στις περιοχές που έχουν ήδη περάσει στη νέα γλώσσα,
// κανένα component δεν γράφει χρώμα στο χέρι — όλα από τα σύμβολα.
// Τρέχει από τη ρίζα: node scripts/check-design.mjs
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';

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
  // Το κοινό πλέγμα αριθμών και το πλακίδιό του — η βάση όλης αυτής της φέτας.
  'src/components/shared/stat-grid.tsx',
  'src/components/shared/stat-card.tsx',
  'src/components/shared/delta-badge.tsx',
  'src/components/shared/sparkline.tsx',
  // Οι οθόνες που πέρασαν στο κοινό πλέγμα. Δύο από αυτές (employee, client)
  // ήταν χτισμένες από ωμά χρώματα, οπότε εκεί ο κανόνας πιάνει πραγματική
  // οπισθοδρόμηση· οι άλλες δύο μπαίνουν για να μη γίνουν ποτέ.
  //
  // ΤΙ ΔΕΝ ΠΙΑΝΕΙ ΑΥΤΟ: κανένας κανόνας εδώ δεν βλέπει ένα ΝΕΟ αυτοσχέδιο
  // πλέγμα αριθμών σε αρχείο εκτός λίστας — ούτε ένα που είναι γραμμένο
  // αποκλειστικά με tokens. Ο φύλακας φυλάει το χρώμα, όχι τη σύνθεση.
  //
  // Εξαίρεση: src/components/salesman/dashboard/pipeline-summary.tsx μένει
  // εκτός — το panel «Pipeline by Stage» κρατά ακόμα ωμά χρώματα, οφειλόμενο
  // σε επόμενη φέτα.
  'src/components/admin/chatbot/chatbot-stats.tsx',
  'src/components/admin/calendar/calendar-stats.tsx',
  'src/components/employee/dashboard/task-stats.tsx',
  'src/components/client/dashboard/dashboard-stats.tsx',
  // Η περιοχή των Οικονομικών περνάει στον κοινό πίνακα (#104) — ο κόμβος
  // του hub, το γράφημα κόστους, το KpiCard της υγείας τιμολόγησης, η
  // αναφορά κορυφαίων πελατών και ο πίνακας τιμολογίων.
  'src/app/admin/finance',
  'src/app/admin/cost-model/tabs/summary-tab.tsx',
  'src/app/admin/pricing-health/pricing-health-content.tsx',
  'src/components/admin/reports/client-report.tsx',
  'src/components/admin/invoices/invoices-table-view.tsx',
  // Η περιοχή των Πελατών περνάει στον κοινό πίνακα (#105) — ο κόμβος του hub
  // και οι στήλες του (ολόκληρος ο φάκελος, ώστε ένα νέο component εκεί να
  // φυλάσσεται αυτόματα), ο πίνακας ενδιαφέροντος, ο πίνακας συνομιλιών, η
  // λίστα προτάσεων και η λίστα συμβολαίων.
  'src/components/shared/status-badge.tsx',
  'src/app/admin/clients',
  'src/components/admin/leads/all-leads-table.tsx',
  'src/components/admin/chatbot/conversations-table.tsx',
  // Ολόκληρος ο φάκελος των προτάσεων, όχι μόνο η λίστα: εδώ ζούσε η δεύτερη
  // αντιγραφή του χάρτη ωμών χρωμάτων που σκότωσε αυτή η φέτα. Αν η οθόνη
  // λεπτομέρειας μείνει αφύλακτη, ο χάρτης ξαναφυτρώνει ακριβώς εκεί που
  // ξεριζώθηκε.
  'src/app/admin/proposals',
  'src/app/admin/contracts/contracts-list-page.tsx',
  // Οι τρεις οθόνες λεπτομέρειας περνούν στο κοινό κέλυφος (#106) — ο σύνδεσμος
  // επιστροφής, ο ένας τίτλος και οι καρτέλες οδηγούμενες από το URL ζουν εδώ.
  'src/components/shared/detail-shell.tsx',
  // Το σκελετικό φόρτωσης του κελύφους — καμία δικαιολογία να ζωγραφίσει ωμό χρώμα.
  'src/components/shell-v2/detail-skeleton.tsx',
  'src/app/admin/projects/[projectId]',
  'src/app/client/projects/[projectId]',
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

// Ένας τίτλος ανά σελίδα: ο μόνος που γράφει <h1> είναι το κοινό PageHeading.
const HEADING_EXEMPT = [
  'src/components/shared/page-heading.tsx', // εδώ ζει ο ένας και μοναδικός <h1>
  'src/components/landing/', // άλλο επίπεδο, εκτός σκοπού μόνιμα
];

// Οθόνες που κρατούν προσωρινά τον δικό τους τίτλο, με ρητό λόγο και ρητό
// σημείο επιστροφής. Κάθε επόμενη φέτα αφαιρεί από εδώ — η λίστα μόνο μικραίνει.
const HEADING_PENDING = [
  'src/app/book/page.tsx', // δημόσια σελίδα με δικό της κέλυφος
  'src/app/admin/invoices/[invoiceId]/invoice-detail.tsx', // → #109
  'src/components/admin/filming-requests/filming-request-detail.tsx', // → #109
  'src/components/client/invoices/invoice-detail.tsx', // → #109
];

const HEADING_IMPORT = /['"][^'"]*\/shared\/page-header['"]/;
const HEADING_TAG = /<h1\b/;

const headingExemptPrefixes = HEADING_EXEMPT.filter((e) => e.endsWith('/')).map((e) =>
  e.replaceAll('\\', '/'),
);
const headingExemptFiles = new Set(
  HEADING_EXEMPT.filter((e) => !e.endsWith('/')).map((e) => e.replaceAll('\\', '/')),
);
const headingPendingSet = new Set(HEADING_PENDING.map((p) => p.replaceAll('\\', '/')));

function isHeadingExempt(file) {
  return headingExemptFiles.has(file) || headingExemptPrefixes.some((p) => file.startsWith(p));
}

const allTsxFiles = walk('src')
  .map((f) => f.replaceAll('\\', '/'))
  .filter((f) => f.endsWith('.tsx'));

const headingViolations = [];
const pendingWithH1 = new Set();

for (const file of allTsxFiles) {
  const lines = readFileSync(file, 'utf8').split('\n');
  lines.forEach((line, i) => {
    const stripped = stripComments(line);
    if (HEADING_IMPORT.test(stripped)) {
      headingViolations.push(`${file}:${i + 1}  ${line.trim()}`);
    }
    if (HEADING_TAG.test(stripped)) {
      if (headingPendingSet.has(file)) {
        pendingWithH1.add(file);
      } else if (!isHeadingExempt(file)) {
        headingViolations.push(`${file}:${i + 1}  ${line.trim()}`);
      }
    }
  });
}

const stalePending = HEADING_PENDING.map((p) => p.replaceAll('\\', '/')).filter(
  (p) => !pendingWithH1.has(p),
);

// Ο έλεγχος <h1> πιάνει μόνο χειροποίητους τίτλους. ΔΕΝ πιάνει την ίδια τη βλάβη
// που έφτιαξε αυτή η φέτα: ένα hub και το σώμα της καρτέλας του να ζωγραφίζουν
// το καθένα το δικό του <PageHeading> — δύο τίτλοι στην ίδια οθόνη, με το μόνο
// <h1> να ζει μέσα στο εξαιρεμένο page-heading.tsx, άρα αόρατο στο grep.
// Εδώ ακολουθούμε τις εισαγωγές κάθε hub και απαιτούμε ότι τίτλο γράφει μόνο
// το ίδιο το hub. ΠΡΟΣΟΧΗ: και οι δύο μορφές εισαγωγής μετράνε — πέντε σώματα
// καρτελών μπαίνουν με σχετική διαδρομή (`./settings-page`), και μια απογραφή
// που κοιτούσε μόνο το `@/` alias τα είχε χάσει ολόκληρα.
const sourceOf = new Map(allTsxFiles.map((f) => [f, readFileSync(f, 'utf8')]));
const strippedOf = (f) => sourceOf.get(f).split('\n').map(stripComments).join('\n');

const IMPORT_SPEC = /from\s+'(@\/[^']+|\.[^']*)'/g;
const RENDERS_HEADING = /<PageHeading[\s/>]/;

function resolveImport(spec, fromFile) {
  const base = spec.startsWith('@/')
    ? `src/${spec.slice(2)}`
    : join(dirname(fromFile), spec).replaceAll('\\', '/');
  for (const candidate of [`${base}.tsx`, `${base}/index.tsx`]) {
    if (sourceOf.has(candidate)) return candidate;
  }
  return null;
}

const hubs = allTsxFiles.filter(
  (f) => f.endsWith('/page.tsx') && sourceOf.get(f).includes('SectionTabs'),
);

const doubleTitles = new Map();
for (const hub of hubs) {
  const seen = new Set();
  const queue = [...strippedOf(hub).matchAll(IMPORT_SPEC)]
    .map((m) => resolveImport(m[1], hub))
    .filter(Boolean);

  while (queue.length > 0) {
    const file = queue.pop();
    if (seen.has(file)) continue;
    seen.add(file);

    if (RENDERS_HEADING.test(strippedOf(file))) {
      if (!doubleTitles.has(file)) doubleTitles.set(file, new Set());
      doubleTitles.get(file).add(hub);
    }
    for (const match of strippedOf(file).matchAll(IMPORT_SPEC)) {
      const resolved = resolveImport(match[1], file);
      if (resolved && !seen.has(resolved)) queue.push(resolved);
    }
  }
}

// Οι περιοχές των Οικονομικών και των Πελατών περνούν από τον κοινό πίνακα.
// Ό,τι εισάγει απευθείας τα ωμά primitives φτιάχνει δικό του πίνακα — αυτό
// ακριβώς που έφερε δεκαεπτά ασύμβατες υλοποιήσεις στο προϊόν.
const TABLE_GUARDED_AREAS = [
  'src/app/admin/finance/',
  'src/app/admin/invoices/',
  'src/app/admin/cost-model/',
  'src/app/admin/pricing-health/',
  'src/components/admin/invoices/',
  'src/components/admin/reports/',
  // Τις δύο κάρτες αυτού του φακέλου τις κρεμάει το hub των Οικονομικών, άρα
  // ανήκουν στην περιοχή όσο και τα υπόλοιπα.
  'src/components/admin/dashboard/finance/',
  // Η περιοχή των Πελατών (#105): ο hub και τα tabs του, οι λεπτομέρειες
  // πελάτη, οι κάρτες προτάσεων και συμβολαίων, οι λίστες leads και το chatbot.
  'src/app/admin/clients/',
  'src/app/admin/proposals/',
  'src/app/admin/contracts/',
  'src/components/admin/clients/',
  'src/components/admin/contracts/',
  'src/components/admin/leads/',
  'src/components/admin/chatbot/',
  // Οι τρεις οθόνες λεπτομέρειας (#106): ο πίνακας τιμολογίων και η λίστα
  // συμβολαίων μέσα στη λεπτομέρεια έργου, και ό,τι δείχνει η πλευρά του πελάτη.
  'src/app/admin/projects/',
  'src/app/client/projects/',
  'src/components/client/projects/',
];

// Λίστες λεπτομέρειας μέσα σε ήδη ανοιγμένη γραμμή. Δεν είναι το θέμα της
// σελίδας — δεν έχουν δουλειά να αποκτήσουν δική τους μπάρα αναζήτησης και
// σελιδοποίησης πάνω από αυτήν του γονιού τους. Κάθε εγγραφή θέλει λόγο.
const TABLE_DETAIL_EXEMPT = [
  'src/app/admin/invoices/invoices-content.tsx', // λίστα τιμολογίων μέσα σε ανοιγμένο πελάτη
  // Οι γραμμές ενός παραστατικού είναι το ίδιο το περιεχόμενο του εγγράφου:
  // λίγες, σταθερές, χωρίς νόημα να αναζητηθούν ή να σελιδοποιηθούν. Η οθόνη
  // αυτή ανασχεδιάζεται ούτως ή άλλως στη #109.
  'src/app/admin/invoices/[invoiceId]/invoice-detail.tsx',
];

// Πίνακες της περιοχής που ΔΕΝ έχουν μεταναστεύσει ακόμα, με ρητό λόγο και
// ρητό σημείο επιστροφής. Ξεχωριστά από το EXEMPT: το EXEMPT λέει «αυτό δεν
// πρέπει ποτέ να γίνει DataTable», αυτό εδώ λέει «δεν έγινε ακόμα».
// Η λίστα μόνο μικραίνει, και ο αριθμός στο τέλος τους αφαιρεί — αλλιώς ο
// φύλακας διαφημίζει κάλυψη που δεν έχει.
// Εκκρεμή που ο ανιχνευτής από κάτω ΔΕΝ μπορεί να δει: πίνακες φτιαγμένοι από
// CSS grid, χωρίς εισαγωγή ούτε ωμή σήμανση. Γι' αυτά ο έλεγχος «δεν
// παραβιάζει πια» είναι αδύνατος — θα έλεγε πάντα ότι ξεπεράστηκαν. Ελέγχονται
// μόνο για ύπαρξη. Ζουν σε δική τους λίστα ώστε η αδυναμία να είναι γραμμένη,
// όχι υπονοούμενη.
const TABLE_PENDING_UNDETECTABLE = [
  // Πλέγμα 12 στηλών με επεξεργασία μέσα στα κελιά, σε γραμμές μέσα σε
  // γραμμές. Θέλει συμβόλαιο επεξεργάσιμου κελιού στον κοινό πίνακα, με έναν
  // μόνο καταναλωτή — αναβλήθηκε συνειδητά.
  'src/app/admin/cost-model/tabs/items-tab.tsx',
];

const TABLE_PENDING = [
  // Η αναφορά πωλήσεων της περιοχής Interest — έργο περιοχής για επόμενη φέτα.
  'src/components/admin/leads/sales-report.tsx',
  // Ο πίνακας γνώσης του chatbot — έργο περιοχής για επόμενη φέτα.
  'src/components/admin/chatbot/knowledge-table.tsx',
];

// Δύο μορφές, γιατί και οι δύο φτιάχνουν πίνακα στο χέρι: εισαγωγή των ωμών
// primitives (με μονά ή διπλά εισαγωγικά, με alias ή σχετική διαδρομή), και
// σκέτη <table> σήμανση — ακριβώς αυτό που μόλις έφυγε από τα τιμολόγια.
const RAW_TABLE_IMPORT = /from\s+['"](?:@\/components\/ui\/table|\.[^'"]*\/table)['"]/;
const RAW_TABLE_TAG = /<table[\s>]/;
const buildsOwnTable = (source) => RAW_TABLE_IMPORT.test(source) || RAW_TABLE_TAG.test(source);

const tableDetailExemptSet = new Set(TABLE_DETAIL_EXEMPT.map((p) => p.replaceAll('\\', '/')));
const tableGuardedFiles = allTsxFiles.filter((f) =>
  TABLE_GUARDED_AREAS.some((prefix) => f.startsWith(prefix)),
);

const tablePendingSet = new Set(TABLE_PENDING.map((p) => p.replaceAll('\\', '/')));
const tableUndetectableSet = new Set(
  TABLE_PENDING_UNDETECTABLE.map((p) => p.replaceAll('\\', '/')),
);

// Ένα αρχείο που μετανάστευσε στον κοινό πίνακα τον εισάγει. Είναι το μόνο
// θετικό σημάδι μετανάστευσης που έχουμε για κάτι αόρατο στον ανιχνευτή.
const USES_SHARED_TABLE = /from\s+['"](?:@\/components\/shared\/data-table|\.[^'"]*\/data-table)['"]/;

const handRolledTables = [];
const staleTableExemptions = [];
const misfiledUndetectable = [];
const tableGuardedFileSet = new Set(tableGuardedFiles);

for (const file of tableGuardedFiles) {
  const source = strippedOf(file);
  const ownTable = buildsOwnTable(source);
  // Μια λίστα που δεν ελέγχεται είναι λωρίδα παράκαμψης: ό,τι μπει εκεί γίνεται
  // μόνιμα αόρατο, ακόμα κι αν παραβιάζει κανονικότατα. Άρα η ίδια η ιδιότητα
  // που επικαλείται η εγγραφή πρέπει να αποδεικνύεται — αλλιώς ανήκει αλλού:
  // αν ο ανιχνευτής ΤΗ ΒΛΕΠΕΙ, θέση της είναι το `TABLE_PENDING`, όπου θα
  // ελεγχθεί· αν εισάγει τον κοινό πίνακα, έχει ήδη μεταναστεύσει.
  if (tableUndetectableSet.has(file)) {
    if (ownTable || USES_SHARED_TABLE.test(source)) misfiledUndetectable.push(file);
    continue;
  }
  // Ένα εκκρεμές που μετανάστευσε δεν είναι πια εκκρεμές. Αν δεν το πιάσουμε
  // εδώ, η λίστα μεγαλώνει μόνο και ο φύλακας διαφημίζει αναβολή που δεν
  // υπάρχει — ο ίδιος κανόνας που ήδη ισχύει για τις εξαιρέσεις παρακάτω.
  if (tablePendingSet.has(file)) {
    if (!ownTable) staleTableExemptions.push(file);
    continue;
  }
  if (tableDetailExemptSet.has(file)) {
    // Μια εξαίρεση που δεν φτιάχνει πια δικό της πίνακα έχει ήδη μεταναστεύσει
    // — μένει εδώ μόνο ξεχασμένη, χωρίς πια να φυλάσσει τίποτα.
    if (!ownTable) staleTableExemptions.push(file);
    continue;
  }
  if (ownTable) handRolledTables.push(file);
}

// Ο βρόχος από πάνω βλέπει μόνο αρχεία που ΥΠΑΡΧΟΥΝ μέσα στην περιοχή. Μια
// εγγραφή που μετονομάστηκε, διαγράφηκε ή γράφτηκε με τυπογραφικό δεν θα
// περνούσε ποτέ από εκεί — θα καθόταν σιωπηλή για πάντα, δίνοντας την
// εντύπωση ότι κάτι φυλάσσεται. Το ίδιο ισχύει και για τα εκκρεμή.
for (const exempt of tableDetailExemptSet) {
  if (!tableGuardedFileSet.has(exempt)) staleTableExemptions.push(exempt);
}
for (const pending of tablePendingSet) {
  if (!tableGuardedFileSet.has(pending)) staleTableExemptions.push(pending);
}
for (const pending of tableUndetectableSet) {
  if (!tableGuardedFileSet.has(pending)) staleTableExemptions.push(pending);
}

// Ο αριθμός που τυπώνεται πρέπει να λέει τι ΕΛΕΓΧΘΗΚΕ για χειροποίητο πίνακα,
// όχι τι σαρώθηκε. Και τα εκκρεμή και οι εξαιρέσεις βγαίνουν από τον βρόχο
// πριν από την ετυμηγορία — ελέγχονται μόνο για το αν ξεπεράστηκαν. Αν δεν
// αφαιρεθούν και τα δύο, η γραμμή επιτυχίας υπόσχεται κάλυψη που δεν έδωσε.
const tableGuardedChecked =
  tableGuardedFiles.length -
  tablePendingSet.size -
  tableUndetectableSet.size -
  tableDetailExemptSet.size;

if (
  violations.length > 0 ||
  headingViolations.length > 0 ||
  stalePending.length > 0 ||
  doubleTitles.size > 0 ||
  handRolledTables.length > 0 ||
  staleTableExemptions.length > 0 ||
  misfiledUndetectable.length > 0
) {
  if (violations.length > 0) {
    console.error(`check:design — ${violations.length} raw colour(s) outside the token layer:\n`);
    for (const v of violations) console.error(`  ${v}`);
    console.error('\nUse a token (bg-card, text-muted-foreground, text-tone-critical, …) instead.');
  }
  if (headingViolations.length > 0) {
    console.error(`\ncheck:design — ${headingViolations.length} heading violation(s):\n`);
    for (const v of headingViolations) console.error(`  ${v}`);
    console.error('\nUse the shared PageHeading component for page titles.');
  }
  if (stalePending.length > 0) {
    console.error(
      `\ncheck:design — ${stalePending.length} stale HEADING_PENDING entr${stalePending.length === 1 ? 'y' : 'ies'} — no <h1> found, remove from the list:\n`,
    );
    for (const p of stalePending) console.error(`  ${p}`);
  }
  if (doubleTitles.size > 0) {
    console.error(
      `\ncheck:design — ${doubleTitles.size} file(s) render a second page title inside a hub:\n`,
    );
    for (const [file, insideHubs] of doubleTitles) {
      console.error(`  ${file}\n      mounted by ${[...insideHubs].join(', ')}`);
    }
    console.error('\nThe hub owns the page title. A tab body must not render its own PageHeading.');
  }
  if (handRolledTables.length > 0) {
    console.error(
      `\ncheck:design — ${handRolledTables.length} file(s) in a table-guarded area build their own table:\n`,
    );
    for (const f of handRolledTables) console.error(`  ${f}`);
    console.error(
      '\nUse the shared DataTable (src/components/shared/data-table.tsx) instead of raw table markup or the raw primitives.',
    );
  }
  if (staleTableExemptions.length > 0) {
    console.error(
      `\ncheck:design — ${staleTableExemptions.length} stale TABLE_DETAIL_EXEMPT / TABLE_PENDING entr${staleTableExemptions.length === 1 ? 'y' : 'ies'} — either no longer builds its own table, or no longer exists in a table-guarded area. Remove from the list:\n`,
    );
    for (const p of staleTableExemptions) console.error(`  ${p}`);
  }
  if (misfiledUndetectable.length > 0) {
    console.error(
      `\ncheck:design — ${misfiledUndetectable.length} TABLE_PENDING_UNDETECTABLE entr${misfiledUndetectable.length === 1 ? 'y is' : 'ies are'} misfiled. That list exists ONLY for tables the detector physically cannot see; ${misfiledUndetectable.length === 1 ? 'this one' : 'these'} either build${misfiledUndetectable.length === 1 ? 's' : ''} a visible table (move to TABLE_PENDING, where it gets checked) or already import${misfiledUndetectable.length === 1 ? 's' : ''} the shared DataTable (remove entirely):\n`,
    );
    for (const p of misfiledUndetectable) console.error(`  ${p}`);
  }
  process.exit(1);
}

console.log(
  `ok — ${files.size} file(s) covered, no raw colours; one title per page ` +
    `(${headingPendingSet.size} pending, ${hubs.length} hubs checked for double titles), ` +
    `${tableGuardedChecked} table-guarded-area file(s) checked for hand-rolled tables ` +
    `(${tablePendingSet.size} pending, ${tableUndetectableSet.size} undetectable, ` +
    `${tableDetailExemptSet.size} exempt)`,
);
