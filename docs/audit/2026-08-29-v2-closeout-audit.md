# v2 / Editorial Noir close-out audit — 2026-08-29

Baseline: `origin/master` @ `0507b0a` (#138). Seven parallel read-only audits + gate run.

## Gates on master

| Gate | Result |
|---|---|
| `pnpm type-check` | ok |
| `pnpm lint` | **6 errors** (`react-hooks/preserve-manual-memoization` in 4 admin components), 35 warnings |
| `pnpm test` | 218/218 |
| `check:design` | ok — 688 files, 0 raw colours; 1 title pending; 2 tables pending + 1 undetectable |
| `check:routes` | ok — 33 stubs |
| `check:i18n` | ok — 2513 calls resolved, el/en key trees identical (2546 keys) |

## PRD #100 — what is done

Token layer, Greek-subset typography (3 faces), the five shared parts, status-tone resolver + tests,
repo-wide design guard wired into `build`, client home streamed per section, invoice detail fetch
de-duplicated, explicit theme wins over OS, focus-visible + reduced-motion, StatusBadge speaks Greek.
Perf: **no real page-level waterfall remains** — #131's "52 pages" was a measurement artefact;
#138 fixed the real 5. Recommend closing #131 with a pointer to #138.

## What was NOT done (residuals)

| Area | Count | Detail |
|---|---|---|
| `loading.tsx` missing on detail routes | 12 | contracts, proposals, university article, chatbot conv., employee project/task/university×2/deliverables, salesman lead/resources, client contract |
| Detail screens not on `DetailShell` | 7 | employee project-detail, task-detail; salesman lead-detail; admin proposal-detail, contract-view-page; client contract-view-client; chatbot conversation-detail |
| Bespoke stat grids | 6 (+handbook, dev) | admin project-detail overview, client invoices-summary, my-agreement-card, expense-report, sales-report, cost-model summary-tab |
| Add/edit dialogs not on `FormDialog` | 12 | 4 strict (category-manage, category-form, resource-upload-form, expense-form) + 8 controlled-state dialogs |
| Hand-rolled tables | 3 | sales-report, knowledge-table (pending), cost-model items-tab (undetectable editable grid) |
| Raw colour debt (guard PENDING) | 10 files | handbook (~45), client projects-list (22), sales-report (10), video-player (10), crew-load-heatmap (6), invoices-content (4), message-attachment (2), risk-panel (1), revenue-forecast-card (1), branding-settings (false positive) |
| Stale route literals → stubs | 25 | `use-require-role.ts` (all 5 wrong), update-password, confirm, confirmation-form, booking-wizard, invoice success, filming-requests notifications, breadcrumbs, risk links |
| Dead literal | 3 | `/admin/expenses` in `expenses.ts` (real: `/admin/invoices/expenses`) |
| Hardcoded English strings | 61 in 31 files | titles, toasts, aria-labels, zod messages |
| Lint errors | 6 | see gates |
| Minor perf | 3 | `pricing-health.ts` 3rd fetch outside Promise.all; `leads.ts` per-stage count; sequential loops in bulk invoice/booking-config writes |

## Guard blind spots
`check-design.mjs` does not enforce: StatGrid usage, DetailShell adoption on `[id]` routes, FormDialog usage, CSS-grid tables.

## Open items needing the owner
- PR #124 (e2e timeouts) — CLEAN, mergeable; merge it.
- PR #95 (phase-0 security) — CONFLICTING after #136–#138; needs rebase + joint review + cloud migration.
- #119 e2e fixture layer — L, test-only, separate effort.
- Owner visual sign-off of both editions (PRD Ruling H) — not delegable.
- E2E identity suite mostly credential-gated (`E2E_TEST_USERS_READY`).

## Delivered
- **Wave 1** (`feat/v2-closeout-wave1`): lint 0 errors, 26 route literals, 12 `loading.tsx`, #128, #126, 61 i18n strings, pricing-health concurrency.
- **Wave 2** (`feat/v2-closeout-wave2`, stacked on wave 1): 7 detail screens → `DetailShell` (employee project/task, salesman lead, admin proposal/contract/chat conversation, client contract); 6 stat grids → `StatGrid`; colour debt paid in 8 files (new `--media-foreground` token for media chrome; branding-settings ruled a data default → `COLOUR_EXEMPT`); sales-report + knowledge-table → `DataTable` (`TABLE_PENDING` now empty); 11 add/edit dialogs → `FormDialog` (event-dialog is a read-only view, left); one deliberate dynamic `backHref` registered in `check-routes.mjs`.

## Still open after both waves
- Sales handbook raw colours (content, out of PRD scope — the only remaining colour `PENDING`).
- `items-tab.tsx` editable grid (needs an editable-cell contract on `DataTable`).
- Guard blind spots (StatGrid / DetailShell / FormDialog adoption not enforced) — worth a follow-up rule now that adoption is complete.
- The five owner items listed above (#124 merge, #95 rebase, #119, visual sign-off, credentialed e2e).

## Point zero — 2026-08-29, afternoon (`feat/point-zero`)
Everything above that could be closed from the code side was closed the same day:
- **Merged**: #124, #139, #141 (morning); #95 phase-0 security (rebased, one conflict in `auth-helpers.ts` — `requireRole` + `getAdminRole` both kept), #94 ADR-0008 docs.
- **#93** RF / bank payment instructions: `resolvePaymentInstructions` (pure, 11 tests), `invoices.rf_code` + `public.settings` migration `20260829_invoice_rf_code.sql`, bank details in company settings, admin RF edit (FormDialog), client panel with copy-to-clipboard, Stripe left dormant, «Σήμανση ως απεσταλμένο».
- **#89 / #90 / #91** read-only Profile: `buildProfileView` (pure, 28 tests), `getMyProfile()`, `ProfileForm` is a `<dl>` mirror; wired on client/employee/salesman settings. Fixed the latent bug (form wrote non-existent `user_profiles` columns).
- **#119** e2e fixture layer: `e2e/fixtures/*` (seed/teardown/graph, namespaced `E2E-<runId>`, refuses to run against the app's own Supabase project), `globalSetup`/`globalTeardown` wired, `pnpm e2e:seed` / `e2e:teardown [--all]`, `SETUP.md` rewritten. **All 79 `test.skip(true)` removed** across the 7 specs — rewritten against the fixture graph. **Written, not executed** — there is no non-production database here.
- Sales handbook: 45 raw colours → tokens; commission tiles → `StatGrid`. Colour `PENDING` is now empty.
- `items-tab.tsx`: Ruling H — editable cost grid is content, not a list → `TABLE_DETAIL_EXEMPT_UNDETECTABLE`.
- Guard now enforces **DetailShell** on `[id]` screens, **StatGrid** for hand-rolled stat rows, **FormDialog** for dialogs with form controls (`scripts/check-design/*.mjs`); the 8 violations it surfaced were migrated the same afternoon → 0 pending on all three.

### What only the owner can do
1. Apply to cloud, in this order: `00065`–`00069` (unverified), `20240209_…`, `20260211_…`, `20260729_phase0_security_rls.sql`, `20260829_invoice_rf_code.sql`. Keep the date names.
2. Fill company **Bank Details** in Settings; set RF codes on open invoices.
3. Point the e2e suite at a non-production Supabase project (`E2E_SUPABASE_URL` + service key) and run `pnpm e2e:seed && pnpm test:e2e` — first real run of the 79 rewritten tests; expect selector fixes.
4. Visual sign-off of both editions (PRD #100 Ruling H) — then close #100.
5. #125: cannot be measured here (authenticated routes, no test users). Templates tab = TipTap cold compile; health tab's serial `cost_items` fetch was folded into `Promise.all` in #139. Re-measure on `pnpm build && pnpm start` once (3) exists.
