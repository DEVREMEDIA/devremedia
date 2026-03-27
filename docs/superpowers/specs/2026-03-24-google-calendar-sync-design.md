# Google Calendar Bidirectional Sync — Design Spec

**Date:** 2026-03-24
**Status:** Approved
**Approach:** Direct Google Calendar API v3 via Service Account

---

## Overview

Bidirectional sync between the project's FullCalendar (Supabase-backed) and a shared company Google Calendar. The UI remains unchanged — sync runs invisibly in the background. Admins manage the calendar as before; Google Calendar serves as a mirror for mobile access, notifications, and convenience.

## Requirements

- **Bidirectional sync**: Project → Google and Google → Project
- **Real-time**: Google Push Notifications (webhooks) for Google → Project; immediate API calls for Project → Google
- **All event types synced**: custom events, project deadlines/start dates, task due dates, invoice due dates
- **Conflict handling**: Custom events auto-sync; project/task/invoice changes from Google require admin approval via notifications
- **New Google events**: Admin receives notification and chooses to create as custom event, task, project deadline, or ignore
- **Single shared calendar**: One company Google Calendar, managed by admins only
- **Source of truth**: Supabase remains the source of truth

## Authentication

**Google Service Account** with domain-wide delegation, accessing one shared Google Calendar.

### Environment Variables

```
GOOGLE_SERVICE_ACCOUNT_EMAIL=service-account@project.iam.gserviceaccount.com
GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n..."
GOOGLE_CALENDAR_ID=company-calendar@group.calendar.google.com
GOOGLE_WEBHOOK_URL=https://yourdomain.com/api/webhooks/google-calendar
CRON_SECRET=random-secret-for-cron-auth
```

No admin settings UI — connection is always-on via env vars.

## Database Schema

### New table: `google_calendar_config`

Single-row table for calendar-wide sync state:

```sql
CREATE TABLE google_calendar_config (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sync_token            TEXT,
  webhook_channel_id    TEXT,
  webhook_channel_token TEXT,
  webhook_resource_id   TEXT,
  webhook_expiration    TIMESTAMPTZ,
  last_sync_at          TIMESTAMPTZ,
  created_at            TIMESTAMPTZ DEFAULT now(),
  updated_at            TIMESTAMPTZ DEFAULT now()
);
```

### New table: `google_calendar_sync`

Per-entity mapping between Supabase entities and Google Calendar events:

```sql
CREATE TABLE google_calendar_sync (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type     TEXT NOT NULL CHECK (entity_type IN ('project', 'task', 'invoice', 'custom')),
  entity_id       UUID,
  subtype         TEXT CHECK (subtype IN ('start', 'deadline')),
  google_event_id TEXT UNIQUE,
  sync_status     TEXT NOT NULL DEFAULT 'synced' CHECK (sync_status IN ('synced', 'pending', 'conflict', 'ignored')),
  sync_direction  TEXT NOT NULL DEFAULT 'to_google' CHECK (sync_direction IN ('to_google', 'from_google')),
  retry_count     INTEGER NOT NULL DEFAULT 0,
  last_synced_at  TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_google_sync_entity ON google_calendar_sync(entity_type, entity_id);
CREATE INDEX idx_google_sync_google_id ON google_calendar_sync(google_event_id);
CREATE INDEX idx_google_sync_status ON google_calendar_sync(sync_status);

-- Prevent duplicate mappings: for projects with subtype (start/deadline)
CREATE UNIQUE INDEX idx_google_sync_project_subtype
  ON google_calendar_sync(entity_type, entity_id, subtype)
  WHERE subtype IS NOT NULL;

-- Prevent duplicate mappings: for non-project entities (subtype is null)
CREATE UNIQUE INDEX idx_google_sync_entity_no_subtype
  ON google_calendar_sync(entity_type, entity_id)
  WHERE subtype IS NULL AND entity_id IS NOT NULL;
```

Key design decisions:
- `entity_id` nullable — allows `ignored` rows for dismissed Google events (no Supabase entity exists)
- `subtype` nullable — only used for projects (`'start'` | `'deadline'`), null for tasks/invoices/custom
- `google_event_id` nullable — allows creating a `pending` row when Google API fails, so cron can retry. PostgreSQL treats NULLs as distinct in UNIQUE constraints, so multiple pending rows are allowed.
- `sync_status: 'ignored'` — tracks events admin deliberately dismissed (prevents re-notification)
- `retry_count` — tracks failed sync attempts for exponential backoff in cron retry
- `updated_at` — needed for retry backoff (distinguish "failed 5s ago" from "failing for 3 days")
- Partial unique indexes — prevent duplicate mappings while handling nullable subtype correctly

RLS: Admin-only (same policy as `calendar_events`).

### Alter `notifications` table

```sql
ALTER TABLE notifications
  ADD COLUMN action_type TEXT,
  ADD COLUMN action_data JSONB;
```

- `action_type`: `google_new_event`, `google_event_changed`, `google_event_deleted`
- `action_data`: typed JSONB per action_type (see TypeScript types below)

### TypeScript types for action_data

```typescript
interface GoogleNewEventData {
  google_event_id: string
  title: string
  start: string
  end?: string
  description?: string
}

interface GoogleEventChangedData {
  google_event_id: string
  entity_type: 'project' | 'task' | 'invoice' | 'custom'
  entity_id: string
  subtype?: 'start' | 'deadline'
  changes: Record<string, { from: string; to: string }>
}

interface GoogleEventDeletedData {
  google_event_id: string
  entity_type: 'project' | 'task' | 'invoice' | 'custom'
  entity_id: string
  title: string
}

type GoogleSyncActionData =
  | { action_type: 'google_new_event'; data: GoogleNewEventData }
  | { action_type: 'google_event_changed'; data: GoogleEventChangedData }
  | { action_type: 'google_event_deleted'; data: GoogleEventDeletedData }
```

### Update `Notification` type

Add `action_type` and `action_data` to the existing `Notification` type in `src/types/entities.ts`, and update `getMyNotifications()` select list in `src/lib/actions/notifications.ts`.

## Sync Flow: Project → Google

### Architecture

All Google sync calls go through a single helper function to keep server actions thin and decoupled:

```typescript
// src/lib/google-sync-helper.ts
async function syncEntityToGoogle(
  entityType: 'project' | 'task' | 'invoice' | 'custom',
  entityId: string,
  operation: 'create' | 'update' | 'delete',
  eventData: GoogleEventPayload,
  subtype?: 'start' | 'deadline'
): Promise<void>
```

Each server action calls this as a single line after its Supabase operation. This keeps actions focused and the sync concern isolated.

### Create

1. Server action creates entity in Supabase (existing logic)
2. `await syncEntityToGoogle(type, id, 'create', data)` — awaited but wrapped in try/catch so it never blocks the main response
3. Helper calls `createGoogleEvent()`, receives `google_event_id`
4. Inserts mapping row into `google_calendar_sync` with `sync_status: 'synced'`
5. On Google API failure: inserts mapping with `google_event_id: null`, `sync_status: 'pending'`

### Update

1. Server action updates entity in Supabase (existing logic)
2. Calls `syncEntityToGoogle(type, id, 'update', data)`
3. Helper looks up mapping → `updateGoogleEvent()` with new data
4. Updates `last_synced_at` and `updated_at`

### Delete

1. Server action deletes entity in Supabase (existing logic)
2. Calls `syncEntityToGoogle(type, id, 'delete', {})`
3. Helper looks up mapping → `deleteGoogleEvent()`
4. Deletes mapping row

### Error Handling

- If Google API call fails, the Supabase operation still succeeds (non-blocking)
- Mapping row is always written: with `google_event_id` if available, without if API failed
- `sync_status: 'pending'` for failed syncs
- Cron job retries pending items (see Cron Jobs section)

## Sync Flow: Google → Project

### Webhook Setup

- Google Calendar Push Notifications → `POST /api/webhooks/google-calendar`
- On `watchCalendar()`, we generate a random `channel_token` (secret) and store it in `google_calendar_config`
- Webhook does NOT contain event data — it signals "something changed"
- On receiving webhook, call `events.list()` with `syncToken` from `google_calendar_config` for incremental changes

### Webhook Authentication

Google Push Notifications do **not** include HMAC signatures. Authentication uses:

1. **Channel token validation**: When calling `watch()`, we set a secret `token` parameter. Google sends it back in every webhook as `X-Goog-Channel-Token`. We validate this against the stored `webhook_channel_token` in `google_calendar_config`.
2. **Signal-only design**: Even if a forged webhook bypasses token validation, it only triggers an `events.list()` call — it cannot inject data. This is documented as a deliberate defense-in-depth choice.

### Loop Protection

When an inbound Google change auto-updates Supabase (custom events), the server action would normally trigger an outbound sync back to Google, creating an infinite loop. Prevention:

- `syncEntityToGoogle()` accepts an optional `fromGoogle: boolean` flag
- When processing inbound webhook changes, Supabase updates are made with `fromGoogle: true`
- The helper skips the outbound Google API call when `fromGoogle` is set
- Additionally, compare `last_synced_at` on the mapping row against the Google event's `updated` timestamp to detect echo updates

### New Event in Google

1. Webhook fires → fetch changes via `syncToken`
2. Check `google_calendar_sync` — no mapping exists = new event
3. Also check for `sync_status: 'ignored'` mapping — if found, skip (already dismissed)
4. Create notification for admins:
   - Type: `google_new_event`
   - Action data: event title, date, description from Google
   - Actions: "Create as Custom Event" / "Create as Task" / "Assign as Project Deadline" / "Ignore"
5. Admin clicks action:
   - Create/Task/Deadline → server action creates entity in Supabase + mapping with `sync_status: 'synced'`
   - Ignore → creates mapping with `sync_status: 'ignored'`, `entity_id: null` to prevent re-notification

### Modified Mapped Event in Google

1. Webhook fires → fetch changes → find mapping
2. **Custom event**: Auto-sync back to Supabase (with `fromGoogle: true`), update `last_synced_at`
3. **Project/Task/Invoice event**: Create notification:
   - Type: `google_event_changed`
   - Shows: what changed (e.g., date moved from X to Y)
   - Actions: "Accept" (update Supabase) / "Reject" (revert Google event to match Supabase)

### Deleted Mapped Event in Google

1. Webhook fires → fetch changes (event marked `cancelled`) → find mapping
2. **Custom event**: Notification — "Delete from project too?" / "Keep it"
3. **Project/Task/Invoice**: Notification — "Event removed from Google. Entity preserved in project." + option to re-sync

### syncToken Lifecycle

- `syncToken` is stored in `google_calendar_config` (single source of truth, not per-entity)
- Updated atomically after every successful `events.list()` call
- On `410 Gone` response (token expired): perform full re-sync by calling `events.list()` without token, then store the new `syncToken`
- Full re-sync compares all Google events against existing mappings to avoid duplicate notifications

### Webhook Renewal

- Google webhooks expire after ~7 days
- Cron job runs every 6 days: `stopWatch()` → `watchCalendar()` with new channel token
- Channel metadata stored in `google_calendar_config` table (not env vars)

## Event Mapping

How project entities map to Google Calendar events:

| Entity | Google Event Title | Google Event Date | All Day | subtype |
|--------|-------------------|-------------------|---------|---------|
| Project start | "Start: {project.title}" | project.start_date | Yes | `'start'` |
| Project deadline | "Deadline: {project.title}" | project.deadline | Yes | `'deadline'` |
| Task due date | "Task: {task.title}" | task.due_date | Yes | null |
| Invoice due date | "Invoice Due: {invoice_number}" | invoice.due_date | Yes | null |
| Custom event | event.title | event.start_date → event.end_date | event.all_day | null |

### Google Calendar Color Mapping

Google Calendar only supports 11 fixed `colorId` integers. Approximate mapping:

| Entity Type | HSL Color (project) | Google colorId | Google Color Name |
|-------------|-------------------|----------------|-------------------|
| Project start | `hsl(var(--primary))` | `9` | Blueberry |
| Project deadline | `hsl(var(--destructive))` | `11` | Tomato |
| Task | `hsl(142 76% 36%)` | `2` | Sage |
| Invoice | `hsl(25 95% 53%)` | `6` | Tangerine |
| Custom: meeting | `hsl(262 83% 58%)` | `3` | Grape |
| Custom: reminder | `hsl(199 89% 48%)` | `7` | Peacock |
| Custom: filming | `hsl(var(--primary))` | `9` | Blueberry |
| Custom: deadline | `hsl(var(--destructive))` | `11` | Tomato |
| Custom: custom | `hsl(280 60% 55%)` | `3` | Grape |

## Notification UI

Uses the existing notification system. New component `GoogleSyncNotification` renders action buttons inline within the existing `notification-bell.tsx` dropdown, based on `action_type`:

### google_new_event
> **New event from Google Calendar**
> "Meeting with client" — 28 Mar 2026, 10:00
> [Create as Custom Event] [Create as Task] [Ignore]

### google_event_changed
> **Synced event changed in Google**
> "Project X Deadline" date changed: 30 Mar → 5 Apr
> [Accept] [Reject]

### google_event_deleted
> **Synced event deleted from Google**
> "Team Meeting" was removed
> [Delete from project] [Keep it]

## File Structure

### New Files

```
src/
  lib/
    google-calendar.ts              -- Google Calendar API client (auth, CRUD, watch)
    google-sync-helper.ts           -- syncEntityToGoogle() helper
    actions/google-sync.ts          -- Server actions (acceptChange, rejectChange, createFromGoogle, ignoreEvent)
  app/
    api/
      webhooks/
        google-calendar/
          route.ts                  -- Webhook endpoint (validates channel token)
      cron/
        google-sync-retry/
          route.ts                  -- Cron: retry pending syncs
        google-webhook-renew/
          route.ts                  -- Cron: renew webhook subscription
  components/
    shared/
      google-sync-notification.tsx  -- Notification action buttons component
```

### Modified Files

```
src/
  lib/
    actions/calendar-events.ts     -- Add syncEntityToGoogle() call after CRUD
    actions/projects.ts            -- Add syncEntityToGoogle() call after CRUD
    actions/tasks.ts               -- Add syncEntityToGoogle() call after CRUD
    actions/invoices.ts            -- Add syncEntityToGoogle() call after CRUD
    actions/notifications.ts       -- Update getMyNotifications() select to include action_type, action_data
  types/
    entities.ts                    -- Add action_type, action_data to Notification type + GoogleSyncActionData types
  components/
    shared/
      notification-bell.tsx        -- Render GoogleSyncNotification for google_* action_types
```

### New Package

```
@googleapis/calendar    -- Scoped Google Calendar API client (much smaller than full googleapis)
```

Using `@googleapis/calendar` instead of the full `googleapis` package (~4MB) to minimize serverless cold start times on Vercel.

## Cron Jobs

Two API routes, secured with `CRON_SECRET` header validation:

### 1. Retry pending syncs — every 5 minutes

**Route:** `POST /api/cron/google-sync-retry`

```
vercel.json: { "crons": [{ "path": "/api/cron/google-sync-retry", "schedule": "*/5 * * * *" }] }
```

- Validates `Authorization: Bearer ${CRON_SECRET}` header
- Queries `google_calendar_sync WHERE sync_status = 'pending' ORDER BY updated_at ASC LIMIT 50`
- Implements backoff: skip rows where `updated_at` is less than `2^retry_count` minutes ago
- Retries the Google API call
- On success: updates `sync_status: 'synced'`, resets `retry_count: 0`
- On failure: increments `retry_count`, updates `updated_at`
- After 3 days of failures (or `retry_count > 20`): marks as `conflict` and creates admin notification

### 2. Renew webhook — every 6 days

**Route:** `POST /api/cron/google-webhook-renew`

```
vercel.json: { "crons": [{ "path": "/api/cron/google-webhook-renew", "schedule": "0 3 */6 * *" }] }
```

- Validates `Authorization: Bearer ${CRON_SECRET}` header
- Reads current channel from `google_calendar_config`
- `stopWatch()` → `watchCalendar()` with new channel token
- Updates `google_calendar_config` with new channel_id, token, expiration

## Security

- Webhook endpoint validates `X-Goog-Channel-Token` against stored secret (generated at watch time)
- Even without token validation, webhook is signal-only — cannot inject data (defense-in-depth)
- Cron endpoints validate `Authorization: Bearer ${CRON_SECRET}` header
- Service account private key stored as env var, never in code
- All sync server actions require admin authentication via `getUser()`
- RLS on both `google_calendar_sync` and `google_calendar_config` tables — admin-only
- Google API calls happen server-side only

## Out of Scope

- Multiple Google Calendars (only one shared calendar)
- Non-admin users connecting their own calendars
- Outlook/iCal integration
- Recurring event patterns (synced as individual occurrences)
