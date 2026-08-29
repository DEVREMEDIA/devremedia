// Κανόνας διαλόγου φόρμας — μέρος του `node scripts/check-design.mjs`.
//
// Ένας διάλογος «πρόσθεσε/άλλαξε» έχει πάντα το ίδιο υποσέλιδο: άκυρο,
// υποβολή, δείκτη προόδου, κλείδωμα όσο τρέχει η υποβολή, και μια περιγραφή που
// υπάρχει ακόμα κι όταν δεν έχει τι να πει (το Radix τη θέλει για το
// `aria-describedby`). Το `src/components/shared/form-dialog.tsx` τα κατέχει
// όλα αυτά. Γραμμένο στο χέρι, το υποσέλιδο ξαναγράφεται λίγο διαφορετικά κάθε
// φορά — και ο δείκτης προόδου, που είναι το πρώτο που ξεχνιέται, λείπει από
// τους περισσότερους.
//
// Ο ΑΝΙΧΝΕΥΤΗΣ ΚΟΙΤΑΕΙ ΤΟΝ ΔΙΑΛΟΓΟ, ΟΧΙ ΤΟ ΑΡΧΕΙΟ. Ένας έλεγχος επιπέδου
// αρχείου («εισάγει `Dialog` ΚΑΙ κάπου μέσα υπάρχει `<form`») θα έλεγε ναι για
// αρχεία που έχουν ΗΔΗ μεταναστεύσει και κρατούν έναν ωμό `Dialog` μόνο για
// επιβεβαίωση διαγραφής (τρία τέτοια στο δέντρο), και θα έλεγε όχι για το
// αντίστροφο: μεταναστευμένο διάλογο δίπλα σε χειροποίητο στο ίδιο αρχείο.
// Εξετάζεται κάθε μπλοκ `<Dialog>…</Dialog>` χωριστά.
//
// ΤΙ ΕΙΝΑΙ ΦΟΡΜΑ: ο διάλογος περιέχει πεδίο που γράφει ο χρήστης. Αυτό κρατά
// έξω, ΕΞ ΟΡΙΣΜΟΥ και χωρίς εγγραφή σε λίστα, τους διαλόγους ανάγνωσης (το
// συμβάν του ημερολογίου, οι λεπτομέρειες παραστατικού, ο διάλογος πακέτων) και
// τις επιβεβαιώσεις διαγραφής — δεν έχουν πεδία. Το ίδιο ισχύει και για το
// `confirm-dialog.tsx`: γράφτηκε πάνω σε `AlertDialog`, που δεν είναι καν
// `<Dialog`, άρα ο ανιχνευτής δεν το βλέπει ποτέ.
const DIALOG_OPEN = /<Dialog(?![A-Za-z])/g;
const DIALOG_CLOSE = /<\/Dialog>/g;
const FIELD = /<(?:form|Input|Textarea|Select|Checkbox|Switch|RadioGroup)(?![A-Za-z])/;

// Διάλογοι με πεδία που ΔΕΝ πρόκειται ποτέ να φορέσουν το κέλυφος.
const FORM_DIALOG_EXEMPT = [
  // Ruling F (ίδια κλάση με το data-table.tsx και το page-heading.tsx): αυτό
  // ΕΙΝΑΙ το κέλυφος. Χτίζεται πάνω στον ωμό `Dialog` και γράφει το ένα και
  // μοναδικό `<form>` εξ ορισμού — αλλιώς δεν θα μπορούσε να υπάρξει.
  'src/components/shared/form-dialog.tsx',
  // Ruling J — επιλογέας, όχι φόρμα. Το ίδιο το κέλυφος το λέει στο σχόλιό του
  // («ΤΙ ΔΕΝ ΕΙΝΑΙ: … δεν είναι επιλογέας»): εδώ δεν συμπληρώνεται και δεν
  // αποθηκεύεται τίποτα — διαλέγεις τρίμηνο και έτος και ξεκινά μια εξαγωγή.
  // Δύο `Select` δεν κάνουν φόρμα· κάνουν παράθυρο επιλογής παραμέτρων πριν από
  // μια ενέργεια. Ίδια κλάση με το Ruling E: το σχήμα δεν ταιριάζει.
  'src/components/admin/invoices/quarterly-export.tsx',
];

// Διάλογοι φόρμας που δεν έχουν μεταναστεύσει ακόμα, με ρητό λόγο. Η λίστα
// μόνο μικραίνει.
const FORM_DIALOG_PENDING = [];

const normalise = (p) => p.replaceAll('\\', '/');

/**
 * Κάθε μπλοκ `<Dialog>…</Dialog>` του αρχείου, και ποια από αυτά έχουν πεδίο.
 * Ο αριθμός ΟΛΩΝ των μπλοκ είναι που τυπώνεται στο τέλος: αυτά εξετάστηκαν,
 * ακόμα κι όσα βγήκαν καθαρά επειδή δεν είχαν πεδίο.
 */
function scanDialogs(source) {
  const all = [];
  DIALOG_OPEN.lastIndex = 0;
  let open;
  while ((open = DIALOG_OPEN.exec(source)) !== null) {
    DIALOG_CLOSE.lastIndex = open.index;
    const close = DIALOG_CLOSE.exec(source);
    const body = source.slice(open.index, close ? close.index : source.length);
    const field = body.match(FIELD);
    all.push({ line: source.slice(0, open.index).split('\n').length, field: field ? field[0] : null });
  }
  return all;
}

export function checkFormDialog({ files, strippedOf }) {
  const raw = new Map();
  const dialogsPerFile = new Map();
  let dialogsScanned = 0;
  for (const file of files) {
    const dialogs = scanDialogs(strippedOf(file));
    if (dialogs.length === 0) continue;
    dialogsScanned += dialogs.length;
    dialogsPerFile.set(file, dialogs.length);
    const withFields = dialogs.filter((d) => d.field);
    if (withFields.length > 0) raw.set(file, withFields);
  }

  const exempt = new Set(FORM_DIALOG_EXEMPT.map(normalise));
  const pending = new Set(FORM_DIALOG_PENDING.map(normalise));

  const violations = [];
  for (const [file, dialogs] of raw) {
    if (exempt.has(file) || pending.has(file)) continue;
    for (const d of dialogs) {
      violations.push(`${file}:${d.line}\n      raw <Dialog> around a ${d.field}> — this is a form`);
    }
  }

  // Μια εγγραφή που μετανάστευσε (ή που ο διάλογός της έπαψε να έχει πεδία, ή
  // που εξαφανίστηκε) δεν φυλάει πια τίποτα.
  const stale = [];
  for (const entry of [...pending, ...exempt]) {
    if (!raw.has(entry)) stale.push(entry);
  }

  // Ο αριθμός λέει τι ΕΛΕΓΧΘΗΚΕ για ετυμηγορία, όχι τι σαρώθηκε: τα μπλοκ των
  // εγγεγραμμένων αρχείων βγαίνουν έξω, αλλιώς η γραμμή επιτυχίας υπόσχεται
  // κάλυψη που δεν έδωσε.
  let excused = 0;
  for (const entry of [...pending, ...exempt]) excused += dialogsPerFile.get(entry) ?? 0;

  return {
    violations,
    stale,
    counts: { checked: dialogsScanned - excused, pending: pending.size, exempt: exempt.size },
  };
}
