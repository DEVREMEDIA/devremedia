# E2E Test Setup

The Playwright suite runs against a **disposable, seeded database**. A fixture
layer creates a known graph of records before the run, the specs address those
records by name, and teardown deletes them again — pass or fail.

This replaces the old arrangement, where 79 tests were `test.skip(true, 'Requires
database with …')` because nothing guaranteed a client, a draft contract or an
unpaid invoice existed. See issue #119.

---

## 1. The one rule

**Never point the fixture layer at the application database.**

The seed creates rows and the teardown deletes them. Run either against a real
customer system and you have created and then destroyed real records. The layer
is built to make that hard:

| Guard | Behaviour |
|---|---|
| Separate variables | Reads `E2E_SUPABASE_URL` / `E2E_SUPABASE_SERVICE_ROLE_KEY`. It never falls back to `NEXT_PUBLIC_SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY`. |
| Same-project refusal | If `E2E_SUPABASE_URL` equals `NEXT_PUBLIC_SUPABASE_URL`, or the two service keys match, seeding throws. |
| Explicit override | That refusal lifts only with `E2E_ALLOW_SAME_PROJECT=1`, typed deliberately. |
| Namespacing | Every seeded value is prefixed `E2E-<runId>`. Teardown deletes by that prefix and by recorded id — never "everything in the table". |
| No seed, no run | With `E2E_SUPABASE_URL` unset, seeding and teardown are no-ops and the credentialed specs skip. The unauthenticated smoke tests still run. |

`.env.local` in this repo points at **production**. It is not a valid target.

---

## 2. Prerequisites

- Node.js and `pnpm`
- A disposable Supabase project — a local `supabase start` is the intended
  target — with every migration in `supabase/migrations/` applied
- `npx playwright install` (Chromium, Firefox, WebKit)

## 3. Configure

Create `.env.test` in the project root (gitignored). It is read automatically by
the seed, the teardown and Playwright's global setup; existing `process.env`
values always win, so CI can pass these as secrets instead.

```env
# Required — point at a DISPOSABLE project
E2E_SUPABASE_URL=http://127.0.0.1:54321
E2E_SUPABASE_SERVICE_ROLE_KEY=<service role key of that project>

# Required — passwords for the two seeded auth users.
# No defaults on purpose: this repo is public, and an admin account with a
# readable password could never safely exist. Generate them.
E2E_ADMIN_PASSWORD=<generated>
E2E_CLIENT_PASSWORD=<generated>

# Optional
E2E_RUN_ID=local          # fixed run id instead of a generated one
E2E_WRITE_TESTS=1         # allow specs that create/modify/delete records
```

> The committed `.env.test.example` still describes the pre-fixture setup, with
> literal passwords in a comment. Those are dead. This section is the current
> contract.

### The gates, and what changed

| Variable | Meaning |
|---|---|
| `E2E_SUPABASE_URL` | Present ⇒ seed before the run, tear down after. Absent ⇒ neither. |
| `E2E_TEST_USERS_READY` | **The seed now sets this itself.** If the seed ran, the users exist; there is nothing left to confirm. Set it by hand only when running against users you created manually, with no fixture database. |
| `E2E_WRITE_TESTS` | Unchanged in meaning: the suite may create, modify and delete records. Still separate from seeding, because a spec that writes can write outside the fixture graph — `hold-resolution.spec.ts` approves or rejects the newest request in the admin list, which on a shared database is somebody's real booking, and approval has no undo. Leave it unset unless the target database is genuinely disposable. |

## 4. Run

```bash
pnpm test:e2e            # seed → sessions → tests → teardown
pnpm e2e:seed            # seed only (leaves the graph in place)
pnpm e2e:teardown        # delete the recorded run
pnpm e2e:teardown -- --all  # sweep every E2E- row, including crashed runs
```

`pnpm e2e:seed` writes `e2e/.auth/fixture-run.json` — the manifest of everything
it created. Teardown reads it. It is gitignored along with the rest of
`e2e/.auth/`.

Seeding is idempotent per run: seeding over an existing manifest tears that run
down first, so re-running never leaves two half-graphs behind.

If a run crashes hard enough to skip teardown, `pnpm e2e:teardown -- --all` sweeps
every `E2E-` prefixed row and every `e2e-…@devre.test` auth user, whichever run
created them.

---

## 5. What gets seeded

One coherent graph, all of it namespaced `E2E-<runId>`:

- **2 auth users** — `e2e-<runId>-admin@devre.test` (role `admin`) and
  `e2e-<runId>-client@devre.test` (role `client`), both with confirmed emails.
- **2 clients** — one linked to the client user via `clients.user_id` and
  carrying the whole graph; one deliberately empty (no projects, no invoices, no
  contracts, no portal login).
- **2 projects** on the linked client — one `filming`, one `delivered`.
- **1 task**, **1 deliverable** (a link, no storage object), **1 message** on the
  active project.
- **3 contracts** — `draft`, `sent` (unsigned and signable) and `signed`.
- **2 invoices** — one `paid`, one `sent` and due in the future.
- **1 filming request** with status `pending`.
- **1 lead** at stage `new`, assigned to the admin user.

No storage objects are created, so nothing needs sweeping from buckets.

Column values are taken from `supabase/migrations/` and
`src/lib/constants/enums.ts`. One trap worth naming: the `CONTRACT_STATUSES`
array in constants contains `pending_review`, but the database CHECK constraint
from `00002_core_tables.sql` does not allow it.

---

## 6. Using fixtures in a spec

Import the graph and name the record you mean. Never click "the first row" —
that is whatever the database sorted first, not the thing under test.

```typescript
import { test, expect } from '@playwright/test';
import { fixtures, hasFixtures } from './fixtures/graph';
import { loginAsAdmin } from './helpers/auth';

test.describe('Contracts - Admin', () => {
  test.beforeEach(async ({ page }) => {
    test.skip(!process.env.E2E_TEST_USERS_READY, 'Test users not configured');
    test.skip(!hasFixtures, 'E2E fixtures not seeded — set E2E_SUPABASE_URL');
    await loginAsAdmin(page);
  });

  test('admin can send a draft contract for signature', async ({ page }) => {
    const contract = fixtures().contracts.draft;

    await page.goto(`/admin/contracts/${contract.id}`);
    await expect(page.getByRole('heading', { name: contract.title })).toBeVisible();
  });
});
```

`hasFixtures` is a boolean evaluated at import time, safe in `test.skip`.
`fixtures()` throws if nothing was seeded, so guard with `hasFixtures` first.

### The full API — `e2e/fixtures/graph.ts`

Every entry names one record. IDs are real UUIDs from the seeded database, so
they can go straight into a route.

| Accessor | Names |
|---|---|
| `fixtures().runId` / `.namespace` | The run id, and `E2E-<runId>` — the prefix on every seeded string |
| `fixtures().users.admin` | `.id`, `.email`, `.role` (`'admin'`), `.displayName` |
| `fixtures().users.client` | Same shape, role `'client'` |
| `fixtures().client` | The populated client: `.id`, `.companyName`, `.contactName`, `.email`, `.userId` |
| `fixtures().emptyClient` | A client with no projects/invoices/contracts and no login; `.userId` is `null` |
| `fixtures().projects.active` | Project in status `filming`: `.id`, `.title`, `.status`, `.projectType` |
| `fixtures().projects.delivered` | Project in status `delivered`, same shape |
| `fixtures().task` | `.id`, `.title`, `.status` (`'todo'`) — on the active project |
| `fixtures().deliverable` | `.id`, `.title`, `.status` (`'pending_review'`) — on the active project |
| `fixtures().message` | `.id`, `.content` — admin-authored, channel `client`, on the active project |
| `fixtures().contracts.draft` | Never sent. `.id`, `.title`, `.status` (`'draft'`) |
| `fixtures().contracts.sent` | Unsigned and signable by the client. `.status` is `'sent'` |
| `fixtures().contracts.signed` | Signed, with `signed_at` and `signature_data`. `.status` is `'signed'` |
| `fixtures().invoices.paid` | `.id`, `.number`, `.status` (`'paid'`), `.total` |
| `fixtures().invoices.unpaid` | `.status` is `'sent'`, due in the future, no `paid_at` |
| `fixtures().filmingRequest` | `.id`, `.title`, `.status` (`'pending'`) |
| `fixtures().lead` | `.id`, `.contactName`, `.companyName`, `.email`, `.stage` (`'new'`) |

Also exported: `FIXTURE` (the nullable raw manifest — use `hasFixtures` instead),
`FIXTURE_PREFIX`, `MANIFEST_PATH`, and the `Fixture*` types.

### What fixtures cannot give you

A handful of the old skips ask for **absence** — "requires database with no
clients", "with no projects", "with no invoices". Seeding cannot produce an empty
table; those assertions need either a dedicated empty database or a scoped view.
`fixtures().emptyClient` covers the scoped case (a client detail page with
nothing on it). The genuinely global ones stay skipped, and should say so:
`test.skip(true, 'Needs an empty database, not a fixture')`.

---

## 7. Layout

```
e2e/
├── .auth/                    # sessions + fixture-run.json (gitignored)
├── fixtures/
│   ├── env.ts                # .env.test loader, no dependency
│   ├── supabase-admin.ts     # service-role client + the safety guards
│   ├── graph.ts              # types, manifest I/O, fixtures() / hasFixtures
│   ├── seed.ts               # builds the graph, writes the manifest
│   └── teardown.ts           # deletes it; --all sweeps the namespace
├── helpers/
│   ├── auth.ts               # login helpers; prefers seeded user emails
│   └── test-utils.ts
├── global-setup.ts           # seed → auth sessions
├── global-teardown.ts        # runs pass or fail
└── *.spec.ts
```

Teardown deletes in reverse foreign-key order. Most children cascade with their
project, but invoices, contracts and filming requests reference a project with
`ON DELETE SET NULL` and would survive it, so they go first. `activity_log.user_id`
is also `SET NULL`, so those rows are removed before the auth users they point
at — otherwise a run leaves orphaned audit rows behind.

---

## 8. Troubleshooting

**"E2E_SUPABASE_URL points at the same Supabase project as NEXT_PUBLIC_SUPABASE_URL"**
Working as intended. Point it somewhere disposable.

**Tests skip with "E2E fixtures not seeded"**
`e2e/.auth/fixture-run.json` is missing. Run `pnpm e2e:seed`, or set
`E2E_SUPABASE_URL` and let `pnpm test:e2e` do it.

**Login fails after seeding**
`E2E_ADMIN_PASSWORD` / `E2E_CLIENT_PASSWORD` must be set *before* the seed — the
seed creates the accounts with exactly those passwords. Changing them afterwards
requires a re-seed.

**Rows left behind**
`pnpm e2e:teardown -- --all`.

**Tests time out on first run**
Turbopack compiles each route on first request. `E2E_TEST_TIMEOUT_MS`,
`E2E_EXPECT_TIMEOUT_MS` and `E2E_LOGIN_TIMEOUT_MS` already carry generous
defaults for exactly this.

---

## 9. CI

```yaml
- run: npx playwright install --with-deps
- run: npx supabase start
- run: npx supabase db push
- run: pnpm test:e2e
  env:
    E2E_SUPABASE_URL: http://127.0.0.1:54321
    E2E_SUPABASE_SERVICE_ROLE_KEY: ${{ secrets.E2E_SERVICE_ROLE_KEY }}
    E2E_ADMIN_PASSWORD: ${{ secrets.E2E_ADMIN_PASSWORD }}
    E2E_CLIENT_PASSWORD: ${{ secrets.E2E_CLIENT_PASSWORD }}
    E2E_WRITE_TESTS: '1'
```

`E2E_TEST_USERS_READY` is absent deliberately — the seed sets it.
