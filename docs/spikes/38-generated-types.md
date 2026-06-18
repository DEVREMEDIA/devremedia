# Spike #38 — `supabase gen types` adoption

**Type:** Investigation spike (HITL). No production code shipped.
**Question:** Should we adopt `supabase gen types typescript` (auto-generated DB types) instead of / alongside the hand-written types in `src/types/`?
**Recommendation:** Evaluated narrow adoption vs deferral (see trade-off).
**Outcome (signed off 2026-06-18):** **DEFER `gen types`** — hand-written types + `enums.ts` remain the source of truth. Reason: it does not solve the real pain (enums are CHECK→`string`), adds per-migration codegen ritual, and column-drift is rare/build-visible. Instead, fix the two real problems it surfaced (podcast bug + duplicate input types). Accepted → `docs/adr/0005-hand-written-types-gen-types-deferred.md`. Revisit when column-drift bugs recur or agent-authored queries scale.

---

## What exists today

### Hand-written types (`src/types/`)
- `index.ts` re-exports `entities.ts`, `relations.ts`, `filters.ts`, + enum types from `@/lib/constants`.
- `entities.ts`: **~50 exported types**, ~30 map to real tables; the rest are *not* plain rows:
  - **Computed / RPC-derived** (no table): `ProjectPricingAnalysis`, `PricingHealthStatus/Summary`, `CostSummary`, `ProposalPackageWithPrice` (`computed_price`), `CostItemWithCategory`.
  - **JSONB column shapes** hand-modeled: `InvoiceLineItem`, `MessageAttachment`, `EquipmentItem`/`Shot`, `ProposalSelectedPackage`, `GoogleSyncActionData` (discriminated union). `gen types` emits these as `Json` → all structure lost.
  - **Inline literal unions** outside `constants`: `ProposalStatus`, `EmailType`, `preferred_locale`, `Message.channel`, etc.
  - **Relation/join types** in `relations.ts`: `ProjectWithClient`, `InvoiceWithRelations`, … plus hand-written `Create*Input`/`Update*Input` (`Omit`/`Partial`).
- **Sync is 100% manual.** No generated file, no codegen step.

### Zod (`src/lib/schemas/`)
- 21 schema files. **64 `.parse()`/`.safeParse()` calls** across server actions + 3 API routes — runtime boundary validation. ✔
- **But** schemas also export `z.infer` types (`CreateProjectInput`, `UpdateProjectInput`, `ProjectResponse`) that **collide by name** with the `Omit`-based ones in `relations.ts`. So "Zod stays runtime-only" is **not** honored today — Zod is also a compile-time type source, duplicating `relations.ts`.

### Enums (`src/lib/constants/enums.ts`)
- **18 `as const` arrays** with derived `(typeof X)[number]` types (USER_ROLES, PROJECT_TYPES, PROJECT_STATUSES, INVOICE_STATUSES, LEAD_STAGES, …).

### DB source of truth (`supabase/migrations/`)
- **55 migrations**, latest `00054`. **Zero native `CREATE TYPE` enums** — every enum is a `text` column with `CHECK (col IN (...))`.
- **Critical implication:** `gen types` emits CHECK-backed columns as **`string`, not literal unions.** So gen-types **cannot** replace `enums.ts`; the narrowed unions must stay hand-maintained.

### Supabase client typing (`src/lib/supabase/`)
- `client.ts` / `server.ts` / `admin.ts` / `middleware.ts`: **none** use a `Database` generic. All query results are untyped from the DB and cast via function return types.
- **No generated types file anywhere.** Adoption is **greenfield**.

---

## Concrete drift the current setup allows

1. **`project_type: 'podcast'` (live drift — VERIFIED).** `PROJECT_TYPES` (enums.ts:17) includes `'podcast'`; `createProjectSchema` derives its enum from `PROJECT_TYPES`, so the create passes Zod at `actions/projects.ts`. The DB CHECK (`00002_core_tables.sql:43-46`) lists only 7 types — **no `podcast`** (the `00010` mentions are comment examples). The write passes app validation and **fails at the DB CHECK**. *(This is a standalone bug — see below.)*
2. **`created_by` lag** — absent from `Project` in `entities.ts` but present in `projectResponseSchema`, `relations.ts` `CreateProjectInput`, and added by migration `00013`.
3. **Duplicate `Create*Input`/`Update*Input`** in both `relations.ts` and Zod files — already diverging.

> ⚠ **Note on #1:** gen-types would **NOT** catch the podcast bug — CHECK columns become `string`. It is a separate enum-vs-DB-CHECK problem, recorded as its own follow-up below.

---

## Trade-off

**What gen-types DOES buy here**
- Typed `createClient<Database>()` → `supabase.from('projects').select(...)` results gain column-level types. Catches **column renames / removals / type changes** at compile time (the most common migration drift).
- A generated `Row` / `Insert` / `Update` per table to use as the **base** for hand-written relation/computed types (reduces hand-copying of column lists).

**What it does NOT buy / costs**
- Does **not** replace `enums.ts` (CHECK → `string`) — enum drift like the podcast bug stays uncaught.
- Does **not** model JSONB shapes (→ `Json`) or computed/RPC types — those stay hand-written.
- Competes with existing `relations.ts` `Create*Input`/Zod `z.infer` (name collisions to resolve).
- Adds a **codegen step** that must be re-run on every migration (a maintenance ritual; easy to forget → stale generated file).

---

## Recommendation — adopt narrowly (conditional GO)

If adopted:
1. Generate `src/types/database.types.ts` (committed), wire `createClient<Database>()` in all three clients.
2. Use generated `Row`/`Insert`/`Update` as the **base** for `relations.ts` join types (`ProjectWithClient = Row<'projects'> & { client: Row<'clients'> }`).
3. **Keep Zod runtime-only** — drop the duplicated `z.infer` `Create*Input` exports in favor of one source (resolve the `relations.ts` vs Zod collision).
4. **Keep `enums.ts` hand-maintained** (gen-types can't narrow CHECK columns).
5. Add the codegen command to the migration workflow + a CI check that the committed file matches `gen types` output (prevents staleness).

**Don't adopt if** the team won't sustain the per-migration codegen ritual — a stale generated file is worse than honest hand-written types.

---

## Separate follow-ups (record only — do NOT solve in this spike)

- **A. `'podcast'` enum/DB drift = a real bug.** Either add `'podcast'` to the `00002`-style CHECK via a new migration, or remove it from `PROJECT_TYPES`. Needs a decision; gen-types won't catch it.
- **B. Hardcoded status enums vs "fully dynamic — nothing hardcoded".** The 18 `enums.ts` arrays are the hardcoded surface in tension with the standing "fully dynamic" preference. Out of scope here per the spike brief — flagged for a dedicated decision.

---

## ADR (accepted → `docs/adr/0005-hand-written-types-gen-types-deferred.md`)

> Note: the spike's *proposed* ADR below recommended narrow adoption; the **accepted**
> decision was to **defer** (see Outcome at top + ADR 0005). The text below is retained as
> the investigation record.

### Proposed ADR (superseded by the deferral decision)

> **Title:** Generated DB types for client typing; Zod runtime-only; enums stay hand-written
>
> **Context:** No generated types exist; Supabase clients are untyped and results are cast to hand-written types that drift from the DB (verified: `created_by` lag, `podcast` enum). All DB enums are CHECK-on-`text`, so `gen types` emits them as `string`.
>
> **Decision:** Adopt `supabase gen types` narrowly: a committed `database.types.ts` powering `createClient<Database>()` and serving as the base for relation types. Zod stays runtime-only at boundaries (remove duplicate `z.infer` input types). `enums.ts` remains the hand-maintained source of narrowed status unions. Codegen added to the migration workflow + CI staleness check.
>
> **Consequences:** Column-level drift caught at compile time; enum drift still not (separate follow-up A). One more codegen ritual per migration. JSONB/computed/RPC types stay hand-written. Removes the `relations.ts`-vs-Zod `Create*Input` duplication.
