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

## Plan
- Wave 1 (`feat/v2-closeout-wave1`): lint errors, route literals, 12 loading.tsx, #128, #126, i18n strings, pricing-health.
- Wave 2 (`feat/v2-closeout-wave2`): 7 detail screens → DetailShell, 6 stat grids → StatGrid, colour debt (excl. handbook), 2 tables.
- Wave 3 (later): 12 dialogs → FormDialog; guard rules for StatGrid/DetailShell/FormDialog.
