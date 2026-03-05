# Devre Media System (DMS)

Internal management platform for a video production company. Multi-role system (super_admin, admin, employee, salesman, client) with bilingual support (el/en via next-intl, default: el).

## Tech Stack

- **Next.js 16.1.6** (App Router, Turbopack dev) + **React 19.2.3** + **TypeScript 5**
- **Supabase** (Auth + PostgreSQL + Storage + Realtime) via `@supabase/ssr 0.8`
- **Stripe 20.3.1** (Checkout + Webhooks)
- **Tailwind CSS 4** + **shadcn/ui** (radix-ui 1.4.3) + **lucide-react**
- **next-intl 4.8.3** (cookie-based locale `NEXT_LOCALE`)
- **Zod 4.3.6** + **react-hook-form 7.71** + **@hookform/resolvers 5.2**
- **@react-pdf/renderer 4.3.2** (PDF generation in API routes)
- **Recharts 3.7**, **FullCalendar 6.1**, **TipTap 3.19**, **dnd-kit**
- **Vercel AI SDK 6** + **OpenAI** (chatbot with pgvector embeddings)
- **Playwright 1.58** (E2E tests)

## Project Structure

```
src/
  app/
    (auth)/          -- login, signup, onboarding, update-password
    admin/           -- dashboard, projects, clients, invoices, contracts, leads,
                        calendar, reports, filming-requests, filming-prep,
                        sales-resources, university, chatbot, settings
    client/          -- dashboard, projects, invoices, contracts, book, settings
    employee/        -- dashboard, tasks, deliverables, university, settings
    salesman/        -- dashboard, leads, resources, handbook, settings
    api/             -- webhooks/stripe, auth/invite, chat, contracts/pdf, invoices/pdf+export+pay
  components/
    ui/              -- 31 shadcn components
    shared/          -- 31 reusable (DataTable, PageHeader, EmptyState, StatusBadge, etc.)
    admin/           -- admin feature components
    client/          -- client portal components
    employee/        -- employee components
    salesman/        -- salesman components
  lib/
    actions/         -- 20 server action files (CRUD for all entities)
    queries/         -- 7 query files (calendar, reports, dashboards)
    schemas/         -- 18 Zod schemas (1 per entity)
    supabase/        -- client.ts, server.ts, admin.ts, middleware.ts
    pdf/             -- invoice-template.tsx, contract-template.tsx
    constants.ts     -- all status enums as const arrays + derived types
    stripe.ts        -- Stripe client config
    utils.ts         -- cn() helper
    sanitize.ts      -- DOMPurify sanitization
  hooks/             -- useAuth, useRealtimeMessages, useRequireAuth, useRequireRole, useUnreadCount
  types/index.ts     -- all entity types + ActionResult<T>
  middleware.ts      -- role-based route protection
  i18n/              -- config.ts, request.ts
messages/            -- en.json, el.json
supabase/migrations/ -- 16 migration files
e2e/                 -- 9 Playwright spec files
scripts/             -- seed-data.sql, seed-cloud.mjs, fix-rls.sql
```

## Architecture Patterns

### ActionResult Pattern
All server actions return:
```typescript
type ActionResult<T> = { data: T; error: null } | { data: null; error: string }
```
Check `result.error` to branch -- there is NO `.success` field.

### Role-Based Access
- Middleware checks role from `user_profiles` table
- `/admin/*` requires admin or super_admin
- `/client/*` requires client (admins can also access)
- `/employee/*` requires employee (admins can also access)
- `/salesman/*` requires salesman (admins can also access)

### Supabase Clients
- **Browser**: import from `@/lib/supabase/client` (NOT `/browser`)
- **Server**: import from `@/lib/supabase/server` (Server Components + Actions)
- **Admin**: import from `@/lib/supabase/admin` (bypasses RLS, webhooks only)

### i18n
- next-intl with cookie-based locale (`NEXT_LOCALE`)
- Default: `el` (Greek). Use `useTranslations('namespace')` in components.
- Translation files: `messages/en.json`, `messages/el.json`

## Component API Gotchas

These shared components have non-obvious APIs -- always check before using:

| Component | Correct Usage | Common Mistake |
|-----------|--------------|----------------|
| **PageHeader** | `children` for action buttons | Using `action` prop |
| **EmptyState** | `icon={FileText}` (ComponentType), `action={{ label, onClick }}` | Passing JSX element or ReactElement |
| **UserAvatar** | `src` prop | Using `avatarUrl` |
| **ConfirmDialog** | `confirmLabel` + `loading` + `destructive` | Using `confirmText` / `isLoading` |
| **DataTable** | No row click support | Expecting `onRowClick` |
| **StatusBadge** | `status: string` + `className` only | Passing `type` prop |

## Common Pitfalls

- **Next.js 16 params**: `params` is `Promise<{ id: string }>` -- must `await` it
- **Zod + react-hook-form**: use `z.input<typeof schema>` for form type (handles `.default()`)
- **Supabase data after error check**: `result.data` can be null -- use `?? []` or `?? default`
- **Realtime payload**: add explicit `: any` type to callback `payload` param
- **Stripe API version**: must be `'2026-01-28.clover'`
- **PDF route Buffer**: use `new Uint8Array(buffer)` for NextResponse body, not raw Buffer
- **FullCalendar**: requires `ssr: false` via dynamic() + client wrapper component
- **Recharts Pie**: `percent` and `name` are possibly undefined in label callback

## Database

- 16 migrations in `supabase/migrations/`
- Key tables: `user_profiles`, `clients`, `projects`, `tasks`, `deliverables`, `invoices`, `contracts`, `filming_requests`, `leads`, `messages`, `notifications`, `activity_log`, `kb_categories`, `kb_articles`, `sales_resources`, `chat_knowledge`
- RLS enabled on all tables
- pgvector extension for chatbot embeddings

### Key Relationships
- Client -> Projects -> Tasks, Deliverables, Invoices, Contracts, Messages
- Client -> FilmingRequests (public booking form -> convert to Project)
- Lead -> convert to Client (CRM pipeline)
- KbCategory -> KbArticles (internal university)

## Dev Commands

```bash
pnpm dev              # Next.js dev server (Turbopack)
pnpm build            # Production build
pnpm lint             # ESLint
pnpm type-check       # TypeScript strict check
pnpm test:e2e         # Playwright E2E tests
pnpm format           # Prettier format
```
