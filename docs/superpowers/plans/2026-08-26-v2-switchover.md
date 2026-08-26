# V2 Switchover (PR Γ) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Το v2 γίνεται η μοναδική έκδοση στα καθαρά URL (`/admin`, `/client`, `/employee`, `/salesman`)· τα `-v2` δέντρα διαγράφονται· κανένα λινκ, bookmark, email ή `revalidatePath` δεν σπάει.

**Architecture:** «Το παλιό δέντρο φοράει το νέο κέλυφος» (spec §Στρατηγική): τα 4 v1 layouts αντικαθίστανται από τα v2 shells· οι v2 hub/own σελίδες κάνουν git mv στα καθαρά paths· τα routes που συγχωνεύτηκαν σε καρτέλες γίνονται μόνιμα redirect stubs· τα `-v2` URLs redirect στα καθαρά μέσω middleware· τα `revalidatePath` ξαναγράφονται βάσει ντετερμινιστικού χάρτη με guard script.

**Tech Stack:** Next.js 16 App Router, next-intl, Playwright.

**Spec:** `docs/superpowers/specs/2026-08-26-v2-switchover-spec.md` — η ενότητα «Στρατηγική γυρίσματος» είναι δεσμευτική. Η απογραφή του -v2 δέντρου παράγεται αναπαραγώγιμα με `node scripts/v2-route-inventory.mjs` (ήδη στο branch).

## Global Constraints

- Branch `feat/v2-switchover` από origin/master `97d4711` (περιλαμβάνει PR #97+#98).
- Πριν από ΚΑΘΕ commit: `pnpm build` περνά. `pnpm type-check` + `pnpm lint` στο τέλος κάθε task.
- Ενδιάμεσες commits επιτρέπεται να έχουν διπλά δέντρα (v1+v2 ταυτόχρονα) — αρκεί να χτίζουν. Η ΣΥΜΠΕΡΙΦΟΡΑ ολοκληρώνεται στο Task 5.
- Τα stubs είναι ΜΟΝΙΜΑ (spec: κρατούν 92 hardcoded hrefs, bookmarks, emails). Μορφή stub:

```tsx
import { redirect } from 'next/navigation';

/** Άλλαξε σπίτι στο νέο μοντέλο — ο σύνδεσμος μένει ζωντανός. */
export default function <Name>Redirect() {
  redirect('<target>');
}
```

- git mv (όχι delete+create) για κάθε μετακίνηση — διατήρηση history.
- Ποτέ commit `.npmrc` / `.env.local` (untracked τοπικά workarounds).
- Conventional commits, imperative mood.

## Ο χάρτης (δεσμευτικός — παράγεται από την απογραφή)

### Stub routes (παλιό path → νέο path[?tab])

| Παλιό (γίνεται stub) | Target |
|---|---|
| /admin | /admin/today |
| /admin/dashboard | /admin/today |
| /admin/dashboard/risk | /admin/today |
| /admin/chatbot | /admin/clients?tab=chat |
| /admin/contracts | /admin/clients?tab=contracts |
| /admin/leads | /admin/clients?tab=interest |
| /admin/proposals | /admin/clients?tab=proposals |
| /admin/projects | /admin/productions?tab=all |
| /admin/filming-requests | /admin/productions?tab=requests |
| /admin/invoices | /admin/finance?tab=invoices |
| /admin/invoices/expenses | /admin/finance?tab=expenses |
| /admin/reports | /admin/finance?tab=reports |
| /admin/cost-model | /admin/finance?tab=cost |
| /admin/pricing-health | /admin/finance?tab=health |
| /admin/university | /admin/knowledge?tab=team |
| /admin/sales-resources | /admin/knowledge?tab=sales |
| /admin/settings → ΜΕΝΕΙ route; βλ. C3 — stub ΔΕΝ μπαίνει στο /admin/settings (είναι το ίδιο το hub path) |  |
| /admin/users | /admin/settings?tab=users |
| /admin/proposal-packages | /admin/settings?tab=packages |
| /admin/contracts/templates | /admin/settings?tab=templates |
| /client | /client/home |
| /client/dashboard | /client/home |
| /client/projects | /client/productions |
| /client/contracts | /client/documents?tab=contracts |
| /client/invoices | /client/documents?tab=invoices |
| /employee | /employee/today |
| /employee/dashboard | /employee/today |
| /employee/projects | /employee/productions |
| /employee/tasks | /employee/work?tab=tasks |
| /employee/university | /employee/knowledge |
| /salesman | /salesman/today |
| /salesman/dashboard | /salesman/today |
| /salesman/resources | /salesman/library?tab=resources |
| /salesman/handbook | /salesman/library?tab=handbook |

### Hub/OWN pages: git mv από -v2 στο καθαρό path (μαζί με το loading.tsx του δίπλα, όπου υπάρχει)

admin: `today`, `clients`, `productions`, `calendar` (αντικαθιστά το v1 calendar/page.tsx), `finance`, `knowledge`, `settings` (βλ. C3 πρώτα) · client: `home`, `documents` · employee: `work` (+ `work/deliverables-index.tsx`) · salesman: `library`. Μέσα σε ΚΑΘΕ μετακινημένο αρχείο: κάθε string `/<role>-v2/` γίνεται `/<role>/` (basePath, hrefs, redirects).

### C2 — v1 σελίδες που ΜΕΤΑΚΟΜΙΖΟΥΝ σε νέο path (git mv, μαζί με το -v2 loading.tsx του προορισμού)

| v1 αρχείο | Νέο path |
|---|---|
| src/app/client/dashboard/page.tsx | src/app/client/home/page.tsx |
| src/app/client/projects/page.tsx | src/app/client/productions/page.tsx |
| src/app/employee/dashboard/page.tsx | src/app/employee/today/page.tsx |
| src/app/employee/projects/page.tsx | src/app/employee/productions/page.tsx |
| src/app/employee/university/page.tsx | src/app/employee/knowledge/page.tsx |
| src/app/salesman/dashboard/page.tsx | src/app/salesman/today/page.tsx |

(τα [id]/υπο-routes τους ΔΕΝ μετακινούνται — μένουν στα παλιά paths, C1)

### C3 — v1 pages που καταναλώνονται από hubs ως components: μετονομασία εκτός route + ενημέρωση import στο hub

| v1 αρχείο | Νέο όνομα (ίδιος φάκελος) | Hub που κάνει import |
|---|---|---|
| src/app/admin/settings/page.tsx | settings-page.tsx | admin settings hub (tab general) |
| src/app/admin/users/page.tsx | users-page.tsx | admin settings hub (tab users) |
| src/app/admin/proposal-packages/page.tsx | packages-page.tsx | admin settings hub (tab packages) |
| src/app/admin/contracts/templates/page.tsx | templates-page.tsx | admin settings hub (tab templates) |
| src/app/admin/filming-requests/page.tsx | requests-page.tsx | admin productions hub (tab requests) |
| src/app/client/contracts/page.tsx | contracts-page.tsx | client documents hub |
| src/app/client/invoices/page.tsx | invoices-page.tsx | client documents hub |
| src/app/employee/tasks/page.tsx | tasks-page.tsx | employee work hub |
| src/app/salesman/resources/page.tsx | resources-page.tsx | salesman library hub |
| src/app/salesman/handbook/page.tsx | handbook-page.tsx | salesman library hub |

ΠΡΟΣΟΧΗ στο /admin/settings: το hub ΚΑΙ το C3 μοιράζονται τον φάκελο — πρώτα `git mv settings/page.tsx settings/settings-page.tsx`, μετά `git mv src/app/admin-v2/settings/page.tsx src/app/admin/settings/page.tsx` (+ import `./settings-page`).

### C1 — v2 wrappers ίδιου path: απλή διαγραφή (το v1 page μένει ως έχει)

Όλα τα υπόλοιπα REEXP της απογραφής (availability, detail pages `[id]`, notifications, settings ρόλων, book, filming-prep, articles κ.λπ.) — σβήνονται μαζί με το -v2 δέντρο στο Task 5, καμία ενέργεια στο v1.

### revalidatePath rewrite map (παλιό literal → νέο literal, χωρίς query)

/admin/dashboard→/admin/today · /admin/chatbot→/admin/clients · /admin/contracts→/admin/clients · /admin/leads→/admin/clients · /admin/proposals→/admin/clients · /admin/projects→/admin/productions · /admin/filming-requests→/admin/productions · /admin/invoices→/admin/finance · /admin/invoices/expenses→/admin/finance · /admin/reports→/admin/finance · /admin/cost-model→/admin/finance · /admin/pricing-health→/admin/finance · /admin/university→/admin/knowledge · /admin/sales-resources→/admin/knowledge · /admin/users→/admin/settings · /admin/proposal-packages→/admin/settings · /admin/contracts/templates→/admin/settings · /client/dashboard→/client/home · /client/projects→/client/productions · /client/contracts→/client/documents · /client/invoices→/client/documents · /employee/dashboard→/employee/today · /employee/projects→/employee/productions · /employee/tasks→/employee/work · /employee/university→/employee/knowledge · /salesman/dashboard→/salesman/today · /salesman/resources→/salesman/library · /salesman/handbook→/salesman/library

Prefix-μεγαλύτερα literals (π.χ. `/admin/projects/${id}`) ΔΕΝ αγγίζονται — τα detail routes μένουν ζωντανά.

---

### Task 1: Guard script για routes & revalidatePath

**Files:**
- Create: `scripts/check-routes.mjs`
- Modify: `package.json` (script `"check:routes": "node scripts/check-routes.mjs"`)

**Interfaces:**
- Produces: script που (α) σαρώνει ΟΛΑ τα `src/app/**/page.tsx` και βρίσκει τα stub pages (περιέχουν `redirect('...')` και τίποτα άλλο ουσιαστικό), (β) μαζεύει όλα τα string literals πρώτου ορίσματος `revalidatePath('...')` στο `src/`, (γ) αποτυγχάνει (exit 1, λίστα ευρημάτων) αν κάποιο literal ισούται με stub path Ή αν κάποιο stub target (χωρίς query) δεν αντιστοιχεί σε υπαρκτό page.tsx. Το Task 6 και το τελικό verification το τρέχουν.

- [ ] **Step 1: Γράψε το script**

```js
// scripts/check-routes.mjs — guard: κανένα revalidatePath σε stub route, κανένα stub χωρίς υπαρκτό target.
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

const errors = [];
for (const [route, target] of stubs) {
  const clean = target.split('?')[0];
  const targetPage = join('src/app', clean === '/' ? '' : clean, 'page.tsx');
  if (!existsSync(targetPage)) errors.push(`stub ${route} -> ${target}: target page missing`);
}

const files = walk('src').filter((p) => /\.(ts|tsx)$/.test(p));
for (const f of files) {
  const src = readFileSync(f, 'utf8');
  for (const m of src.matchAll(/revalidatePath\(\s*'([^']+)'/g)) {
    if (stubs.has(m[1])) errors.push(`${f}: revalidatePath('${m[1]}') targets a stub (use ${stubs.get(m[1]).split('?')[0]})`);
  }
}

if (errors.length) {
  console.error(errors.join('\n'));
  process.exit(1);
}
console.log(`ok — ${stubs.size} stubs, no revalidatePath targets a stub`);
```

- [ ] **Step 2: Τρέξε το — στο σημερινό δέντρο πρέπει να ΠΕΡΝΑ**

Run: `node scripts/check-routes.mjs`
Expected: `ok — ... stubs` (τα -v2 stubs έχουν υπαρκτά -v2 targets· κανένα revalidatePath δεν δείχνει ήδη σε stub — τα v1 paths δεν είναι ακόμη stubs).

- [ ] **Step 3: Commit**

```bash
git add scripts/check-routes.mjs package.json
git commit -m "chore: route/revalidatePath guard script for the switchover"
```

---

### Task 2: Admin tree switchover

**Files:** `src/app/admin/**`, `src/app/admin-v2/{today,clients,productions,calendar,finance,knowledge,settings}/*` (git mv έξω), + τα loading.tsx τους.

**Interfaces:**
- Consumes: τους πίνακες «Ο χάρτης» παραπάνω (admin γραμμές μόνο).
- Produces: το /admin δέντρο πλήρες σε v2 μορφή. Το /admin-v2 μένει προσωρινά ημιτελές (τα μετακινημένα λείπουν) — αποδεκτό, σβήνεται στο Task 5.

- [ ] **Step 1: Layout swap**

`src/app/admin/layout.tsx` γίνεται:

```tsx
import { AdminV2Shell } from '@/components/admin-v2/shell';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <AdminV2Shell>{children}</AdminV2Shell>;
}
```

- [ ] **Step 2: C3 μετονομασίες admin** (πίνακας C3, 5 αρχεία) — `git mv`, τα default exports μένουν ίδια.

- [ ] **Step 3: Hub/OWN μετακινήσεις admin** — για καθένα από today, clients, productions, calendar, finance, knowledge, settings: `git mv src/app/admin-v2/<x>/page.tsx src/app/admin/<x>/page.tsx` (το calendar αντικαθιστά το υπάρχον v1 — πρώτα `git rm src/app/admin/calendar/page.tsx`)· `git mv` και το αντίστοιχο `src/app/admin-v2/<x>/loading.tsx` (το /admin/calendar & /admin/clients έχουν ήδη v1 loading.tsx — αντικατάστησέ τα με τα -v2)· μέσα στα μετακινημένα: `/admin-v2/` → `/admin/` παντού (basePath, Link hrefs, redirect targets)· imports C3 → τα νέα ονόματα (`./settings-page` κ.λπ., ή absolute `@/app/admin/filming-requests/requests-page`).

- [ ] **Step 4: Stubs admin** — δημιουργία stub page.tsx σε ΟΛΑ τα admin paths του πίνακα stubs (19 συν το root `/admin/page.tsx`), με τα de-v2 targets. Τα dashboard/* παλιά αρχεία (`page.tsx`, `risk/page.tsx`, `loading.tsx`) διαγράφονται (`git rm`) — τα widgets ζουν στο components/. Παλιά v1 loading.tsx σε φακέλους που έγιναν stub (invoices, contracts, projects, filming-requests, reports, users, university): `git rm`.

- [ ] **Step 5: Build + commit**

Run: `pnpm build` → επιτυχία (και τα δύο δέντρα χτίζουν).

```bash
git add -A src/app/admin src/app/admin-v2
git commit -m "feat(v2): admin tree wears the v2 shell at clean URLs"
```

---

### Task 3: Client tree switchover

Ίδια συνταγή με Task 2, γραμμές client του χάρτη:
- [ ] Step 1: `src/app/client/layout.tsx` → `<ClientV2Shell>` (από `@/components/client-v2/shell`).
- [ ] Step 2: C3: contracts/page.tsx→contracts-page.tsx, invoices/page.tsx→invoices-page.tsx.
- [ ] Step 3: C2: dashboard/page.tsx→home/page.tsx, projects/page.tsx→productions/page.tsx (τα [projectId], [invoiceId], [contractId] ΜΕΝΟΥΝ στα παλιά paths). Hub: documents (+loading), home loading από -v2· imports → `../contracts/contracts-page` κ.λπ.· `/client-v2/`→`/client/` σε όλα τα μετακινημένα. Τα v1 loading.tsx των dashboard/projects/contracts/invoices: git rm (αντικαθίστανται από τα -v2 ή γίνονται stub dirs).
- [ ] Step 4: Stubs: /client, /client/dashboard, /client/projects, /client/contracts, /client/invoices.
- [ ] Step 5: `pnpm build` → commit `feat(v2): client tree wears the v2 shell at clean URLs`.

---

### Task 4: Employee + salesman trees switchover

Ίδια συνταγή, δύο commits (ένα ανά ρόλο):
- [ ] Employee: layout → `EmployeeV2Shell`· C3 tasks/page.tsx→tasks-page.tsx· C2 dashboard→today, projects→productions, university→knowledge (τα university/[categorySlug]/** ΜΕΝΟΥΝ)· hub work (+deliverables-index.tsx +loading)· -v2 loading των today/productions/knowledge μετακομίζουν· stubs: /employee, dashboard, projects, tasks, university· `/employee-v2/`→`/employee/`. Commit: `feat(v2): employee tree wears the v2 shell at clean URLs`.
- [ ] Salesman: layout → `SalesmanV2Shell`· C3 resources/page.tsx→resources-page.tsx, handbook/page.tsx→handbook-page.tsx· C2 dashboard→today· hub library (+loading)· -v2 today/leads loading μετακομίζουν (leads path ίδιο — μόνο το loading.tsx από -v2 αν το v1 δεν έχει)· stubs: /salesman, dashboard, resources, handbook· `/salesman-v2/`→`/salesman/`. Commit: `feat(v2): salesman tree wears the v2 shell at clean URLs`.
- [ ] `pnpm build` πριν από κάθε commit.

---

### Task 5: Κατεδάφιση -v2 + middleware + καθάρισμα κελύφους

**Files:** `src/app/*-v2/` (διαγραφή), `src/middleware.ts`, `src/components/shell-v2/{app-shell,keep-in-shell}.tsx`, `src/components/*-v2/nav.ts`, `src/components/*-v2/shell.tsx`, τα ορφανά v1 chrome components, `e2e/*.spec.ts`, `messages/*.json`, `src/lib/auth/resolve-redirect.ts` (αν χρειάζεται).

- [ ] **Step 1: Διαγραφή -v2 δέντρων**: `git rm -r src/app/admin-v2 src/app/client-v2 src/app/employee-v2 src/app/salesman-v2` (ό,τι απέμεινε: C1 wrappers, stubs, layouts).

- [ ] **Step 2: Middleware**: στο `src/middleware.ts`, αμέσως μετά το `const { pathname } = request.nextUrl;` (γραμμή ~83):

```ts
// Τα -v2 URLs της περιόδου preview ζουν για πάντα ως redirects στα καθαρά.
const v2Match = pathname.match(/^\/(admin|client|employee|salesman)-v2(\/.*)?$/);
if (v2Match) {
  const url = request.nextUrl.clone();
  url.pathname = `/${v2Match[1]}${v2Match[2] ?? ''}`;
  return NextResponse.redirect(url, 308);
}
```

και `getDashboardForRole`: `/admin/today`, `/employee/today`, `/salesman/today`, `/client/home`. Έλεγξε και το `src/lib/auth/resolve-redirect.ts` για hardcoded `/dashboard` paths — ενημέρωσε αντίστοιχα αν υπάρχουν.

- [ ] **Step 3: KeepInShell + rolePrefix**: `git rm src/components/shell-v2/keep-in-shell.tsx`· από το `app-shell.tsx` φύγε το import/χρήση του και το prop `rolePrefix` (και από τα 4 `*-v2/shell.tsx` που το περνούν). Φύγε και το preview badge (`{t('previewBadge')}` + το span του) — δεν είναι πια preview· σβήσε το κλειδί `shellV2.previewBadge` και από τα δύο messages.

- [ ] **Step 4: nav.ts ×4**: όλα τα hrefs `/<role>-v2/...` → `/<role>/...`.

- [ ] **Step 5: Ορφανά v1 chrome**: πριν σβήσεις, grep χρήσεις εκτός των παλιών layouts. Αναμενόμενα διαγράψιμα: `src/components/admin/{sidebar,header,mobile-nav}.tsx`, `src/components/employee/{sidebar,header}.tsx`, `src/components/salesman/{sidebar,header}.tsx`, `src/components/client/navbar.tsx`. Αν κάτι έχει άλλον consumer, κράτα το και ανάφερέ το ως concern.

- [ ] **Step 6: e2e**: σε ΟΛΑ τα specs, `/admin-v2/` κ.λπ. → καθαρά paths. Το test του badge («Προεπισκόπηση v2») αντικαθίσταται με πραγματικό assertion του chrome, π.χ. `await expect(page.locator('aside a[href="/admin/today"]')).toBeVisible();`. Τα υπάρχοντα v1-path specs (π.χ. `admin-dashboard.spec.ts` που χτυπά `/admin/dashboard`) ΘΑ προσγειώνονται σε stub → ενημέρωσε τα goto/assertions στα νέα paths (π.χ. `/admin/today`) ή, όπου το spec αφορά σελίδα που χάθηκε (π.χ. πλήρες v1 dashboard layout), προσάρμοσε τα assertions σε ό,τι πραγματικά υπάρχει πλέον — μην αφήσεις spec να ελέγχει πράγμα που δεν υπάρχει.

- [ ] **Step 7: Verification sweep + commit**

Run: `grep -rn '\-v2' src e2e --include='*.ts' --include='*.tsx' | grep -v 'components/' | grep -v middleware` → μόνο σχόλια/τίποτα. `node scripts/check-routes.mjs` → θα ΑΠΟΤΥΓΧΑΝΕΙ ακόμη στα revalidatePath (αναμενόμενο — Task 6). `pnpm build && pnpm type-check && pnpm lint` → καθαρά.

```bash
git add -A
git commit -m "feat(v2): retire the -v2 preview — middleware redirects, shell cleanup, e2e on clean paths"
```

---

### Task 6: revalidatePath rewrite

**Files:** `src/lib/actions/*.ts`, `src/lib/apply-status-change.ts`, `src/app/api/contracts/[contractId]/upload-signed/route.ts` (όπου υπάρχουν literals του χάρτη).

- [ ] **Step 1**: Εφάρμοσε τον «revalidatePath rewrite map» με προσεκτικό sed/χειροκίνητα: ΜΟΝΟ ακριβή literals (`revalidatePath('/admin/projects')`), ΟΧΙ template literals με id. Πρόσεξε: `/admin/invoices/expenses` πριν από το `/admin/invoices` (σειρά αντικατάστασης).
- [ ] **Step 2**: Run: `node scripts/check-routes.mjs` → **ok**. `pnpm build && pnpm type-check` → καθαρά.
- [ ] **Step 3**: Commit `fix(v2): point every revalidatePath at the routes that now render the data`.

---

### Task 7: Παρκαρισμένα minors + τελικός έλεγχος

**Files:** `src/lib/auth-helpers.ts`, `src/app/admin/today/page.tsx`, `e2e/v2-shell.spec.ts`.

- [ ] **Step 1**: `getAdminRole`: τύλιξε σε `cache()` (`import { cache } from 'react'`), και έλεγξε το `{ error }` του profile query — `console.error('[getAdminRole]', error)` πριν το `return null`.
- [ ] **Step 2**: Στο today page: `const [t, role] = await Promise.all([getTranslations(...), getAdminRole()]);`.
- [ ] **Step 3**: Στο e2e overview test: πρόσθεσε assertion και για τον τίτλο του `UpcomingDeadlinesGrouped` (βρες το πραγματικό string στο component/messages — μην μαντέψεις).
- [ ] **Step 4: Τελικό verification όλου του branch**

Run: `pnpm build && pnpm type-check && pnpm lint && node scripts/check-routes.mjs && pnpm exec playwright test --list`
Expected: όλα καθαρά, όλα τα specs συλλέγονται.

- [ ] **Step 5**: Commit `chore(v2): cache getAdminRole, parallel today fetch, deadlines smoke`.

---

## Self-Review Notes

- Η σειρά Task 2→5 αφήνει ενδιάμεσα λειτουργικά «διπλά» δέντρα — δεκτό ανά commit, με τελική συμπεριφορά στο Task 5. Το KeepInShell συνεχίζει να στέλνει κλικ στο -v2 μέχρι το Task 5 — αποδεκτό (το -v2 υπάρχει ακόμη).
- Emails/Stripe/PDF paths καλύπτονται από τα μόνιμα stubs (spec §Emails) — καμία αλλαγή στο `src/lib/email/`.
- Το `getRiskItems` με τα v1 hrefs (`/admin/invoices/...` κ.λπ.): ΟΛΑ detail paths που παραμένουν ζωντανά — καμία αλλαγή.
- `notification-bell` (`/${pathname.split('/')[1]}/notifications`): στα καθαρά URL δίνει `/admin/notifications` — υπαρκτό (C1). ΟΚ.
- Ο guard `check-routes.mjs` μένει για πάντα: κάθε μελλοντικό route-merge θα σκάει το script αντί για σιωπηλά stale UI.
