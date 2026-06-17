---
title: Phased Refactor Playbook — Deepening the DMS (PRD #31, Phases #32–#36)
status: draft
date: 2026-06-16
authors: ntontischris, Claude
applies_to: devremedia
---

# Phased Refactor Playbook — Deepening the DMS

## Problem

PRD **#31** ("deepening the DMS — phased, perf-first") was split into 7 phase issues.
Phase 1 (**#34**) shipped (PR #39, `5f9d8d0`). The remaining structural phases —
**#32, #33, #35, #36** — need to be executed safely, one at a time, by the agent.

An earlier attempt used an autonomous orchestration script
(`scripts/workflows/phased-refactor-loop.js` on `docs/refactor-loop-spec`). It was
judged over-engineered: a single live run took ~3h and did not finish one phase.
We are **replacing that script** with a lightweight playbook the agent executes
manually, one phase per branch, with explicit gates and runtime verification —
the same method that made #34 trustworthy.

This document is the playbook, not a per-phase implementation plan. Each phase
still gets its own `writing-plans` plan when it starts.

## Goals

1. Ship #32 → #33 → #35 → #36 without regressions, each independently verified.
2. Keep a human gate at the **final** integration→master merge (check Vercel
   preview first), while letting the agent do per-phase work autonomously.
3. Reuse the #34 runtime A/B verification method, adapted per phase (one A/B
   recipe does **not** fit all phases).
4. Never merge broken work; never delete or skip tests to make gates pass.

## Non-Goals

- Spikes **#37** (role-list unification) and **#38** (`supabase gen types`) are out
  of scope — HITL investigations, not part of this execution run.
- No autonomous multi-phase script. The agent drives each phase by hand.
- No new features beyond what each phase issue specifies.

## Branch Model

- **Integration branch:** `refactor/deepening-dms`, (re)created clean off **current
  master** (`5f9d8d0`). The existing stale branch of that name predates #34 and
  must be deleted and recreated.
- **Per phase:** cut `phase-N` off the integration branch → work → merge `phase-N`
  back into the integration branch.
- **End of run:** **ONE** PR `refactor/deepening-dms → master`. The user checks the
  Vercel **preview deployment** (= staging) plus optional local A/B, then performs
  the **human-gated** prod merge.

```
master (5f9d8d0)
  └─ refactor/deepening-dms            (integration, off current master)
       ├─ phase-32 → merge ─┐
       ├─ phase-33 → merge ─┤
       ├─ phase-35 → merge ─┤  (all land on integration)
       └─ phase-36 → merge ─┘
  ⇐ single PR: refactor/deepening-dms → master  (human-gated, Vercel preview checked)
```

## Per-Phase 7 Steps

For each phase N in order (#32, #33, #35, #36):

1. **Cut branch** — `phase-N` off the integration branch.
2. **Implement with TDD** — read PRD #31 + the phase issue first; failing test → code → green.
3. **Gates** — `pnpm build` + `pnpm type-check` + `pnpm lint` + `pnpm test:unit`, all green.
4. **Per-phase runtime verification** — using the recipe below (the key decision).
5. **Self-review** — diff vs ADR-0001/0002/0003, scope check, confirm **no deleted/skipped tests**.
6. **Merge** — `phase-N` → integration branch; comment + label the issue.
7. **Next phase.**

**Phase order & dependency:** #32 → #33 → #35 → #36. Only **#36 depends on #32**
(finance single-owner needs #32's aggregate RPCs). #33 and #35 are otherwise
parallel-grabbable but executed sequentially here for clean verification.

## Per-Phase Verification Recipe

One A/B does **not** fit all. Each phase verifies what it actually changed:

| Phase | What it changes | Verification |
|-------|-----------------|--------------|
| **#32** | reports aggregate RPCs + single-round-trip bulk invoice ops | A/B: aggregate numbers **identical** to old in-memory grouping on the same data; **fewer round-trips** on bulk invoice ops (count requests). |
| **#33** | `applyStatusChange` orchestrator | Trigger a status change; confirm each side-effect (notify / email / calendar-sync / revalidate) fires **exactly once**. |
| **#35** | auth seam (`requireUser`/`requireAdmin`/`withAuth`) | Anon still **307/401**; spot-check server actions reject unauthenticated; no regression. |
| **#36** | finance single-owner (remove `reports.ts` Revenue copy) | Test asserting **TS bucketing == RPC aggregates** on shared fixtures; Revenue/Collections numbers **byte-identical**. |

### Runtime A/B method (reused from #34)

Drive the real app with Playwright (installed) and compare master vs the phase branch:

- Headless chromium, log in as admin, navigate, **count requests**: Supabase REST
  (`/rest/v1/...`, e.g. `user_profiles`) AND Next.js **server actions** (POST with
  `next-action` header). #34 result: `user_profiles` 5→1, Projects tab 2→0,
  Invoices tab 4→2.
- Throwaway script (e.g. `verifyNN.mjs`) reads admin creds from `VEMAIL`/`VPASS`
  env. **Deleted after use, never committed.**
- Run `pnpm dev`, run the script on the phase branch; then `git checkout master`,
  restart dev, run again; compare.
- **Admin credentials are user-provided in-session** — ask the user when login is
  needed for verification. They are never stored.

## Escalation

If gates or verification fail and do not resolve in a reasonable number of attempts:
**STOP and tell the user.** Never merge broken work; never skip a phase; never
delete/skip a test to go green.

## Migrations

- **#32 and #36 ship SQL migrations.** The agent ships them **in the branch only**;
  the **human applies** them to cloud/prod at merge time.
- Pre-existing open item: migration **`00051`** is UNVERIFIED in cloud (invite flow
  trigger + `email_logs`). Not part of this run, but noted so prod behaviour is
  understood.

## Constraints / ADRs to respect

- **ADR-0001** — stored title is `{Client} — {Project}` (denormalized).
- **ADR-0002** — Revenue (Τζίρος) vs Collections (Εισπράξεις); `src/lib/finance.ts`
  is the single source of truth. **#36 enforces this** by removing the `reports.ts` copy.
- **ADR-0003** — invitation/confirmation flow.
- **Never push to master directly** — PR flow only; final prod merge human-gated.
- Reference implementation from #34 (good patterns to follow): `src/lib/auth-profile.ts`,
  `src/lib/tab-data.ts`, `src/lib/deliverable-video.ts` (+ their `.test.ts`),
  `src/app/layout.tsx`, `src/components/providers/auth-provider.tsx`.

## Testing

- Per-phase gates are the regression guard: `build`, `type-check`, `lint`,
  `test:unit` (Vitest v3) must be green before any merge to integration.
- New behaviour is TDD-first (failing unit test before code).
- Runtime A/B (Playwright) is the behavioural proof that the refactor preserved
  output / reduced round-trips, per the recipe table.
