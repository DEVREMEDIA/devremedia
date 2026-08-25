# Spec — Μετάβαση DMS από v1 σε v2 (το v2 γίνεται το κανονικό app)

**Ημερομηνία:** 2026-08-26 · **Κατάσταση:** εγκεκριμένο από τον χρήστη (στρατηγική + απόφαση γέφυρας)

## Στόχος

Το v2 shell (6-area IA, tabs, καθαρή πλοήγηση) γίνεται η μοναδική έκδοση της εφαρμογής, στα **καθαρά URL** (`/admin`, όχι `/admin-v2`). Το v1 chrome εξαφανίζεται. **Καμία λειτουργικότητα δεν χάνεται. Καμία σελίδα δεν ξαναγίνεται «σαν το παλιό».**

## Αποφάσεις (κλειδωμένες από τον χρήστη)

1. **Καθαρά URL** — το v2 κληρονομεί τα ονόματα του v1 (`/admin/...`).
2. **Το v2 είναι ο κανόνας** — ό,τι μεταφέρεται, μεταφέρεται στο ύφος/IA του v2. Δεν αναπαράγουμε το v1 look.
3. **Γέφυρα πρώτα, redesign μετά** — τα 11 κομμάτια του v1 admin dashboard που λείπουν από το v2 «Σήμερα» μπαίνουν πρώτα ως έχουν (components υπάρχουν ήδη στο `src/components/admin/dashboard/**`) μέσα στο v2, **κατανεμημένα στις σωστές περιοχές** — όχι όλα σε μία σελίδα. Το εις-βάθος redesign τους ακολουθεί ως ξεχωριστή δουλειά.
4. **Περιορισμός απόδοσης (ρητή απαίτηση χρήστη):** καμία σελίδα δεν φορτώνει «τα πάντα με τη μία». Κάθε ενότητα δεδομένων = δικό της `<Suspense>` με skeleton· κάθε καρτέλα φορτώνει μόνο τα δικά της δεδομένα (το μοτίβο `{active === 'x' && <XTab />}` που ήδη ακολουθούν και οι 8 v2 κόμβοι — επιβεβαιωμένο). Κάθε v2 κόμβος αποκτά `loading.tsx`.
5. **Τα redirect stubs μένουν μόνιμα** — κρατούν ζωντανά ~92 hardcoded href, bookmarks, λινκ σε emails/PDF.
6. **PR flow πάντα** — ποτέ direct push σε master· branches κόβονται από `origin/master`.

## Στρατηγική γυρίσματος: «το παλιό δέντρο φοράει το νέο κέλυφος»

**Απόρριψη της αρχικής ιδέας** «εξαγωγή περιεχομένου → μετονομασία -v2 → διαγραφή v1» (~130 αρχεία μετακίνηση). Η απογραφή έδειξε ότι τα v2 pages είναι thin wrappers που κάνουν re-export **ολόκληρα τα v1 pages** (`from '@/app/admin/x/page'`) — άρα το περιεχόμενο ΕΙΝΑΙ ήδη το v1 δέντρο, και η μόνη ουσιαστική διαφορά είναι το layout (κέλυφος).

**Η τελική μετάβαση (PR Γ) γίνεται ανάποδα και πολύ μικρότερη:**

1. Τα 4 v1 `layout.tsx` (καθαρά presentational — επιβεβαιωμένο, κανένα provider/guard) αντικαθίστανται από τα v2 shells (`AdminV2Shell` κ.λπ.).
2. Οι σελίδες που ΑΝΗΚΟΥΝ στο v2 (κόμβοι με tabs: clients, finance, productions, knowledge, settings, work, library, documents, home + OWN: today, knowledge, calendar) **μετακομίζουν στο v1 δέντρο** στα καθαρά paths τους, με τα imports τους να γίνονται σχετικά (το περιεχόμενο μένει εκεί που είναι, colocated).
3. Τα v1 routes που συγχωνεύτηκαν σε καρτέλες (π.χ. `/admin/invoices`) γίνονται redirect stubs → `/admin/finance?tab=invoices` (τα stub αρχεία υπάρχουν ήδη στα -v2 trees, αλλάζει μόνο το prefix του target).
4. Τα `-v2` δέντρα διαγράφονται· το middleware αποκτά redirect `-v2` → καθαρό URL (bookmarks της preview περιόδου).
5. Το `keep-in-shell.tsx` (προσωρινό crutch — αυτο-τεκμηριωμένο ως τέτοιο) διαγράφεται.

**Γιατί είναι ασφαλέστερο:** μηδενική μετακίνηση περιεχομένου, το git history μένει ανέπαφο, και **όλα** τα hardcoded `/admin/...` paths (92 anchors + τα `router.push` που ΔΕΝ πιάνει το keep-in-shell) γίνονται αυτομάτως σωστά αντί να χρειάζονται sweep.

## Ευρήματα απογραφής (2 παράλληλα audits, 2026-08-26)

### Feature parity των OWN σελίδων
- **`admin-v2/calendar`**: πλήρες parity με v1 (ίδιο `CalendarViewWrapper`, ίδιο `getCalendarEvents`).
- **`admin-v2/knowledge`**: parity + superset (απορρόφησε και το `/admin/sales-resources` ως καρτέλα).
- **`admin-v2/today`**: ΜΟΝΟ το risk radar (βελτιωμένο). **Λείπουν 11 κομμάτια** του v1 dashboard — αυτά καλύπτει η γέφυρα (PR Β):

| Κομμάτι (component → query) | Προορισμός στη γέφυρα |
|---|---|
| Today agenda (`today-agenda.tsx` → `getTodayAgenda`) | Σήμερα |
| KPI hero strip, super_admin only (`kpi-strip.tsx` → `kpi-hero.ts`) | Σήμερα |
| Recent activity feed (`activity-feed.tsx` → `getRecentActivity`) | Σήμερα |
| Upcoming deadlines grouped (`upcoming-deadlines-grouped.tsx`) | Παραγωγές |
| Crew load heatmap (`crew-load-heatmap.tsx` → `getCrewLoad`) | Παραγωγές |
| Sales funnel (`sales-funnel-card.tsx` → `getSalesFunnel`) | Πελάτες?tab=interest |
| Revenue forecast (`revenue-forecast-card.tsx` → `getRevenueForecast`) | Πελάτες?tab=interest |
| Cost health verdict (`cost-health-card.tsx` → `getCostModelHealth`) | Οικονομικά?tab=cost |
| Project profitability top-5 (`project-profitability-card.tsx`) | Οικονομικά?tab=health |
| Business velocity (`business-velocity.tsx` → `getBusinessVelocity`) | Σήμερα |
| Role gating super_admin vs admin (`getRole()`) | επανέρχεται μαζί με τα παραπάνω |

Όλα ξανά μέσα σε `<Suspense>` με τα υπάρχοντα skeletons (`dashboard/shared/card-skeletons.tsx`) — βλ. περιορισμό απόδοσης.

### Κενά πλοήγησης (μόνο admin — client/employee/salesman πλήρη)
- Άφταστα με κλικ: `availability`, `filming-prep`, `chatbot/knowledge` (+ χάθηκαν `ChatbotStats`/header στο clients?tab=chat), `contracts/new`.
- Mobile: η «Γνώση» κόβεται (`NAV_ITEMS.slice(0, 5)` σε 6 items).

### Bugs
- `src/components/admin/clients/client-contracts-tab.tsx:59` — `'...${clientId}'` σε **μονά** quotes → πλοηγεί σε literal `${clientId}`. Προϋπάρχον, πραγματικό bug.
- `user-nav` «Προφίλ» → `/admin/profile` & `/client/profile` — **δεν υπάρχουν ούτε στο v1** (404 παντού). Προϋπάρχον.
- `getRiskItems` (`src/lib/queries/dashboard/risk.ts:58-125`) χτίζει v1 hrefs — σωστά μετά το γύρισμα (στρατηγική shell-swap), κανένα sweep δεν χρειάζεται.

### i18n
- 0 χρήσεις next-intl σε όλο το v2 (shell + κόμβοι) — hardcoded ελληνικά· **λείπει και το `LanguageSwitcher`** από το v2 header (το v1 Header το έχει). Η εφαρμογή είναι δηλωμένα δίγλωσση.

### revalidatePath
- 115+ κλήσεις δείχνουν σε routes που γίνονται stubs (κορυφαία: `/client/dashboard` 19x → home, `/admin/proposals`, `/admin/projects`, …). Οι σελίδες είναι dynamic (cookie auth), άρα το σύμπτωμα είναι «η ανοιχτή σελίδα δεν φρεσκάρει μετά το save» — όχι χαλασμένα δεδομένα. **Το bug υπάρχει ήδη σήμερα στο -v2 preview.** Διόρθωση: ντετερμινιστικός χάρτης stub→target (παράγεται με script από τα `redirect()` των stubs) → επανεγγραφή των κλήσεων → guard test που σταυρώνει redirects/revalidatePath ώστε να μην ξανασυμβεί. 74 υπάρχοντα `router.refresh()` το μετριάζουν σε μέρος των flows.

### Emails / Stripe / e2e
- Μόνο το `${APP_URL}/client/invoices` (invoice-sent CTA) προσγειώνεται σε συγχωνευμένο route — καλύπτεται από το μόνιμο stub. Όλα τα υπόλοιπα paths (project detail, success/cancel, auth/confirm) μένουν έγκυρα. `KeepInShell` δεν βοηθά cold entries — γι' αυτό τα stubs είναι μόνιμα.
- 9 Playwright specs σε v1 paths: με καθαρά URL μένουν έγκυρα· όσα χτυπούν συγχωνευμένα routes θέλουν ενημέρωση στο PR Γ.

## Τεμαχισμός — 3 PR, με αυτή τη σειρά

| PR | Περιεχόμενο | Ορατό; |
|---|---|---|
| **Α — Θωράκιση κελύφους** | i18n shell+κόμβων + LanguageSwitcher, mobile 6ο item, λινκ για τις 4 ορφανές σελίδες, 2 bug fixes, `loading.tsx`/Suspense σε όλους τους κόμβους, e2e smoke του v2 | Μόνο σε όσους είναι στο -v2 preview — δωρεάν δοκιμή σε παραγωγή |
| **Β — Γέφυρα dashboard** | Τα 11 κομμάτια στον πίνακα παραπάνω, κατανεμημένα, με Suspense ανά κομμάτι + role gating | Ομοίως, μόνο στο preview |
| **Γ — Το γύρισμα** | Shell-swap στρατηγική (5 βήματα παραπάνω) + revalidatePath χάρτης/rewrite/guard + e2e updates | Ναι — το v2 γίνεται το app |

Κάθε PR: branch από `origin/master`, `pnpm build` + `type-check` + `lint` πριν από κάθε commit, review πριν το merge. Το εις-βάθος redesign των widgets της γέφυρας = ξεχωριστή δουλειά ΜΕΤΑ το Γ.

## Εκτός scope
- Redesign περιεχομένου σελίδων (μετά το Γ).
- PR #95 (Phase 0 security) — άσχετο, μην αγγιχτεί.
- Ό,τι είναι untracked-never-commit: `design-explorations/`, `patches/`, `tzeni/`, `.sandcastle/`, `.gitnexus/`, `src/app/dev/prototype-ia/`.

## Πλάνα
- PR Α: `docs/superpowers/plans/2026-08-26-v2-shell-hardening.md`
- PR Β, Γ: γράφονται μετά το merge του προηγούμενού τους (τα βήματά τους εξαρτώνται από το αποτέλεσμα του προηγούμενου).
