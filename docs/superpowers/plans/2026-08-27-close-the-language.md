# Close the language — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** The design guard stops being an allow-list of migrated areas and starts covering the product, so drifting back is a build failure rather than a discovery six months later.

**Architecture:** No new abstractions. The remaining strays adopt the existing token layer and shared parts; the guard's `COVERED` collapses to `['src']` and every exception that survives becomes an explicit, reasoned entry rather than an omission.

**Tech Stack:** Next.js 16, React 19, Tailwind 4 token layer, next-intl 4.8, `scripts/check-design.mjs`.

**Spec:** GitHub issue #111, under PRD #100. Inventory: `.superpowers/sdd/2026-08-27-close-the-language/inventory.md`.

---

## Global Constraints

- **Nothing renders a raw colour** outside an exemption written down in this plan. Colour comes from the token layer in `src/app/globals.css` or a shared part that reads it.
- **The tone tokens carry meaning, not hue.** A decorative colour takes `primary` or a neutral token.
- **`TONE_RULES` in `src/lib/status-tone.ts` is not edited by this slice.** (#128 owns that decision.)
- **No user-visible English string** survives in a file this slice touches. Catalogues keep identical key trees.
- **What any role sees, and in what order, is unchanged.** Colour, focus rings and motion are this slice's subject.
- **Every exemption is written with its reason, and self-policing** — an entry that stops excusing anything must fail the build, exactly as the existing lists do.
- After every task: `pnpm build`.

---

## Rulings made before execution

The inventory named one genuinely undecided question and several smaller ones. They are settled here so no implementer has to guess.

**Ruling A — the marketing surface is permanently out; the booking flow is in.** The repository has already made this distinction once: the heading rule exempts `src/components/landing/` **permanently** ("άλλο επίπεδο, εκτός σκοπού μόνιμα") while keeping `src/app/book/page.tsx` as a *temporary* `HEADING_PENDING`. That precedent is followed rather than re-litigated. The landing page and the landing chatbot widget speak to strangers in a different visual language and are permanently exempt. The public booking form is a flow real clients complete to do business with the company — it is product, and it migrates.

**Ruling B — `src/components/ui` comes into scope.** The inventory found these primitives have *never* been scanned. That is the single best hiding place in the repository for a raw palette to regrow: every screen imports them. The guard already applies this exact argument to `tone-chip.tsx` and `tone-icon.tsx`. If a future `shadcn add` drops a primitive full of literal colours, the build failing is the correct outcome, not an inconvenience.

**Ruling C — email and PDF templates are permanently exempt, for a technical reason.** `@react-pdf/renderer` and the Resend email templates render outside the browser: no Tailwind, no CSS custom properties, no `color-mix()`. Literal colour is the only thing that works there. This is a necessity, not a deferral, and the entry must say so — otherwise a future reader will "pay off" a debt that cannot be paid.

**Ruling D — `src/lib/chart-colors.ts` is exempt because it *is* the palette.** It holds the colour-vision-safe eight-hue scale committed to in `667d387`. A palette file that contains no colours would be an empty file. The entry carries the corollary that makes it safe: this is the **only** declared home for a chart hue, so the same literal appearing anywhere else is a violation, not a duplicate.

**Ruling E — a matrix is not a table.** `crew-load-heatmap.tsx` renders crew against days — a two-dimensional grid, not a list of rows. It gets a *permanent* table exemption, in the class that says "this must never become a `DataTable`", not the one that says "not yet".

**Ruling F — the table detector must not report the table.** `src/components/shared/data-table.tsx` and `src/components/ui/table.tsx` are the implementation the rule exists to promote. They are named permanent exemptions, exactly as `page-heading.tsx` is exempt from the `<h1>` rule and `TITLE_OWNERS` from the double-title rule.

**Ruling G — streaming leaves this slice.** The inventory measured 52 of 108 server pages fetching several independent things with no boundary between them. That is its own body of work and is tracked as **#131**. Holding the guard hostage to 52 page refactors would delay the protection and bury the refactors in a colour diff.

**Ruling H — the owner's sign-off cannot be delegated.** The criterion requiring both editions to be reviewed in real use, on desktop and on a phone, is the owner's. This slice makes everything else true and then stops there, saying so plainly.

---

### Task 1: The table rule goes repo-wide

**Files:**
- Modify: `scripts/check-design.mjs`
- Modify: the five files the inventory names as real, small `DataTable` migrations

- [ ] **Step 1:** Read the inventory's table section and the guard's existing table lists in full.
- [ ] **Step 2:** Migrate the five real hand-rolled tables to `DataTable`. What each shows, and in what order, does not change.
- [ ] **Step 3:** Add `data-table.tsx` and `ui/table.tsx` as **named** permanent exemptions (Ruling F), with the reason written beside them.
- [ ] **Step 4:** Add `crew-load-heatmap.tsx` as a permanent exemption in the "never a DataTable" class (Ruling E).
- [ ] **Step 5:** Replace `TABLE_GUARDED_AREAS` with whole-`src` coverage.
- [ ] **Step 6: Negative tests.** Inject a `<table>` into three files that were previously unguarded — one per role area — and confirm the build fails each time. Restore. Then confirm each new exemption is self-policing: make an exempted file stop matching the detector and confirm the guard complains that the exemption excuses nothing.
- [ ] **Step 7:** `pnpm build`. Commit.

---

### Task 2: The app shell and the primitives stop writing colour

**Files:**
- Modify: `src/components/shared/notification-bell.tsx`, `src/components/shared/language-switcher.tsx`, the `src/components/shell-v2/` files the inventory names
- Modify: the `src/components/ui/` primitives that hold raw colour

These are mounted on **every route in the product** (Ruling B), which is why they come first among the colour tasks.

- [ ] **Step 1:** Read each file; replace every raw colour with a token.
- [ ] **Step 2:** Where a primitive's colour is part of shadcn's own contract, prefer the semantic token the rest of the product already uses over inventing a new one.
- [ ] **Step 3:** `pnpm build`. Commit.

---

### Task 3: One letterhead, not two

**Files:**
- Modify: `src/components/admin/contracts/contract-creator.tsx`, `src/app/admin/contracts/new-contract-form.tsx` (confirm exact paths from the inventory)

The inventory found **61 raw colours split across two near-duplicate copies** of the same contract letterhead — the largest single block of colour debt left in the product, and duplicated.

- [ ] **Step 1:** Read both. Establish exactly what differs; the duplication is the finding, so do not assume they are identical.
- [ ] **Step 2:** Extract the shared letterhead once, on tokens. If the two genuinely differ in ways that cannot be reconciled, say so in the report rather than forcing them together.
- [ ] **Step 3:** Verify a generated contract still renders the same content in the same order.
- [ ] **Step 4:** `pnpm build`. Commit.

---

### Task 4: The remaining portal strays

**Files:** the rest of the inventory's Group A — roughly 30 files across the four role areas and shared components.

- [ ] **Step 1:** Work file by file from the inventory's list. Every raw colour becomes a token; every status colour comes from the tone layer.
- [ ] **Step 2:** Report any file where the right token is genuinely unclear, rather than guessing.
- [ ] **Step 3:** `pnpm build`. Commit in coherent groups, not one commit per file.

---

### Task 5: The booking flow joins the product

**Files:** `src/app/book/`, `src/components/shared/public-booking-form.tsx` and the booking section components.

Per Ruling A this is product, not marketing.

- [ ] **Step 1:** Raw colour → tokens.
- [ ] **Step 2:** `src/app/book/page.tsx` currently sits in `HEADING_PENDING` because it renders its own `<h1>`. Move it onto the shared heading if that is possible without changing what the page shows, and remove the entry. If it is not possible, say why — the entry then stays, with its reason updated.
- [ ] **Step 3:** `pnpm build`. Commit.

---

### Task 6: Focus is visible everywhere, motion is optional everywhere

**Files:**
- Modify: `src/app/globals.css`

The inventory found **no global `:focus-visible` rule** — `globals.css` only recolours whatever outline the browser happens to draw, eleven `ui/` primitives bring their own ring, and the app shell mounted on every route has none. Reduced-motion handling exists but is almost entirely scoped to the landing page.

- [ ] **Step 1:** Add one global `:focus-visible` treatment, on tokens, visible against both editions. Do not remove a primitive's own ring; the global rule is the floor, not a replacement.
- [ ] **Step 2:** Extend `prefers-reduced-motion: reduce` product-wide, not landing-only — transitions and transforms drop, opacity and colour changes may stay.
- [ ] **Step 3:** Verify by reading that no element ends up with **no** visible focus indicator, and none with two competing ones.
- [ ] **Step 4:** `pnpm build`. Commit.

---

### Task 7: A tone is legible without hue

**Files:**
- Modify: `src/components/shared/tone-icon.tsx`

`ToneChip` and `StatusBadge` already pair colour with visible text, so they are safe. **`ToneIcon` varies only colour** — its icon shape differs only because each of its three callers happens to map status to icon independently. Someone who cannot separate the hues sees three identical circles.

- [ ] **Step 1:** Give `ToneIcon` a shape that follows its tone, so the tone is carried by the mark and not only by its colour.
- [ ] **Step 2:** Do not break the three existing callers; if one passes its own icon deliberately, keep that working.
- [ ] **Step 3:** `pnpm build`. Commit.

---

### Task 8: The colour rule goes repo-wide

**Files:**
- Modify: `scripts/check-design.mjs`

This is the task the seven before it exist to make possible.

- [ ] **Step 1:** Replace `COVERED` with whole-`src` coverage.
- [ ] **Step 2:** Write the permanent exemptions, each with its reason: the landing surface (Ruling A), email and PDF templates (Ruling C), the chart palette (Ruling D), and the one FOUC fallback the inventory names.
- [ ] **Step 3:** Record whatever genuinely remains as `PENDING` entries with exact colour multisets, derived from the guard's own output — never hand-counted. If nothing remains, the list shrinks, which is the point.
- [ ] **Step 4:** **Every permanent exemption must be self-policing.** An entry naming a file that no longer holds a raw colour, or no longer exists, must fail the build. Verify each one by making it stop being needed and watching the guard complain.
- [ ] **Step 5: Negative tests.** Inject a raw colour into at least five files that were previously unguarded, spread across different areas, and confirm the build fails each time. Restore, and prove the tree is clean.
- [ ] **Step 6:** Record the new numbers. `pnpm build`. Commit.

---

### Task 9: Playwright asserts the product-wide invariants

**Files:**
- Modify: `e2e/design-identity.spec.ts`

- [ ] **Step 1:** Assert one page heading per page across **all** roles, driven by a route list rather than repeated blocks.
- [ ] **Step 2:** Assert the typefaces load and render Greek glyphs.
- [ ] **Step 3:** Assert both editions paint — background and text both come from the palette, neither transparent.
- [ ] **Step 4:** Assert an explicit theme choice beats the system preference.
- [ ] **Step 5:** Keep the existing skip guard. **These tests remain specification, not protection** (#119) — say so in the report and do not claim otherwise.
- [ ] **Step 6:** `pnpm build`. Commit.

---

## Self-review notes

- Every acceptance criterion in #111 maps to a task except two: the streaming criterion, moved to #131 with its measurements (Ruling G), and the owner's sign-off, which cannot be delegated (Ruling H).
- The inventory's "hardest thing" — the undecided policy on the public surface — is settled by Ruling A from precedent already in the repository, not by invention.
- `src/components/ui` was never scanned by any rule. That is a structural gap, not a backlog item, and Task 2 closes it.
