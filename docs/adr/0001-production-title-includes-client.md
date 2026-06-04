# A Production's title includes its Client's name

**Status:** accepted

## Decision

A Production's stored `title` is denormalized to include the Client's name as a prefix — `"{company_name} — {name}"` (e.g. `"Acme — FILMING 1"`). This is the canonical display form everywhere: admin, employee, client portal, calendar events, PDFs, emails, and notifications.

## Context

Productions were entered with generic titles (`FILMING 1`, `FILMING 2`, …). Across the system — employee screens, the shared calendar, PDFs, emails — only the bare title is shown, with no Client context, so you couldn't tell whose Production was which (reported by Angelos). Existing rows were already backfilled (migration `00048`); this ADR records the forward-looking commitment so new Productions stay consistent.

## Considered options

- **Compose at display time** (keep `title` clean, render `{client} — {title}` only where Client context is missing). Cleaner per our single-source-of-truth rule, but requires touching every display site, reverting the `00048` backfill (a string-strip migration with edge-case risk), and removing the now-redundant Client column from admin lists.
- **Bake the Client into the title** (chosen). Simpler and visually consistent everywhere with zero changes to existing data. The only code change is prefilling the Client prefix when a new Production is created.

We chose baking for simplicity and because it needed **no data migration** — existing records stay untouched, which was a hard requirement (no risk to Production data).

## Consequences

- The `title` field is intentionally **not** the canonical Production name on its own — it carries Client identity. This deviates from our usual "derive, don't duplicate" rule; the deviation is deliberate.
- If a Client is later renamed (`company_name` changes), previously-baked Production titles keep the **old** name and will not auto-update. Accepted as a known cost.
- In admin list/board views, where the Client is already shown in a separate column, the name appears twice. Accepted — consistency was preferred over de-duplication.
- New Productions get the prefix via a creation-form prefill (only when the title is empty), so the user can still override it.
