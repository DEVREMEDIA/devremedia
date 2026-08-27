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
  // Ο ίδιος χάρτης για άλλη γεωμετρία (πλακίδιο εικονιδίου). Μπαίνει δίπλα στο
  // αδελφάκι του: ένα αρχείο που κρατά χάρτη τόνος→χρώμα και δεν φυλάσσεται
  // είναι το ακριβώς σωστό σημείο για να ξαναγεννηθεί η ωμή παλέτα.
  'src/components/shared/tone-icon.tsx',
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
  // Σημείωση: src/components/salesman/dashboard/pipeline-summary.tsx μένει
  // εκτός για άλλο λόγο πια — το panel «Pipeline by Stage» πέρασε στο κοινό
  // πλέγμα σε αυτή τη φέτα και δεν γράφει πια ωμό χρώμα. Δεν μπήκε στο
  // COVERED εδώ· η ένταξη ολόκληρου του φακέλου salesman ανήκει σε άλλο task.
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
  // Η γραμμή καρτελών που ζωγραφίζει και τους έντεκα κόμβους και οθόνες
  // λεπτομέρειας. Πιο βαρύ από τον σκελετό δίπλα του, και έλειπε.
  'src/components/shell-v2/section-tabs.tsx',
  'src/app/admin/projects/[projectId]',
  'src/app/client/projects/[projectId]',
  // Ο φάκελος από τον οποίο η οθόνη του portal ΠΡΟΣΑΡΤΑ τα σώματα των καρτελών
  // της. Ήταν στα φυλασσόμενα για πίνακες αλλά όχι για χρώμα — κάλυψη που
  // δηλωνόταν πιο φαρδιά απ' ό,τι δινόταν.
  'src/components/client/projects',
  // Ολόκληρο το portal πελάτη περνάει στη νέα γλώσσα (#107) — δύο ολόκληρα
  // δέντρα, ώστε ένα νέο component οπουδήποτε από κάτω να φυλάσσεται αυτόματα.
  'src/app/client',
  'src/components/client',
  // Η περιοχή των Παραγωγών (#108-#109) — ο κοινός FormDialog, ο κόμβος και
  // τα πέντε δέντρα components του: έργα, tasks, deliverables, ημερολόγιο,
  // αιτήματα και προετοιμασία γυρίσματος.
  'src/components/shared/form-dialog.tsx',
  'src/app/admin/productions',
  'src/components/admin/projects',
  'src/components/admin/tasks',
  'src/components/admin/deliverables',
  'src/components/admin/calendar',
  'src/components/admin/filming-requests',
  'src/components/admin/filming-prep',
  // Οι τέσσερις οθόνες λεπτομέρειας περνούν στο κοινό κέλυφος (#109) — τιμολόγιο,
  // lead, αίτημα γυρίσματος, και τα δύο φυλασσόμενα δέντρα γύρω τους.
  'src/app/admin/invoices',
  'src/app/admin/leads',
  'src/app/admin/filming-requests',
  'src/components/admin/invoices',
  'src/components/admin/leads',
];

// Αρχεία μέσα σε καλυμμένους φακέλους που όντως γράφουν ακόμα ωμό χρώμα.
// Κάθε επόμενη φέτα αφαιρεί από εδώ ό,τι μεταναστεύει. Μπαίνει εδώ μόνο
// ό,τι πραγματικά παραβιάζει — ένα καθαρό αρχείο δεν έχει λόγο να εξαιρεθεί.
//
// ΤΟ `colours` ΕΙΝΑΙ ΤΟ ΧΡΕΟΣ: ΠΟΙΑ ακριβώς χρώματα δικαιολογούνται, όχι
// πόσα. Ο φύλακας συγκρίνει το ταξινομημένο σύνολο ακριβώς.
//
// Δύο γενιές αυτού του ελέγχου ήταν ανοιχτές πόρτες, και τις δύο τις βρήκε
// ανεξάρτητος έλεγχος βάζοντας παραβίαση, ποτέ διαβάζοντας:
//   1η — η εγγραφή εξαιρούσε ΤΟ ΑΡΧΕΙΟ. Ένα εκκρεμές αρχείο μάζευε όσα νέα
//        χρώματα ήθελε· ο έλεγχος ρωτούσε «παραβιάζει ακόμα;», έπαιρνε ναι,
//        και σιωπούσε.
//   2η — η εγγραφή εξαιρούσε ΕΝΑΝ ΑΡΙΘΜΟ. Αντικατάστησε μια παραβίαση με
//        άλλη, κράτα το σύνολο ίδιο, και ο φύλακας μένει πράσινος. Ένα
//        `text-red-500` γίνεται `bg-purple-700` και κανείς δεν το μαθαίνει.
// Το σύνολο κλείνει και τις δύο: αλλάζει οτιδήποτε, το build πέφτει.
//
// Και έχει ένα δεύτερο κέρδος: διαβάζεται. Ο επόμενος βλέπει ΤΙ χρωστά το
// αρχείο χωρίς να το ανοίξει, αντί για έναν αριθμό που δεν λέει τίποτα.
// (Ο πρώτος αριθμός που γράφτηκε εδώ ως σχόλιο ήταν ήδη λάθος: έλεγε
// δεκαπέντε για ένα αρχείο με δεκαεπτά γραμμές και είκοσι δύο χρώματα.)
const PENDING = [
  {
    file: 'src/components/admin/dashboard/production/crew-load-heatmap.tsx',
    colours: [
      'bg-emerald-200',
      'bg-red-400',
      'bg-yellow-300',
      'text-emerald-900',
      'text-red-900',
      'text-yellow-900',
    ],
  },
  { file: 'src/components/admin/dashboard/risk/risk-panel.tsx', colours: ['text-red-500'] },
  {
    file: 'src/components/admin/dashboard/sales/revenue-forecast-card.tsx',
    colours: ['bg-emerald-500'],
  },
  // Η λίστα έργων του portal πελάτη — και δεν είναι οθόνη λεπτομέρειας:
  // μπήκε στην κάλυψη μαζί με τον φάκελό της, δεν την ανέλαβε η #106.
  {
    file: 'src/components/client/projects/projects-list.tsx',
    colours: [
      'bg-amber-500',
      'bg-amber-500',
      'bg-amber-500',
      'bg-amber-500',
      'bg-amber-500',
      'bg-amber-500',
      'bg-emerald-500',
      'rgba(234,179,8,0.2)',
      'rgba(234,179,8,0.2)',
      'rgba(234,179,8,0.4)',
      'rgba(234,179,8,0.4)',
      'text-amber-400',
      'text-amber-400',
      'text-amber-500',
      'text-amber-500',
      'text-amber-500',
      'text-amber-600',
      'text-amber-600',
      'text-emerald-400',
      'text-emerald-500',
      'text-emerald-500',
      'text-emerald-600',
    ],
  },
  // Η αναφορά πωλήσεων της περιοχής Interest — CHART_COLORS και τα
  // text-green-600/text-red-600 της. Ήδη στο TABLE_PENDING ως έργο περιοχής
  // για επόμενη φέτα· ίδιος λόγος εδώ. Δεν είναι ότι τα χρώματα γραφήματος
  // δεν μπορούν να γίνουν tokens — τα --chart-1..5 υπάρχουν ήδη στο
  // globals.css. Είναι θέμα εμβέλειας: η οθόνη ανήκει σε επόμενη φέτα.
  {
    file: 'src/components/admin/leads/sales-report.tsx',
    colours: [
      '#06b6d4',
      '#10b981',
      '#3b82f6',
      '#3b82f6',
      '#8b5cf6',
      '#ec4899',
      '#ef4444',
      '#f59e0b',
      'text-green-600',
      'text-red-600',
    ],
  },
  // Εύρημα εκτός σχεδίου της #109: η κάρτα ανά πελάτη μέσα στη λίστα
  // τιμολογίων ζωγραφίζει ακόμα text-green-600 (πληρωμένο) και
  // text-orange-600 (υπόλοιπο) στο χέρι. Ο πίνακας εδώ ήδη μετανάστευσε
  // (#104, βλ. TABLE_DETAIL_EXEMPT) αλλά το χρώμα ξέφυγε επειδή το
  // src/app/admin/invoices δεν ήταν καλυμμένο για χρώμα μέχρι αυτή τη φέτα.
  // Θέμα εμβέλειας, όχι αδυναμίας — το χρέος προϋπάρχει της #109 και δεν
  // ήταν κάτι που τα Tasks 1-6 ανέλαβαν να καθαρίσουν.
  {
    file: 'src/app/admin/invoices/invoices-content.tsx',
    colours: ['text-green-600', 'text-green-600', 'text-orange-600', 'text-orange-600'],
  },
];

// ΠΡΟΣΟΧΗ στα όρια λέξης. Το Tailwind γράφει τα κενά μιας αυθαίρετης τιμής ως
// κάτω παύλα — `shadow-[0_8px_30px_-4px_rgba(234,179,8,.15)]` — και η κάτω
// παύλα είναι χαρακτήρας ΛΕΞΗΣ. Ένα `\b` πριν από το `rgba` δεν ταιριάζει ποτέ
// εκεί, οπότε ο φύλακας τύπωνε «καθόλου ωμά χρώματα» ενώ ένα σταθερό κεχριμπάρι
// καθόταν μέσα σε καλυμμένο αρχείο. Το ίδιο ίσχυε για hex ακολουθούμενο από
// κάτω παύλα.
//
// Ο φράχτης δεν φεύγει, ΑΛΛΑΖΕΙ: αντί για `\b` μπαίνει «όχι γράμμα ή ψηφίο από
// πριν» — που δέχεται την κάτω παύλα του Tailwind αλλά κόβει το `borgb(` μέσα
// σε λέξη. Σκέτη αφαίρεση του `\b` έδινε ψευδώς θετικά, και την έπιασε ο
// επανέλεγχος. Για το hex, «όχι κι άλλο δεκαεξαδικό ψηφίο από πίσω».
// Η συνάρτηση χρώματος πιάνεται ΜΕ ΤΑ ΟΡΙΣΜΑΤΑ ΤΗΣ. Πρώτη γραφή σταματούσε
// στο `rgba(`, οπότε στο σύνολο του εκκρεμούς καταγραφόταν μόνο η λέξη —
// και `rgba(234,179,8,.2)` → `rgba(0,0,255,.9)` περνούσε πράσινο. Έκλεινε η
// αντικατάσταση για τις κλάσεις Tailwind και έμενε ανοιχτή ακριβώς δίπλα.
// Η παρένθεση κλεισίματος είναι ΠΡΟΑΙΡΕΤΙΚΗ επίτηδες: ο έλεγχος γίνεται ανά
// γραμμή, και μια κλήση σπασμένη σε δύο γραμμές δεν πρέπει να πάψει να
// ανιχνεύεται επειδή το `)` της έμεινε παρακάτω.
//
// Τα ονόματα των συναρτήσεων γράφονται γράμμα-γράμμα σε πεζό/κεφαλαίο. Η CSS
// ΔΕΝ ξεχωρίζει πεζά από κεφαλαία στα ονόματα συναρτήσεων — το `RGBA(255,0,0,.9)`
// βάφει ακριβώς όπως το `rgba(...)`, και περνούσε ολόκληρο μπροστά από τον
// φύλακα. Δεν μπαίνει σκέτο `i` σε όλη την έκφραση: το hex το χειρίζεται ήδη
// μόνο του, και οι κλάσεις Tailwind ΕΙΝΑΙ πεζές — ένα καθολικό `i` θα άρχιζε να
// πιάνει ταυτόχρονα και συμβολοσειρές σαν `TEXT-RED` που δεν είναι χρώματα.
const RAW_COLOUR =
  /#[0-9a-fA-F]{3,8}(?![0-9a-fA-F])|(?<![a-zA-Z0-9])(?:[rR][gG][bB][aA]?|[hH][sS][lL][aA]?|[oO][kK][lL][cC][hH])\s*\([^)]*\)?|\b(?:bg|text|border|ring|fill|stroke|from|via|to|divide|outline|shadow|decoration|accent|caret)-(?:white|black|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose|slate|gray|grey|zinc|neutral|stone)(?:-\d{2,3})?\b/;

/** Το ίδιο, με `g`: για να μετρηθεί ΤΙ παραβιάζει ένα εκκρεμές, όχι μόνο ΑΝ. */
const RAW_COLOUR_ALL = new RegExp(RAW_COLOUR.source, 'g');

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

const pendingDebt = new Map(
  PENDING.map((p) => [p.file.replaceAll('\\', '/'), [...p.colours].sort()]),
);

/** Τι ακριβώς παραβιάζει το αρχείο, ταξινομημένο, με τις επαναλήψεις του. */
function colourMultiset(source) {
  const found = [];
  for (const line of source.split('\n')) {
    for (const m of stripComments(line).matchAll(RAW_COLOUR_ALL)) found.push(m[0]);
  }
  return found.sort();
}

const files = new Set();
for (const target of COVERED) {
  for (const file of walk(target)) files.add(file.replaceAll('\\', '/'));
}

const violations = [];
const stalePendingColours = [];
const changedPendingDebt = [];
for (const file of files) {
  const lines = readFileSync(file, 'utf8').split('\n');
  const offending = [];
  lines.forEach((line, i) => {
    if (RAW_COLOUR.test(stripComments(line))) offending.push(`${file}:${i + 1}  ${line.trim()}`);
  });
  // Ένα εκκρεμές που καθάρισε δεν είναι πια εκκρεμές. Ήταν η μόνη από τις
  // λίστες αναβολής χωρίς αυτόν τον έλεγχο — άρα η μόνη που μπορούσε να
  // κρατήσει για πάντα μια εξαίρεση που δεν εξαιρεί τίποτα.
  if (pendingDebt.has(file)) {
    if (offending.length === 0) {
      stalePendingColours.push(file);
    } else {
      // Η εξαίρεση καλύπτει ΣΥΓΚΕΚΡΙΜΕΝΑ χρώματα, όχι το αρχείο και όχι έναν
      // αριθμό. Αντικατάσταση ενός χρώματος με άλλο κρατά το πλήθος και
      // περνούσε — δεν περνά πια.
      const declared = pendingDebt.get(file);
      const found = colourMultiset(readFileSync(file, 'utf8'));
      if (declared.join(' ') !== found.join(' ')) {
        changedPendingDebt.push({ file, declared, found });
      }
    }
    continue;
  }
  violations.push(...offending);
}

// Και μια εγγραφή που δείχνει σε αρχείο εκτός καλυμμένης περιοχής — μετονομασία,
// διαγραφή, τυπογραφικό — κάθεται σιωπηλή δίνοντας την εντύπωση ότι φυλάει κάτι.
for (const pending of pendingDebt.keys()) {
  if (!files.has(pending)) stalePendingColours.push(pending);
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
const RENDERS_HEADING_ALL = /<PageHeading[\s/>]/g;
const RENDERS_DETAIL_SHELL = /<DetailShell[\s/>]/;
const RENDERS_DETAIL_SHELL_ALL = /<DetailShell[\s/>]/g;

// Τα δύο components των οποίων η ΔΟΥΛΕΙΑ είναι να γράψουν τον τίτλο. Χωρίς
// αυτή την εξαίρεση, ο έλεγχος διπλού τίτλου θα κατήγγειλλε το ίδιο το κέλυφος
// — γιατί ναι, ζωγραφίζει `PageHeading`· αυτός είναι ο σκοπός του.
const TITLE_OWNERS = new Set([
  'src/components/shared/page-heading.tsx',
  'src/components/shared/detail-shell.tsx',
]);

function resolveImport(spec, fromFile) {
  const base = spec.startsWith('@/')
    ? `src/${spec.slice(2)}`
    : join(dirname(fromFile), spec).replaceAll('\\', '/');
  for (const candidate of [`${base}.tsx`, `${base}/index.tsx`]) {
    if (sourceOf.has(candidate)) return candidate;
  }
  return null;
}

// Δύο σχήματα οθόνης με καρτέλες, όχι ένα. Ο κόμβος γράφει ο ίδιος
// `SectionTabs` μέσα στο `page.tsx` του. Η οθόνη λεπτομέρειας τον φτάνει
// ΕΜΜΕΣΑ, μέσα από το `DetailShell`, και συνήθως από component πελάτη — άρα
// ένας έλεγχος που ψάχνει μόνο «page.tsx που λέει SectionTabs» δεν έβλεπε
// καμία από τις τρεις οθόνες λεπτομέρειας. Το εντόπισε ο τελικός έλεγχος της
// #106 βάζοντας δεύτερο `PageHeading` σε σώμα καρτέλας και βλέποντας πράσινο.
// Ρίζα ελέγχου είναι ΚΑΘΕ αρχείο που γράφει το ίδιο τον τίτλο μιας οθόνης —
// είτε απευθείας με `PageHeading`, είτε μέσα από το `DetailShell`. Ο παλιός
// ορισμός ήταν «page.tsx που αναφέρει SectionTabs», δηλαδή μόνο κόμβοι: η
// αρχική του πελάτη δεν ήταν τίποτα από τα δύο, και η φέτα #107 μόλις την
// έσπασε σε οκτώ components — το πιθανότερο σημείο του προϊόντος να ξεφύγει
// ένας δεύτερος τίτλος ήταν ακριβώς αυτό που κανείς δεν κοίταζε.
const hubs = allTsxFiles.filter(
  (f) =>
    !TITLE_OWNERS.has(f) &&
    (RENDERS_HEADING.test(strippedOf(f)) || RENDERS_DETAIL_SHELL.test(strippedOf(f))),
);

const doubleTitles = new Map();
for (const hub of hubs) {
  // Ο κόμβος ΕΛΕΓΧΕΤΑΙ ΚΑΙ ΓΙΑ ΤΟΝ ΕΑΥΤΟ ΤΟΥ. Ο βρόχος από κάτω ξεκινούσε από
  // τις ΕΙΣΑΓΩΓΕΣ του, οπότε ο πιο προφανής τρόπος να σπάσει ο κανόνας —
  // δύο επικεφαλίδες γραμμένες στο ίδιο αρχείο — περνούσε καθαρός. Και οι
  // τέσσερις οθόνες λεπτομέρειας της #109 είναι μονοαρχεία, δηλαδή ο κανόνας
  // ήταν τυφλός ακριβώς εκεί που μόλις είχε επεκταθεί. Το βρήκε το αρνητικό
  // τεστ της Task 7, εισάγοντας παραβίαση και βλέποντας τον φύλακα πράσινο.
  const own = strippedOf(hub);
  const ownTitles =
    (own.match(RENDERS_HEADING_ALL) ?? []).length +
    (own.match(RENDERS_DETAIL_SHELL_ALL) ?? []).length;
  if (ownTitles > 1) {
    if (!doubleTitles.has(hub)) doubleTitles.set(hub, new Set());
    doubleTitles.get(hub).add(hub);
  }

  const seen = new Set();
  const queue = [...strippedOf(hub).matchAll(IMPORT_SPEC)]
    .map((m) => resolveImport(m[1], hub))
    .filter(Boolean);

  while (queue.length > 0) {
    const file = queue.pop();
    if (seen.has(file)) continue;
    seen.add(file);

    if (!TITLE_OWNERS.has(file) && RENDERS_HEADING.test(strippedOf(file))) {
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
  // Ολόκληρο το portal πελάτη (#107) — δύο ολόκληρα δέντρα, όπως και για το
  // χρώμα από πάνω.
  'src/app/client/',
  'src/components/client/',
  // Η περιοχή των Παραγωγών (#108-#109), όπως και για το χρώμα από πάνω.
  'src/app/admin/productions/',
  'src/components/admin/filming-requests/',
  'src/components/admin/filming-prep/',
  'src/components/admin/deliverables/',
  'src/components/admin/tasks/',
];

// Λίστες λεπτομέρειας μέσα σε ήδη ανοιγμένη γραμμή. Δεν είναι το θέμα της
// σελίδας — δεν έχουν δουλειά να αποκτήσουν δική τους μπάρα αναζήτησης και
// σελιδοποίησης πάνω από αυτήν του γονιού τους. Κάθε εγγραφή θέλει λόγο.
const TABLE_DETAIL_EXEMPT = [
  'src/app/admin/invoices/invoices-content.tsx', // λίστα τιμολογίων μέσα σε ανοιγμένο πελάτη
  // Οι γραμμές ενός παραστατικού είναι το ίδιο το περιεχόμενο του εγγράφου:
  // λίγες, σταθερές, χωρίς νόημα να αναζητηθούν ή να σελιδοποιηθούν. Ισχύει
  // εξίσου και για τις δύο πλευρές — η admin οθόνη λεπτομέρειας τιμολογίου
  // και η αντίστοιχη client (Ruling B, #109).
  'src/app/admin/invoices/[invoiceId]/invoice-detail.tsx',
  'src/components/client/invoices/invoice-detail.tsx',
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
  stalePendingColours.length > 0 ||
  changedPendingDebt.length > 0 ||
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
  if (stalePendingColours.length > 0) {
    console.error(
      `\ncheck:design — ${stalePendingColours.length} stale PENDING entr${stalePendingColours.length === 1 ? 'y' : 'ies'} — either writes no raw colour any more, or no longer sits inside a covered area. Remove from the list:\n`,
    );
    for (const p of stalePendingColours) console.error(`  ${p}`);
  }
  if (changedPendingDebt.length > 0) {
    console.error(
      `\ncheck:design — ${changedPendingDebt.length} PENDING entr${changedPendingDebt.length === 1 ? 'y whose' : 'ies whose'} colour debt changed. A PENDING entry excuses NAMED raw colours — not the file, and not a count:\n`,
    );
    for (const { file, declared, found } of changedPendingDebt) {
      // Ποια ακριβώς μπήκαν και ποια έφυγαν — με τις επαναλήψεις τους, ώστε
      // «τρία amber έγιναν τέσσερα» να μη διαβάζεται ως «κανένα αλλαγμένο».
      const remaining = [...declared];
      const added = [];
      for (const c of found) {
        const at = remaining.indexOf(c);
        if (at === -1) added.push(c);
        else remaining.splice(at, 1);
      }
      console.error(`  ${file}`);
      if (added.length > 0) {
        console.error(
          `      NEW behind the exception: ${added.join(', ')}\n` +
            '      Remove it, or add it to the entry and say why it is owed.',
        );
      }
      if (remaining.length > 0) {
        console.error(
          `      no longer present: ${remaining.join(', ')}\n` +
            '      Paid, apparently. Drop it from the entry.',
        );
      }
    }
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
      const others = [...insideHubs].filter((h) => h !== file);
      // Δύο διαφορετικά σφάλματα, δύο διαφορετικές προτάσεις. Το «mounted by
      // τον εαυτό του» δεν λέει τίποτα σε όποιον το διαβάζει στις έξι το πρωί.
      if (insideHubs.has(file)) {
        console.error(`  ${file}\n      renders more than one page title in its own body`);
      }
      if (others.length > 0) {
        console.error(`  ${file}\n      mounted by ${others.join(', ')}`);
      }
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
