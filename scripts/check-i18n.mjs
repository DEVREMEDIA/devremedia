// Φύλακας μετάφρασης: όταν ένα component ζητά κλειδί που δεν υπάρχει, το
// next-intl δεν πετάει σφάλμα — τυπώνει στην οθόνη το ΙΔΙΟ το μονοπάτι του
// κλειδιού (π.χ. `leads.convertDescription`). Τίποτα άλλο στο repo δεν το
// πιάνει: το `pnpm build` περνάει, το `tsc` περνάει (το `t('οτιδήποτε')`
// τυπίζεται ως string), το `pnpm lint` περνάει, και το `check-design.mjs`
// δεν ανοίγει καν το messages/. Επτά τέτοια βρέθηκαν διαβάζοντας ένα diff με
// το χέρι — αυτός ο έλεγχος είναι για να μην ξαναγίνει.
// Τρέχει από τη ρίζα: node scripts/check-i18n.mjs
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

// Ίδιο σχήμα ελέγχου με το check-design.mjs: ό,τι ΔΕΝ μπορεί να αποφασιστεί
// στατικά δεν σιωπά — μετριέται και τυπώνεται στη γραμμή επιτυχίας, με λόγο.
// Ένα κλειδί όπως `t(item.label)` ή `t(\`groups.${kind}\`)` δεν λύνεται ποτέ
// σε πράξη ένα regex/parser χωρίς πλήρη type-checker· η τιμιότητα εδώ είναι
// να το πούμε, όχι να προσποιηθούμε κάλυψη που δεν έχουμε.
const TRANSLATION_CALLS = ['useTranslations', 'getTranslations'];

function walk(target, out = []) {
  let stat;
  try {
    stat = statSync(target);
  } catch {
    console.error(`check:i18n — cannot stat "${target}" (renamed or deleted?)`);
    process.exit(1);
  }
  if (!stat.isDirectory()) {
    if (/\.(tsx|ts)$/.test(target)) out.push(target);
    return out;
  }
  for (const name of readdirSync(target)) walk(join(target, name), out);
  return out;
}

/** Ίδια λογική με το check-design.mjs: σχόλια γραμμής/μπλοκ έξω, ώστε ένα
 * `// t('foo.bar')` σε παράδειγμα ή JSDoc να μην μοιάζει με πραγματική κλήση. */
function stripComments(line) {
  const trimmed = line.trim();
  if (trimmed.startsWith('*') || trimmed.startsWith('/*')) return '';
  const i = line.search(/(?<!:)\/\//);
  return i === -1 ? line : line.slice(0, i);
}

/** Βρίσκει την παρένθεση κλεισίματος που ταιριάζει με το openIndex, χωρίς να
 * μπερδεύεται από παρενθέσεις μέσα σε strings/template literals (π.χ.
 * `t('rowsSelected', { total: table.getFilteredRowModel().rows.length })`). */
function matchClosingParen(source, openIndex) {
  let depth = 1;
  let inString = null;
  for (let i = openIndex + 1; i < source.length; i++) {
    const ch = source[i];
    if (inString) {
      if (ch === '\\') {
        i++;
      } else if (ch === inString) {
        inString = null;
      }
      continue;
    }
    if (ch === "'" || ch === '"' || ch === '`') {
      inString = ch;
    } else if (ch === '(') {
      depth++;
    } else if (ch === ')') {
      depth--;
      if (depth === 0) return i;
    }
  }
  return -1; // ασύμβατο πηγαίο κείμενο — δεν κλείνει ποτέ. Ο καλών το χειρίζεται.
}

/** Σπάει ένα κείμενο σε top-level κομμάτια χωρισμένα με κόμμα, χωρίς να
 * μπερδεύεται από κόμματα μέσα σε `(){}[]` ή strings. Χρησιμοποιείται και
 * για τα ορίσματα μιας κλήσης t(...) και για τις ιδιότητες ενός object
 * literal ορίσματος. */
function splitTopLevel(text) {
  const parts = [];
  let depth = 0;
  let inString = null;
  let start = 0;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inString) {
      if (ch === '\\') {
        i++;
      } else if (ch === inString) {
        inString = null;
      }
      continue;
    }
    if (ch === "'" || ch === '"' || ch === '`') {
      inString = ch;
    } else if (ch === '(' || ch === '{' || ch === '[') {
      depth++;
    } else if (ch === ')' || ch === '}' || ch === ']') {
      depth--;
    } else if (ch === ',' && depth === 0) {
      parts.push(text.slice(start, i).trim());
      start = i + 1;
    }
  }
  const last = text.slice(start).trim();
  if (last.length > 0) parts.push(last);
  return parts;
}

/** Ένα όρισμα-κλειδί λύνεται στατικά μόνο αν είναι ΑΚΕΡΑΙΟ string literal —
 * `'leads.convertDescription'`, `"foo"`, ή template χωρίς `${`. Οτιδήποτε
 * άλλο (μεταβλητή, member expression, template με παρεμβολή) είναι δυναμικό
 * κλειδί: δεν λύνεται στατικά, ΔΕΝ αγνοείται σιωπηλά — μετριέται ως
 * "unchecked" με λόγο.
 */
function resolveLiteral(argText) {
  if (argText == null) return { literal: false, reason: 'no argument' };
  const trimmed = argText.trim();
  if (trimmed.length === 0) return { literal: false, reason: 'empty argument' };
  const quote = trimmed[0];
  if ((quote === "'" || quote === '"') && trimmed[trimmed.length - 1] === quote) {
    const inner = trimmed.slice(1, -1);
    // Ένα literal με απομεινάρι εισαγωγικό μέσα (π.χ. συνδυασμός quotes) δεν
    // είναι πλέον ένα ΑΚΕΡΑΙΟ string literal — παίζει ασφαλές, αναφέρεται ως
    // δυναμικό αντί να μαντέψει λάθος τιμή.
    if (!inner.includes(quote) || inner.includes(`\\${quote}`)) {
      return { literal: true, value: inner.replace(new RegExp(`\\\\${quote}`, 'g'), quote) };
    }
    return { literal: false, reason: 'non-literal key expression' };
  }
  if (quote === '`' && trimmed[trimmed.length - 1] === '`') {
    const inner = trimmed.slice(1, -1);
    if (inner.includes('${')) return { literal: false, reason: 'template-literal key (dynamic)' };
    return { literal: true, value: inner };
  }
  return { literal: false, reason: 'non-literal key expression' };
}

/** Ονόματα placeholder μέσα σε ένα μήνυμα — `{count}`, ή μέσα σε ICU plural
 * `{count, plural, one {...} other {...}}`. Ένα πραγματικό ICU argument
 * ακολουθείται ΑΜΕΣΩΣ (μετά από κενά) είτε από `}` (`{project}`) είτε από
 * `,` (`{count, plural, ...}`) — το ελληνικό/αγγλικό κείμενο ενός literal
 * branch δεν ταιριάζει ποτέ σε αυτό, γιατί συνεχίζει με άλλη λέξη μετά το
 * πρώτο αναγνωριστικό (π.χ. `{Nothing pending...}` -> μετά το "Nothing"
 * ακολουθεί κενό και μετά "pending", όχι `,`/`}`). Χωρίς αυτόν τον
 * περιορισμό, ένα αγγλικό literal branch σαν `{No deliverables yet}` θα
 * διαβαζόταν ως placeholder `No` — ψευδώς θετικό που το βρήκε η ίδια η
 * πρώτη εκτέλεση αυτού του ελέγχου. */
/** Το ICU επιτρέπει να γράψεις κυριολεκτικά άγκιστρα διαφεύγοντάς τα με
 * απόστροφους: `'{placeholder_name}'` τυπώνεται ως κείμενο και ΔΕΝ είναι
 * argument. Χρειάζεται στα κείμενα οδηγιών — π.χ. το πρότυπο συμβολαίου λέει
 * στον χρήστη «χρησιμοποιήστε {placeholder_name} για δυναμικές τιμές».
 *
 * Ο κανόνας του ICU είναι στενός και τον ακολουθούμε ακριβώς: ένας απόστροφος
 * ξεκινά διαφυγή ΜΟΝΟ αν ακολουθείται αμέσως από `{` ή `}`. Οπουδήποτε αλλού
 * είναι απλός απόστροφος — γι' αυτό το αγγλικό «don't» δεν ανοίγει διαφυγή και
 * δεν καταπίνει το υπόλοιπο μήνυμα. */
function stripIcuEscapes(message) {
  return message.replace(/'[{}][^']*'/g, '');
}

function placeholderNames(message) {
  const names = new Set();
  for (const m of stripIcuEscapes(message).matchAll(/\{\s*([A-Za-z_][A-Za-z0-9_]*)\s*[,}]/g))
    names.add(m[1]);
  return names;
}

/** Ιδιότητες ενός object literal ορίσματος (`{ count, total: x }`). Επιστρέφει
 * `null` αν κάποια ιδιότητα δεν αναλύεται με ασφάλεια (spread, computed key)
 * — τότε ο καλών το μετρά ως unchecked αντί να υποθέσει ελλιπές placeholder. */
function objectLiteralKeys(argText) {
  const trimmed = argText.trim();
  if (trimmed[0] !== '{' || trimmed[trimmed.length - 1] !== '}') return null;
  const inner = trimmed.slice(1, -1);
  const props = splitTopLevel(inner);
  const names = new Set();
  for (const prop of props) {
    if (prop.startsWith('...') || prop.startsWith('[')) return null;
    const keyed = prop.match(/^([A-Za-z_$][\w$]*)\s*:/);
    if (keyed) {
      names.add(keyed[1]);
      continue;
    }
    const shorthand = prop.match(/^([A-Za-z_$][\w$]*)$/);
    if (shorthand) {
      names.add(shorthand[1]);
      continue;
    }
    return null; // κάτι πιο σύνθετο (spread υπολογισμένη έκφραση, κ.λπ.)
  }
  return names;
}

function lookup(tree, path) {
  let node = tree;
  for (const part of path) {
    if (node == null || typeof node !== 'object' || Array.isArray(node)) return undefined;
    node = node[part];
  }
  return node;
}

const elTree = JSON.parse(readFileSync('messages/el.json', 'utf8'));
const enTree = JSON.parse(readFileSync('messages/en.json', 'utf8'));

const files = walk('src').map((f) => f.replaceAll('\\', '/'));

let filesWithBindings = 0;
let resolvedCalls = 0;
const missingKeys = []; // { file, line, path, missingFrom }
const placeholderMismatches = []; // { file, line, path, missing }
let placeholderChecksPassed = 0;

const uncheckedCalls = []; // { file, line, varName, reason }
const uncheckedReasonCounts = new Map();
function countUnchecked(reason) {
  uncheckedReasonCounts.set(reason, (uncheckedReasonCounts.get(reason) ?? 0) + 1);
}

let placeholderUncheckedCount = 0;
const placeholderUncheckedReasonCounts = new Map();
function countPlaceholderUnchecked(reason) {
  placeholderUncheckedReasonCounts.set(
    reason,
    (placeholderUncheckedReasonCounts.get(reason) ?? 0) + 1,
  );
}

// Δεσμεύει `varName = useTranslations('ns')` / `await getTranslations('ns')`.
// Πιάνει ΚΑΙ τις μη-literal περιπτώσεις (namespace περνιέται ως μεταβλητή) —
// αυτές δεν λύνονται ποτέ σε namespace string, άρα κάθε κλήση πάνω στη
// μεταβλητή γίνεται unchecked με λόγο "dynamic namespace" αντί να εξαφανιστεί.
const BINDING_RE =
  /\b(?:const|let)\s+(\w+)\s*=\s*(?:await\s+)?(?:useTranslations|getTranslations)\(([\s\S]*?)\)/g;

for (const file of files) {
  const rawSource = readFileSync(file, 'utf8');
  const lines = rawSource.split('\n');
  const stripped = lines.map(stripComments).join('\n');

  // Αντιστοίχιση offset -> γραμμή, υπολογισμένη μία φορά ανά αρχείο.
  const lineStarts = [0];
  for (let i = 0; i < stripped.length; i++) {
    if (stripped[i] === '\n') lineStarts.push(i + 1);
  }
  function lineOf(offset) {
    let lo = 0;
    let hi = lineStarts.length - 1;
    while (lo < hi) {
      const mid = (lo + hi + 1) >> 1;
      if (lineStarts[mid] <= offset) lo = mid;
      else hi = mid - 1;
    }
    return lo + 1;
  }

  const bindings = [];
  for (const m of stripped.matchAll(BINDING_RE)) {
    const varName = m[1];
    const resolved = resolveLiteral(m[2]);
    bindings.push({
      varName,
      index: m.index,
      namespace: resolved.literal ? resolved.value : null,
      dynamicNamespaceReason: resolved.literal ? null : 'dynamic namespace',
    });
  }
  if (bindings.length === 0) continue;
  filesWithBindings++;

  const varNames = [...new Set(bindings.map((b) => b.varName))].sort(
    (a, b) => b.length - a.length,
  );
  const escaped = varNames.map((v) => v.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  const CALL_RE = new RegExp(`\\b(${escaped.join('|')})(\\.(rich|markup|raw))?\\s*\\(`, 'g');

  for (const m of stripped.matchAll(CALL_RE)) {
    const varName = m[1];
    const isRich = Boolean(m[3]);
    const callStart = m.index;
    const openParenIndex = callStart + m[0].length - 1;

    // Μη μπερδευτείς με την ίδια τη δήλωση: `const t = useTranslations(...)`
    // δεν παράγει ποτέ υποσυμβολοσειρά `t(` (βλ. σχόλιο πάνω από BINDING_RE),
    // οπότε αυτό εδώ είναι πάντα πραγματική κλήση πάνω στη μεταβλητή.

    // Το πλησιέστερο ΠΡΟΗΓΟΥΜΕΝΟ binding της ίδιας μεταβλητής — προσέγγιση
    // εμβέλειας κατά σειρά γραμμών, όχι πραγματικό AST scope. Αρκεί εδώ:
    // κάθε component σε αυτό το repo δηλώνει τη δική του `const t = ...`
    // αμέσως στην αρχή του σώματός του.
    let binding = null;
    for (const b of bindings) {
      if (b.varName === varName && b.index < callStart) {
        if (!binding || b.index > binding.index) binding = b;
      }
    }
    if (!binding) continue; // δεν βρέθηκε binding πριν από την κλήση — αγνόησέ το

    const line = lineOf(callStart);

    if (binding.namespace === null) {
      uncheckedCalls.push({ file, line, varName, reason: binding.dynamicNamespaceReason });
      countUnchecked(binding.dynamicNamespaceReason);
      continue;
    }

    const closeParenIndex = matchClosingParen(stripped, openParenIndex);
    if (closeParenIndex === -1) {
      uncheckedCalls.push({ file, line, varName, reason: 'unbalanced call (parser gave up)' });
      countUnchecked('unbalanced call (parser gave up)');
      continue;
    }
    const argsText = stripped.slice(openParenIndex + 1, closeParenIndex);
    const args = splitTopLevel(argsText);

    const keyResult = resolveLiteral(args[0]);
    if (!keyResult.literal) {
      uncheckedCalls.push({ file, line, varName, reason: keyResult.reason });
      countUnchecked(keyResult.reason);
      continue;
    }

    resolvedCalls++;
    const path = `${binding.namespace}.${keyResult.value}`.split('.').filter((p) => p.length > 0);
    const elValue = lookup(elTree, path);
    const enValue = lookup(enTree, path);
    const existsEl = typeof elValue === 'string';
    const existsEn = typeof enValue === 'string';

    if (!existsEl || !existsEn) {
      const missingFrom = [];
      if (!existsEl) missingFrom.push('el');
      if (!existsEn) missingFrom.push('en');
      missingKeys.push({ file, line, path: path.join('.'), missingFrom });
      continue; // ένα ανύπαρκτο κλειδί δεν έχει νόημα να ελεγχθεί για placeholders
    }

    if (isRich) continue; // t.rich/.markup/.raw δεν περνάει values σαν το t() απλό

    const required = new Set([...placeholderNames(elValue), ...placeholderNames(enValue)]);
    if (required.size === 0) continue; // τίποτα να ελεγχθεί

    if (args.length < 2) {
      placeholderMismatches.push({
        file,
        line,
        path: path.join('.'),
        missing: [...required],
      });
      continue;
    }
    const provided = objectLiteralKeys(args[1]);
    if (provided === null) {
      countPlaceholderUnchecked('params argument not a plain inline object literal');
      placeholderUncheckedCount++;
      continue;
    }
    const missing = [...required].filter((n) => !provided.has(n));
    if (missing.length > 0) {
      placeholderMismatches.push({ file, line, path: path.join('.'), missing });
    } else {
      placeholderChecksPassed++;
    }
  }
}

const totalCalls = resolvedCalls + uncheckedCalls.length;

if (missingKeys.length > 0 || placeholderMismatches.length > 0) {
  if (missingKeys.length > 0) {
    console.error(
      `check:i18n — ${missingKeys.length} translation key(s) do not resolve in messages/el.json and/or messages/en.json:\n`,
    );
    for (const { file, line, path, missingFrom } of missingKeys) {
      console.error(`  ${file}:${line}  ${path}  (missing from: ${missingFrom.join(', ')})`);
    }
    console.error(
      '\nnext-intl renders the key path itself on screen when a key is missing — add the key to messages/el.json and messages/en.json.',
    );
  }
  if (placeholderMismatches.length > 0) {
    console.error(
      `\ncheck:i18n — ${placeholderMismatches.length} call(s) do not pass all placeholders their message requires:\n`,
    );
    for (const { file, line, path, missing } of placeholderMismatches) {
      console.error(`  ${file}:${line}  ${path}  missing: ${missing.join(', ')}`);
    }
    console.error(
      '\nA message with an unfilled placeholder is a next-intl runtime error, not a fallback — pass the missing value(s).',
    );
  }
  process.exit(1);
}

const uncheckedBreakdown = [...uncheckedReasonCounts.entries()]
  .map(([reason, count]) => `${count} ${reason}`)
  .join(', ');
const placeholderUncheckedBreakdown = [...placeholderUncheckedReasonCounts.entries()]
  .map(([reason, count]) => `${count} ${reason}`)
  .join(', ');

console.log(
  `ok — ${resolvedCalls} call(s) resolved against messages/el.json + messages/en.json ` +
    `across ${filesWithBindings} file(s) with translation bindings; ` +
    `${uncheckedCalls.length}/${totalCalls} call(s) could not be checked statically` +
    (uncheckedBreakdown ? ` (${uncheckedBreakdown})` : '') +
    `; ${placeholderChecksPassed} placeholder check(s) passed, ` +
    `${placeholderUncheckedCount} unchecked` +
    (placeholderUncheckedBreakdown ? ` (${placeholderUncheckedBreakdown})` : ''),
);
