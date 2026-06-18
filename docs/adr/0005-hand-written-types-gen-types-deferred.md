# Hand-written types remain the source of truth; `gen types` is deferred

We keep the hand-written types in `src/types/` and the hand-maintained enums in
`src/lib/constants/enums.ts`. We do **not** adopt `supabase gen types typescript` now.
We revisit it when DB column-drift bugs actually start to bite, or when AI-agent-authored
queries grow enough that a typed client (`createClient<Database>()`) becomes a meaningful
guardrail.

## Context

Spike #38 evaluated generated DB types. Findings:

- Supabase clients are currently untyped; query results are cast to hand-written types,
  kept in sync by hand. There is no generated file and no codegen step.
- **`gen types` does not solve our actual pain.** Every DB enum is a `CHECK` constraint on
  a `text` column (zero native `CREATE TYPE`), so the generator emits them as `string`,
  not literal unions. The one verified live bug — `project_type: 'podcast'` accepted by the
  app/Zod but rejected by the DB CHECK — would **not** be caught by generated types, and
  `enums.ts` could **not** be replaced by them.
- What it *would* catch: column renames / removals / type changes — rare here and usually
  surfaced at build/test time when a query breaks.
- Costs: a codegen ritual on every migration (stale file if forgotten), and name
  collisions with the existing `relations.ts` / Zod `Create*Input` types.
- The one project-specific argument *for* it: AFK agents author queries and can invent
  column names; a typed client would stop that at build. Not yet pressing.

## Decision

- **Keep hand-written types + hand-maintained `enums.ts`.** Defer `gen types`.
- Do the two boring-but-real fixes the spike surfaced instead (tracked as issues):
  1. Resolve the `podcast` enum/DB-CHECK drift (real, shippable bug).
  2. De-duplicate the `Create*Input` / `Update*Input` definitions that exist in both
     `relations.ts` and the Zod schemas (one source; Zod stays runtime-only at boundaries).
- Re-evaluate adoption when column-drift bugs recur or agent-authored queries scale.

## Consequences

- Column-level DB drift stays uncaught at compile time (accepted — rare, build/test-visible).
- No per-migration codegen overhead is added now.
- Enum drift (e.g. `podcast`) is **not** a typing problem and must be fixed at the
  app/DB-CHECK level — see follow-up issue.
- The hardcoded-enums-vs-"fully dynamic" tension is recorded as a separate follow-up; it is
  out of scope for this typing decision.
