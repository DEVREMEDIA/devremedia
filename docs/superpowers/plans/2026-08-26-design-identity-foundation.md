# Design Identity Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Establish the Editorial Noir (work edition) identity — tokens, typefaces, status tones, the shared page heading — and prove it end-to-end on the admin Today screen, guarded by tests and a build check.

**Architecture:** One theme-token layer in `src/app/globals.css` becomes the single source for colour in both a light and a dark edition. The root layout swaps its Latin-only typefaces for three faces loaded with Greek. A pure resolver turns a status string into one of five presentation tones. A shared page-heading component becomes the only heading a page renders. The admin Today screen is then dressed in that language without changing what it shows. A guard script and Playwright specs lock the invariants.

**Tech Stack:** Next.js 16 App Router, React 19, Tailwind CSS 4 (`@theme inline`), next/font/google, next-intl, Vitest 3, Playwright 1.58.

**Spec:** `https://github.com/DEVREMEDIA/devremedia/issues/101` (slice) under `https://github.com/DEVREMEDIA/devremedia/issues/100` (PRD)

## Global Constraints

- **Never stage `.npmrc` or `.env.local`.** They are local Windows build workarounds. Stage explicit paths only — never `git add -A` or `git add .`.
- **The brand accent (gold) means emphasis or interactive. It never signals state.** Semantic tones come from a separate ramp and always render as a filled chip with a tinted background, so tone is distinguishable by form as well as hue.
- **The display serif is for titles and headline figures only.** Never inside data. Times, identifiers and numeric columns use the monospaced face with `font-variant-numeric: tabular-nums`.
- **No component declares a raw colour value.** Every colour comes from a token.
- **Do not touch the landing page's design layer.** `src/components/landing/landing-l5.css`, `src/components/landing/fonts.ts` and everything scoped under `.l5-root` stay exactly as they are.
- **Do not change the chart palette.** `src/lib/chart-colors.ts` and the `--chart-*` tokens are colour-vision-safe by an earlier decision and remain authoritative.
- **What the Today screen shows, and in what order, does not change.** This slice changes appearance only.
- **Per-section streaming on Today is preserved.** No page may load everything at once.
- Both message catalogues (`messages/el.json`, `messages/en.json`) keep identical key trees. Default locale is Greek.
- Every task ends green on: `pnpm type-check`, `pnpm lint`, `pnpm build`.

---

## File Structure

| File | Responsibility |
|---|---|
| `src/app/globals.css` (modify) | The token layer: both editions, semantic tone ramp, font-family bindings. |
| `src/app/layout.tsx` (modify) | Loads the three typefaces with Greek subsets and exposes them as CSS variables. |
| `src/lib/status-tone.ts` (create) | Data-driven `statusTone()` resolver plus the `Tone` type. |
| `src/lib/status-tone.test.ts` (create) | Vitest coverage for the resolver. |
| `src/components/shared/page-heading.tsx` (create) | The single page heading: title, optional subtitle, action slot. |
| `src/app/admin/today/page.tsx` (modify) | Adopts `PageHeading`; dressed in the new language. |
| `src/components/admin/dashboard/**` (modify) | Today's widgets adopt the tokens and the type rules. |
| `scripts/check-design.mjs` (create) | Build guard: no raw colours in migrated files. |
| `package.json` (modify) | Adds the `check:design` script. |
| `e2e/design-identity.spec.ts` (create) | Playwright invariants: one heading, fonts with Greek, both editions, theme override. |

---

### Task 1: Token layer and typefaces

**Files:**
- Modify: `src/app/globals.css` (the `@theme inline` block at lines 8-59, `:root` at 61-95, `.dark` at 97-131)
- Modify: `src/app/layout.tsx` (imports at line 2, font declarations at lines 25-35, and the `body` className that applies them)

**Interfaces:**
- Consumes: nothing.
- Produces: CSS variables `--font-display`, `--font-sans-ui`, `--font-data`; Tailwind theme keys `--font-display`, `--font-sans`, `--font-mono`; tone tokens `--tone-critical`, `--tone-critical-bg`, `--tone-caution`, `--tone-caution-bg`, `--tone-positive`, `--tone-positive-bg`, `--tone-neutral`, `--tone-neutral-bg`, each defined in both editions.

- [ ] **Step 1: Swap the typefaces in the root layout**

The current declarations load `subsets: ['latin']` only, while the app's default locale is Greek — every Greek character therefore renders in an OS fallback. Replace the two Geist declarations with these three. Keep `display: 'swap'`.

```tsx
import { EB_Garamond, Inter, Noto_Sans_Mono } from 'next/font/google';

const displaySerif = EB_Garamond({
  variable: '--font-display',
  subsets: ['latin', 'greek'],
  weight: ['400', '500', '600'],
  style: ['normal', 'italic'],
  display: 'swap',
});

const bodySans = Inter({
  variable: '--font-sans-ui',
  subsets: ['latin', 'greek'],
  weight: ['300', '400', '500', '600', '700'],
  display: 'swap',
});

const dataMono = Noto_Sans_Mono({
  variable: '--font-data',
  subsets: ['latin', 'greek'],
  weight: ['400', '500', '700'],
  display: 'swap',
});
```

Then update the element that applies them. Find the `className` that currently interpolates `geistSans.variable` and `geistMono.variable` and replace those with `displaySerif.variable`, `bodySans.variable`, `dataMono.variable`. Do not otherwise restructure the layout.

- [ ] **Step 2: Verify the old font variables are gone**

Run: `grep -rn "geist" src/ --include=*.tsx --include=*.ts --include=*.css -i`
Expected: no matches outside `src/components/landing/` (the landing has its own separate font layer and is out of scope). If a match exists elsewhere, update it to the new variable name.

- [ ] **Step 3: Bind the fonts in the Tailwind theme**

In `src/app/globals.css`, inside the `@theme inline` block, replace the two font lines:

```css
  --font-sans: var(--font-sans-ui);
  --font-mono: var(--font-data);
  --font-display: var(--font-display);
```

- [ ] **Step 4: Write the dark edition tokens**

The dark edition is the native one. In `src/app/globals.css`, replace the body of the `.dark` block with the values below. Leave every `--chart-*` line in that block exactly as it is — the chart palette is colour-vision-safe by an earlier decision and is out of scope. Leave the `--sidebar-*` lines present but retune them to the values shown.

```css
.dark {
  color-scheme: dark;
  --background: #0a0a0b;
  --foreground: #ece9e2;
  --card: #111110;
  --card-foreground: #ece9e2;
  --popover: #111110;
  --popover-foreground: #ece9e2;
  --primary: #c9a033;
  --primary-foreground: #0a0a0b;
  --secondary: #171714;
  --secondary-foreground: #ece9e2;
  --muted: #171714;
  --muted-foreground: #9a968c;
  --accent: #1c1a15;
  --accent-foreground: #ece9e2;
  --destructive: #d4674f;
  --border: rgba(236, 233, 226, 0.13);
  --input: rgba(236, 233, 226, 0.18);
  --ring: #c9a033;
  --tone-critical: #d4674f;
  --tone-critical-bg: #241410;
  --tone-caution: #cc7a3d;
  --tone-caution-bg: #221609;
  --tone-positive: #6fa88a;
  --tone-positive-bg: #101d18;
  --tone-neutral: #9a968c;
  --tone-neutral-bg: #171714;
  --sidebar: #0d0d0c;
  --sidebar-foreground: #ece9e2;
  --sidebar-primary: #c9a033;
  --sidebar-primary-foreground: #0a0a0b;
  --sidebar-accent: #1c1a15;
  --sidebar-accent-foreground: #ece9e2;
  --sidebar-border: rgba(236, 233, 226, 0.13);
  --sidebar-ring: #c9a033;
}
```

- [ ] **Step 5: Write the light edition tokens**

Replace the body of the `:root` block the same way. Keep `--radius: 0.625rem` and keep every `--chart-*` line unchanged.

```css
:root {
  color-scheme: light dark;
  --radius: 0.625rem;
  --background: #faf8f3;
  --foreground: #1a1a18;
  --card: #ffffff;
  --card-foreground: #1a1a18;
  --popover: #ffffff;
  --popover-foreground: #1a1a18;
  --primary: #8a6d1f;
  --primary-foreground: #fffdf7;
  --secondary: #f0ede4;
  --secondary-foreground: #33312a;
  --muted: #f0ede4;
  --muted-foreground: #6b675e;
  --accent: #f3efe3;
  --accent-foreground: #33312a;
  --destructive: #b04a32;
  --border: #e3dfd3;
  --input: #dad5c7;
  --ring: #8a6d1f;
  --tone-critical: #b04a32;
  --tone-critical-bg: #fbeeea;
  --tone-caution: #9a5b22;
  --tone-caution-bg: #fbf1e5;
  --tone-positive: #3f7a5f;
  --tone-positive-bg: #ecf4ef;
  --tone-neutral: #6b675e;
  --tone-neutral-bg: #f0ede4;
  --sidebar: #f6f3ea;
  --sidebar-foreground: #1a1a18;
  --sidebar-primary: #8a6d1f;
  --sidebar-primary-foreground: #fffdf7;
  --sidebar-accent: #f3efe3;
  --sidebar-accent-foreground: #33312a;
  --sidebar-border: #e3dfd3;
  --sidebar-ring: #8a6d1f;
}
```

- [ ] **Step 6: Expose the tone tokens to Tailwind**

Inside `@theme inline`, alongside the existing `--color-*` mappings, add:

```css
  --color-tone-critical: var(--tone-critical);
  --color-tone-critical-bg: var(--tone-critical-bg);
  --color-tone-caution: var(--tone-caution);
  --color-tone-caution-bg: var(--tone-caution-bg);
  --color-tone-positive: var(--tone-positive);
  --color-tone-positive-bg: var(--tone-positive-bg);
  --color-tone-neutral: var(--tone-neutral);
  --color-tone-neutral-bg: var(--tone-neutral-bg);
```

- [ ] **Step 7: Verify the build and both editions**

Run: `pnpm type-check && pnpm lint && pnpm build`
Expected: all three pass.

Then run `pnpm dev`, open `http://localhost:3000/login`, and confirm by eye: Greek text renders in Inter (not the OS default), the page has a painted background in both editions, and toggling the theme switches the whole surface. Stop the dev server.

- [ ] **Step 8: Commit**

```bash
git add src/app/globals.css src/app/layout.tsx
git commit -m "feat(design): Editorial Noir tokens in both editions, typefaces with Greek"
```

---

### Task 2: The status-to-tone resolver

**Files:**
- Create: `src/lib/status-tone.ts`
- Create: `src/lib/status-tone.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces: `export type Tone = 'critical' | 'caution' | 'positive' | 'neutral'`; `export function statusTone(status: string | null | undefined): Tone`; `export const TONE_RULES`.

The platform rule is that configuration stays dynamic — status values are data, not an enum, and a status nobody anticipated must still render sensibly. So the mapping is a **data table matched by keyword**, not a `switch` over business statuses, and anything unmatched falls to `neutral`.

- [ ] **Step 1: Write the failing test**

Create `src/lib/status-tone.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { statusTone, TONE_RULES } from './status-tone';

describe('statusTone', () => {
  it('maps an overdue status to critical', () => {
    expect(statusTone('overdue')).toBe('critical');
  });

  it('maps a pending status to caution', () => {
    expect(statusTone('pending')).toBe('caution');
  });

  it('maps a paid status to positive', () => {
    expect(statusTone('paid')).toBe('positive');
  });

  it('is case and whitespace insensitive', () => {
    expect(statusTone('  PAID  ')).toBe('positive');
  });

  it('matches a multi-word status on its keyword', () => {
    expect(statusTone('payment_overdue')).toBe('critical');
    expect(statusTone('awaiting review')).toBe('caution');
  });

  it('degrades to neutral for a status it has never seen', () => {
    expect(statusTone('flibbertigibbet')).toBe('neutral');
  });

  it('degrades to neutral for empty input', () => {
    expect(statusTone('')).toBe('neutral');
    expect(statusTone(null)).toBe('neutral');
    expect(statusTone(undefined)).toBe('neutral');
  });

  it('is driven by a data table rather than control flow', () => {
    expect(Array.isArray(TONE_RULES)).toBe(true);
    expect(TONE_RULES.length).toBeGreaterThan(0);
    for (const rule of TONE_RULES) {
      expect(Array.isArray(rule.match)).toBe(true);
    }
  });
});
```

- [ ] **Step 2: Run it to make sure it fails**

Run: `pnpm test:unit src/lib/status-tone.test.ts`
Expected: FAIL — cannot resolve `./status-tone`.

- [ ] **Step 3: Write the resolver**

Create `src/lib/status-tone.ts`:

```ts
/**
 * Καταστάσεις είναι δεδομένα, όχι enum: ο πίνακας από κάτω είναι
 * λέξεις-κλειδιά, ώστε μια νέα κατάσταση να μη χρειάζεται κώδικα.
 * Ό,τι δεν ταιριάζει πουθενά παίρνει ουδέτερο τόνο αντί να σπάσει.
 */
export type Tone = 'critical' | 'caution' | 'positive' | 'neutral';

export const TONE_RULES: ReadonlyArray<{ tone: Tone; match: readonly string[] }> = [
  {
    tone: 'critical',
    match: ['overdue', 'failed', 'rejected', 'cancelled', 'canceled', 'blocked', 'expired'],
  },
  {
    tone: 'caution',
    match: ['pending', 'awaiting', 'review', 'draft', 'sent', 'progress', 'hold', 'unsigned'],
  },
  {
    tone: 'positive',
    match: ['paid', 'signed', 'approved', 'completed', 'complete', 'delivered', 'active', 'done'],
  },
];

function tokenize(status: string): string[] {
  return status
    .trim()
    .toLowerCase()
    .split(/[^a-z]+/)
    .filter(Boolean);
}

export function statusTone(status: string | null | undefined): Tone {
  if (!status) return 'neutral';
  const tokens = tokenize(status);
  if (tokens.length === 0) return 'neutral';

  for (const rule of TONE_RULES) {
    if (tokens.some((token) => rule.match.includes(token))) return rule.tone;
  }
  return 'neutral';
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `pnpm test:unit src/lib/status-tone.test.ts`
Expected: PASS, 8 tests.

- [ ] **Step 5: Commit**

```bash
git add src/lib/status-tone.ts src/lib/status-tone.test.ts
git commit -m "feat(design): data-driven status-to-tone resolver"
```

---

### Task 3: The shared page heading

**Files:**
- Create: `src/components/shared/page-heading.tsx`

**Interfaces:**
- Consumes: nothing.
- Produces: `export function PageHeading(props: PageHeadingProps)` where

```ts
interface PageHeadingProps {
  title: string;
  subtitle?: React.ReactNode;
  children?: React.ReactNode; // page actions, rendered right-aligned
}
```

It renders `data-slot="page-heading"` on its root and `data-slot="page-heading-title"` on the `h1` — the Playwright specs and the guard script both key off these.

There is an existing `src/components/shared/page-header.tsx` with a larger, bolder heading. **Do not delete or modify it in this task** — later slices remove its uses. This task only adds the new part and adopts it on Today.

- [ ] **Step 1: Write the component**

Create `src/components/shared/page-heading.tsx`:

```tsx
import type { ReactNode } from 'react';

interface PageHeadingProps {
  title: string;
  subtitle?: ReactNode;
  children?: ReactNode;
}

/**
 * Η μοναδική επικεφαλίδα μιας σελίδας. Ο σερίφ ζει εδώ και μόνο εδώ —
 * μέσα στα δεδομένα δουλεύει η mono με στοιχισμένους αριθμούς.
 */
export function PageHeading({ title, subtitle, children }: PageHeadingProps) {
  return (
    <header
      data-slot="page-heading"
      className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3 border-b border-border pb-4"
    >
      <div className="min-w-0">
        <h1
          data-slot="page-heading-title"
          className="font-display text-3xl leading-tight font-normal tracking-tight text-balance"
        >
          {title}
        </h1>
        {subtitle ? <div className="mt-1.5 text-sm text-muted-foreground">{subtitle}</div> : null}
      </div>
      {children ? <div className="flex shrink-0 items-center gap-2">{children}</div> : null}
    </header>
  );
}
```

- [ ] **Step 2: Verify it compiles**

Run: `pnpm type-check`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/components/shared/page-heading.tsx
git commit -m "feat(design): shared page heading, one title per page"
```

---

### Task 4: The Today screen wears the language

**Files:**
- Modify: `src/app/admin/today/page.tsx`
- Modify: `src/components/admin/dashboard/risk/risk-item.tsx`
- Modify: `src/components/admin/dashboard/hero/kpi-strip.tsx`
- Modify: `src/components/admin/dashboard/today/today-agenda.tsx`
- Modify: `src/components/admin/dashboard/activity-feed.tsx`
- Modify: `src/components/admin/dashboard/velocity/business-velocity.tsx`
- Modify: `src/components/admin/dashboard/shared/card-skeletons.tsx`

**Interfaces:**
- Consumes: `PageHeading` from Task 3, `statusTone` from Task 2, the tokens from Task 1.
- Produces: nothing new.

This is the slice's proof. Read the current Today page first — it already streams each section behind its own `Suspense` boundary and that structure must survive untouched. **Only appearance changes.** Do not add, remove or reorder a section, and do not change any query.

Apply the language:

- The page title moves into `PageHeading`, with the existing count subtitle as its `subtitle`. The hand-written `<header>` with `text-2xl font-semibold` goes away. The `Suspense`-wrapped `Subtitle` keeps streaming — pass it as the `subtitle` node.
- The six risk-radar boxes become a hairline-ruled band rather than six rounded bordered cards: one bordered container, cells divided by `border-l border-border`, no per-cell rounding. Each count is `font-display text-3xl tabular-nums`; a non-zero count takes `text-tone-critical`, a zero count `text-muted-foreground`. The label under it stays `text-[11px] text-muted-foreground`.
- Section headings inside the page (currently `text-xs font-bold uppercase tracking-wider`) become `font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground` with a `border-b border-border pb-2` rule.
- Any status pill anywhere in these widgets takes its colour from `statusTone`, rendered as a filled chip: `bg-tone-<tone>-bg text-tone-<tone>`, `font-mono text-[10px] uppercase tracking-[0.1em]`, small radius. Never a raw colour.
- Times, dates, amounts, counts and identifiers use `font-mono tabular-nums`.
- The empty state keeps its words and becomes a hairline dashed rule rather than a rounded dashed card.
- The skeletons in `card-skeletons.tsx` are retuned so their shape still matches what replaces them.

Because Tailwind 4 resolves `text-tone-critical` from the `--color-tone-*` theme keys added in Task 1, no arbitrary values are needed. If a needed utility does not resolve, add the missing `--color-*` mapping to `@theme inline` rather than writing a raw colour.

- [ ] **Step 1: Read the current page and widgets**

Read all seven files listed above before editing. Note every `Suspense` boundary and every query call; they are invariants.

- [ ] **Step 2: Adopt PageHeading on the Today page**

Replace the hand-written header block with:

```tsx
<PageHeading
  title={t('title')}
  subtitle={
    <Suspense fallback={<span>&nbsp;</span>}>
      <Subtitle />
    </Suspense>
  }
/>
```

and change `Subtitle` to return a plain `<span>{t('subtitle', { count: items.length })}</span>` — the heading now owns the wrapper and its styling.

- [ ] **Step 3: Restyle the risk radar band and the section headings**

Apply the rules above. Keep `RISK_GROUPS`, the grouping logic and the ordering exactly as they are.

- [ ] **Step 4: Restyle the remaining widgets**

Apply the same rules to the KPI strip, agenda, activity feed, business velocity and skeletons. Replace any hardcoded colour class that carries meaning (for example a red or amber utility on a status) with the tone chip driven by `statusTone`.

- [ ] **Step 5: Verify nothing changed but the appearance**

Run: `pnpm type-check && pnpm lint && pnpm build`
Expected: all pass.

Run: `grep -c "Suspense" src/app/admin/today/page.tsx`
Expected: the same count as before your edit (record it in Step 1). If it dropped, you removed a streaming boundary — restore it.

- [ ] **Step 6: Commit**

```bash
git add src/app/admin/today/page.tsx src/components/admin/dashboard
git commit -m "feat(design): the Today screen wears the new language"
```

---

### Task 5: The design guard

**Files:**
- Create: `scripts/check-design.mjs`
- Modify: `package.json` (add to the `scripts` block, beside the existing `check:routes`)

**Interfaces:**
- Consumes: nothing.
- Produces: the `pnpm check:design` command; exit code 1 on any violation.

Model it on the existing `scripts/check-routes.mjs`: walk the tree, collect every violation with its file and line, print them all, exit non-zero. It must cover **only the files this slice migrated**, so it can be introduced before the migration finishes. Later slices widen the list.

- [ ] **Step 1: Read the existing guard for its shape**

Read `scripts/check-routes.mjs`. Match its structure, its output style and its exit behaviour.

- [ ] **Step 2: Write the guard**

Create `scripts/check-design.mjs`:

```js
// Φύλακας όψης: στις περιοχές που έχουν ήδη περάσει στη νέα γλώσσα,
// κανένα component δεν γράφει χρώμα στο χέρι — όλα από τα σύμβολα.
// Τρέχει από τη ρίζα: node scripts/check-design.mjs
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

// Περιοχές που έχουν μεταναστεύσει. Κάθε επόμενη φέτα προσθέτει εδώ.
const MIGRATED = ['src/components/shared/page-heading.tsx', 'src/components/admin/dashboard'];

const RAW_COLOUR =
  /#[0-9a-fA-F]{3,8}\b|\b(?:rgb|rgba|hsl|hsla|oklch)\s*\(|\b(?:bg|text|border|ring|fill|stroke)-(?:red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose|slate|gray|grey|zinc|neutral|stone)-\d{2,3}\b/;

function walk(target, out = []) {
  if (!statSync(target).isDirectory()) {
    if (/\.(tsx|ts)$/.test(target)) out.push(target);
    return out;
  }
  for (const name of readdirSync(target)) walk(join(target, name), out);
  return out;
}

const violations = [];
for (const target of MIGRATED) {
  for (const file of walk(target)) {
    const lines = readFileSync(file, 'utf8').split('\n');
    lines.forEach((line, i) => {
      if (RAW_COLOUR.test(line)) {
        violations.push(`${file.replaceAll('\\', '/')}:${i + 1}  ${line.trim()}`);
      }
    });
  }
}

if (violations.length > 0) {
  console.error(`check:design — ${violations.length} raw colour(s) outside the token layer:\n`);
  for (const v of violations) console.error(`  ${v}`);
  console.error('\nUse a token (bg-card, text-muted-foreground, text-tone-critical, …) instead.');
  process.exit(1);
}

console.log(`ok — ${MIGRATED.length} migrated area(s), no raw colours`);
```

- [ ] **Step 3: Add the script**

In `package.json`, immediately after the `"check:routes"` line, add:

```json
    "check:design": "node scripts/check-design.mjs",
```

- [ ] **Step 4: Run it and fix what it finds**

Run: `pnpm check:design`
Expected: `ok — 2 migrated area(s), no raw colours`. If it reports violations, they are real — fix them in the migrated files by moving to tokens, then re-run.

- [ ] **Step 5: Prove the guard actually catches something**

Temporarily add a line containing `className="text-red-500"` to `src/components/shared/page-heading.tsx`, run `pnpm check:design`, and confirm it exits non-zero and names that file and line. Then remove the line and confirm it passes again.

- [ ] **Step 6: Commit**

```bash
git add scripts/check-design.mjs package.json
git commit -m "feat(design): build guard against raw colours in migrated areas"
```

---

### Task 6: Playwright invariants

**Files:**
- Create: `e2e/design-identity.spec.ts`

**Interfaces:**
- Consumes: the existing e2e helpers.
- Produces: nothing.

Read `e2e/v2-shell.spec.ts` first and follow its conventions exactly: the same credential gating (specs that need a signed-in user skip unless `E2E_TEST_USERS_READY` is set), and the same locator discipline — filter by `data-slot`, never by text, and never leave a strict-mode locator that could match more than one element.

Four invariants. Each one exists because a real defect was found:

1. **One page heading per page.** The double-title defect.
2. **The three typefaces are loaded with Greek glyphs.** The Latin-only subset defect — the reason this whole check exists.
3. **Both editions render with a painted background.** Guards against a surface inheriting the host ground.
4. **An explicit theme choice beats the OS preference**, in both directions.

- [ ] **Step 1: Write the spec**

Create `e2e/design-identity.spec.ts`. Use `document.fonts.check` with a Greek string for the font assertion — it is the only reliable way to prove the glyphs actually loaded rather than silently fell back:

```ts
const GREEK = 'Σήμερα';

async function fontLoaded(page: Page, family: string) {
  return page.evaluate(
    ([f, sample]) => document.fonts.check(`16px "${f}"`, sample),
    [family, GREEK] as const,
  );
}
```

Assert the login page (public, no credentials needed) for the font and background invariants, and the signed-in routes for the heading invariant behind the credential gate.

- [ ] **Step 2: Confirm the spec is collected**

Run: `pnpm exec playwright test e2e/design-identity.spec.ts --list`
Expected: the spec's tests are listed with no collection error.

- [ ] **Step 3: Run what can run without credentials**

Run: `pnpm exec playwright test e2e/design-identity.spec.ts`
Expected: the public-page tests pass; the credential-gated ones report as skipped, not failed.

- [ ] **Step 4: Run the whole suite for collection health**

Run: `pnpm exec playwright test --list`
Expected: every spec collects; no errors.

- [ ] **Step 5: Commit**

```bash
git add e2e/design-identity.spec.ts
git commit -m "test(design): playwright invariants for headings, fonts and both editions"
```
