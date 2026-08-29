// scripts/check-routes.mjs — guard: κανένα revalidatePath ούτε backHref σε stub route, κανένα stub χωρίς υπαρκτό target.
import { readdirSync, readFileSync, statSync, existsSync } from 'node:fs';
import { join } from 'node:path';

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, out);
    else out.push(p);
  }
  return out;
}

const pages = walk('src/app').filter((p) => p.endsWith('page.tsx'));
const stubs = new Map(); // route path -> target
for (const p of pages) {
  const src = readFileSync(p, 'utf8');
  const m = src.match(/redirect\('([^']+)'\)/);
  if (m && !src.includes('supabase') && src.length < 600) {
    const route = '/' + p.replaceAll('\\', '/').replace('src/app/', '').replace('/page.tsx', '');
    stubs.set(route, m[1]);
  }
}

/**
 * Το μονοπάτι όπως το βλέπει ο router: χωρίς query, χωρίς άγκυρα, χωρίς τελική
 * κάθετο. Ο πίνακας των stubs χτίζεται από ονόματα αρχείων, άρα τα κλειδιά του
 * είναι πάντα στην κανονική μορφή — ενώ ο κώδικας γράφει ό,τι του φανεί.
 * `/admin/leads/` και `/admin/leads#tab` οδηγούν στην ΙΔΙΑ σελίδα με το
 * `/admin/leads`, όμως το `stubs.has()` τα αστοχούσε και ο φύλακας τύπωνε «ok»
 * για προορισμό που ανακατευθύνει. Η κανονικοποίηση μπαίνει σε ΚΑΘΕ αναζήτηση,
 * όχι μόνο εκεί που βρέθηκε η τρύπα.
 */
function normaliseRoute(href) {
  const path = href.split('?')[0].split('#')[0];
  return path.length > 1 ? path.replace(/\/+$/, '') : path;
}

const errors = [];
for (const [route, target] of stubs) {
  const clean = normaliseRoute(target);
  const targetPage = join('src/app', clean === '/' ? '' : clean, 'page.tsx');
  if (!existsSync(targetPage)) errors.push(`stub ${route} -> ${target}: target page missing`);
}

// Η μέρα ήρθε: μία οθόνη έχει δυναμικό προορισμό επιστροφής, ΑΠΟΦΑΣΗ, όχι
// παράπλευρη απώλεια. Το συμβόλαιο γυρίζει στην παραγωγή του
// (`/admin/projects/${project_id}`) — πραγματική σελίδα, όχι stub, με το id
// να έρχεται από τα δεδομένα. Κάθε νέα εγγραφή εδώ θέλει την ίδια αιτιολογία.
const DYNAMIC_BACKHREF_DECIDED = new Set([
  'src/app/admin/contracts/[contractId]/contract-view-page.tsx',
  // Πίσω στον ΣΥΓΚΕΚΡΙΜΕΝΟ πελάτη/lead που μόλις επεξεργάστηκες
  // (`/admin/clients/${clientId}`, `/salesman/leads/${leadId}`) — πραγματικές
  // σελίδες λεπτομέρειας, όχι stub, με το id να έρχεται από τα δεδομένα.
  'src/app/admin/clients/[clientId]/edit/page.tsx',
  'src/app/salesman/leads/[leadId]/edit/page.tsx',
]);

const files = walk('src').filter((p) => /\.(ts|tsx)$/.test(p));
for (const f of files) {
  const src = readFileSync(f, 'utf8');
  // ΓΝΩΣΤΟ ΟΡΙΟ: πιάνει μόνο κυριολεκτικό μονό εισαγωγικό. Ένα
  // revalidatePath(`/admin/${id}`) δεν ελέγχεται — και σε αντίθεση με το
  // backHref από κάτω, τα δυναμικά μονοπάτια εδώ είναι συνηθισμένα και
  // θεμιτά, οπότε το «κλείσε προς τα μέσα» θα έριχνε το build για κανονικό
  // κώδικα. Γραμμένο εδώ ώστε το κενό να είναι δηλωμένο, όχι υπονοούμενο.
  for (const m of src.matchAll(/revalidatePath\(\s*'([^']+)'/g)) {
    const route = normaliseRoute(m[1]);
    if (stubs.has(route))
      errors.push(`${f}: revalidatePath('${m[1]}') targets a stub (use ${normaliseRoute(stubs.get(route))})`);
  }
  // Ο κανόνας κλείνει ΠΡΟΣ ΤΑ ΜΕΣΑ. Πρώτη γραφή έπιανε μόνο `backHref="..."`,
  // οπότε ένα template literal ή μια σταθερά περνούσαν αόρατα — έδινε
  // περισσότερη βεβαιότητα απ' όση κέρδιζε, που είναι χειρότερο από το να
  // μην υπάρχει. Τώρα κάθε `backHref=` εξετάζεται: αν δεν είναι απλή
  // κυριολεξία, ο φύλακας ΔΕΝ μπορεί να την επαληθεύσει και το λέει, αντί
  // να σιωπήσει. Και οι τέσσερις σημερινοί είναι κυριολεξίες, άρα σήμερα
  // δεν κοστίζει τίποτα· την ημέρα που κάποιος χρειαστεί δυναμικό προορισμό,
  // το θέλουμε να είναι απόφαση, όχι παράπλευρη απώλεια.
  // Τα κενά γύρω από το ίσον είναι έγκυρη JSX και η πρώτη γραφή τα έχανε:
  // `backHref = "/admin/chatbot"` περνούσε ολόκληρο, stub και όλα.
  for (const m of src.matchAll(/backHref\s*=\s*(["']([^"']+)["']|\{)/g)) {
    if (m[1] === '{' && DYNAMIC_BACKHREF_DECIDED.has(f.replaceAll('\\', '/'))) continue;
    if (m[1] === '{') {
      errors.push(
        `${f}: backHref={...} is not a plain literal, so it cannot be checked against the ${stubs.size} redirect stubs. ` +
          `Use a literal, or decide deliberately and exempt it here.`,
      );
      continue;
    }
    const route = normaliseRoute(m[2]);
    if (stubs.has(route)) errors.push(`${f}: backHref="${m[2]}" targets a stub (use ${stubs.get(route)})`);
  }
}

if (errors.length) {
  console.error(errors.join('\n'));
  process.exit(1);
}
console.log(`ok — ${stubs.size} stubs, no revalidatePath or backHref targets a stub`);
