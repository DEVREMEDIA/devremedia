// Φύλακας όψης: στις περιοχές που έχουν ήδη περάσει στη νέα γλώσσα,
// κανένα component δεν γράφει χρώμα στο χέρι — όλα από τα σύμβολα.
// Και, με την ίδια λογική, κανένα δεν ξαναγράφει στο χέρι ένα κοινό μέρος που
// υπάρχει ήδη: τίτλο σελίδας (`PageHeading`), πίνακα (`DataTable`), κέλυφος
// λεπτομέρειας (`DetailShell`), πλέγμα αριθμών (`StatGrid`), διάλογο φόρμας
// (`FormDialog`). Οι τρεις τελευταίοι ζουν στο `scripts/check-design/`.
// Τρέχει από τη ρίζα: node scripts/check-design.mjs
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
// Οι τρεις νεότεροι κανόνες — κοινό κέλυφος λεπτομέρειας, πλέγμα αριθμών,
// διάλογος φόρμας — ζουν σε δικά τους αρθρώματα. Όχι επειδή είναι άλλου είδους
// έλεγχοι, αλλά επειδή το αρχείο έφτανε τις χίλιες γραμμές και ο επόμενος που
// θα ακουμπήσει τον κανόνα χρώματος δεν έχει λόγο να διαβάσει τη βαθμονόμηση
// του ανιχνευτή στατιστικών. Το σημείο εισόδου και η συμπεριφορά του
// `pnpm check:design` δεν αλλάζουν: μία εντολή, μία γραμμή αποτελέσματος.
import { checkDetailShell } from './check-design/detail-shell.mjs';
import { checkStatGrid } from './check-design/stat-grid.mjs';
import { checkFormDialog } from './check-design/form-dialog.mjs';

// Ο κανόνας χρώματος καλύπτει πλέον ΟΛΟΚΛΗΡΟ το src — όχι πια μια λίστα
// περιοχών που μεγάλωνε φέτα τη φέτα (#104-#110). Η ιστορία ποιος φάκελος
// πέρασε σε ποιο issue μένει στο git log· ο κανόνας δεν τη χρειάζεται πια
// για να αποφασίσει τι σαρώνει. Ένα νέο component οπουδήποτε στο src
// φυλάσσεται αυτόματα, χωρίς να χρειάζεται να προστεθεί ρητά εδώ. Ό,τι δεν
// έχει μεταναστεύσει ακόμα πάει στο PENDING, και ό,τι δεν πρόκειται ΠΟΤΕ να
// μεταναστεύσει πάει στο COLOUR_EXEMPT — και τα δύο πιο κάτω.
const COVERED = ['src'];

// Περιοχές ΜΟΝΙΜΑ έξω από τον κανόνα χρώματος — όχι «δεν πρόλαβε ακόμα»
// (αυτό είναι το PENDING από κάτω), αλλά «δεν πρόκειται ποτέ». Κάθε εγγραφή
// είναι απόφαση με λόγο, όχι παράλειψη, και ο έλεγχος στο τέλος του αρχείου
// την ξαναεπιβεβαιώνει: αν ένα αρχείο εδώ πάψει να γράφει ωμό χρώμα ή
// εξαφανιστεί, το build πέφτει. Μια εξαίρεση που δεν εξαιρεί πια τίποτα
// είναι ακριβώς η πόρτα από την οποία ξαναμπαίνει η ωμή παλέτα.
const COLOUR_EXEMPT = [
  // Ruling A — η επιφάνεια μάρκετινγκ μιλάει σε αγνώστους με άλλη οπτική
  // γλώσσα. Ίδια διάκριση με τον κανόνα <h1> πιο κάτω (HEADING_EXEMPT), που
  // εξαιρεί μόνιμα το src/components/landing/ ενώ κρατά τη σελίδα κράτησης
  // ως προσωρινό χρέος. Το cinematic-logo.tsx ΔΕΝ μπαίνει εδώ — ήταν στην
  // αρχική απογραφή, αλλά είναι πλέον προϊόν: ζει στο src/components/shared/
  // χωρίς κανένα ωμό χρώμα, ήδη μεταναστευμένο.
  'src/components/landing/',
  'src/components/shared/landing-contact-form.tsx',
  'src/components/shared/landing-mobile-nav.tsx',
  'src/components/shared/chatbot/',
  'src/app/page.tsx',

  // Ruling C — email και PDF templates αποδίδουν ΕΞΩ από τον browser: το
  // @react-pdf/renderer και το HTML που στέλνει το Resend δεν βλέπουν
  // Tailwind, ούτε CSS custom properties, ούτε color-mix(). Το ωμό χρώμα
  // εδώ είναι ΑΝΑΓΚΗ, όχι οφειλή — δεν υπάρχει token να το «ξεπληρώσει»
  // ένα μελλοντικό πέρασμα, γιατί δεν υπάρχει στυλοσελίδα εκεί να διαβάσει
  // ένα token.
  'src/lib/pdf/',
  'src/lib/email/templates/',
  // Ίδια ανάγκη, διαφορετικό σχήμα: όχι component μέσα στο templates/, αλλά
  // συνάρτηση που χτίζει το ίδιο ωμό HTML string για το email πρόσκλησης —
  // ο λόγος του Ruling C («αποδίδει έξω από τον browser») ισχύει ακριβώς
  // το ίδιο.
  'src/lib/email/send-invite-email.ts',

  // Ruling D — αυτό ΕΙΝΑΙ η παλέτα: το CVD-safe οκτάχρωμο scale του commit
  // 667d387. Ένα αρχείο παλέτας χωρίς κανένα χρώμα θα ήταν άδειο αρχείο.
  // Πόρισμα που το κρατά ασφαλές: αυτό είναι το ΜΟΝΟ δηλωμένο σπίτι ενός
  // χρώματος γραφήματος — το ίδιο literal γραμμένο οπουδήποτε αλλού στο
  // src δεν είναι «διπλότυπο», είναι παραβίαση, και ο βρόχος βάσης το
  // πιάνει κανονικά εκεί (δεν χρειάζεται δικό του μηχανισμό).
  'src/lib/chart-colors.ts',

  // Το fallback του FOUC: το inline style του src/app/layout.tsx είναι η
  // τιμή για το ένα στιγμιότυπο πριν προλάβει να φορτώσει η στυλοσελίδα —
  // η κύρια τιμή είναι ήδη το token (var(--background, ...)), το hex είναι
  // μόνο το fallback του ίδιου του CSS var(). Τεχνική ανάγκη, όχι οφειλή.
  'src/app/layout.tsx',

  // Ruling G — δεδομένο, όχι χρώμα UI: το #000000 στο branding-settings.tsx
  // είναι η προεπιλεγμένη τιμή του color picker (NO_BRAND_COLOR_SET), δηλαδή
  // τιμή που διαλέγει ο χρήστης και αποθηκεύεται, όχι ζωγραφισμένη επιφάνεια.
  // Το regex δεν ξεχωρίζει τα δύο· δεν «πληρώνεται» ποτέ με token.
  'src/components/admin/settings/branding-settings.tsx',
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
// Άδεια: το εγχειρίδιο πωλήσεων ήταν η τελευταία εγγραφή — τα σαράντα πέντε ωμά
// χρώματα της περιοχής περιεχομένου του πέρασαν στα σύμβολα και ο ίδιος ο
// φύλακας το ανακοίνωσε ως παλαιωμένη εγγραφή. Η λίστα μένει, όπως και το
// `TABLE_PENDING`, ώστε το επόμενο αρχείο που θα καθυστερήσει να έχει πού να
// γραφτεί — με τα ΟΝΟΜΑΤΑ των χρωμάτων που χρωστά, όχι με έναν αριθμό.
const PENDING = [];

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
// Και μια αριθμητική οντότητα HTML ΔΕΝ είναι χρώμα. Το `&#10005;` (σταυρός)
// έχει πέντε ψηφία που τυχαίνει να είναι όλα έγκυρα δεκαεξαδικά, οπότε το
// `#10005` ταίριαζε και ο φύλακας κατήγγειλλε ένα γλυφικό. Το `&` από πριν
// είναι το μόνο που ξεχωρίζει τα δύο — ένα `#fff;` μέσα σε CSS είναι
// κανονικότατο χρώμα, άρα το `;` από πίσω δεν κάνει για κριτήριο.
// Το βρήκε implementer μετρώντας το χρέος ενός αρχείου, όχι έλεγχος: η
// μέτρηση έβγαινε έξι παραπάνω απ' όσα χρώματα υπήρχαν στ' αλήθεια.
// Ο τέταρτος κλάδος προστέθηκε αφού μια ανεξάρτητη εξέταση απέδειξε ότι το ωμό
// χρώμα ξαναμπαίνει από την πιο συνηθισμένη πόρτα και ο φύλακας τύπωνε «ok»:
// ένα `style={{ color: 'white' }}` ή ένα `fill="white"` σε SVG δεν ταίριαζε σε
// κανέναν από τους τρεις πρώτους. Δεν ήταν επίθεση — έτσι γράφει κανείς ένα
// εικονίδιο.
//
// Πιάνει ΜΟΝΟ ονόματα χρωμάτων σε θέση που πραγματικά βάφει, δηλαδή μετά από
// γνωστή ιδιότητα χρώματος. Αυτό κρατά έξω τα `fill="none"`,
// `stroke="currentColor"`, `fill="url(#grad)"` και `color: 'inherit'`, που
// είναι όλα θεμιτά και συχνά. Η λίστα ονομάτων είναι τα χρώματα που πληκτρολογεί
// στην πράξη ένας άνθρωπος· δεν είναι και τα 148 της προδιαγραφής, και δεν
// προσποιείται ότι είναι — ένα `whitesmoke` περνάει ακόμη.
const RAW_COLOUR =
  /(?<!&)#[0-9a-fA-F]{3,8}(?![0-9a-fA-F])|(?<![a-zA-Z0-9])(?:[rR][gG][bB][aA]?|[hH][sS][lL][aA]?|[oO][kK][lL][cC][hH])\s*\([^)]*\)?|\b(?:bg|text|border|ring|fill|stroke|from|via|to|divide|outline|shadow|decoration|accent|caret)-(?:white|black|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose|slate|gray|grey|zinc|neutral|stone)(?:-\d{2,3})?\b|\b(?:fill|stroke|stop-?[cC]olor|flood-?[cC]olor|color|background|background-?[cC]olor|border-?[cC]olor|outline-?[cC]olor|caret-?[cC]olor|text-?[dD]ecoration-?[cC]olor)\s*[:=]\s*['"`]?(?:white|black|red|green|blue|yellow|orange|purple|pink|gray|grey|brown|cyan|magenta|lime|navy|teal|olive|maroon|silver|gold|beige|ivory|khaki|salmon|coral|crimson|indigo|violet|turquoise|aqua|fuchsia)\b/;

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

// Ίδιο σχήμα με το HEADING_EXEMPT πιο κάτω: πρόθεμα φακέλου (τελειώνει σε
// '/') έναντι ακριβούς αρχείου.
const colourExemptPrefixes = COLOUR_EXEMPT.filter((e) => e.endsWith('/')).map((e) =>
  e.replaceAll('\\', '/'),
);
const colourExemptFiles = new Set(
  COLOUR_EXEMPT.filter((e) => !e.endsWith('/')).map((e) => e.replaceAll('\\', '/')),
);

function isColourExempt(file) {
  return colourExemptFiles.has(file) || colourExemptPrefixes.some((p) => file.startsWith(p));
}

// Ποιες εγγραφές του COLOUR_EXEMPT είδαμε στ' αλήθεια να δικαιολογούν κάτι.
// Ένα ακριβές αρχείο μπαίνει εδώ μόνο αν βρέθηκε μέσα του ωμό χρώμα· ένα
// πρόθεμα φακέλου μπαίνει αν έστω ΕΝΑ αρχείο από κάτω του βρέθηκε να έχει.
// Χωρίς αυτό, μια εξαίρεση θα μπορούσε να μείνει για πάντα έστω κι αν το
// αρχείο που δικαιολογούσε έγινε καθαρό ή έφυγε.
const colourExemptSeenRaw = new Set();

const violations = [];
const stalePendingColours = [];
const changedPendingDebt = [];
for (const file of files) {
  const lines = readFileSync(file, 'utf8').split('\n');
  const offending = [];
  lines.forEach((line, i) => {
    if (RAW_COLOUR.test(stripComments(line))) offending.push(`${file}:${i + 1}  ${line.trim()}`);
  });

  if (isColourExempt(file)) {
    if (offending.length > 0) {
      colourExemptSeenRaw.add(file);
      for (const prefix of colourExemptPrefixes) {
        if (file.startsWith(prefix)) colourExemptSeenRaw.add(prefix);
      }
    }
    continue;
  }

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
      if (declared.join('\u0000') !== found.join('\u0000')) {
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

// Το COLOUR_EXEMPT είναι μόνιμο, αλλά «μόνιμο» δεν σημαίνει «απαρακολούθητο».
// Κάθε εγγραφή πρέπει να αποδεικνύεται ενεργή: το αρχείο/φάκελος υπάρχει ΚΑΙ
// βρέθηκε μέσα του τουλάχιστον ένα ωμό χρώμα. Ρητό statSync εδώ (όχι μόνο
// μέλος του `files`, που θα έκρυβε μια εγγραφή μετονομασμένη σε κάτι εκτός
// .ts/.tsx) πιάνει και τη διαγραφή/μετονομασία ρητά.
const staleColourExemptions = [];
for (const entry of COLOUR_EXEMPT) {
  try {
    statSync(entry);
  } catch {
    staleColourExemptions.push(entry);
    continue;
  }
  if (!colourExemptSeenRaw.has(entry)) staleColourExemptions.push(entry);
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

// Ο κανόνας πίνακα καλύπτει πλέον ΟΛΟΚΛΗΡΟ το src — όχι πια μια λίστα
// περιοχών που μεγάλωνε φέτα τη φέτα (Οικονομικά, Πελάτες, Παραγωγοί,
// Εργαζόμενοι/Πωλητές, ...). Ό,τι εισάγει απευθείας τα ωμά primitives ή
// γράφει σκέτο <table> φτιάχνει δικό του πίνακα — αυτό ακριβώς που έφερε
// δεκαεπτά ασύμβατες υλοποιήσεις στο προϊόν, και τίποτα δεν εγγυάται ότι δεν
// θα ξαναφυτρώσει σε μια περιοχή που κανείς δεν είχε βάλει ρητά στη λίστα. Ένα
// νέο component οπουδήποτε στο src φυλάσσεται αυτόματα, χωρίς να χρειάζεται
// να προστεθεί ρητά εδώ.
const TABLE_GUARDED_AREAS = ['src/'];

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
  // Ψευδώς θετικό του ανιχνευτή: αυτό ΕΙΝΑΙ ο κοινός DataTable που προωθεί ο
  // κανόνας — χτίζεται πάνω στα ωμά primitives εξ ορισμού, αλλιώς δεν θα
  // μπορούσε να υπάρξει. Μόνιμη, ονομαστική εξαίρεση (Ruling F) — το ίδιο
  // είδος εξαίρεσης με το page-heading.tsx στον κανόνα <h1> και το
  // TITLE_OWNERS: όχι «δεν έχει μεταναστεύσει ακόμα», αλλά «αυτό είναι το
  // σημείο άφιξης».
  'src/components/shared/data-table.tsx',
  // Ψευδώς θετικό του ανιχνευτή: αυτό ΕΙΝΑΙ το ίδιο το primitive πάνω στο
  // οποίο χτίζεται ο κοινός πίνακας. Μόνιμη, ονομαστική εξαίρεση (Ruling F) —
  // ίδια λογική με το data-table.tsx από πάνω.
  'src/components/ui/table.tsx',
  // Πλέγμα προσωπικού×ημερών, όχι λίστα: κάθε κελί είναι σύνδεσμος έντασης
  // χρώματος, όχι γραμμή προς αναζήτηση ή σελιδοποίηση. Το μοντέλο γραμμής
  // του DataTable δεν ταιριάζει εδώ και δεν πρόκειται ποτέ να ταιριάξει —
  // διαρθρωτική εξαίρεση (Ruling E), ίδια κλάση με τις δύο παραπάνω: «οι
  // γραμμές ΕΙΝΑΙ το περιεχόμενο, όχι λίστα προς αναζήτηση/σελιδοποίηση».
  'src/components/admin/dashboard/production/crew-load-heatmap.tsx',
];

// Ίδια απόφαση με το `TABLE_DETAIL_EXEMPT` («δεν πρόκειται ποτέ»), αλλά για
// πίνακες που ο ανιχνευτής ΔΕΝ μπορεί να δει: φτιαγμένους από CSS grid, χωρίς
// εισαγωγή των ωμών primitives και χωρίς σήμανση `<table>`. Γι' αυτούς ο
// έλεγχος «παραβιάζει ακόμα;» είναι αδύνατος — θα έλεγε πάντα όχι. Ελέγχονται
// για ύπαρξη, και για το αν έπαψαν να είναι αόρατοι (τότε ανήκουν στο
// `TABLE_DETAIL_EXEMPT`, όπου ελέγχονται κανονικά). Ζουν σε δική τους λίστα
// ώστε η αδυναμία να είναι γραμμένη, όχι υπονοούμενη — ακριβώς όπως και στα
// εκκρεμή από κάτω.
const TABLE_DETAIL_EXEMPT_UNDETECTABLE = [
  // Ruling H — πλέγμα κόστους με επεξεργασία μέσα στα κελιά. Ήταν γραμμένο ως
  // «αναβλήθηκε» (TABLE_PENDING_UNDETECTABLE), αλλά η ανάγνωση του αρχείου
  // δείχνει ότι δεν είναι λίστα που περιμένει τη σειρά της: κάθε γραμμή είναι
  // δώδεκα στήλες με `Input` που αποθηκεύουν στο `onBlur`, και μέσα σε
  // ανοιγμένη γραμμή ξεδιπλώνονται ΑΛΛΕΣ επεξεργάσιμες γραμμές (ανάλυση
  // κόστους) με δικό τους άθροισμα και προειδοποίηση απόκλισης. Οι γραμμές ΕΙΝΑΙ
  // το περιεχόμενο — δεν αναζητούνται, δεν σελιδοποιούνται, δεν ταξινομούνται·
  // αθροίζονται. Το μοντέλο γραμμής του `DataTable` (δεδομένα μέσα, κελιά μόνο
  // για ανάγνωση, μπάρα αναζήτησης και σελιδοποίηση από πάνω) δεν ταιριάζει και
  // δεν πρόκειται να ταιριάξει χωρίς να γίνει ο κοινός πίνακας κάτι άλλο για
  // χάρη ενός καταναλωτή. Ίδια κλάση με το Ruling E (crew-load-heatmap):
  // διαρθρωτική εξαίρεση, όχι χρέος.
  'src/app/admin/cost-model/tabs/items-tab.tsx',
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
// Άδεια: η μόνη εγγραφή της (το πλέγμα κόστους) διαβάστηκε και αποδείχθηκε
// διαρθρωτική εξαίρεση, όχι αναβολή — μετακόμισε στο
// `TABLE_DETAIL_EXEMPT_UNDETECTABLE` με το Ruling H. Η λίστα μένει, όπως και το
// `TABLE_PENDING` από κάτω, ώστε ο επόμενος αόρατος πίνακας που θα καθυστερήσει
// να έχει πού να γραφτεί.
const TABLE_PENDING_UNDETECTABLE = [];

// Άδεια από το close-out της 2026-08-29: sales-report και knowledge-table
// μετανάστευσαν στον κοινό DataTable. Η λίστα μένει ώστε ο επόμενος πίνακας
// που θα καθυστερήσει να έχει πού να γραφτεί.
const TABLE_PENDING = [];

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
const tableExemptUndetectableSet = new Set(
  TABLE_DETAIL_EXEMPT_UNDETECTABLE.map((p) => p.replaceAll('\\', '/')),
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
  if (tableUndetectableSet.has(file) || tableExemptUndetectableSet.has(file)) {
    // Ίδιος έλεγχος και για τις δύο αόρατες λίστες: η ΑΟΡΑΤΟΤΗΤΑ είναι που
    // επικαλούνται, και αυτή αποδεικνύεται. Αν ο ανιχνευτής άρχισε να τη
    // βλέπει, θέση της είναι η αντίστοιχη ορατή λίστα (`TABLE_PENDING` ή
    // `TABLE_DETAIL_EXEMPT`), όπου ελέγχεται κανονικά.
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
for (const exempt of tableExemptUndetectableSet) {
  if (!tableGuardedFileSet.has(exempt)) staleTableExemptions.push(exempt);
}

// Ο αριθμός που τυπώνεται πρέπει να λέει τι ΕΛΕΓΧΘΗΚΕ για χειροποίητο πίνακα,
// όχι τι σαρώθηκε. Και τα εκκρεμή και οι εξαιρέσεις βγαίνουν από τον βρόχο
// πριν από την ετυμηγορία — ελέγχονται μόνο για το αν ξεπεράστηκαν. Αν δεν
// αφαιρεθούν και τα δύο, η γραμμή επιτυχίας υπόσχεται κάλυψη που δεν έδωσε.
const tableGuardedChecked =
  tableGuardedFiles.length -
  tablePendingSet.size -
  tableUndetectableSet.size -
  tableExemptUndetectableSet.size -
  tableDetailExemptSet.size;

// Οι τρεις κανόνες των κοινών μερών. Παίρνουν το ίδιο υλικό που έχει ήδη
// διαβαστεί μία φορά (τα .tsx του src και το `strippedOf`) — κανένα δεύτερο
// πέρασμα στον δίσκο, κανένα δεύτερο αντίγραφο των πηγών.
const detailShell = checkDetailShell({ files: allTsxFiles, strippedOf });
const statGrid = checkStatGrid({ files: allTsxFiles, strippedOf });
const formDialog = checkFormDialog({ files: allTsxFiles, strippedOf });

// Κάθε κανόνας δίνει δύο ειδών αστοχίες με το ίδιο σχήμα: παραβιάσεις, και
// εγγραφές λίστας που δεν φυλάνε πια τίποτα. Ο έλεγχος παλαιότητας ΡΙΧΝΕΙ το
// build ακριβώς όπως και η παραβίαση — μια λίστα που μόνο μεγαλώνει είναι
// λωρίδα παράκαμψης.
const SHARED_PART_RULES = [
  {
    name: 'DetailShell',
    result: detailShell,
    lists: 'DETAIL_SHELL_PENDING / DETAIL_SHELL_EXEMPT',
    module: 'scripts/check-design/detail-shell.mjs',
    hint: 'Use the shared DetailShell (src/components/shared/detail-shell.tsx) — it owns the back link, the title and the tabs of a detail screen.',
    staleWhy: 'either wears the shell now, is no longer a detail screen, or no longer exists',
  },
  {
    name: 'StatGrid',
    result: statGrid,
    lists: 'STAT_GRID_PENDING / STAT_GRID_EXEMPT',
    module: 'scripts/check-design/stat-grid.mjs',
    hint: 'Use the shared StatGrid + StatCard (src/components/shared/stat-grid.tsx, stat-card.tsx) for a row of number tiles.',
    staleWhy: 'either has no hand-rolled row of number tiles any more, or no longer exists',
  },
  {
    name: 'FormDialog',
    result: formDialog,
    lists: 'FORM_DIALOG_PENDING / FORM_DIALOG_EXEMPT',
    module: 'scripts/check-design/form-dialog.mjs',
    hint: 'Use the shared FormDialog (src/components/shared/form-dialog.tsx) — it owns the footer, the submit state and the aria description.',
    staleWhy: 'either has no field-bearing raw <Dialog> any more, or no longer exists',
  },
];

const sharedPartFailures = SHARED_PART_RULES.some(
  (r) => r.result.violations.length > 0 || r.result.stale.length > 0,
);

if (
  sharedPartFailures ||
  violations.length > 0 ||
  stalePendingColours.length > 0 ||
  changedPendingDebt.length > 0 ||
  staleColourExemptions.length > 0 ||
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
  if (staleColourExemptions.length > 0) {
    console.error(
      `\ncheck:design — ${staleColourExemptions.length} stale COLOUR_EXEMPT entr${staleColourExemptions.length === 1 ? 'y' : 'ies'} — either writes no raw colour any more, or no longer exists. Remove from the list:\n`,
    );
    for (const p of staleColourExemptions) console.error(`  ${p}`);
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
      `\ncheck:design — ${misfiledUndetectable.length} TABLE_PENDING_UNDETECTABLE / TABLE_DETAIL_EXEMPT_UNDETECTABLE entr${misfiledUndetectable.length === 1 ? 'y is' : 'ies are'} misfiled. Those lists exist ONLY for tables the detector physically cannot see; ${misfiledUndetectable.length === 1 ? 'this one' : 'these'} either build${misfiledUndetectable.length === 1 ? 's' : ''} a visible table (move to the matching visible list — TABLE_PENDING or TABLE_DETAIL_EXEMPT — where it gets checked) or already import${misfiledUndetectable.length === 1 ? 's' : ''} the shared DataTable (remove entirely):\n`,
    );
    for (const p of misfiledUndetectable) console.error(`  ${p}`);
  }
  for (const rule of SHARED_PART_RULES) {
    const { violations: found, stale } = rule.result;
    if (found.length > 0) {
      console.error(`\ncheck:design — ${found.length} file(s) do the ${rule.name}'s job by hand:\n`);
      for (const v of found) console.error(`  ${v}`);
      console.error(`\n${rule.hint}`);
    }
    if (stale.length > 0) {
      console.error(
        `\ncheck:design — ${stale.length} stale ${rule.lists} entr${stale.length === 1 ? 'y' : 'ies'} — ${rule.staleWhy}. Remove from the list in ${rule.module}:\n`,
      );
      for (const p of stale) console.error(`  ${p}`);
    }
  }
  process.exit(1);
}

console.log(
  `ok — ${files.size} file(s) covered, no raw colours; one title per page ` +
    `(${headingPendingSet.size} pending, ${hubs.length} hubs checked for double titles), ` +
    `${tableGuardedChecked} table-guarded-area file(s) checked for hand-rolled tables ` +
    `(${tablePendingSet.size} pending, ${tableUndetectableSet.size} undetectable, ` +
    `${tableDetailExemptSet.size + tableExemptUndetectableSet.size} exempt); ` +
    // Οι τρεις νεότεροι κανόνες τυπώνουν ό,τι και οι παλιοί: τι ελέγχθηκε, και
    // πόσο χρέος έμεινε γραμμένο δίπλα του. Ένας φύλακας που λέει μόνο «ok»
    // κρύβει τις λίστες του.
    `${detailShell.counts.checked} detail-route screen(s) checked for DetailShell ` +
    `(${detailShell.counts.pending} pending, ${detailShell.counts.exempt} exempt), ` +
    `${statGrid.counts.checked} file(s) checked for hand-rolled stat rows ` +
    `(${statGrid.counts.pending} pending, ${statGrid.counts.exempt} exempt), ` +
    `${formDialog.counts.checked} raw dialog(s) checked for hand-rolled forms ` +
    `(${formDialog.counts.pending} pending, ${formDialog.counts.exempt} exempt)`,
);
