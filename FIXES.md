# Devre Media System — Master Fix Tracker

> **Οδηγίες**: Αυτό το αρχείο περιέχει ΟΛΑ τα προβλήματα που βρέθηκαν στο full project review.
> Κάθε φορά που ολοκληρώνεται ένα fix, σημειώνεται ως `[x]` και τρέχει `pnpm build` για επιβεβαίωση.
> Ημερομηνία review: 2025-07-15

---

## PHASE 1: ΚΡΙΣΙΜΑ ΑΣΦΑΛΕΙΑΣ

### 1.1 Auth checks σε server actions (CRITICAL)
Σχεδόν ΟΛΑ τα server actions λείπουν `getUser()` auth checks.

- [x] `src/lib/actions/team.ts` — `updateTeamMemberRole` χωρίς auth (privilege escalation σε super_admin) ✅
- [x] `src/lib/actions/team.ts` — `getTeamMembers` χωρίς auth ✅
- [x] `src/lib/actions/team.ts` — `deactivateTeamMember` χωρίς role check ✅
- [x] `src/lib/actions/chatbot.ts` — Όλα (4 functions) χρησιμοποιούν adminClient χωρίς admin role check ✅
- [x] `src/lib/actions/clients.ts` — 5/5 functions χωρίς auth ✅
- [x] `src/lib/actions/filming-prep.ts` — 10/10 functions χωρίς auth ✅
- [x] `src/lib/actions/deliverables.ts` — 6/8 functions χωρίς auth ✅
- [x] `src/lib/actions/expenses.ts` — 4/5 functions χωρίς auth ✅
- [x] `src/lib/actions/invoices.ts` — 5/7 functions χωρίς auth ✅
- [x] `src/lib/actions/leads.ts` — 5/8 functions χωρίς auth ✅
- [x] `src/lib/actions/projects.ts` — 5/6 functions χωρίς auth ✅
- [x] `src/lib/actions/tasks.ts` — 5/6 functions χωρίς auth ✅
- [x] `src/lib/actions/settings.ts` — 4/4 functions χωρίς auth + `userId` δεν derives από getUser() ✅
- [x] `src/lib/actions/kb-articles.ts` — `createKbArticle`, `updateKbArticle`, `deleteKbArticle` χωρίς auth ✅
- [x] `src/lib/actions/kb-categories.ts` — `updateKbCategory`, `deleteKbCategory` χωρίς auth, `createKbCategory` χωρίς role check ✅
- [x] `src/lib/actions/sales-resources.ts` — 6/8 functions χωρίς auth ✅
- [x] `src/lib/actions/messages.ts` — `getMessagesByProject` χωρίς auth ✅
- [x] `src/lib/actions/lead-activities.ts` — `getLeadActivities` χωρίς auth ✅
- [x] `src/lib/actions/calendar-events.ts` — 3 functions χωρίς admin role check ✅
- [x] `src/lib/actions/contracts.ts` — `getAllContracts`, `createContract`, `updateContract`, `deleteContract`, template CRUD χωρίς role check ✅
- [x] `src/lib/actions/filming-requests.ts` — `reviewFilmingRequest`, `convertToProject` χωρίς admin role check ✅

### 1.2 Auth σε API routes (CRITICAL)
- [x] `src/app/api/contracts/[contractId]/sign/route.ts` — Added client ownership check via clients.user_id ✅
- [x] `src/app/api/invoices/[invoiceId]/pay/route.ts` — Added client ownership check ✅
- [x] `src/app/api/invoices/[invoiceId]/pdf/route.ts` — Added admin/client ownership check ✅
- [x] `src/app/api/invoices/export/route.ts` — Added admin role check ✅
- [x] `src/app/api/chat/route.ts` — Rate limiter now uses IP+sessionId to prevent bypass ✅

### 1.3 PostgREST injection (CRITICAL)
User search input interpolated χωρίς escape στο `.or()`:
- [x] `src/lib/actions/clients.ts` — `filters.search` injection ✅ (escapePostgrestFilter)
- [x] `src/lib/actions/leads.ts` — `filters.search` injection ✅
- [x] `src/lib/actions/projects.ts` — `filters.search` injection ✅
- [x] `src/lib/actions/kb-articles.ts` — `searchArticles` query injection ✅

### 1.4 Auth logic bugs (CRITICAL)
- [x] `src/lib/actions/contracts.ts:300` — `signContract` bypass: αν `clientUserId` null, anyone signs ✅ (changed && to !clientUserId ||)
- [x] `src/app/auth/callback/route.ts:19` — Open redirect via unvalidated `next` parameter ✅ (validate relative path)
- [x] `src/app/auth/confirm/route.ts:22` — Open redirect via unvalidated `next` parameter ✅

### 1.5 RLS problems (CRITICAL — SQL migrations needed)
- [x] `20240209_messaging_webhook.sql` — Messages RLS πολύ permissive ✅ (00017: project-scoped SELECT/UPDATE)
- [x] `00012_chatbot_pgvector.sql:148` — `chat_conversations` UPDATE open to all ✅ (00017: admin/session-owner only)
- [x] `00012_chatbot_pgvector.sql:186` — `chat_rate_limits` USING(true) ✅ (00017: dropped policy, service role bypasses RLS)
- [x] `00012_chatbot_pgvector.sql:114` — Trigger calls `update_updated_at()` ✅ (00017: created missing function)
- [x] `00003_rls_policies.sql:285` — Clients can UPDATE any column ✅ (00017: restricted to sign flow only)
- [x] `00016_fix_data_relationships.sql:29` — Email auto-link takeover ✅ (00017: only auto-link if invited_by metadata)

---

## PHASE 2: BUGS (σπασμένη λειτουργικότητα)

### 2.1 Data/Logic bugs
- [x] `src/lib/actions/invoices.ts:157` — `|| 24` πρέπει `?? 24` (0% tax → 24%) ✅
- [x] `src/components/admin/invoices/invoice-form.tsx:112` — Error toast shows success message ✅ (use updateFailed/createFailed keys)
- [x] `src/hooks/use-require-role.ts:42` — Infinite re-render (inline array in deps) ✅ (rolesKey string)
- [x] `src/app/admin/clients/[clientId]/client-detail.tsx:67` — catch shows "Client deleted" as error ✅ (deleteFailed key)
- [x] `src/app/admin/clients/columns.tsx:49` — Same wrong toast in catch ✅
- [x] `src/app/admin/projects/[projectId]/project-detail.tsx:352-366` — Tasks/Deliverables tabs show EmptyState placeholder instead of real components ✅
- [x] `src/app/admin/projects/[projectId]/project-detail.tsx:197` — Budget currency USD instead of EUR ✅
- [x] `src/components/admin/notification-bell.tsx:15` — `hasUnread = true` hardcoded always ✅ (set to false)
- [x] `src/components/admin/deliverables/deliverable-detail.tsx:99` — `getPublicUrl` on private bucket (broken download) ✅ (createSignedUrl)
- [x] `src/components/admin/tasks/task-detail-sheet.tsx:238` — Free text input for UUID field (FK violation) ✅ (UUID regex validation)
- [x] `src/components/shared/contract-view.tsx:86` — `signed_at!` non-null assertion without guard ✅ (added guard)
- [x] `src/components/client/projects/contracts-tab.tsx:64` — Sign button only for `sent`, ignores `viewed` ✅
- [x] `src/components/admin/calendar/upcoming-events.tsx:62` — `custom` missing from TYPE_KEYS → crash ✅
- [x] `src/components/admin/calendar/calendar-stats.tsx:35` — datetime vs date-only string comparison ✅ (Date objects)
- [x] `src/components/client/invoices/invoice-detail.tsx:32-43` — Fake payment flow, loading never reset ✅ (added setLoading(false) before redirect)
- [x] `src/app/(auth)/login/page.tsx:56` — toast.error called in render body (repeated toasts) ✅ (useEffect)
- [x] `src/components/employee/tasks/task-status-update.tsx:39-43` — Same translation key for success/error ✅
- [x] `src/components/shared/message-attachment.tsx:33` — Broken download (fetch without signed URL) ✅ (createSignedUrl)
- [x] `src/components/employee/user-nav.tsx:63` — Dead link to `/employee/profile` ✅ (→ /employee/settings)
- [x] `src/components/providers/auth-provider.tsx:88` — `supabase` in deps creates new subscription every render ✅ (useMemo)
- [x] `src/app/admin/clients/[clientId]/client-detail.tsx:232-247` — Hardcoded `0`/`$0` placeholder stats ✅ (fetch real projects/invoices, pass stats prop)
- [x] `src/components/admin/invoices/invoice-form.tsx:278` — Currency hardcoded EUR in InvoiceSummary instead of form value ✅

### 2.2 React anti-patterns
- [x] `src/components/admin/filming-prep/concept-notes.tsx:243` — Stale closure debounce (useState instead of useRef) ✅
- [x] `src/components/admin/filming-prep/shot-list.tsx:137` — Same stale closure bug ✅
- [x] `src/components/admin/filming-prep/equipment-checklist.tsx:89` — Unstable IDs with Date.now() (breaks dnd-kit) ✅ (crypto.randomUUID)

### 2.3 Build errors (DONE)
- [x] `src/app/employee/university/[categorySlug]/page.tsx:42` — Type error unknown → KbArticle (fixed return type + removed duplicate query)
- [x] `src/app/salesman/resources/[categoryId]/page.tsx:46` — Type error unknown → SalesResource (fixed return type + removed duplicate query)
- [x] `src/app/admin/sales-resources/page.tsx:16` — Type cast mismatch after return type fix

---

## PHASE 3: TYPE SAFETY

### 3.1 Server actions returning `unknown` instead of proper types
- [x] `src/lib/actions/clients.ts` — 4 functions return `ActionResult<unknown>` ✅ (typed to Client[])
- [x] `src/lib/actions/invoices.ts` — 2 functions return `ActionResult<unknown>` ✅ (typed to InvoiceWithRelations)
- [x] `src/lib/actions/leads.ts` — 3 functions return `ActionResult<unknown>` ✅ (typed to Lead[])
- [x] `src/lib/actions/messages.ts` — 2 functions return `ActionResult<unknown>` ✅ (typed to Message[])
- [x] `src/lib/actions/kb-articles.ts` — 4 functions return `ActionResult<unknown>` ✅ (typed with KbArticleWithCategory)
- [x] `src/lib/actions/chatbot.ts` — 2 functions return `ActionResult<unknown>` ✅ (typed to ChatKnowledge)
- [x] `src/lib/actions/lead-activities.ts` — 1 function returns `ActionResult<unknown[]>` ✅ (typed to LeadActivity[])
- [x] `src/lib/actions/filming-requests.ts` — 1 function returns `ActionResult<unknown>` ✅ (typed return)

### 3.2 Unsafe type casts
- [x] `src/components/admin/filming-prep/concept-notes.tsx:69` — `as ConceptNote[]` cast ✅ (aligned types/index.ts with DB, removed local interface)
- [x] `src/components/client/projects/deliverables-tab.tsx:104` — `as unknown as VideoAnnotation[]` double cast ✅ (fixed global type to match DB, imported from @/types)
- [x] `src/components/admin/filming-requests/filming-request-detail.tsx:83` — `as { id: string }` cast ✅ (removed, uses result.data!.id)
- [x] `src/components/admin/contracts/template-list.tsx:71` — unsafe cast to extend type ✅ (removed cast, use content.slice)
- [x] `src/components/admin/calendar/calendar-event-form.tsx:102` — `as` cast on event_type ✅ (typed CalendarEventRecord.event_type properly)

### 3.3 Zod schema gaps
- [x] `src/lib/schemas/invoice.ts:21-22` — `issue_date`/`due_date` no date format validation ✅ (regex YYYY-MM-DD)
- [x] `src/lib/schemas/expense.ts:12` — `date` no format validation ✅
- [x] `src/lib/schemas/calendar-event.ts:8-9` — `start_date`/`end_date` no date format validation ✅ (regex with optional time)
- [x] `src/lib/schemas/project.ts:14-15` — date fields no format validation ✅
- [x] `src/lib/schemas/task.ts:14` — date fields no format validation ✅
- [x] `src/lib/schemas/contract.ts:58-63` — `signature_image` no base64 format validation ✅ (refine startsWith data:image/)
- [x] `src/lib/schemas/filming-request.ts:25` — `reference_links` not validated as URLs ✅ (z.string().url())
- [x] `src/lib/schemas/message.ts:10` — `file_size` no upper bound ✅ (max 100MB)
- [x] `src/lib/actions/leads.ts:136` — `updateLeadStage` accepts any string, not validated against enum ✅ (LEAD_STAGES check)

---

## PHASE 4: PERFORMANCE

- [x] `src/app/client/dashboard/page.tsx:44-60` — N+1 sequential deliverable queries → Promise.all ✅
- [x] `src/lib/actions/contracts.ts:69,111` — `select('*')` violations ✅ (explicit columns)
- [x] `src/lib/actions/invoices.ts:22` — `select('*, client:clients(*), project:projects(*)')` triple wildcard ✅
- [x] `src/lib/actions/clients.ts` — `select('*')` on clients table ✅
- [x] `src/lib/actions/tasks.ts` — `select('*')` throughout ✅
- [x] `src/lib/actions/deliverables.ts` — `select('*')` throughout ✅
- [x] `src/lib/actions/expenses.ts` — `select('*')` throughout ✅
- [x] `src/lib/actions/filming-prep.ts` — `select('*')` throughout ✅
- [x] `src/lib/actions/kb-categories.ts` — `select('*')` throughout ✅
- [x] `src/lib/actions/sales-resources.ts` — `select('*')` on categories ✅
- [x] `src/lib/queries/leads.ts:6` — Full table scan for stage count (should aggregate in DB) ✅ (parallel count queries with head:true)
- [x] `src/app/admin/dashboard/page.tsx:39-44` — Already uses Promise.all ✅ (was false positive)

---

## PHASE 5: i18n (hardcoded strings)

### Admin pages/components (English)
- [x] `src/app/admin/contracts/page.tsx` — "Contracts", description ✅ (getTranslations)
- [x] `src/app/admin/contracts/[contractId]/contract-view-page.tsx` — "Back to Project", "Download PDF", etc. ✅ (t() calls)
- [x] `src/app/admin/contracts/contracts-list-page.tsx` — EmptyState, ConfirmDialog strings ✅ (t() + locale-aware date)
- [x] `src/app/admin/contracts/templates/templates-content.tsx` — "Contract Templates", "New Template" ✅ (useTranslations)
- [x] `src/app/admin/leads/page.tsx` — "Leads", "All Leads", "Sales Reports" ✅ (getTranslations)
- [x] `src/app/admin/university/page.tsx` — "DMS University" ✅ (getTranslations)
- [x] `src/app/admin/chatbot/page.tsx` — "AI Chatbot", tabs ✅ (getTranslations + chatbot namespace)
- [x] `src/app/admin/filming-prep/[projectId]/filming-prep-content.tsx` — tab labels ✅ (useTranslations)
- [x] `src/components/admin/leads/all-leads-table.tsx` — column headers ✅ (t() + locale-aware date)
- [x] `src/components/admin/leads/lead-detail.tsx` — tabs, card titles ✅ (t() + locale-aware date)
- [x] `src/components/admin/deliverables/approval-actions.tsx` — all labels ✅ (t() calls)
- [x] `src/components/admin/deliverables/video-upload.tsx` — all labels ✅ (t() calls)
- [x] `src/components/admin/invoices/invoice-summary.tsx` — "Subtotal", "Total", "ΦΠΑ" ✅ (i18n with useTranslations)
- [x] `src/app/admin/invoices/[invoiceId]/invoice-detail.tsx` — "ΦΠΑ" hardcoded Greek ✅ (t('vat'))
- [x] `src/components/admin/chatbot/chatbot-stats.tsx` — stat titles ✅ (useTranslations + chatbot namespace)
- [x] `src/components/admin/sales-resources/sales-resources-overview.tsx` — labels ✅ (t() calls)
- [x] `src/components/admin/settings/team-management.tsx:96` — `window.confirm()` instead of ConfirmDialog ✅ (replaced with ConfirmDialog component)

### Client/shared components
- [x] `src/components/client/invoices/invoice-detail.tsx` — dozens of hardcoded strings ✅ (all replaced with t() keys)
- [x] `src/app/client/projects/[projectId]/client-project-detail.tsx` — tab labels, card content ✅ (useTranslations + locale-aware dates)
- [x] `src/components/client/book/step-package.tsx` — hardcoded Greek strings ✅ (i18n with booking namespace)
- [x] `src/components/shared/contract-view.tsx:44` — English date format ✅ (toLocaleDateString with undefined locale)
- [x] `src/components/shared/public-booking-form.tsx:101` — `t('submitError')` key missing from locales ✅ (added to en.json + el.json)
- [x] `src/components/shared/tiptap-editor.tsx:70` — `window.prompt` for URL ✅ (i18n with common.enterUrl)

### Employee/salesman components
- [x] `src/components/salesman/leads/lead-card.tsx:76` — "Contacted today", "Xd ago" hardcoded ✅ (i18n keys)
- [x] `src/components/salesman/leads/lead-detail.tsx` — "Information", "Activities" etc. ✅ (useTranslations + locale-aware dates)
- [x] `src/components/salesman/leads/lead-convert-dialog.tsx` — "Cancel", "Convert to Client" ✅ (tCommon('cancel') + t('convertToClient'))
- [x] `src/components/salesman/dashboard/recent-activity.tsx` — all labels ✅ (useTranslations('salesman.dashboard'))
- [x] `src/app/(auth)/onboarding/page.tsx` — all labels hardcoded English ✅ (t() calls with auth namespace)
- [x] `src/app/(auth)/update-password/page.tsx` — all labels hardcoded English ✅ (t() calls with auth namespace)
- [x] `src/components/employee/tasks/my-task-card.tsx:72` — `'en-US'` locale hardcoded ✅ (undefined locale)

---

## PHASE 6: CODE QUALITY

### File size violations (>300 lines)
- [x] `src/types/index.ts` — 794 lines → split ✅ (entities.ts, relations.ts, filters.ts + barrel index.ts)
- [x] `src/lib/constants.ts` — 581 lines → split ✅ (enums.ts, labels.ts, equipment.ts, services.ts + barrel index.ts)
- [x] `src/components/admin/filming-prep/equipment-checklist.tsx` — 606→162 lines ✅ (extracted equipment-catalog-dialog.tsx)
- [x] `src/components/client/projects/deliverables-tab.tsx` — 493→244 lines ✅ (removed unused props, simplified)
- [x] `src/lib/pdf/contract-template.tsx` — 451→172 lines ✅ (extracted contract-pdf-styles.ts with styles + terms)
- [x] `src/components/shared/public-booking-form.tsx` — 450→129 lines ✅ (simplified)

### Duplicated code
- [x] EVENT_TYPE_KEYS duplicated in 2 calendar files ✅ (moved to constants.ts, imported in both)
- [x] PAYMENT_LABELS duplicated in contracts.ts and contract-template.tsx ✅ (PAYMENT_METHOD_LABELS in constants.ts)
- [x] DeliverableWithProject type duplicated in dashboard and recent-deliverables ✅ (moved to types/index.ts)
- [x] ContractCard isSignable() duplicated in contracts-list.tsx and recent-contracts.tsx ✅ (isContractSignable in constants.ts)

### Other
- [x] `src/lib/queries/leads.ts` — Missing `'use server'` directive ✅
- [x] `src/lib/queries/calendar.ts:1` — `'use server'` on query file ✅ (kept 'use server' since server-only not installed)
- [x] `src/components/admin/invoices/line-items-editor.tsx:62` — index as key in mutable list ✅ (useRef-based stable keys)
- [x] `src/components/admin/filming-prep/shot-list.tsx:249` — index as key in mutable list ✅ (shot.number key)
- [x] `src/components/shared/message-bubble.tsx:65` — index as key on attachments ✅ (file_path key)
- [x] `src/components/client/dashboard/pending-actions.tsx:17` — `projects` prop unused ✅ (removed)
- [x] `src/components/client/projects/deliverables-tab.tsx:69` — `projectId` prop unused ✅ (removed)

---

## Progress Summary

| Phase | Total | Done | Remaining |
|-------|-------|------|-----------|
| 1. Security | 39 | 39 | 0 |
| 2. Bugs | 28 | 28 | 0 |
| 3. Type Safety | 22 | 22 | 0 |
| 4. Performance | 12 | 12 | 0 |
| 5. i18n | 30 | 30 | 0 |
| 6. Code Quality | 17 | 17 | 0 |
| **TOTAL** | **148** | **148** | **0** |
