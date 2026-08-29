// Κανόνας πλέγματος αριθμών — μέρος του `node scripts/check-design.mjs`.
//
// Μια σειρά από «κάρτες με έναν αριθμό» είναι ΕΝΑ μπλοκ, όχι τέσσερα
// αντικείμενα: το `StatGrid` τη χαράζει με τρίχινες γραμμές (`gap-px` πάνω σε
// `bg-border`) και το `StatCard` γράφει το πλακίδιο. Χειροποίητη, η ίδια σειρά
// επιστρέφει σε αιωρούμενες κάρτες με άλλο κενό, άλλο μέγεθος αριθμού και άλλο
// σημείο διακοπής σε κάθε περιοχή του προϊόντος.
//
// Ο ΑΝΙΧΝΕΥΤΗΣ ΔΕΝ ΠΑΡΑΚΑΜΠΤΕΤΑΙ ΜΕ ΕΙΣΑΓΩΓΗ. Δεν υπάρχει «αν το αρχείο εισάγει
// StatGrid, προσπέρασέ το» — αυτό θα ήταν λωρίδα παράκαμψης (ένα αρχείο με ένα
// μεταναστευμένο πλέγμα και ένα χειροποίητο θα περνούσε ολόκληρο). Δεν
// χρειάζεται κιόλας: όποιος χρησιμοποιεί `StatCard` ΔΕΝ γράφει τον αριθμό στο
// αρχείο του — ο αριθμός ζει μέσα στο `stat-card.tsx`. Ένα μεταναστευμένο
// αρχείο βγαίνει καθαρό από μόνο του, χωρίς εξαίρεση.

// Τι μετράει για «αριθμός»: μέγεθος επίδειξης πάνω σε ΑΠΛΟ δοχείο (div/span/p).
// Το ίδιο μέγεθος πάνω σε `CardTitle` είναι επικεφαλίδα κάρτας, όχι πλακίδιο
// στατιστικού — και αυτή ακριβώς η διάκριση κρατά έξω τις οκτώ κάρτες τιμών του
// εγχειριδίου πωλήσεων (`<CardTitle className="text-3xl">` με τιμή πακέτου και
// από κάτω λίστα παροχών), που ήταν το μόνο ψευδώς θετικό της πρώτης γραφής.
const FIGURE = /<(?:div|span|p)\b[^>]*\b(?:text-2xl|text-3xl|font-display)\b/;

// Το δοχείο του πλακιδίου: κάρτα ή πλαισιωμένο κουτί με στρογγυλεμένη γωνία.
const TILE = /<Card(?![A-Za-z])|<div\b[^>]*className=["'`][^"'`]*\brounded\b[^"'`]*\bborder\b/g;

// Πόσο κοντά πρέπει να στέκονται οι αριθμοί για να είναι ΣΕΙΡΑ. Ένα πλακίδιο
// είναι μια χούφτα γραμμές (ετικέτα, αριθμός, ίσως εικονίδιο)· τρεις αριθμοί
// αραιωμένοι σε πενήντα γραμμές είναι τρεις διαφορετικές κάρτες περιεχομένου
// που τυχαίνει να έχουν μεγάλα ψηφία. Το όριο βαθμονομήθηκε πάνω στο δέντρο:
// με μεγαλύτερο, το εγχειρίδιο πωλήσεων άρχιζε να μοιάζει με πίνακα ελέγχου.
const NEIGHBOUR_LINES = 15;

// Πόσα δοχεία θέλουμε ΓΥΡΩ από τη σειρά — όχι σε ολόκληρο το αρχείο. Πρώτη
// γραφή μετρούσε κάρτες σε όλο το αρχείο και έβγαζε «σαράντα πέντε», δηλαδή
// τίποτα: ένα αρχείο με πολλές κάρτες κάπου αλλού δεν λέει τίποτα για το αν
// ΑΥΤΟΙ οι τρεις αριθμοί κάθονται σε πλακίδια.
const TILES_REQUIRED = 3;
const WINDOW_BEFORE = 6;

// Χειροποίητες σειρές αριθμών που ΔΕΝ πρόκειται ποτέ να γίνουν `StatGrid`.
// Άδεια σήμερα, και αυτό είναι ειλικρινές αποτέλεσμα, όχι παράλειψη: η μόνη
// κλάση που θα δικαιολογούσε εγγραφή εδώ (το ίδιο το `stat-card.tsx`, το σημείο
// άφιξης — Ruling F) δεν έχει τρεις αριθμούς, άρα δεν την βλέπει καν ο
// ανιχνευτής. Μια εξαίρεση που δεν εξαιρεί τίποτα ρίχνει το build (δες τον
// έλεγχο παλαιότητας πιο κάτω), οπότε η λίστα μένει άδεια μέχρι να υπάρξει
// πραγματικό σχήμα να γραφτεί μέσα της.
const STAT_GRID_EXEMPT = [];

// Σειρές που δεν έχουν μεταναστεύσει ακόμα, με ρητό λόγο. Μόνο μικραίνει.
//
// Άδεια σήμερα: τα τρία πλακίδια προμήθειας του εγχειριδίου πωλήσεων φορούν
// πλέον `StatGrid`/`StatCard`.
const STAT_GRID_PENDING = [];

const normalise = (p) => p.replaceAll('\\', '/');

/**
 * Η ΠΡΩΤΗ σειρά αριθμών του αρχείου, ή null. Επιστρέφει και τα όρια γραμμών,
 * ώστε το μήνυμα να δείχνει πού να κοιτάξει κανείς αντί να πει σκέτο το αρχείο.
 */
function findStatRow(lines) {
  const figures = [];
  lines.forEach((line, i) => {
    if (FIGURE.test(line)) figures.push(i);
  });

  let run = 1;
  for (let i = 1; i < figures.length; i++) {
    run = figures[i] - figures[i - 1] <= NEIGHBOUR_LINES ? run + 1 : 1;
    if (run < 3) continue;

    const first = figures[i - run + 1];
    const last = figures[i];
    const window = lines.slice(Math.max(0, first - WINDOW_BEFORE), last + 2).join('\n');
    if ((window.match(TILE) ?? []).length >= TILES_REQUIRED) {
      return { first: first + 1, last: last + 1, figures: run };
    }
  }
  return null;
}

export function checkStatGrid({ files, strippedOf }) {
  const rows = new Map();
  for (const file of files) {
    const row = findStatRow(strippedOf(file).split('\n'));
    if (row) rows.set(file, row);
  }

  const exempt = new Set(STAT_GRID_EXEMPT.map(normalise));
  const pending = new Set(STAT_GRID_PENDING.map(normalise));

  const violations = [];
  for (const [file, row] of rows) {
    if (exempt.has(file) || pending.has(file)) continue;
    violations.push(
      `${file}:${row.first}-${row.last}\n      ${row.figures} hand-rolled number tiles in a row`,
    );
  }

  const stale = [];
  for (const entry of [...pending, ...exempt]) {
    if (!rows.has(entry)) stale.push(entry);
  }

  return {
    violations,
    stale,
    counts: { checked: files.length - pending.size - exempt.size, pending: pending.size, exempt: exempt.size },
  };
}
