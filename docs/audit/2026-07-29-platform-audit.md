# Πλατφόρμα DMS — Πλήρες Audit (2026-07-29)

> **Σκοπός:** Η βάση γνώσης πάνω στην οποία θα σχεδιαστεί η απλοποίηση και βελτιστοποίηση της πλατφόρμας.
> **Μέθοδος:** 9 παράλληλοι AI agents διάβασαν εξαντλητικά τον πραγματικό κώδικα (1.3M tokens ανάλυσης, 567 αναγνώσεις αρχείων): 5 χαρτογράφησαν τα journeys κάθε ρόλου (admin ×2, client, employee, salesman) και 4 τις τεχνικές διαστάσεις (duplication στα server actions, βάση/RLS/indexes, performance, χάρτης διπλών καταγραφών). Κάθε εύρημα τεκμηριώνεται με συγκεκριμένο `file:line`. Τα δύο κρισιμότερα ευρήματα ασφαλείας επαληθεύτηκαν και με δεύτερη, ανεξάρτητη ανάγνωση.
> **Δεσμευτικός περιορισμός:** Τα δεδομένα παραγωγής είναι ζωντανά. **Καμία πρόταση δεν αλλάζει τον τρόπο αποθήκευσης** — μόνο προσθετικές αλλαγές (νέα indexes, νέες policies, consolidation σε επίπεδο κώδικα).

---

## 1. Συμπέρασμα σε μία παράγραφο

Και τα τέσσερα «συμπτώματα» που περιέγραψες **επιβεβαιώνονται με απτά στοιχεία στον κώδικα**: (α) η ίδια διαδικασία όντως καταγράφεται 2-3 φορές σε πολλά σημεία (7 τεκμηριωμένες διπλές/τριπλές διαδρομές εγγραφής), (β) η UX μπερδεύει γιατί η ίδια ενέργεια ζει σε 2-3 διαφορετικές οθόνες με διαφορετικά ονόματα, (γ) η «βαριά» αίσθηση έχει συγκεκριμένες, μετρήσιμες αιτίες — με κορυφαία το ότι **κάθε RLS policy στη βάση επανεκτελεί τον έλεγχο auth ανά γραμμή αντί ανά query** (79 σημεία σε 26 migrations) και ότι τα auth checks ξανατρέχουν δικτυακά σε κάθε server action (185 σημεία, χωρίς caching), και (δ) βρέθηκαν σοβαρά κρυφά bugs — μεταξύ αυτών **2 ανοιχτά θέματα ασφαλείας**, μία ροή **ολοκληρωτικά σπασμένη για τον salesman** (Convert Lead → Client) και μία **ολοκληρωτικά σπασμένη για τον employee** (δεν βλέπει πουθενά τα σχόλια αναθεώρησης του πελάτη).

---

## 2. ΑΜΕΣΑ — Ευρήματα ασφαλείας (επαληθευμένα)

### 2.1 🔴 Το RLS των μηνυμάτων είναι ουσιαστικά ανοιχτό σε όλους τους συνδεδεμένους χρήστες

- **Τι συμβαίνει:** Το `supabase/migrations/20240209_messaging_webhook.sql:12-21` ξαναδημιουργεί το SELECT policy των `messages` ως «υπάρχει το project» — χωρίς κανένα scoping σε πελάτη/εργαζόμενο/κανάλι. Το UPDATE policy (γραμμές 37-42) είναι `USING (true) WITH CHECK (true)`.
- **Γιατί «κερδίζει»:** Τα migrations εφαρμόζονται με αλφαβητική σειρά ονόματος αρχείου· το `20240209_...` ταξινομείται **μετά** από όλα τα `000xx_...` (το '2' > '0'), άρα πατάει πάνω στα σωστά σκοπευμένα policies των 00017 και 00023.
- **Συνέπεια:** Κάθε authenticated χρήστης (και πελάτης) μπορεί να διαβάσει **όλα** τα μηνύματα όλων των projects — και του εσωτερικού καναλιού `team` — και να κάνει UPDATE σε οποιοδήποτε μήνυμα.
- **Επιπλέον στο ίδιο αρχείο:** το bucket `attachments` δημιουργείται **public** με public read policy (γραμμές 58-74), και το partial index `idx_messages_project_created_recent` (γραμμές 51-53) έχει «παγωμένο» `NOW()` από τη στιγμή του deploy — είναι μόνιμα ένα τρίτο, περιττό αντίγραφο index που πληρώνεται σε κάθε INSERT.
- **Διόρθωση (προσθετική):** Νέο migration `00065_reinstate_messages_rls.sql` που κάνει DROP+CREATE τα policies με τη σωστή λογική του 00023 (admin / δικός του client / assigned employee / channel split). Επαλήθευση στο live DB: `select policyname, qual from pg_policies where tablename='messages'`.

### 2.2 🔴 Τα helper functions του notifications.ts είναι δημόσια server actions με admin client και μηδέν auth

- **Τι συμβαίνει:** Το `src/lib/actions/notifications.ts` έχει `'use server'` στην κορυφή, οπότε **κάθε** exported function γίνεται δημόσια καλέσιμο HTTP endpoint. Οι `getClientUserIdFromProject` (:22), `getClientUserIdFromClientId` (:35), `getAdminUserIds` (:46), `createNotification` (:68), `createNotificationForMany` (:111) τρέχουν με `createAdminClient()` (παράκαμψη RLS) **χωρίς κανένα** `requireUser()`/`requireAdmin()`.
- **Συνέπεια:** Οποιοσδήποτε φτάνει στο deployed endpoint μπορεί να δημιουργεί ψεύτικες ειδοποιήσεις σε οποιονδήποτε χρήστη, να απαριθμήσει τα admin user ids, ή να αντιστοιχίσει client → user id.
- **Διόρθωση:** Μεταφορά των 5 helpers σε module **χωρίς** `'use server'` (π.χ. `src/lib/notification-helpers.ts`) ώστε να είναι απλές server-only συναρτήσεις. Στο αρχείο actions μένουν μόνο τα user-facing (`getMyNotifications` κ.λπ. που ήδη κάνουν `requireUser`).

### 2.3 🟠 Λοιπά θέματα άμυνας

| Θέμα | Στοιχεία | Διόρθωση |
|---|---|---|
| `annotation_seen` SELECT ανοιχτό σε κάθε authenticated χρήστη (ποιος είδε ποιο annotation, cross-client) | `00059_annotation_seen.sql:21-23` | Scoped policy μέσω join στο project/client όπως στα `video_annotations` |
| Όλα τα write actions των invoices ελέγχουν μόνο `requireUser()` — μόνη άμυνα το RLS, αντίθετα με contracts/clients που κάνουν `requireAdmin()` | `invoices.ts:112,173,238,278,316,371` | Αλλαγή σε `requireAdmin()` (defense-in-depth) |
| Lead actions μόνο `requireUser()` χωρίς role check | `leads.ts`, `lead-activities.ts` | Ρητός ρόλος στο action layer |
| Ο employee μπορεί να διαγράψει **εγκεκριμένο/final** deliverable με ένα γενικό confirm | `00056_..._rls.sql:49-65` + `admin/deliverables/deliverable-list.tsx:149-156` | Φραγή delete σε approved/final για μη-admin |

---

## 3. Κρίσιμα κρυφά bugs (σπασμένες ροές)

### 3.1 🔴 Convert Lead → Client: σπασμένο για ΚΑΘΕ salesman

Το `convertLeadToClient` (`leads.ts:217-231`) κάνει INSERT στο `clients` με το session του καλούντος, αλλά το μόνο RLS policy στο `clients` είναι admin-only (`00017_fix_rls_security.sql:48-52`). Κανένα migration δεν δίνει salesman πρόσβαση στο `clients`. Ο salesman πατάει «Convert» και παίρνει πάντα permission denied — **η σημαντικότερη ενέργεια του CRM δεν δουλεύει για τον ρόλο που τη χρειάζεται**. Διόρθωση: SECURITY DEFINER RPC ή στοχευμένο INSERT policy, κρατώντας τον έλεγχο `lead.assigned_to === user.id`.

### 3.2 🔴 Ο employee δεν μπορεί να δει πουθενά τι διόρθωση ζήτησε ο πελάτης

Όταν ο πελάτης ζητά αναθεώρηση, το σχόλιο γράφεται στα `video_annotations` και ο employee ειδοποιείται με link στο `/employee/deliverables/[projectId]` — αλλά η οθόνη employee δεν ανοίγει ποτέ το `DeliverableDetail` (μόνο αυτό διαβάζει annotations)· grep για «annotation» σε όλο το `src/app/employee` + `src/components/employee` = **0 αποτελέσματα**. Ο employee βλέπει μόνο κόκκινο badge «Revision Requested» και πρέπει να μάθει τι ζητήθηκε **εκτός εφαρμογής**. (`deliverables.ts:456-523`, `status-effects.ts:190-196`, `employee/deliverables/deliverable-list.tsx:1-37`)

### 3.3 🔴 Διπλές εγγραφές ημερολογίου από τη μετατροπή filming request

Τα `convertToProject` (`filming-requests.ts:308-319`) και `approveHold` (:405-416) γράφουν **χειροκίνητα** `calendar_events` χωρίς `project_id`, παρακάμπτοντας το `syncProjectFilmingToCalendar` (το δηλωμένο single source of truth, που ψάχνει με `.eq('project_id', ...)`). Στην επόμενη επεξεργασία του project δημιουργείται **δεύτερο event για το ίδιο γύρισμα**. Επιπλέον το `createProject` (`projects.ts:100-157`) **δεν συγχρονίζει ποτέ** το ημερολόγιο — παραγωγή που δημιουργείται από τη φόρμα «νέα παραγωγή» με ημερομηνία γυρίσματος απλώς δεν εμφανίζεται στο calendar μέχρι κάποιος να την ξανα-επεξεργαστεί.

### 3.4 🔴 Οι κρατήσεις του νέου booking flow χάνουν την ημερομηνία στη μετατροπή

Το `convertToProject` διαβάζει μόνο το legacy `preferred_dates[0]` (`filming-requests.ts:280-285`). Ένα request από το νέο Hold flow έχει `preferred_dates = null` και `booking_date`/`slot_id` — το project βγαίνει **χωρίς filming_date και χωρίς calendar event**, σιωπηλά.

### 3.5 🔴 Η κάρτα «My Agreement» δείχνει πάντα γεμάτο υπόλοιπο

Το `getMyAgreement` (`my-agreement.ts:78-94`) έχει hardcoded `const clientUsage: Booking[] = []` (stub από παλιότερο slice του #70), ενώ το `/client/book` υπολογίζει σωστά από τα πραγματικά Holds. Ο ίδιος πελάτης βλέπει **δύο διαφορετικά νούμερα** για το ίδιο πράγμα στο ίδιο session.

### 3.6 🟠 Το «paid» του τιμολογίου γράφεται από 2 ασυγχρόνιστες διαδρομές

Stripe webhook (`api/webhooks/stripe/route.ts:39-101`) και confirm endpoint (`api/invoices/[id]/confirm`) γράφουν και τα δύο `status='paid'` + στέλνουν ειδοποιήσεις. Το webhook **δεν έχει idempotency guard** (τα Stripe events επαναπαραδίδονται → διπλές ειδοποιήσεις), δεν περνά από το `applyStatusChange`, στέλνει διαφορετικές ειδοποιήσεις από το χειροκίνητο path, και **δεν κάνει revalidatePath** — το UI δείχνει «sent» μέχρι τυχαία πλοήγηση. Διόρθωση: κοινός `markInvoicePaid(id, {source})` και για τα δύο.

### 3.7 🟠 Το «overdue» υπολογίζεται σε 1 από 3 οθόνες

Κανείς δεν γράφει ποτέ `status='overdue'` στη βάση· μόνο το grouped-card view το υπολογίζει client-side (`invoices-content.tsx:94-98`), ενώ table view (`invoices-table-view.tsx:158`) και detail (`invoice-detail.tsx:162`) δείχνουν το raw «sent». **Το ίδιο τιμολόγιο δείχνει διαφορετικό status ανάλογα την οθόνη.**

### 3.8 🟠 Μικρότερα αλλά πραγματικά

- `getMyContracts` χωρίς linked client record επιστρέφει **όλα** τα contracts που επιτρέπει το RLS αντί για κενό (`contracts.ts:95-108`).
- Widget «Recent Activity» salesman: διαβάζει `activity.notes` ενώ η στήλη λέγεται `description` — το κείμενο **δεν εμφανίζεται ποτέ** (`salesman-dashboard.ts:82-97` vs `recent-activity.tsx:89-93`).
- «Pay Now» με κάρτα ακόμα ζωντανό παρότι το ADR-0008 (μόλις merged, branch #93) αποφάσισε RF/τραπεζικές οδηγίες — μέχρι να υλοποιηθεί, υπάρχει χάσμα app-«paid» vs πραγματικής λογιστικής συμφωνίας.
- Μη-ατομικές αλληλουχίες 4-5 writes χωρίς transaction στα convertToProject/approveHold — μερική αποτυχία = project χωρίς σημαδεμένο request → διπλό project με δεύτερο κλικ. Πρόταση: ένα RPC όπως ήδη κάνει ατομικά το `book_slot`.
- `getNextInvoiceNumber` read-then-insert race (σώζει το unique constraint, αλλά ο 2ος admin βλέπει raw Postgres error).
- Version number deliverable: ίδιο race pattern (`deliverables.ts:75-83`).

---

## 4. Ο χάρτης των διπλών/τριπλών καταγραφών («γιατί τα γράφω 2-3 φορές»)

| # | Έννοια | Πού καταγράφεται | Τι φταίει | Πρόταση (χωρίς αλλαγή δεδομένων) |
|---|---|---|---|---|
| 1 | **Δημιουργία πελάτη** | 3 ανεξάρτητα paths: χειροκίνητη φόρμα (`clients.ts:58`), μετατροπή lead (`leads.ts:216`), auto-create από filming request (`filming-requests.ts:222-277`) | Μόνο το 3ο ελέγχει υπάρχον email· τα άλλα δημιουργούν **διπλό πελάτη** σιωπηλά. Το convert φτιάχνει και placeholder clients αντί να ψάξει `contact_email` | Ένας κοινός `findOrCreateClient(contactInfo)` παντού |
| 2 | **«Θέλω γύρισμα»** | `filming_requests` (2 paths: createFilmingRequest, bookSlot/RPC) **και** `leads` (το `createPublicFilmingRequest` παρά το όνομά του γράφει leads!) | Ίδια πρόθεση, 3 διαδρομές, 2 πίνακες· ο πίνακας `filming_requests` κουβαλά ταυτόχρονα 2 σημασίες («αίτημα προς αξιολόγηση» και «Hold που δεσμεύει χωρητικότητα») με το ίδιο `status='pending'` | Ενιαία είσοδος → `filming_requests`· προσθετικό generated column `request_kind` (booking/inquiry) + badge στη λίστα admin |
| 3 | **Μετατροπή σε project** | `convertToProject` + `approveHold`: δύο σχεδόν πανομοιότυπα actions των ~140 γραμμών, δύο διαφορετικά UI flows | Ο admin πρέπει να ξέρει ποιο flow ισχύει ανά request· διπλή συντήρηση, τα bugs 3.3/3.4 υπάρχουν και στα δύο | Κοινός `createProjectFromFilmingSource()` + ατομικό RPC |
| 4 | **Στάδιο δουλειάς** | `projects.status` (8 στάδια), `tasks.status` (4), `deliverables.status` (4) — **κανένας κώδικας δεν τα συνδέει** | Ο employee ολοκληρώνει όλα τα tasks και το project μένει «editing» μέχρι να το αλλάξει κάποιος χειροκίνητα αλλού | Είτε παράγωγο project stage από tasks/deliverables, είτε ρητό στο UI ότι το στάδιο είναι admin-owned |
| 5 | **«Τι έγινε» (ιστορικό)** | `activity_log` (τροφοδοτείται από **1 μόνο** σημείο σε όλη την εφαρμογή — διαγραφή deliverable!) αλλά είναι η πηγή του admin dashboard feed· τη δουλειά την κάνει το `notifications` (30+ call sites) | Το «Recent Activity» του dashboard δείχνει ουσιαστικά κενό/παραπλανητικό ιστορικό | Απόφαση: ή το feed διαβάζει `notifications`, ή τα status-effects γράφουν και `log_activity()` — όχι τρίτο σύστημα |
| 6 | **Εμπορικοί όροι** | Proposal → Contract → Client Agreement: **3 χειροκίνητες επαναπληκτρολογήσεις** χωρίς αυτοματισμό· το prefill του Agreement κάνει fragile exact-string match του ελεύθερου `service_type` με `proposal_packages.name` (`client-agreements.ts:139-149`) | Τριπλή εισαγωγή ίδιων όρων· τιμές contract/agreement αποκλίνουν σιωπηλά χωρίς κανένα flag | «Convert accepted Proposal → Contract», auto-prefill Agreement στο sign, `service_type` ως select πάνω στα ίδια packages, banner σε απόκλιση τιμών |
| 7 | **Όνομα πελάτη** | `user_profiles.display_name` (γράφεται 1 φορά στο invite) vs `clients.contact_name` (επεξεργάσιμο) | Αλλαγή ονόματος πελάτη ενημερώνει μόνο το ένα· το header του πελάτη δείχνει το παλιό | Στο `updateClient`: sync και του display_name όταν υπάρχει linked user |
| 8 | **Υλικό αναφοράς προσωπικού** | 3 συστήματα: `kb_articles` (University), `sales_resources`, + **1509 γραμμές hardcoded JSX** (`sales-handbook.tsx`) με τιμές/προμήθειες καρφωμένες στον κώδικα | Αλλαγή τιμής = code deploy· κίνδυνος απόκλισης από το πραγματικό pricing tool (αντίθετο με τον κανόνα «όλα δυναμικά») | Μεταφορά handbook content σε `kb_articles`· ενιαίο μοντέλο content με audience tag |
| 9 | **Lead vs Client «lead»** | Πλήρες CRM 7 σταδίων στο `leads` **και** `clients.status='lead'` ελεύθερα επιλέξιμο από τη φόρμα πελάτη | Δύο ασύνδετες έννοιες «δεν είναι ακόμα πελάτης»· ο admin μπορεί να παρακάμψει το CRM | Αφαίρεση/κλείδωμα του 'lead' από CLIENT_STATUSES |
| 10 | **Το ίδιο τιμολόγιο σε 2 συστήματα** | Το DMS δεν εκδίδει τιμολόγια — καθρεφτίζει PDF από εξωτερικό λογιστικό/myDATA (μόνο upload+AI parse path) | Δομικά «διπλή καταγραφή» by design — να αναγνωριστεί ρητά ως συνειδητή απόφαση ή να αλλάξει | Ήδη κατεύθυνση ADR-0008· να τεκμηριωθεί το μοντέλο «mirror» |

---

## 5. Γιατί «είναι βαριά» — οι πραγματικές αιτίες, ιεραρχημένες

### Επίπεδο βάσης (το μεγαλύτερο μοχλό)

1. **RLS ανά γραμμή αντί ανά query — 79 εμφανίσεις σε 26 migrations.** Σχεδόν κάθε policy καλεί `auth.uid()`/`is_admin()`/EXISTS **χωρίς** τύλιγμα σε `(select ...)`, οπότε η Postgres επανεκτελεί τον έλεγχο **για κάθε γραμμή** κάθε πίνακα, σε **κάθε** request. Διόρθωση: ένα migration που κάνει DROP+CREATE όλα τα policies με ίδια λογική αλλά `(select auth.uid())` / `(select public.is_admin())`. Καμία αλλαγή σχήματος/δεδομένων — **η μεγαλύτερη μεμονωμένη βελτίωση ταχύτητας που υπάρχει διαθέσιμη**.
2. **Policies με 2-3 στοίβες EXISTS ανά γραμμή** στα employee deliverable update/delete (`00056`). Πρόταση: κοινός STABLE SECURITY DEFINER helper `has_role()`.
3. **Ελλείποντα indexes (όλα προσθετικά):**
   ```sql
   CREATE INDEX idx_messages_project_channel_created ON public.messages(project_id, channel, created_at);
   CREATE INDEX idx_client_agreements_package_id ON public.client_agreements(package_id);  -- τρέχει σε ΚΑΘΕ bookSlot
   CREATE INDEX idx_projects_created_by ON public.projects(created_by);        -- + ίδιο για tasks, deliverables,
   -- invoices, expenses, contracts, filming_requests (7 FK χωρίς index, 00013)
   ```
   και **DROP** τα περιττά: `idx_messages_project_created_recent` (παγωμένο NOW(), μόνιμο duplicate) + `idx_messages_project_created` (ακριβές duplicate του `idx_messages_created_at`) — 3 σχεδόν ίδια indexes πληρώνονται σε κάθε INSERT μηνύματος.
4. **`markMessagesAsRead`: N UPDATEs για N αδιάβαστα** (`messages.ts:126-133`), το καθένα με πλήρη επανεκτίμηση RLS, με αγνοημένα errors. Ένα RPC μία εντολή.

### Επίπεδο εφαρμογής

5. **Auth ξανά και ξανά:** `requireUser`/`requireAdmin` κάνουν ζωντανό `auth.getUser()` (+ role SELECT) σε **185 call sites** χωρίς React `cache()` — πάνω στο auth+role query που ήδη κάνει το middleware σε κάθε πλοήγηση. Σελίδα που καλεί 6 actions = 7+ auth round-trips. Διόρθωση: `cache()` στα auth-helpers + επιστροφή του role από το `requireUser` (τώρα τα actions ξανα-ρωτούν `user_profiles` για κάτι που το helper μόλις πέταξε).
6. **Μηδενικό pagination στα core lists:** `getProjects`, `getClients`, `getFilmingRequests` φέρνουν **ολόκληρους πίνακες**· μόνο 2 αρχεία σε όλη τη βάση κώδικα χρησιμοποιούν `.range()`. Το calendar (`queries/calendar.ts:26-53`) τραβά **όλη την ιστορία** projects/tasks/invoices/events χωρίς κανένα date bound σε κάθε φόρτωση.
7. **Admin leads page: ~13 round-trips ανά φόρτωση** — 7 ξεχωριστά count queries (ένα ανά στάδιο) + full-table scans που αθροίζονται σε JS. Πρόταση: ένα RPC με GROUP BY, όπως ήδη έγινε για το dashboard (00045/00046).
8. **Διπλά fetches ίδιας σελίδας:** `getProject`/`getClient` καλούνται και στο `generateMetadata` και στο body χωρίς `cache()`· τα tabs (tasks/deliverables/invoices) ξανα-φορτώνουν client-side ό,τι είχε ήδη ο server (μόνο το contracts-tab κάνει το σωστό pattern)· το `DeliverableDetail` ξανα-φέρνει όλη τη λίστα deliverables που κρατά ο γονιός.
9. **Σειριακά awaits:** client dashboard ~5 σειριακά round-trips + N+1 για deliverables ανά project· employee dashboard 6 queries στα ίδια rows (μία φορά fetch + bucketing αρκεί)· `router.refresh()` μετά από κάθε αλλαγή status ενός task ξανατρέχει όλα τα queries της σελίδας.
10. **Bundle:** το recharts φορτώνεται στατικά στο πιο επισκέψιμο σημείο (7 sparklines στο super_admin dashboard) ενώ FullCalendar/TipTap σωστά γίνονται dynamic· το 1509-γραμμών handbook είναι client component με 2 useState. **Κανένα `loading.tsx`** σε employee/salesman trees (blank σελίδα μέχρι να λυθούν όλα τα queries).
11. **Blocking εξωτερικές κλήσεις:** create/updateInvoice **περιμένουν** live Google Calendar sync μέσα στο submit (`invoices.ts:145-157, 210-222`)· τα bulk actions τρέχουν τα side effects **σειριακά ανά τιμολόγιο**.
12. **revalidatePath fan-out:** κάθε chat μήνυμα invalidates 3 paths, convertToProject 6, κ.ο.κ.
13. **`select('*')` σε 20 σημεία** — το `getProjects` μάλιστα με `clients(*)` σκορπά και PII πελατών (διεύθυνση, ΑΦΜ, σημειώσεις) σε κάθε φόρτωση client portal.

---

## 6. UX ανά ρόλο — τα βασικά σημεία σύγχυσης

### Admin
- **Ανάθεση εργαζόμενου σε παραγωγή: 3 άσχετα σημεία** (φόρμα δημιουργίας — μόνο κατά τη δημιουργία, popover σε kanban κάρτα, σελίδα Filming Prep) και **πουθενά** στο detail/edit του ίδιου του project.
- **Δύο διαφορετικά flows μετατροπής** filming request (legacy accept→convert vs Hold approve) χωρίς ένδειξη στη λίστα ποιο ισχύει ανά request.
- **Το πραγματικό lead management δεν υπάρχει στο /admin** — το `/admin/leads` είναι read-only· για stage change/convert ο admin πρέπει να ξέρει να πάει στο `/salesman/leads`.
- Νεκρός μηχανισμός draft/send στα contracts: δημιουργούνται πάντα `sent` (`contracts.ts:174`), αλλά υπάρχει κουμπί «Send» που δεν ενεργοποιείται ποτέ.
- Στη μετατροπή lead **χάνεται όλο το deal context** (deal_value, source, notes) — τίποτα δεν προσυμπληρώνει Contract/Agreement.

### Client
- **3 διαφορετικές ετικέτες/προορισμοί** για το ίδιο «υπόγραψε το συμφωνητικό» (dashboard, λίστα, project tab — το τρίτο μάλιστα παρακάμπτει την επιλογή upload).
- Ψηφιακή υπογραφή = άμεσο `signed`, upload = `pending_review` που περιμένει admin — **χωρίς καμία εξήγηση** ότι διαφέρουν.
- Το status του project εμφανίζεται με **3 διαφορετικές οπτικές** (dashboard timeline, λίστα, overview) που πρέπει να συγχρονίζει νοερά ο χρήστης.
- **i18n:** όλο το core flow approve/revision, τα preview/download, και **όλες οι ημερομηνίες** (`format()` χωρίς locale → «Jan 5, 2026») είναι αγγλικά μέσα σε ελληνικό UI.

### Employee
- Σπασμένος revision loop (βλ. 3.2) — το πιο σοβαρό.
- Checklist υπο-εργασιών **read-only** για τον employee (`<Checkbox disabled />`) ενώ ο admin επεξεργάζεται τα ίδια δεδομένα — αυτός που κάνει τη δουλειά δεν μπορεί να τσεκάρει την πρόοδό του.
- **Κανένα εσωτερικό κανάλι:** το MessageThread του employee καρφώνεται στο default `channel='client'` — κάθε μήνυμα πάει στον πελάτη· ο admin έχει selector client/team, ο employee όχι.
- Dashboard widgets read-only (χρειάζεται πλοήγηση για το πιο συχνό action)· διπλή route για ίδια οθόνη deliverables (μία unlisted, μόνο μέσω notification link).

### Salesman
- Convert σπασμένο (βλ. 3.1).
- Στάδια pipeline **αγγλικά** στο kanban/κάρτες/detail αλλά **ελληνικά** στο dashboard (LEAD_STAGE_LABELS hardcoded vs next-intl) — ίδιο session, δύο γλώσσες.
- Auto-activities («Stage changed to proposal») αποθηκεύονται **μόνιμα στα αγγλικά** στη βάση.
- Weighted pipeline value: **δύο διαφορετικοί υπολογισμοί** (salesman: hardcoded probability map αγνοώντας το πεδίο `probability`· admin: το πραγματικό πεδίο) → διαφορετικά νούμερα για το ίδιο lead.
- Kanban `grid-cols-7` χωρίς responsive fallback — άχρηστο κάτω από wide desktop.
- Lead detail πλήρως διπλο-υλοποιημένο admin vs salesman (254 vs 180 γραμμές, διαφορετικά formats, 3ο αντίγραφο icon map στο activity feed).

---

## 7. Νεκρός κώδικας προς αφαίρεση

| Τι | Πού | Σημείωση |
|---|---|---|
| Ολόκληρος 6-step BookingWizard (~7 αρχεία, 283+ γραμμές) | `src/components/client/book/booking-wizard.tsx` + step-*.tsx | Ξεπεράστηκε από το Hold flow· καλεί το παλιό `createFilmingRequest`· **0 imports** |
| Contract draft/send machinery | `contracts.ts:381-420`, `contract-view-page.tsx:124` | Μη προσβάσιμο — ή αφαίρεση ή πραγματικό draft βήμα |
| `useUnreadCount` hook | `src/hooks/use-unread-count.ts` | 0 χρήσεις· αν ενεργοποιούνταν, unfiltered table-wide realtime subscription |
| `TaskStatusUpdate.projectId` prop | `task-status-update.tsx:18-24` | Περνιέται παντού, δεν διαβάζεται ποτέ |
| `createPublicFilmingRequest` (όνομα) | `filming-requests.ts:510-564` | Γράφει `leads` — μετονομασία/μετακίνηση σε leads.ts |

---

## 8. Προτεινόμενο πλάνο (φάσεις — προς συζήτηση)

**Φάση 0 — Ασφάλεια (άμεσα, μικρό μέγεθος):**
00065 migration για messages RLS + annotation_seen policy· split του notifications.ts· requireAdmin στα invoices· έλεγχος στο live DB ποια policies ισχύουν σήμερα.

**Φάση 1 — Σπασμένες ροές (τα 5 κόκκινα bugs §3.1-3.5):**
Salesman convert (RPC)· employee revision visibility· ενοποίηση calendar sync (3 σημεία → `syncProjectFilmingToCalendar`)· booking_date fallback στο convert· wiring του My Agreement στα πραγματικά Holds. Συν: idempotency/ενοποίηση στο Stripe webhook, ενιαίο overdue.

**Φάση 2 — Ταχύτητα (χωρίς αλλαγή δεδομένων):**
Migration «RLS initplan wrap» (79 policies)· `cache()` στα auth-helpers + role στο return· pagination σε projects/clients/filming-requests + date-window στο calendar· leads RPC· Promise.all στα dashboards· loading.tsx σε employee/salesman· dynamic(recharts)· τα indexes/drops του §5.3· mark-read RPC· Google sync εκτός request path.

**Φάση 3 — Απλοποίηση (το «ένα πράγμα, ένα μέρος»):**
`findOrCreateClient`· ενιαίο convert helper + ατομικό RPC· `request_kind` badge· απόφαση activity_log vs notifications· Proposal→Contract→Agreement αλυσίδα με prefills· sync ονόματος πελάτη· ενιαία lead components + labels μέσω next-intl· handbook → kb_articles· i18n sweep (client flow, dates, settings pages)· καθάρισμα νεκρού κώδικα (§7)· ανάθεση εργαζόμενου στο project detail· team channel για employees.

---

## 9. Τι πήγε καλά (να μην χαλάσει)

- Το στρώμα dashboard/reports (migrations 00044-00054) είναι **σωστά χτισμένο**: σκόπιμα composite/partial indexes με τεκμηριωμένο query-to-index mapping, RPCs αντί για query storms — **αυτό είναι το πρότυπο** που πρέπει να επεκταθεί σε leads/calendar.
- `finance.ts` γίνεται σεβαστό ως single source of truth παντού· `format.ts` χωρίς παρακάμψεις.
- Το `book_slot` RPC (00064) κάνει ατομικά capacity+allowance — το πρότυπο για τα convert flows.
- Το University flow (employee) είναι το καθαρότερο, χωρίς κανένα εύρημα.
- FullCalendar/TipTap σωστά code-split· το contracts-tab δείχνει το σωστό initial-data pattern για όλα τα tabs.

---

*Πρωτογενή δεδομένα: 110 ευρήματα από 9 agents, αποθηκευμένα ανά agent σε JSON στο session scratchpad (`scratchpad/audit/*.json`). Τα ευρήματα §2.1, §2.2 επαληθεύτηκαν με απευθείας ανάγνωση των αρχείων. Τα υπόλοιπα citations προέρχονται από τους agents που διάβασαν τον κώδικα — πριν από κάθε fix ισχύει το ίδιο πρωτόκολλο: διάβασε το σημείο, επιβεβαίωσε, μετά άλλαξε.*
