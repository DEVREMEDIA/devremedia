# Supabase Setup Guide — Devre Media System

Οδηγός για στήσιμο fresh Supabase project (π.χ. για πελάτη).

---

## Βήμα 1 — Migrations (SQL Editor)

Τρέξε τα migrations **με τη σειρά** στο Supabase Dashboard → SQL Editor.
Κάθε αρχείο βρίσκεται στο `supabase/migrations/`.

| # | Αρχείο | Τι κάνει |
|---|--------|----------|
| 1 | `00001_auth_tables.sql` | user_profiles, activity_log, notifications + trigger auto-create profile on signup |
| 2 | `00002_core_tables.sql` | 14 core πίνακες (clients, projects, tasks, deliverables, invoices, contracts, filming_requests κλπ) |
| 3 | `00003_rls_policies.sql` | RLS policies για όλους τους core πίνακες |
| 4 | `00004_indexes_triggers.sql` | Indexes + updated_at triggers |
| 5 | `00005_role_expansion.sql` | Προσθήκη employee & salesman roles |
| 6 | `00006_employee_rls.sql` | RLS policies για employees (tasks, projects, deliverables) |
| 7 | `00007_leads_crm.sql` | leads + lead_activities πίνακες με RLS |
| 8 | `00008_university.sql` | kb_categories + kb_articles (internal university) |
| 9 | `00009_sales_resources.sql` | sales_resource_categories + sales_resources |
| 10 | `00010_add_selected_package.sql` | Προσθήκη selected_package στο filming_requests |
| 11 | `00011_public_booking_fields.sql` | Contact fields στο filming_requests (public booking form) |
| 12 | `00012_chatbot_pgvector.sql` | Chatbot tables (chat_knowledge, conversations, messages, rate_limits) + pgvector |
| 13 | `00013_add_created_by_columns.sql` | created_by column σε projects, tasks, deliverables, invoices, expenses, contracts, filming_requests |
| 14 | `00014_contract_service_fields.sql` | service_type, agreed_amount, payment_method στο contracts |
| 15 | `00015_calendar_events.sql` | calendar_events πίνακας |
| 16 | `00016_fix_data_relationships.sql` | sent_at/viewed_at στο invoices, leads FK, handle_new_user trigger |
| 17 | `00017_fix_rls_security.sql` | Security fixes (messages, chat, contracts, handle_new_user) |
| 18 | `00018_leads_nullable_assigned_to.sql` | leads.assigned_to γίνεται nullable (για public forms) |
| 19 | `00019_fix_rls_recursion.sql` | Fix RLS infinite recursion — δημιουργεί is_admin() helper + αντικαθιστά admin policies |
| 20 | `20240209_messaging_webhook.sql` | Realtime για messages + attachments storage bucket |
| 21 | `20260211_contract_reminders.sql` | contract_reminders πίνακας |

---

## Βήμα 2 — Storage Buckets

Στο Supabase Dashboard → Storage, δημιούργησε:

| Bucket | Public | Χρήση |
|--------|--------|-------|
| `attachments` | Ναι | Attachments σε messages |
| `sales-resources` | Όχι | Αρχεία για salesmen |

---

## Βήμα 3 — Environment Variables

Στο `.env.local` του Next.js project:

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJh...
SUPABASE_SERVICE_ROLE_KEY=eyJh...
```

Το `SUPABASE_SERVICE_ROLE_KEY` χρησιμοποιείται από τον admin client για:
- Public booking form → δημιουργία lead
- Contact form → δημιουργία lead
- Invite flow
- Convert filming request to project

---

## Βήμα 4 — Δημιουργία Admin User

1. Στο Supabase Dashboard → Authentication → Users → Add User
2. Δημιούργησε τον admin user (email + password)
3. Στο SQL Editor, κάνε τον admin:

```sql
UPDATE user_profiles
SET role = 'super_admin'
WHERE id = '<user-uuid-from-step-2>';
```

---

## Βήμα 5 — Seed Data (Προαιρετικό)

Αν θέλεις demo data:

1. Πρώτα ενημέρωσε τα hardcoded UUIDs στο `scripts/seed-data.sql` με τα πραγματικά UUIDs των users
2. Τρέξε το `scripts/seed-data.sql` στο SQL Editor

---

## Σημαντικές Σημειώσεις

- **Σειρά εκτέλεσης**: Τα migrations ΠΡΕΠΕΙ να τρέξουν με τη σειρά (1→21). Κάθε migration εξαρτάται από τα προηγούμενα.
- **RLS**: Όλοι οι πίνακες έχουν RLS enabled. Το migration 00019 φτιάχνει το infinite recursion issue.
- **Roles**: super_admin, admin, employee, salesman, client
- **Public forms**: Η booking form (`/book`) και η contact form (landing page) δημιουργούν leads χωρίς authentication, μέσω του admin client (service role key).

---

## Πίνακες Database (Σύνοψη)

### Core
- `user_profiles` — Ρόλοι χρηστών (linked to auth.users)
- `clients` — Πελάτες
- `projects` — Projects (linked to clients)
- `tasks` — Tasks (linked to projects)
- `deliverables` — Deliverables (linked to projects)
- `invoices` — Τιμολόγια (linked to clients + projects)
- `contracts` — Συμβόλαια (linked to clients + projects)
- `messages` — Messaging ανά project

### CRM
- `leads` — Lead pipeline (source: website, referral, social_media κλπ)
- `lead_activities` — Ιστορικό δραστηριοτήτων ανά lead

### Filming
- `filming_requests` — Αιτήματα filming (public + authenticated)
- `equipment_lists` — Εξοπλισμός ανά project
- `shot_lists` — Shot lists ανά project
- `concept_notes` — Concept notes ανά project

### Knowledge Base
- `kb_categories` — Κατηγορίες (internal university)
- `kb_articles` — Άρθρα

### Sales
- `sales_resource_categories` — Κατηγορίες resources
- `sales_resources` — Αρχεία για salesmen

### Chatbot
- `chat_knowledge` — RAG knowledge base (pgvector embeddings)
- `chat_conversations` — Συνομιλίες chatbot
- `chat_messages` — Μηνύματα chatbot
- `chat_rate_limits` — Rate limiting

### Λοιπά
- `activity_log` — Activity log
- `notifications` — Ειδοποιήσεις
- `contract_templates` — Templates συμβολαίων
- `contract_reminders` — Reminders για λήξη συμβολαίων
- `calendar_events` — Ημερολόγιο
- `video_annotations` — Annotations σε βίντεο
- `expenses` — Έξοδα
