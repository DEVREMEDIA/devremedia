# V2 Shell Hardening (PR Α) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Θωράκιση του v2 shell (live στο -v2 preview) ώστε να μη χάνει τίποτα από το v1 chrome: i18n + language switcher, πλήρες mobile nav, λινκ για τις 4 ορφανές σελίδες, 2 bug fixes, loading skeletons, e2e smoke.

**Architecture:** Όλες οι αλλαγές είναι στο v2 layer (`src/app/*-v2/**`, `src/components/shell-v2/**`, `src/components/*-v2/nav.ts`) + `messages/*.json`. Το re-exported v1 περιεχόμενο ΔΕΝ αγγίζεται — είναι ήδη μεταφρασμένο. Νέο i18n namespace `shellV2` με next-intl (client: `useTranslations`, server: `getTranslations`).

**Tech Stack:** Next.js 16 App Router, next-intl 4.8 (cookie `NEXT_LOCALE`, default `el`), Tailwind 4, Playwright.

**Spec:** `docs/superpowers/specs/2026-08-26-v2-switchover-spec.md`

## Global Constraints

- Branch από **φρέσκο** `origin/master` (το τοπικό master είναι stale): `git fetch origin && git checkout -b feat/v2-shell-hardening origin/master`. Ποτέ push σε master· PR flow.
- Πριν από ΚΑΘΕ commit: `pnpm build` πρέπει να περνά. `pnpm type-check` και `pnpm lint` στο τέλος κάθε task.
- CLAUDE.md: πριν την επεξεργασία υπάρχοντος exported symbol τρέξε `gitnexus_impact({target: "<Symbol>", direction: "upstream"})` και σταμάτα αν βγει HIGH/CRITICAL. (Νέα αρχεία/symbols δεν το χρειάζονται.)
- Μην αγγίξεις: `src/app/{admin,client,employee,salesman}/**` (v1 content) εκτός των 2 bug-fix αρχείων του Task 5 στο `src/components/`, `PR #95` υλικό, untracked φακέλους (`design-explorations/`, `patches/`, `tzeni/`, `.sandcastle/`, `.gitnexus/`, `src/app/dev/prototype-ia/`).
- Όλα τα ελληνικά strings που μεταφέρονται σε messages αντιγράφονται **verbatim** ως τιμές `el` — καμία αναδιατύπωση.
- Conventional commits, imperative mood.

---

### Task 1: Language switcher + πλήρες mobile nav στον admin

**Files:**
- Modify: `src/components/shell-v2/app-shell.tsx`
- Modify: `src/components/admin-v2/nav.ts:24-25`

**Interfaces:**
- Consumes: `LanguageSwitcher` από `@/components/shared/language-switcher` (υπάρχει, χρησιμοποιείται ήδη στο v1 `src/components/admin/header.tsx:12,39`).
- Produces: τίποτα νέο — το `MOBILE_NAV_ITEMS` του admin αποκτά 6 items· το `ShellBottomNav` ήδη κάνει render με δυναμικό grid (`repeat(${items.length}, …)`), οπότε δεν αλλάζει.

- [ ] **Step 1: Πρόσθεσε το LanguageSwitcher στο header του AppShell**

Στο `src/components/shell-v2/app-shell.tsx`, πρόσθεσε το import και το στοιχείο δίπλα στο ThemeToggle:

```tsx
import { LanguageSwitcher } from '@/components/shared/language-switcher';
```

και στο JSX (γραμμές 43-46), από:

```tsx
        <div className="flex-1" />
        <ThemeToggle />
        <NotificationBell />
```

σε:

```tsx
        <div className="flex-1" />
        <LanguageSwitcher />
        <ThemeToggle />
        <NotificationBell />
```

- [ ] **Step 2: Δώσε και τα 6 items στο mobile nav του admin**

Στο `src/components/admin-v2/nav.ts`, αντικατέστησε τις γραμμές 24-25:

```ts
/** Τα 5 items που χωράνε στην κάτω μπάρα του κινητού. */
export const MOBILE_NAV_ITEMS: NavItem[] = NAV_ITEMS.slice(0, 5);
```

με:

```ts
/** Στο κινητό χωράνε και τα 6 — το grid της μπάρας προσαρμόζεται στο πλήθος. */
export const MOBILE_NAV_ITEMS: NavItem[] = NAV_ITEMS;
```

- [ ] **Step 3: Build για επιβεβαίωση**

Run: `pnpm build`
Expected: επιτυχές build.

Χειροκίνητος οπτικός έλεγχος (προαιρετικός εδώ, καλύπτεται από e2e στο Task 7): `pnpm dev`, `/admin-v2/today` → ο switcher φαίνεται στο header· σε mobile viewport (390px) η κάτω μπάρα δείχνει 6 κουμπιά με τη «Γνώση» παρούσα.

- [ ] **Step 4: Commit**

```bash
git add src/components/shell-v2/app-shell.tsx src/components/admin-v2/nav.ts
git commit -m "fix(v2): add language switcher to shell and restore Knowledge in mobile nav"
```

---

### Task 2: i18n του κελύφους (nav labels + chrome)

**Files:**
- Modify: `messages/el.json`, `messages/en.json` (νέο top-level namespace `shellV2`)
- Modify: `src/components/admin-v2/nav.ts`, `src/components/client-v2/nav.ts`, `src/components/employee-v2/nav.ts`, `src/components/salesman-v2/nav.ts`
- Modify: `src/components/shell-v2/sidebar.tsx`, `src/components/shell-v2/bottom-nav.tsx`, `src/components/shell-v2/app-shell.tsx`

**Interfaces:**
- Produces: σύμβαση ότι τα `NavItem.label` / `NavItem.short` περιέχουν **κλειδιά** του namespace `shellV2` (π.χ. `'nav.admin.today'`), όχι έτοιμα strings. Τα shell components τα μεταφράζουν με `useTranslations('shellV2')`. Το Task 3 βασίζεται στο ίδιο namespace για τα hub pages.
- Consumes: `NavItem` από `src/components/shell-v2/types.ts` (τα πεδία μένουν `string` — δεν αλλάζει ο τύπος).

- [ ] **Step 1: Πρόσθεσε το namespace `shellV2` στα messages**

Στο `messages/el.json` (top-level, δίπλα στα υπάρχοντα namespaces):

```json
"shellV2": {
  "previewBadge": "Προεπισκόπηση v2",
  "mainMenu": "Κύριο μενού",
  "mobileMenu": "Μενού κινητού",
  "nav": {
    "settings": "Ρυθμίσεις",
    "settingsShort": "Ρυθμ.",
    "admin": {
      "today": "Σήμερα", "todayShort": "Σήμερα",
      "clients": "Πελάτες", "clientsShort": "Πελάτες",
      "productions": "Παραγωγές", "productionsShort": "Έργα",
      "calendar": "Ημερολόγιο", "calendarShort": "Ημερ.",
      "finance": "Οικονομικά", "financeShort": "Οικον.",
      "knowledge": "Γνώση", "knowledgeShort": "Γνώση"
    },
    "client": {
      "home": "Αρχική", "homeShort": "Αρχική",
      "productions": "Οι παραγωγές μου", "productionsShort": "Έργα",
      "documents": "Τα χαρτιά μου", "documentsShort": "Χαρτιά",
      "book": "Κλείσε γύρισμα", "bookShort": "Κράτηση"
    },
    "employee": {
      "today": "Σήμερα", "todayShort": "Σήμερα",
      "work": "Η δουλειά μου", "workShort": "Δουλειά",
      "productions": "Παραγωγές", "productionsShort": "Έργα",
      "knowledge": "Γνώση", "knowledgeShort": "Γνώση"
    },
    "salesman": {
      "today": "Σήμερα", "todayShort": "Σήμερα",
      "leads": "Ευκαιρίες", "leadsShort": "Ευκαιρ.",
      "library": "Υλικό", "libraryShort": "Υλικό"
    }
  }
}
```

Στο `messages/en.json` το ίδιο δέντρο με τιμές:

```json
"shellV2": {
  "previewBadge": "v2 preview",
  "mainMenu": "Main menu",
  "mobileMenu": "Mobile menu",
  "nav": {
    "settings": "Settings", "settingsShort": "Settings",
    "admin": {
      "today": "Today", "todayShort": "Today",
      "clients": "Clients", "clientsShort": "Clients",
      "productions": "Productions", "productionsShort": "Work",
      "calendar": "Calendar", "calendarShort": "Cal.",
      "finance": "Finance", "financeShort": "Finance",
      "knowledge": "Knowledge", "knowledgeShort": "Know."
    },
    "client": {
      "home": "Home", "homeShort": "Home",
      "productions": "My productions", "productionsShort": "Work",
      "documents": "My documents", "documentsShort": "Docs",
      "book": "Book a shoot", "bookShort": "Book"
    },
    "employee": {
      "today": "Today", "todayShort": "Today",
      "work": "My work", "workShort": "Work",
      "productions": "Productions", "productionsShort": "Work",
      "knowledge": "Knowledge", "knowledgeShort": "Know."
    },
    "salesman": {
      "today": "Today", "todayShort": "Today",
      "leads": "Opportunities", "leadsShort": "Leads",
      "library": "Library", "libraryShort": "Library"
    }
  }
}
```

- [ ] **Step 2: Γύρισε τα 4 nav.ts σε κλειδιά**

Σε κάθε nav.ts τα `label`/`short` γίνονται κλειδιά σχετικά με το `shellV2`. Πλήρες παράδειγμα — `src/components/admin-v2/nav.ts`:

```ts
import { Sun, Users, Clapperboard, CalendarDays, Euro, BookOpen, Settings } from 'lucide-react';
import type { NavItem } from '@/components/shell-v2/types';

/**
 * Οι 6 προορισμοί του νέου μοντέλου, με τη σειρά του κύκλου ζωής της δουλειάς.
 * Τα label/short είναι κλειδιά του namespace `shellV2` — μεταφράζονται στο κέλυφος.
 */
export const NAV_ITEMS: NavItem[] = [
  { href: '/admin-v2/today', label: 'nav.admin.today', short: 'nav.admin.todayShort', icon: Sun },
  { href: '/admin-v2/clients', label: 'nav.admin.clients', short: 'nav.admin.clientsShort', icon: Users },
  { href: '/admin-v2/productions', label: 'nav.admin.productions', short: 'nav.admin.productionsShort', icon: Clapperboard },
  { href: '/admin-v2/calendar', label: 'nav.admin.calendar', short: 'nav.admin.calendarShort', icon: CalendarDays },
  { href: '/admin-v2/finance', label: 'nav.admin.finance', short: 'nav.admin.financeShort', icon: Euro },
  { href: '/admin-v2/knowledge', label: 'nav.admin.knowledge', short: 'nav.admin.knowledgeShort', icon: BookOpen },
];

export const SETTINGS_ITEM: NavItem = {
  href: '/admin-v2/settings',
  label: 'nav.settings',
  short: 'nav.settingsShort',
  icon: Settings,
};

/** Στο κινητό χωράνε και τα 6 — το grid της μπάρας προσαρμόζεται στο πλήθος. */
export const MOBILE_NAV_ITEMS: NavItem[] = NAV_ITEMS;
```

Ομοίως στα άλλα τρία, με τα κλειδιά `nav.client.*`, `nav.employee.*`, `nav.salesman.*` κατά αντιστοιχία των υπαρχόντων ελληνικών labels (η αντιστοίχιση προκύπτει 1-1 από το Step 1 — π.χ. `'Οι παραγωγές μου'` → `'nav.client.productions'`).

- [ ] **Step 3: Μετάφραση στα shell components**

`src/components/shell-v2/sidebar.tsx` (είναι ήδη `'use client'`):

```tsx
import { useTranslations } from 'next-intl';
```

Στο `SidebarLink` δεν καλείς hook (καλείται μέσα σε loop) — πέρνα έτοιμα strings: άλλαξε το component να δέχεται `label: string` και μετάφρασε στον γονιό:

```tsx
function SidebarLink({ item, label, active }: { item: NavItem; label: string; active: boolean }) {
  // ... ίδιο σώμα, αλλά title={label} και <span className="hidden flex-1 lg:inline">{label}</span>
}

export function ShellSidebar({ items, settingsItem }: ShellSidebarProps) {
  const pathname = usePathname() ?? '';
  const t = useTranslations('shellV2');

  return (
    <aside className="hidden shrink-0 flex-col border-r border-border bg-card md:flex md:w-[68px] lg:w-60">
      {/* brand row αμετάβλητο — το «Devre Media» είναι επωνυμία, δεν μεταφράζεται */}
      <nav className="flex flex-1 flex-col gap-0.5 p-2.5" aria-label={t('mainMenu')}>
        {items.map((item) => (
          <SidebarLink key={item.href} item={item} label={t(item.label)} active={isActive(pathname, item.href)} />
        ))}
      </nav>
      <div className="border-t border-border p-2.5">
        <SidebarLink item={settingsItem} label={t(settingsItem.label)} active={isActive(pathname, settingsItem.href)} />
      </div>
    </aside>
  );
}
```

`src/components/shell-v2/bottom-nav.tsx`: πρόσθεσε `const t = useTranslations('shellV2');`, `aria-label={t('mobileMenu')}`, και `{t(item.short)}` αντί για `{item.short}`.

`src/components/shell-v2/app-shell.tsx`: `import { useTranslations } from 'next-intl';`, `const t = useTranslations('shellV2');` μέσα στο `AppShell`, και το badge γίνεται `{t('previewBadge')}`. (Το AppShell μπαίνει στο client graph μέσω των `'use client'` role shells, οπότε το hook δουλεύει.)

- [ ] **Step 4: Build + έλεγχος και στις 2 γλώσσες**

Run: `pnpm build && pnpm type-check`
Expected: επιτυχία, χωρίς σφάλμα MISSING_MESSAGE.

Χειροκίνητα: `pnpm dev`, `/admin-v2/today`, εναλλαγή γλώσσας από τον switcher → όλο το μενού + badge αλλάζουν σε en και πίσω.

- [ ] **Step 5: Commit**

```bash
git add messages/el.json messages/en.json src/components/admin-v2/nav.ts src/components/client-v2/nav.ts src/components/employee-v2/nav.ts src/components/salesman-v2/nav.ts src/components/shell-v2/sidebar.tsx src/components/shell-v2/bottom-nav.tsx src/components/shell-v2/app-shell.tsx
git commit -m "feat(v2): translate shell chrome and nav via next-intl shellV2 namespace"
```

---

### Task 3: i18n των v2 hub/own pages (τίτλοι, επικεφαλίδες, καρτέλες)

**Files:**
- Modify: `messages/el.json`, `messages/en.json` (κλειδιά `shellV2.pages.*`)
- Modify (server pages — Greek literals σε metadata/h1/subtitle/TABS):
  `src/app/admin-v2/{today,clients,productions,calendar,finance,knowledge,settings}/page.tsx`,
  `src/app/client-v2/{home,productions,documents,book,settings}/page.tsx`,
  `src/app/employee-v2/{today,work,productions,knowledge,settings}/page.tsx`,
  `src/app/employee-v2/work/deliverables-index.tsx`,
  `src/app/salesman-v2/{today,leads,library,settings}/page.tsx`

**Interfaces:**
- Consumes: namespace `shellV2` (Task 2). Τα κλειδιά σελίδων μπαίνουν κάτω από `shellV2.pages.<role><Hub>` π.χ. `shellV2.pages.adminClients.title`.
- Produces: μοτίβο `generateMetadata` + `getTranslations` που θα επαναχρησιμοποιήσει το PR Β.

- [ ] **Step 1: Κλειδιά σελίδων στα messages**

Κανόνας ονοματοδοσίας: `shellV2.pages.<role><Hub>` με πεδία `title`, `subtitle` (όπου η σελίδα έχει υπότιτλο κάτω από το h1), `tab<Key>` για κάθε καρτέλα, και ό,τι άλλο literal έχει η σελίδα. Οι τιμές `el` αντιγράφονται **verbatim** από τα αρχεία (η πλήρης απογραφή literals ανά αρχείο+γραμμή υπάρχει στο spec repo-audit· αναπαράγεται με `grep -rnP "[\x{0370}-\x{03FF}]" src/app/*-v2 --include='*.tsx'`). Πλήρες παράδειγμα για δύο hubs — τα υπόλοιπα ακολουθούν 1-1 το ίδιο σχήμα:

```json
"pages": {
  "adminClients": {
    "title": "Πελάτες",
    "subtitle": "Από το πρώτο ενδιαφέρον μέχρι την ενεργή συνεργασία — μία λίστα, όχι δύο",
    "tabList": "Πελάτες", "tabInterest": "Ενδιαφέρον", "tabProposals": "Προτάσεις",
    "tabContracts": "Συμφωνητικά", "tabChat": "Συνομιλίες"
  },
  "adminFinance": {
    "title": "Οικονομικά",
    "subtitle": "Τιμολόγια, έξοδα, αναφορές, κοστολόγηση και υγεία τιμολόγησης — ένα μέρος",
    "tabInvoices": "Τιμολόγια", "tabExpenses": "Έξοδα", "tabReports": "Αναφορές",
    "tabCost": "Κοστολόγηση", "tabHealth": "Υγεία τιμολόγησης",
    "error": "Σφάλμα: {message}",
    "sectionRevenue": "Έσοδα", "sectionProjects": "Παραγωγές",
    "sectionClients": "Πελάτες", "sectionExpenses": "Έξοδα & περιθώριο"
  }
}
```

Αγγλικές τιμές (en.json) αντίστοιχα: `adminClients` → "Clients" / "From first interest to active collaboration — one list, not two" / "Clients", "Interest", "Proposals", "Contracts", "Conversations"· `adminFinance` → "Finance" / "Invoices, expenses, reports, costing and pricing health — one place" / "Invoices", "Expenses", "Reports", "Costing", "Pricing health" / "Error: {message}" / "Revenue", "Productions", "Clients", "Expenses & margin". Για τα υπόλοιπα hubs ο εκτελεστής γράφει φυσικές αγγλικές αποδόσεις ίδιου ύφους (σύντομες, χωρίς τίτλο-κεφαλαία).

- [ ] **Step 2: Μετατροπή των pages — πλήρες exemplar το `admin-v2/clients/page.tsx`**

```tsx
import { getTranslations } from 'next-intl/server';
import type { Metadata } from 'next';
// ...υπόλοιπα imports αμετάβλητα

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('shellV2.pages.adminClients');
  return { title: t('title') };
}

// το static `export const metadata` διαγράφεται

export default async function ClientsPage({ searchParams }: { searchParams: SearchParams }) {
  const t = await getTranslations('shellV2.pages.adminClients');
  const TABS: SectionTab[] = [
    { key: 'list', label: t('tabList') },
    { key: 'interest', label: t('tabInterest') },
    { key: 'proposals', label: t('tabProposals') },
    { key: 'contracts', label: t('tabContracts') },
    { key: 'chat', label: t('tabChat') },
  ];
  const params = await searchParams;
  const active = TABS.some((tab) => tab.key === params.tab) ? (params.tab as string) : 'list';

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">{t('title')}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{t('subtitle')}</p>
      </header>
      {/* SectionTabs + conditional tabs αμετάβλητα */}
```

Σημείωση: το module-level `const TABS` μετακινείται μέσα στο component (χρειάζεται το `t`). Στα pages που το `TABS` χρησιμοποιείται ΚΑΙ από redirect validation εκτός component, μεταφέρεται μαζί ό,τι το διαβάζει. Το error literal του finance γίνεται `t('error', { message: result.error })`.

- [ ] **Step 3: Εφάρμοσε το ίδιο μοτίβο σε όλα τα αρχεία της λίστας Files**

Μηχανικός κανόνας: κάθε ελληνικό literal σε metadata/JSX (όχι σχόλια) → κλειδί στο αντίστοιχο `shellV2.pages.*`. Τα stubs (redirect-only pages) ΔΕΝ αγγίζονται. Το `deliverables-index.tsx` είναι το μόνο non-page: πάρε τα 5 literals του (empty-state title/description, μετρητές παραδοτέων με πληθυντικούς — χρησιμοποίησε ICU plural: `"{count, plural, one {# παραδοτέο} other {# παραδοτέα}}"`).

- [ ] **Step 4: Verification sweep**

Run: `grep -rnP "[\x{0370}-\x{03FF}]" src/app/admin-v2 src/app/client-v2 src/app/employee-v2 src/app/salesman-v2 --include='*.tsx' | grep -vP ":\d+:\s*(//|\*|/\*)" | grep -P "['\"\`]|>[^<]*[\x{0370}-\x{03FF}]"`
Expected: κενό αποτέλεσμα (ελληνικά επιτρέπονται μόνο σε σχόλια).

Run: `pnpm build && pnpm type-check`
Expected: επιτυχία. Χειροκίνητα: εναλλαγή γλώσσας σε `/admin-v2/finance` → τίτλος, υπότιτλος, καρτέλες, section headers αλλάζουν.

- [ ] **Step 5: Commit**

```bash
git add messages/el.json messages/en.json src/app/admin-v2 src/app/client-v2 src/app/employee-v2 src/app/salesman-v2
git commit -m "feat(v2): translate hub page titles, subtitles and tab labels"
```

---

### Task 4: Λινκ για τις 4 ορφανές admin σελίδες

**Files:**
- Modify: `src/app/admin-v2/productions/page.tsx` (quick-links: availability, filming-prep)
- Modify: `src/app/admin-v2/clients/page.tsx` (ChatTab: header με λινκ knowledge + `ChatbotStats`)
- Modify: `messages/el.json`, `messages/en.json` (νέα κλειδιά στο `shellV2.pages`)

**Interfaces:**
- Consumes: `ChatbotStats` όπως τη χρησιμοποιεί το v1 `src/app/admin/chatbot/page.tsx` (δες το αρχείο για το ακριβές import/props πριν γράψεις)· `Button` από `@/components/ui/button`· κλειδιά Task 3.
- Produces: όλες οι v2 real σελίδες προσβάσιμες με κλικ. (Το `contracts/new` καλύπτεται εδώ μέσω του ήδη υπάρχοντος `PageHeader` κουμπιού ΜΟΝΟ αν υπάρχει· αλλιώς προστίθεται όπως παρακάτω.)

- [ ] **Step 1: Quick-links στο Productions**

Στο `src/app/admin-v2/productions/page.tsx`, στο `<header>` δίπλα στον τίτλο (δομή όπως clients), πρόσθεσε δεξιά στο header row:

```tsx
<div className="flex items-center gap-2">
  <Button asChild variant="outline" size="sm">
    <Link href="/admin-v2/availability">{t('linkAvailability')}</Link>
  </Button>
  <Button asChild variant="outline" size="sm">
    <Link href="/admin-v2/filming-prep">{t('linkFilmingPrep')}</Link>
  </Button>
</div>
```

με το header να γίνεται `flex items-start justify-between gap-3`. Κλειδιά: `adminProductions.linkAvailability` = «Διαθεσιμότητα» / "Availability", `adminProductions.linkFilmingPrep` = «Προετοιμασία γυρισμάτων» / "Filming prep".

- [ ] **Step 2: Πλήρης καρτέλα Συνομιλιών στο Clients**

Διάβασε πρώτα το `src/app/admin/chatbot/page.tsx` (v1) για το ακριβές σχήμα των `ChatbotStats`/δεδομένων. Μετά, στο `ChatTab()` του `src/app/admin-v2/clients/page.tsx`, αναπαρήγαγε stats + κουμπί:

```tsx
async function ChatTab() {
  const t = await getTranslations('shellV2.pages.adminClients');
  const conversations = await getChatConversations();
  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button asChild variant="outline" size="sm">
          <Link href="/admin-v2/chatbot/knowledge">{t('linkChatKnowledge')}</Link>
        </Button>
      </div>
      <ConversationsTable conversations={conversations as ChatConversation[]} />
    </div>
  );
}
```

(Αν το v1 `ChatbotStats` είναι αυτόνομο async component, πρόσθεσέ το πάνω από το κουμπί με τα ίδια props όπως στο v1.) Κλειδί: `adminClients.linkChatKnowledge` = «Γνωσιακή βάση» / "Knowledge base".

- [ ] **Step 3: Κουμπί «Νέο συμφωνητικό» στην καρτέλα Συμφωνητικών**

Στο `ContractsTab()` του ίδιου αρχείου, τύλιξε το `ContractsListPage` ώστε να προηγείται κουμπί:

```tsx
<div className="space-y-4">
  <div className="flex justify-end">
    <Button asChild size="sm">
      <Link href="/admin-v2/contracts/new">{t('linkNewContract')}</Link>
    </Button>
  </div>
  <ContractsListPage contracts={contracts} />
</div>
```

Κλειδί: `adminClients.linkNewContract` = «Νέο συμφωνητικό» / "New contract".

- [ ] **Step 4: Build + click-through**

Run: `pnpm build`
Expected: επιτυχία. Χειροκίνητα: από `/admin-v2/productions` φτάνεις σε Διαθεσιμότητα & Προετοιμασία· από `/admin-v2/clients?tab=chat` στη γνωσιακή βάση· από `?tab=contracts` σε νέο συμβόλαιο.

- [ ] **Step 5: Commit**

```bash
git add src/app/admin-v2/productions/page.tsx src/app/admin-v2/clients/page.tsx messages/el.json messages/en.json
git commit -m "feat(v2): link availability, filming prep, chatbot knowledge and new contract into the shell"
```

---

### Task 5: Δύο bug fixes σε shared components

**Files:**
- Modify: `src/components/admin/clients/client-contracts-tab.tsx:59`
- Modify: `src/components/admin/user-nav.tsx:55`, `src/components/client/user-nav.tsx:52`

**Interfaces:**
- Consumes: τίποτα νέο.
- Produces: το κουμπί συμβολαίου πελάτη πλοηγεί σωστά· το «Προφίλ» δεν βγάζει πια 404 (δείχνει στις Ρυθμίσεις, όπου ζει το προφίλ). Πριν τις αλλαγές τρέξε `gitnexus_impact` για τα components αυτών των αρχείων (upstream) — αναμένεται LOW (leaf UI).

- [ ] **Step 1: Διόρθωσε το literal `${clientId}`**

`src/components/admin/clients/client-contracts-tab.tsx:59` — από μονά quotes σε template literal:

```ts
// πριν (bug — πλοηγεί σε literal "${clientId}"):
window.location.href = '/admin/contracts/new?clientId=${clientId}';
// μετά:
window.location.href = `/admin/contracts/new?clientId=${clientId}`;
```

- [ ] **Step 2: Διόρθωσε τα «Προφίλ» links**

Προϋπάρχον 404 και στο v1 (τα `/admin/profile`, `/client/profile` δεν υπήρξαν ποτέ). Στο `src/components/admin/user-nav.tsx:55` άλλαξε το href σε `/admin/settings`, στο `src/components/client/user-nav.tsx:52` σε `/client/settings` (το KeepInShell τα κρατά στο v2 όσο ζει η preview, και μετά το γύρισμα είναι ούτως ή άλλως σωστά).

- [ ] **Step 3: Build + type-check**

Run: `pnpm build && pnpm type-check`
Expected: επιτυχία.

- [ ] **Step 4: Commit**

```bash
git add src/components/admin/clients/client-contracts-tab.tsx src/components/admin/user-nav.tsx src/components/client/user-nav.tsx
git commit -m "fix: repair literal clientId contract link and dead profile menu links"
```

---

### Task 6: loading.tsx σε όλους τους v2 κόμβους

**Files:**
- Create: `src/components/shell-v2/hub-skeleton.tsx`
- Create: `loading.tsx` σε: `src/app/admin-v2/{today,clients,productions,calendar,finance,knowledge,settings}/`, `src/app/client-v2/{home,productions,documents,book}/`, `src/app/employee-v2/{today,work,productions,knowledge}/`, `src/app/salesman-v2/{today,leads,library}/`

**Interfaces:**
- Produces: `HubSkeleton` — generic skeleton (header + tabs + rows) που γίνεται το σώμα κάθε `loading.tsx`. Το PR Β θα βάλει πλουσιότερα per-widget skeletons· εδώ θέλουμε instant paint.
- Consumes: `Skeleton` από `@/components/ui/skeleton` (υπάρχον shadcn component — αν το αρχείο λείπει, δες `src/components/ui/` για το διαθέσιμο όνομα πριν γράψεις).

- [ ] **Step 1: Γράψε το shared skeleton**

`src/components/shell-v2/hub-skeleton.tsx`:

```tsx
import { Skeleton } from '@/components/ui/skeleton';

/** Στιγμιαίος σκελετός κόμβου: τίτλος, καρτέλες, γραμμές περιεχομένου. */
export function HubSkeleton() {
  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <Skeleton className="h-7 w-44" />
        <Skeleton className="h-4 w-72" />
      </div>
      <div className="flex gap-2 border-b border-border pb-2">
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton key={i} className="h-8 w-24" />
        ))}
      </div>
      <div className="space-y-3">
        {Array.from({ length: 6 }, (_, i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Ένα loading.tsx ανά κόμβο**

Ίδιο περιεχόμενο παντού (18 αρχεία, λίστα στο Files):

```tsx
import { HubSkeleton } from '@/components/shell-v2/hub-skeleton';

export default function Loading() {
  return <HubSkeleton />;
}
```

- [ ] **Step 3: Build + οπτικός έλεγχος**

Run: `pnpm build`
Expected: επιτυχία. Χειροκίνητα σε dev με throttling: η πλοήγηση μεταξύ κόμβων δείχνει αμέσως σκελετό αντί για πάγωμα.

- [ ] **Step 4: Commit**

```bash
git add src/components/shell-v2/hub-skeleton.tsx src/app/admin-v2 src/app/client-v2 src/app/employee-v2 src/app/salesman-v2
git commit -m "feat(v2): instant loading skeletons for every hub"
```

---

### Task 7: e2e smoke του v2 shell

**Files:**
- Create: `e2e/v2-shell.spec.ts`
- Test: το ίδιο.

**Interfaces:**
- Consumes: `loginAsAdmin` από `e2e/helpers/auth` (υπάρχον μοτίβο — δες `e2e/admin-dashboard.spec.ts`)· gating flag `E2E_TEST_USERS_READY` όπως όλα τα specs.

- [ ] **Step 1: Γράψε το failing spec**

```ts
import { test, expect } from '@playwright/test';
import { loginAsAdmin } from './helpers/auth';

/** Smoke του v2 shell: πλοήγηση, ορφανές σελίδες, εναλλαγή γλώσσας. */
test.describe('V2 shell', () => {
  test('sidebar reaches all six areas', async ({ page }) => {
    test.skip(!process.env.E2E_TEST_USERS_READY, 'Test users not configured in database');
    await loginAsAdmin(page);
    await page.goto('/admin-v2/today');
    for (const path of ['clients', 'productions', 'calendar', 'finance', 'knowledge']) {
      await page.locator(`aside a[href="/admin-v2/${path}"]`).click();
      await expect(page).toHaveURL(new RegExp(`/admin-v2/${path}`));
      await expect(page.locator('h1').first()).toBeVisible();
    }
  });

  test('orphan pages are reachable by click', async ({ page }) => {
    test.skip(!process.env.E2E_TEST_USERS_READY, 'Test users not configured in database');
    await loginAsAdmin(page);
    await page.goto('/admin-v2/productions');
    await expect(page.getByRole('link', { name: /Διαθεσιμότητα|Availability/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /Προετοιμασία|Filming prep/i })).toBeVisible();
    await page.goto('/admin-v2/clients?tab=contracts');
    await expect(page.getByRole('link', { name: /Νέο συμφωνητικό|New contract/i })).toBeVisible();
    await page.goto('/admin-v2/clients?tab=chat');
    await expect(page.getByRole('link', { name: /Γνωσιακή βάση|Knowledge base/i })).toBeVisible();
  });

  test('language switcher translates the shell', async ({ page }) => {
    test.skip(!process.env.E2E_TEST_USERS_READY, 'Test users not configured in database');
    await loginAsAdmin(page);
    await page.goto('/admin-v2/today');
    // Ο switcher υπάρχει στο header (δες language-switcher.tsx για τον ρόλο/aria του trigger)
    await expect(page.locator('header')).toContainText(/Προεπισκόπηση v2|v2 preview/);
  });
});
```

- [ ] **Step 2: Τρέξε το spec**

Run: `pnpm test:e2e -- v2-shell.spec.ts`
Expected: PASS με ρυθμισμένους E2E users, αλλιώς SKIP (όπως όλα τα specs του repo). Αν αποτύχει σε selector, διόρθωσε τον selector — όχι το UI, εκτός αν αποκαλύπτει πραγματικό κενό.

- [ ] **Step 3: Τελικός έλεγχος όλου του PR**

Run: `pnpm build && pnpm type-check && pnpm lint`
Expected: όλα καθαρά.

- [ ] **Step 4: Commit + PR**

```bash
git add e2e/v2-shell.spec.ts
git commit -m "test(v2): shell smoke — nav coverage, orphan links, locale"
git push -u origin feat/v2-shell-hardening
gh pr create --title "feat(v2): shell hardening — i18n, nav coverage, skeletons" --body "..."
```

Το PR body: τι άλλαξε (7 tasks), γιατί (spec link), πώς δοκιμάζεται (τα 3 e2e + χειροκίνητο language switch στο -v2 preview). ΟΧΙ merge χωρίς review του χρήστη.

---

## Self-Review Notes

- Όλα τα ελληνικά strings των Steps προέρχονται verbatim από τα αρχεία (απογραφή 2026-08-26). Τα λίγα που δεν απογράφηκαν (υπότιτλοι hubs εκτός clients/finance) καλύπτονται από τον μηχανικό κανόνα του Task 3 Step 3 + verification grep του Step 4.
- Το `ChatbotStats` (Task 4 Step 2) σημειώνεται ρητά ως «διάβασε πρώτα το v1 αρχείο» γιατί το ακριβές API του δεν απογράφηκε — ο εκτελεστής ΔΕΝ πρέπει να το μαντέψει.
- revalidatePath / γέφυρα dashboard / γύρισμα: ΕΚΤΟΣ scope αυτού του PR — βλ. spec, PR Β και Γ.
