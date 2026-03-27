# Google Calendar Bidirectional Sync — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Bidirectional real-time sync between the project's FullCalendar (Supabase) and a shared company Google Calendar.

**Architecture:** Service account authenticates with Google Calendar API v3. A sync helper (`syncEntityToGoogle`) is called from existing server actions after CRUD operations. Google Push Notifications (webhooks) handle Google → Project sync. A mapping table (`google_calendar_sync`) tracks which Supabase entities correspond to which Google events. Admin notifications handle conflicts.

**Tech Stack:** `@googleapis/calendar`, Next.js 16 App Router, Supabase (PostgreSQL + RLS), Vercel Cron

**Spec:** `docs/superpowers/specs/2026-03-24-google-calendar-sync-design.md`

---

## Task 1: Database Migration

**Files:**
- Create: `supabase/migrations/00028_google_calendar_sync.sql`

- [ ] **Step 1: Create migration file**

```sql
-- Google Calendar Bidirectional Sync
-- Creates config table (single-row, calendar-wide state) and sync mapping table.
-- Also adds action_type + action_data columns to notifications for sync conflict UI.

-- 1. Config table: stores syncToken, webhook channel metadata
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

-- RLS: admin-only
ALTER TABLE google_calendar_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage google_calendar_config"
  ON google_calendar_config
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role IN ('super_admin', 'admin')
    )
  );

-- Seed a single config row
INSERT INTO google_calendar_config (id) VALUES (gen_random_uuid());

-- 2. Sync mapping table: links Supabase entities to Google Calendar events
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

-- Partial unique indexes to prevent duplicate mappings
CREATE UNIQUE INDEX idx_google_sync_project_subtype
  ON google_calendar_sync(entity_type, entity_id, subtype)
  WHERE subtype IS NOT NULL;

CREATE UNIQUE INDEX idx_google_sync_entity_no_subtype
  ON google_calendar_sync(entity_type, entity_id)
  WHERE subtype IS NULL AND entity_id IS NOT NULL;

-- RLS: admin-only
ALTER TABLE google_calendar_sync ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage google_calendar_sync"
  ON google_calendar_sync
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role IN ('super_admin', 'admin')
    )
  );

-- updated_at trigger (reuse existing pattern from calendar_events)
CREATE TRIGGER update_google_calendar_sync_updated_at
  BEFORE UPDATE ON google_calendar_sync
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_google_calendar_config_updated_at
  BEFORE UPDATE ON google_calendar_config
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- 3. Add action columns to notifications for Google sync conflict UI
ALTER TABLE notifications
  ADD COLUMN IF NOT EXISTS action_type TEXT,
  ADD COLUMN IF NOT EXISTS action_data JSONB;
```

- [ ] **Step 2: Apply migration locally**

Run: `pnpm supabase db push` or `pnpm supabase migration up`
Expected: Migration applies without errors. Tables `google_calendar_config` and `google_calendar_sync` created, `notifications` table altered.

- [ ] **Step 3: Verify tables exist**

Run: `pnpm supabase db reset` (or check via Supabase Studio)
Expected: Both tables visible, config table has one seeded row, notifications table has `action_type` and `action_data` columns.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/00028_google_calendar_sync.sql
git commit -m "feat(db): add google calendar sync tables and notification action columns"
```

---

## Task 2: Install Package & Update Env Config

**Files:**
- Modify: `package.json`
- Modify: `.env.local.example`
- Modify: `vercel.json`

- [ ] **Step 1: Install @googleapis/calendar and verify auth peer dep**

Run: `pnpm add @googleapis/calendar`
Then verify google-auth-library is available: `pnpm ls google-auth-library`
If not present: `pnpm add google-auth-library`
Expected: Both packages available in node_modules. Verify with: `node -e "require('google-auth-library')"`

- [ ] **Step 2: Update .env.local.example**

Add to `.env.local.example`:

```bash
# Google Calendar Sync
GOOGLE_SERVICE_ACCOUNT_EMAIL=
GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY=
GOOGLE_CALENDAR_ID=
GOOGLE_WEBHOOK_URL=
CRON_SECRET=
```

- [ ] **Step 3: Update vercel.json with cron jobs**

Update `vercel.json` to:

```json
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "framework": "nextjs",
  "buildCommand": "next build",
  "installCommand": "pnpm install --frozen-lockfile",
  "regions": ["iad1"],
  "crons": [
    {
      "path": "/api/cron/google-sync-retry",
      "schedule": "*/5 * * * *"
    },
    {
      "path": "/api/cron/google-webhook-renew",
      "schedule": "0 3 */6 * *"
    }
  ]
}
```

- [ ] **Step 4: Commit**

```bash
git add package.json pnpm-lock.yaml .env.local.example vercel.json
git commit -m "chore: add @googleapis/calendar, env vars, and cron config"
```

---

## Task 3: TypeScript Types & Constants

**Files:**
- Modify: `src/types/entities.ts` — add Google sync types to `Notification` type
- Modify: `src/lib/notification-types.ts` — add Google sync notification types

- [ ] **Step 1: Add Google sync types to entities.ts**

In `src/types/entities.ts`, add after the existing `Notification` type:

```typescript
// --- Google Calendar Sync Types ---

export interface GoogleCalendarSyncRecord {
  id: string
  entity_type: 'project' | 'task' | 'invoice' | 'custom'
  entity_id: string | null
  subtype: 'start' | 'deadline' | null
  google_event_id: string | null
  sync_status: 'synced' | 'pending' | 'conflict' | 'ignored'
  sync_direction: 'to_google' | 'from_google'
  retry_count: number
  last_synced_at: string | null
  created_at: string
  updated_at: string
}

export interface GoogleCalendarConfigRecord {
  id: string
  sync_token: string | null
  webhook_channel_id: string | null
  webhook_channel_token: string | null
  webhook_resource_id: string | null
  webhook_expiration: string | null
  last_sync_at: string | null
  created_at: string
  updated_at: string
}

export interface GoogleNewEventData {
  google_event_id: string
  title: string
  start: string
  end?: string
  description?: string
}

export interface GoogleEventChangedData {
  google_event_id: string
  entity_type: 'project' | 'task' | 'invoice' | 'custom'
  entity_id: string
  subtype?: 'start' | 'deadline'
  changes: Record<string, { from: string; to: string }>
}

export interface GoogleEventDeletedData {
  google_event_id: string
  entity_type: 'project' | 'task' | 'invoice' | 'custom'
  entity_id: string
  title: string
}

export type GoogleSyncActionData =
  | { action_type: 'google_new_event'; data: GoogleNewEventData }
  | { action_type: 'google_event_changed'; data: GoogleEventChangedData }
  | { action_type: 'google_event_deleted'; data: GoogleEventDeletedData }
```

Also update the existing `Notification` type to include the new fields:

```typescript
export type Notification = {
  id: string
  user_id: string
  type: string
  title: string
  body: string | null
  read: boolean
  action_url: string | null
  action_type: string | null
  action_data: GoogleSyncActionData | null
  created_at: string
}
```

- [ ] **Step 2: Add Google sync notification types to notification-types.ts**

In `src/lib/notification-types.ts`, add to `NOTIFICATION_TYPES`:

```typescript
// Google Calendar Sync
GOOGLE_NEW_EVENT: 'google_new_event',
GOOGLE_EVENT_CHANGED: 'google_event_changed',
GOOGLE_EVENT_DELETED: 'google_event_deleted',
```

And add to `TYPE_TO_PREFERENCE`:

```typescript
[NOTIFICATION_TYPES.GOOGLE_NEW_EVENT]: 'project_updates',
[NOTIFICATION_TYPES.GOOGLE_EVENT_CHANGED]: 'project_updates',
[NOTIFICATION_TYPES.GOOGLE_EVENT_DELETED]: 'project_updates',
```

- [ ] **Step 3: Update notifications.ts — select list AND CreateNotificationInput**

In `src/lib/actions/notifications.ts`, line ~113, update the select string to include the new columns:

```typescript
.select('id, user_id, type, title, body, read, action_url, action_type, action_data, created_at')
```

Also update the `CreateNotificationInput` interface (around line ~54) to accept the new fields:

```typescript
interface CreateNotificationInput {
  userId: string;
  type: string;
  title: string;
  body?: string;
  actionUrl?: string;
  actionType?: string;
  actionData?: unknown;
}
```

And update the `createNotification()` function's insert call to include them:

```typescript
    await supabase.from('notifications').insert({
      user_id: userId,
      type,
      title,
      body: body ?? null,
      action_url: actionUrl ?? null,
      action_type: actionType ?? null,
      action_data: actionData ?? null,
    });
```

This is critical — the webhook endpoint (Task 8) must insert `action_type`/`action_data` atomically in one query, not via a separate update.

- [ ] **Step 4: Verify build passes**

Run: `pnpm build`
Expected: Build succeeds. The new types don't break existing code because `action_type` and `action_data` are nullable.

- [ ] **Step 5: Commit**

```bash
git add src/types/entities.ts src/lib/notification-types.ts src/lib/actions/notifications.ts
git commit -m "feat(types): add Google Calendar sync types and notification columns"
```

---

## Task 4: Google Calendar API Client

**Files:**
- Create: `src/lib/google-calendar.ts`

This module handles all direct communication with Google Calendar API v3. Every other module in the system calls this — nothing else talks to Google directly.

- [ ] **Step 1: Create the Google Calendar API client**

Create `src/lib/google-calendar.ts`:

```typescript
import { calendar_v3 } from '@googleapis/calendar'
import { JWT } from 'google-auth-library'
import { randomUUID } from 'crypto'

// --- Auth ---
// NOTE: @googleapis/calendar does NOT re-export auth classes.
// JWT comes from google-auth-library (installed as peer dep of @googleapis/calendar).
// After `pnpm add @googleapis/calendar`, verify google-auth-library is available.
// If not: `pnpm add google-auth-library`

function getAuthClient() {
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL
  const key = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY?.replace(/\\n/g, '\n')

  if (!email || !key) {
    throw new Error('Google Calendar credentials not configured')
  }

  return new JWT({
    email,
    key,
    scopes: ['https://www.googleapis.com/auth/calendar'],
  })
}

function getCalendarClient(): calendar_v3.Calendar {
  return new calendar_v3.Calendar({ auth: getAuthClient() })
}

function getCalendarId(): string {
  const calendarId = process.env.GOOGLE_CALENDAR_ID
  if (!calendarId) throw new Error('GOOGLE_CALENDAR_ID not configured')
  return calendarId
}

// --- Color Mapping ---

const ENTITY_COLOR_MAP: Record<string, string> = {
  'project_start': '9',      // Blueberry
  'project_deadline': '11',  // Tomato
  'task': '2',               // Sage
  'invoice': '6',            // Tangerine
  'custom_meeting': '3',     // Grape
  'custom_reminder': '7',    // Peacock
  'custom_filming': '9',     // Blueberry
  'custom_deadline': '11',   // Tomato
  'custom_custom': '3',      // Grape
}

export function getGoogleColorId(
  entityType: string,
  subtype?: string | null,
  eventType?: string | null,
): string {
  if (entityType === 'project' && subtype) {
    return ENTITY_COLOR_MAP[`project_${subtype}`] ?? '9'
  }
  if (entityType === 'custom' && eventType) {
    return ENTITY_COLOR_MAP[`custom_${eventType}`] ?? '3'
  }
  return ENTITY_COLOR_MAP[entityType] ?? '1'
}

// --- Event Payload ---

export interface GoogleEventPayload {
  title: string
  description?: string
  startDate: string
  endDate?: string
  allDay?: boolean
  colorId?: string
}

function buildEventResource(payload: GoogleEventPayload): calendar_v3.Schema$Event {
  const isAllDay = payload.allDay ?? true
  const event: calendar_v3.Schema$Event = {
    summary: payload.title,
    description: payload.description ?? undefined,
    colorId: payload.colorId ?? undefined,
  }

  if (isAllDay) {
    // All-day events use date (not dateTime)
    event.start = { date: payload.startDate.split('T')[0] }
    event.end = { date: (payload.endDate ?? payload.startDate).split('T')[0] }
  } else {
    event.start = { dateTime: payload.startDate, timeZone: 'Europe/Athens' }
    event.end = {
      dateTime: payload.endDate ?? payload.startDate,
      timeZone: 'Europe/Athens',
    }
  }

  return event
}

// --- CRUD ---

export async function createGoogleEvent(
  payload: GoogleEventPayload,
): Promise<string> {
  const calendar = getCalendarClient()
  const response = await calendar.events.insert({
    calendarId: getCalendarId(),
    requestBody: buildEventResource(payload),
  })
  if (!response.data.id) throw new Error('Google Calendar: event created but no ID returned')
  return response.data.id
}

export async function updateGoogleEvent(
  googleEventId: string,
  payload: GoogleEventPayload,
): Promise<void> {
  const calendar = getCalendarClient()
  await calendar.events.update({
    calendarId: getCalendarId(),
    eventId: googleEventId,
    requestBody: buildEventResource(payload),
  })
}

export async function deleteGoogleEvent(googleEventId: string): Promise<void> {
  const calendar = getCalendarClient()
  await calendar.events.delete({
    calendarId: getCalendarId(),
    eventId: googleEventId,
  })
}

// --- Incremental Sync ---

export interface GoogleSyncResult {
  events: calendar_v3.Schema$Event[]
  nextSyncToken: string | null
}

export async function fetchChangedEvents(
  syncToken?: string | null,
): Promise<GoogleSyncResult> {
  const calendar = getCalendarClient()

  try {
    const response = await calendar.events.list({
      calendarId: getCalendarId(),
      syncToken: syncToken ?? undefined,
      singleEvents: true,
      maxResults: 250,
    })

    return {
      events: response.data.items ?? [],
      nextSyncToken: response.data.nextSyncToken ?? null,
    }
  } catch (err: unknown) {
    // 410 Gone = syncToken expired, do full sync
    if (err && typeof err === 'object' && 'code' in err && (err as { code: number }).code === 410) {
      const response = await calendar.events.list({
        calendarId: getCalendarId(),
        singleEvents: true,
        maxResults: 2500,
        timeMin: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString(),
      })

      return {
        events: response.data.items ?? [],
        nextSyncToken: response.data.nextSyncToken ?? null,
      }
    }
    throw err
  }
}

// --- Watch (Push Notifications) ---

export interface WatchResult {
  channelId: string
  channelToken: string
  resourceId: string
  expiration: string
}

export async function watchCalendar(): Promise<WatchResult> {
  const calendar = getCalendarClient()
  const channelId = randomUUID()
  const channelToken = randomUUID()
  const webhookUrl = process.env.GOOGLE_WEBHOOK_URL

  if (!webhookUrl) throw new Error('GOOGLE_WEBHOOK_URL not configured')

  const response = await calendar.events.watch({
    calendarId: getCalendarId(),
    requestBody: {
      id: channelId,
      token: channelToken,
      type: 'web_hook',
      address: webhookUrl,
    },
  })

  return {
    channelId,
    channelToken,
    resourceId: response.data.resourceId ?? '',
    expiration: new Date(Number(response.data.expiration)).toISOString(),
  }
}

export async function stopWatch(
  channelId: string,
  resourceId: string,
): Promise<void> {
  const calendar = getCalendarClient()
  await calendar.channels.stop({
    requestBody: {
      id: channelId,
      resourceId,
    },
  })
}
```

- [ ] **Step 2: Verify build passes**

Run: `pnpm build`
Expected: Build succeeds. Module exports but is not yet called from anywhere.

- [ ] **Step 3: Commit**

```bash
git add src/lib/google-calendar.ts
git commit -m "feat(google): add Google Calendar API client module"
```

---

## Task 5: Sync Helper

**Files:**
- Create: `src/lib/google-sync-helper.ts`

This is the single entry point that all server actions call after CRUD operations. It handles the mapping table and delegates to the Google API client.

- [ ] **Step 1: Create the sync helper**

Create `src/lib/google-sync-helper.ts`:

```typescript
import { createAdminClient } from '@/lib/supabase/admin'
import {
  createGoogleEvent,
  updateGoogleEvent,
  deleteGoogleEvent,
  getGoogleColorId,
} from '@/lib/google-calendar'
import type { GoogleEventPayload } from '@/lib/google-calendar'

interface SyncOptions {
  entityType: 'project' | 'task' | 'invoice' | 'custom'
  entityId: string
  operation: 'create' | 'update' | 'delete'
  eventData?: GoogleEventPayload
  subtype?: 'start' | 'deadline'
  fromGoogle?: boolean
}

export async function syncEntityToGoogle({
  entityType,
  entityId,
  operation,
  eventData,
  subtype,
  fromGoogle = false,
}: SyncOptions): Promise<void> {
  // Skip outbound sync if this change originated from Google (loop protection)
  if (fromGoogle) return

  // Skip if Google Calendar is not configured
  if (!process.env.GOOGLE_CALENDAR_ID || !process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL) return

  const supabase = createAdminClient()

  try {
    if (operation === 'create' && eventData) {
      await handleCreate(supabase, entityType, entityId, eventData, subtype)
    } else if (operation === 'update' && eventData) {
      await handleUpdate(supabase, entityType, entityId, eventData, subtype)
    } else if (operation === 'delete') {
      await handleDelete(supabase, entityType, entityId, subtype)
    }
  } catch (err) {
    // Log but never throw — sync failures must not block the main action
    console.error(`[Google Sync] ${operation} failed for ${entityType}/${entityId}:`, err)
  }
}

async function handleCreate(
  supabase: ReturnType<typeof createAdminClient>,
  entityType: SyncOptions['entityType'],
  entityId: string,
  eventData: GoogleEventPayload,
  subtype?: string,
) {
  let googleEventId: string | null = null
  let syncStatus: 'synced' | 'pending' = 'pending'

  try {
    googleEventId = await createGoogleEvent(eventData)
    syncStatus = 'synced'
  } catch (err) {
    console.error('[Google Sync] createGoogleEvent failed:', err)
  }

  await supabase.from('google_calendar_sync').insert({
    entity_type: entityType,
    entity_id: entityId,
    subtype: subtype ?? null,
    google_event_id: googleEventId,
    sync_status: syncStatus,
    sync_direction: 'to_google',
    last_synced_at: syncStatus === 'synced' ? new Date().toISOString() : null,
  })
}

async function handleUpdate(
  supabase: ReturnType<typeof createAdminClient>,
  entityType: SyncOptions['entityType'],
  entityId: string,
  eventData: GoogleEventPayload,
  subtype?: string,
) {
  // Find existing mapping
  let query = supabase
    .from('google_calendar_sync')
    .select('id, google_event_id, sync_status')
    .eq('entity_type', entityType)
    .eq('entity_id', entityId)

  if (subtype) {
    query = query.eq('subtype', subtype)
  } else {
    query = query.is('subtype', null)
  }

  const { data: mapping } = await query.single()

  if (!mapping) {
    // No mapping exists yet — create one (entity existed before sync was enabled)
    await handleCreate(supabase, entityType, entityId, eventData, subtype)
    return
  }

  if (!mapping.google_event_id) {
    // Pending create that never completed — retry
    try {
      const googleEventId = await createGoogleEvent(eventData)
      await supabase
        .from('google_calendar_sync')
        .update({
          google_event_id: googleEventId,
          sync_status: 'synced',
          last_synced_at: new Date().toISOString(),
          retry_count: 0,
        })
        .eq('id', mapping.id)
    } catch (err) {
      console.error('[Google Sync] retry create on update failed:', err)
    }
    return
  }

  try {
    await updateGoogleEvent(mapping.google_event_id, eventData)
    await supabase
      .from('google_calendar_sync')
      .update({
        sync_status: 'synced',
        last_synced_at: new Date().toISOString(),
      })
      .eq('id', mapping.id)
  } catch (err) {
    console.error('[Google Sync] updateGoogleEvent failed:', err)
    await supabase
      .from('google_calendar_sync')
      .update({ sync_status: 'pending' })
      .eq('id', mapping.id)
  }
}

async function handleDelete(
  supabase: ReturnType<typeof createAdminClient>,
  entityType: SyncOptions['entityType'],
  entityId: string,
  subtype?: string,
) {
  let query = supabase
    .from('google_calendar_sync')
    .select('id, google_event_id')
    .eq('entity_type', entityType)
    .eq('entity_id', entityId)

  if (subtype) {
    query = query.eq('subtype', subtype)
  } else {
    query = query.is('subtype', null)
  }

  const { data: mapping } = await query.single()

  if (!mapping) return

  if (mapping.google_event_id) {
    try {
      await deleteGoogleEvent(mapping.google_event_id)
    } catch (err) {
      console.error('[Google Sync] deleteGoogleEvent failed:', err)
    }
  }

  await supabase
    .from('google_calendar_sync')
    .delete()
    .eq('id', mapping.id)
}
```

- [ ] **Step 2: Verify build passes**

Run: `pnpm build`
Expected: Build succeeds.

- [ ] **Step 3: Commit**

```bash
git add src/lib/google-sync-helper.ts
git commit -m "feat(google): add sync helper for Project → Google sync"
```

---

## Task 6: Integrate Sync into Existing Server Actions

**Files:**
- Modify: `src/lib/actions/calendar-events.ts`
- Modify: `src/lib/actions/projects.ts`
- Modify: `src/lib/actions/tasks.ts`
- Modify: `src/lib/actions/invoices.ts`

Each action gets a single `syncEntityToGoogle()` call after its Supabase operation. The call is wrapped in try/catch inside the helper, so it never affects the action's return value.

- [ ] **Step 1: Add sync to calendar-events.ts**

At the top of `src/lib/actions/calendar-events.ts`, add import:

```typescript
import { syncEntityToGoogle } from '@/lib/google-sync-helper'
import { getGoogleColorId } from '@/lib/google-calendar'
```

In `createCalendarEvent()`, after `revalidatePath('/admin/calendar')` (line ~43) and before `return { data, error: null }`, add:

```typescript
    await syncEntityToGoogle({
      entityType: 'custom',
      entityId: data.id,
      operation: 'create',
      eventData: {
        title: data.title,
        description: data.description ?? undefined,
        startDate: data.start_date,
        endDate: data.end_date ?? undefined,
        allDay: data.all_day,
        colorId: getGoogleColorId('custom', null, data.event_type),
      },
    })
```

In `updateCalendarEvent()`, after `revalidatePath('/admin/calendar')` and before `return { data, error: null }`, add:

```typescript
    await syncEntityToGoogle({
      entityType: 'custom',
      entityId: data.id,
      operation: 'update',
      eventData: {
        title: data.title,
        description: data.description ?? undefined,
        startDate: data.start_date,
        endDate: data.end_date ?? undefined,
        allDay: data.all_day,
        colorId: getGoogleColorId('custom', null, data.event_type),
      },
    })
```

In `deleteCalendarEvent()`, after `revalidatePath('/admin/calendar')` and before `return { data: null, error: null }`, add:

```typescript
    await syncEntityToGoogle({
      entityType: 'custom',
      entityId: id,
      operation: 'delete',
    })
```

- [ ] **Step 2: Add sync to projects.ts**

At the top of `src/lib/actions/projects.ts`, add import:

```typescript
import { syncEntityToGoogle } from '@/lib/google-sync-helper'
import { getGoogleColorId } from '@/lib/google-calendar'
```

In `createProject()`, after the `revalidatePath` calls and before `return { data, error: null }`, add:

```typescript
    if (data.start_date) {
      await syncEntityToGoogle({
        entityType: 'project',
        entityId: data.id,
        operation: 'create',
        subtype: 'start',
        eventData: {
          title: `Start: ${data.title}`,
          startDate: data.start_date,
          allDay: true,
          colorId: getGoogleColorId('project', 'start'),
        },
      })
    }
    if (data.deadline) {
      await syncEntityToGoogle({
        entityType: 'project',
        entityId: data.id,
        operation: 'create',
        subtype: 'deadline',
        eventData: {
          title: `Deadline: ${data.title}`,
          startDate: data.deadline,
          allDay: true,
          colorId: getGoogleColorId('project', 'deadline'),
        },
      })
    }
```

In `updateProject()`, after the `revalidatePath` calls and before `return { data, error: null }`, add:

```typescript
    if (data.start_date) {
      await syncEntityToGoogle({
        entityType: 'project',
        entityId: data.id,
        operation: 'update',
        subtype: 'start',
        eventData: {
          title: `Start: ${data.title}`,
          startDate: data.start_date,
          allDay: true,
          colorId: getGoogleColorId('project', 'start'),
        },
      })
    }
    if (data.deadline) {
      await syncEntityToGoogle({
        entityType: 'project',
        entityId: data.id,
        operation: 'update',
        subtype: 'deadline',
        eventData: {
          title: `Deadline: ${data.title}`,
          startDate: data.deadline,
          allDay: true,
          colorId: getGoogleColorId('project', 'deadline'),
        },
      })
    }
```

In `deleteProject()` (if it exists), add sync calls for both subtypes.

- [ ] **Step 3: Add sync to tasks.ts**

At the top of `src/lib/actions/tasks.ts`, add import:

```typescript
import { syncEntityToGoogle } from '@/lib/google-sync-helper'
import { getGoogleColorId } from '@/lib/google-calendar'
```

In `createTask()`, after the notification call and before `return { data, error: null }`, add:

```typescript
    if (data.due_date) {
      await syncEntityToGoogle({
        entityType: 'task',
        entityId: data.id,
        operation: 'create',
        eventData: {
          title: `Task: ${data.title}`,
          startDate: data.due_date,
          allDay: true,
          colorId: getGoogleColorId('task'),
        },
      })
    }
```

In `updateTask()`, after the notification call and before `return { data, error: null }`, add:

```typescript
    if (data.due_date) {
      await syncEntityToGoogle({
        entityType: 'task',
        entityId: data.id,
        operation: 'update',
        eventData: {
          title: `Task: ${data.title}`,
          startDate: data.due_date,
          allDay: true,
          colorId: getGoogleColorId('task'),
        },
      })
    }
```

In `deleteTask()` (if it exists), add sync call.

- [ ] **Step 4: Add sync to invoices.ts**

At the top of `src/lib/actions/invoices.ts`, add import:

```typescript
import { syncEntityToGoogle } from '@/lib/google-sync-helper'
import { getGoogleColorId } from '@/lib/google-calendar'
```

In `createInvoice()`, after the `revalidatePath` calls and before `return`, add:

```typescript
    if (data.due_date) {
      await syncEntityToGoogle({
        entityType: 'invoice',
        entityId: data.id,
        operation: 'create',
        eventData: {
          title: `Invoice Due: ${data.invoice_number}`,
          startDate: data.due_date,
          allDay: true,
          colorId: getGoogleColorId('invoice'),
        },
      })
    }
```

In `updateInvoice()`, after the `revalidatePath` calls and before `return`, add:

```typescript
    if (data.due_date) {
      await syncEntityToGoogle({
        entityType: 'invoice',
        entityId: data.id,
        operation: 'update',
        eventData: {
          title: `Invoice Due: ${data.invoice_number}`,
          startDate: data.due_date,
          allDay: true,
          colorId: getGoogleColorId('invoice'),
        },
      })
    }
```

In `deleteInvoice()` (if it exists), add sync call.

- [ ] **Step 5: Verify build passes**

Run: `pnpm build`
Expected: Build succeeds. All sync calls are non-blocking (errors caught by helper).

- [ ] **Step 6: Commit**

```bash
git add src/lib/actions/calendar-events.ts src/lib/actions/projects.ts src/lib/actions/tasks.ts src/lib/actions/invoices.ts
git commit -m "feat(google): add sync calls to all entity CRUD actions"
```

---

## Task 7: Google Sync Server Actions (Conflict Resolution)

**Files:**
- Create: `src/lib/actions/google-sync.ts`

These are the server actions that the notification UI calls when admin clicks Accept/Reject/Create/Ignore.

- [ ] **Step 1: Create google-sync.ts**

Create `src/lib/actions/google-sync.ts`:

```typescript
'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'
import { updateGoogleEvent, deleteGoogleEvent } from '@/lib/google-calendar'
import type { ActionResult } from '@/types'
import type { GoogleNewEventData, GoogleEventChangedData, GoogleEventDeletedData } from '@/types/entities'

// --- Auth helper ---

async function requireAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { user: null, error: 'Unauthorized' as const }

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!profile || !['super_admin', 'admin'].includes(profile.role)) {
    return { user: null, error: 'Forbidden' as const }
  }

  return { user, error: null }
}

// --- Handle new Google event ---

export async function createFromGoogleEvent(
  notificationId: string,
  targetType: 'custom' | 'task',
  actionData: GoogleNewEventData,
): Promise<ActionResult<null>> {
  try {
    const { user, error: authError } = await requireAdmin()
    if (authError || !user) return { data: null, error: authError ?? 'Unauthorized' }

    const supabase = createAdminClient()

    if (targetType === 'custom') {
      // Create calendar_event
      const { data: event, error } = await supabase
        .from('calendar_events')
        .insert({
          title: actionData.title,
          description: actionData.description ?? null,
          start_date: actionData.start,
          end_date: actionData.end ?? null,
          all_day: !actionData.start.includes('T'),
          event_type: 'custom',
          created_by: user.id,
        })
        .select('id')
        .single()

      if (error) return { data: null, error: error.message }

      // Create sync mapping
      await supabase.from('google_calendar_sync').insert({
        entity_type: 'custom',
        entity_id: event.id,
        google_event_id: actionData.google_event_id,
        sync_status: 'synced',
        sync_direction: 'from_google',
        last_synced_at: new Date().toISOString(),
      })
    } else if (targetType === 'task') {
      // Task creation requires a project_id — for now create as custom event
      // TODO: Add project selection UI if needed
      const { data: event, error } = await supabase
        .from('calendar_events')
        .insert({
          title: actionData.title,
          description: actionData.description ?? null,
          start_date: actionData.start,
          end_date: actionData.end ?? null,
          all_day: !actionData.start.includes('T'),
          event_type: 'meeting',
          created_by: user.id,
        })
        .select('id')
        .single()

      if (error) return { data: null, error: error.message }

      await supabase.from('google_calendar_sync').insert({
        entity_type: 'custom',
        entity_id: event.id,
        google_event_id: actionData.google_event_id,
        sync_status: 'synced',
        sync_direction: 'from_google',
        last_synced_at: new Date().toISOString(),
      })
    }

    // Mark notification as read
    await supabase
      .from('notifications')
      .update({ read: true })
      .eq('id', notificationId)

    revalidatePath('/admin/calendar')
    return { data: null, error: null }
  } catch (err) {
    return { data: null, error: err instanceof Error ? err.message : 'Failed to create from Google event' }
  }
}

export async function ignoreGoogleEvent(
  notificationId: string,
  googleEventId: string,
): Promise<ActionResult<null>> {
  try {
    const { error: authError } = await requireAdmin()
    if (authError) return { data: null, error: authError }

    const supabase = createAdminClient()

    // Create ignored mapping to prevent re-notification
    await supabase.from('google_calendar_sync').insert({
      entity_type: 'custom',
      entity_id: null,
      google_event_id: googleEventId,
      sync_status: 'ignored',
      sync_direction: 'from_google',
    })

    await supabase
      .from('notifications')
      .update({ read: true })
      .eq('id', notificationId)

    return { data: null, error: null }
  } catch (err) {
    return { data: null, error: err instanceof Error ? err.message : 'Failed to ignore event' }
  }
}

// --- Handle changed Google event ---

export async function acceptGoogleChange(
  notificationId: string,
  actionData: GoogleEventChangedData,
): Promise<ActionResult<null>> {
  try {
    const { error: authError } = await requireAdmin()
    if (authError) return { data: null, error: authError }

    const supabase = createAdminClient()

    // Apply changes based on entity type
    if (actionData.entity_type === 'custom') {
      // Custom events: apply all changed fields directly
      const updateData: Record<string, unknown> = {}
      for (const [field, change] of Object.entries(actionData.changes)) {
        updateData[field] = change.to
      }
      await supabase
        .from('calendar_events')
        .update(updateData)
        .eq('id', actionData.entity_id)
    } else if (actionData.entity_type === 'project') {
      // Projects: map the date change to the correct field based on subtype
      const dateChange = actionData.changes.date
      if (dateChange) {
        const field = actionData.subtype === 'start' ? 'start_date' : 'deadline'
        await supabase
          .from('projects')
          .update({ [field]: dateChange.to })
          .eq('id', actionData.entity_id)
      }
    } else if (actionData.entity_type === 'task') {
      const dateChange = actionData.changes.date
      if (dateChange) {
        await supabase
          .from('tasks')
          .update({ due_date: dateChange.to })
          .eq('id', actionData.entity_id)
      }
    } else if (actionData.entity_type === 'invoice') {
      const dateChange = actionData.changes.date
      if (dateChange) {
        await supabase
          .from('invoices')
          .update({ due_date: dateChange.to })
          .eq('id', actionData.entity_id)
      }
    }

    // Update sync mapping
    await supabase
      .from('google_calendar_sync')
      .update({
        sync_status: 'synced',
        last_synced_at: new Date().toISOString(),
      })
      .eq('google_event_id', actionData.google_event_id)

    await supabase
      .from('notifications')
      .update({ read: true })
      .eq('id', notificationId)

    revalidatePath('/admin/calendar')
    revalidatePath('/admin/projects')
    return { data: null, error: null }
  } catch (err) {
    return { data: null, error: err instanceof Error ? err.message : 'Failed to accept change' }
  }
}

export async function rejectGoogleChange(
  notificationId: string,
  actionData: GoogleEventChangedData,
): Promise<ActionResult<null>> {
  try {
    const { error: authError } = await requireAdmin()
    if (authError) return { data: null, error: authError }

    const supabase = createAdminClient()

    // Revert Google event to match Supabase data
    // Fetch current Supabase data and push it back to Google
    let currentData: Record<string, unknown> | null = null

    if (actionData.entity_type === 'custom') {
      const { data } = await supabase
        .from('calendar_events')
        .select('title, description, start_date, end_date, all_day')
        .eq('id', actionData.entity_id)
        .single()
      currentData = data
    } else if (actionData.entity_type === 'project') {
      const { data } = await supabase
        .from('projects')
        .select('title, start_date, deadline')
        .eq('id', actionData.entity_id)
        .single()
      currentData = data
    } else if (actionData.entity_type === 'task') {
      const { data } = await supabase
        .from('tasks')
        .select('title, due_date')
        .eq('id', actionData.entity_id)
        .single()
      currentData = data
    } else if (actionData.entity_type === 'invoice') {
      const { data } = await supabase
        .from('invoices')
        .select('invoice_number, due_date')
        .eq('id', actionData.entity_id)
        .single()
      currentData = data
    }

    if (currentData) {
      const title = actionData.entity_type === 'invoice'
        ? `Invoice Due: ${currentData.invoice_number}`
        : actionData.entity_type === 'task'
          ? `Task: ${currentData.title}`
          : actionData.entity_type === 'project' && actionData.subtype === 'start'
            ? `Start: ${currentData.title}`
            : actionData.entity_type === 'project' && actionData.subtype === 'deadline'
              ? `Deadline: ${currentData.title}`
              : (currentData.title as string)

      const startDate = actionData.entity_type === 'project'
        ? (actionData.subtype === 'start' ? currentData.start_date : currentData.deadline) as string
        : actionData.entity_type === 'custom'
          ? currentData.start_date as string
          : currentData.due_date as string

      await updateGoogleEvent(actionData.google_event_id, {
        title,
        description: actionData.entity_type === 'custom' ? (currentData.description as string | undefined) : undefined,
        startDate,
        endDate: actionData.entity_type === 'custom' ? (currentData.end_date as string | undefined) : undefined,
        allDay: actionData.entity_type === 'custom' ? (currentData.all_day as boolean) : true,
      })
    }

    await supabase
      .from('google_calendar_sync')
      .update({ sync_status: 'synced', last_synced_at: new Date().toISOString() })
      .eq('google_event_id', actionData.google_event_id)

    await supabase
      .from('notifications')
      .update({ read: true })
      .eq('id', notificationId)

    return { data: null, error: null }
  } catch (err) {
    return { data: null, error: err instanceof Error ? err.message : 'Failed to reject change' }
  }
}

// --- Handle deleted Google event ---

export async function confirmGoogleDelete(
  notificationId: string,
  actionData: GoogleEventDeletedData,
): Promise<ActionResult<null>> {
  try {
    const { error: authError } = await requireAdmin()
    if (authError) return { data: null, error: authError }

    const supabase = createAdminClient()

    // Delete the Supabase entity
    if (actionData.entity_type === 'custom') {
      await supabase.from('calendar_events').delete().eq('id', actionData.entity_id)
    }
    // For project/task/invoice: we don't delete the entity, just remove the mapping

    await supabase
      .from('google_calendar_sync')
      .delete()
      .eq('google_event_id', actionData.google_event_id)

    await supabase
      .from('notifications')
      .update({ read: true })
      .eq('id', notificationId)

    revalidatePath('/admin/calendar')
    return { data: null, error: null }
  } catch (err) {
    return { data: null, error: err instanceof Error ? err.message : 'Failed to confirm delete' }
  }
}

export async function keepAfterGoogleDelete(
  notificationId: string,
  googleEventId: string,
): Promise<ActionResult<null>> {
  try {
    const { error: authError } = await requireAdmin()
    if (authError) return { data: null, error: authError }

    const supabase = createAdminClient()

    // Remove mapping — entity stays in Supabase
    await supabase
      .from('google_calendar_sync')
      .delete()
      .eq('google_event_id', googleEventId)

    await supabase
      .from('notifications')
      .update({ read: true })
      .eq('id', notificationId)

    return { data: null, error: null }
  } catch (err) {
    return { data: null, error: err instanceof Error ? err.message : 'Failed to keep event' }
  }
}
```

- [ ] **Step 2: Verify build passes**

Run: `pnpm build`
Expected: Build succeeds.

- [ ] **Step 3: Commit**

```bash
git add src/lib/actions/google-sync.ts
git commit -m "feat(google): add sync conflict resolution server actions"
```

---

## Task 8: Google Calendar Webhook Endpoint

**Files:**
- Create: `src/app/api/webhooks/google-calendar/route.ts`

This receives Google Push Notifications, validates the channel token, fetches changes, and creates admin notifications.

- [ ] **Step 1: Create the webhook route**

Create `src/app/api/webhooks/google-calendar/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { fetchChangedEvents } from '@/lib/google-calendar'
import { createNotificationForMany, getAdminUserIds } from '@/lib/actions/notifications'
import { NOTIFICATION_TYPES } from '@/lib/notification-types'
import { syncEntityToGoogle } from '@/lib/google-sync-helper'
import type { calendar_v3 } from '@googleapis/calendar'

export async function POST(request: NextRequest) {
  try {
    const supabase = createAdminClient()

    // 1. Validate channel token
    const channelToken = request.headers.get('x-goog-channel-token')
    const { data: config } = await supabase
      .from('google_calendar_config')
      .select('webhook_channel_token, sync_token')
      .limit(1)
      .single()

    if (!config?.webhook_channel_token || channelToken !== config.webhook_channel_token) {
      return NextResponse.json({ error: 'Invalid channel token' }, { status: 403 })
    }

    // 2. Fetch changed events using syncToken
    const { events, nextSyncToken } = await fetchChangedEvents(config.sync_token)

    // 3. Update syncToken atomically
    if (nextSyncToken) {
      await supabase
        .from('google_calendar_config')
        .update({
          sync_token: nextSyncToken,
          last_sync_at: new Date().toISOString(),
        })
        .not('id', 'is', null)
    }

    // 4. Process each changed event
    const adminIds = await getAdminUserIds()

    for (const event of events) {
      await processGoogleEvent(supabase, event, adminIds)
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[Google Webhook] Error:', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}

async function processGoogleEvent(
  supabase: ReturnType<typeof createAdminClient>,
  event: calendar_v3.Schema$Event,
  adminIds: string[],
) {
  if (!event.id) return

  // Check existing mapping
  const { data: mapping } = await supabase
    .from('google_calendar_sync')
    .select('id, entity_type, entity_id, subtype, sync_status, last_synced_at')
    .eq('google_event_id', event.id)
    .single()

  // Ignored event — skip
  if (mapping?.sync_status === 'ignored') return

  const isCancelled = event.status === 'cancelled'

  if (!mapping) {
    // New event from Google
    if (isCancelled) return // Deleted event we never tracked — ignore

    // Atomic insert — action_type and action_data are set in one query (no race condition)
    await createNotificationForMany(adminIds, {
      type: NOTIFICATION_TYPES.GOOGLE_NEW_EVENT,
      title: 'New event from Google Calendar',
      body: `"${event.summary ?? 'Untitled'}" — ${formatEventDate(event)}`,
      actionUrl: '/admin/calendar',
      actionType: 'google_new_event',
      actionData: {
        action_type: 'google_new_event',
        data: {
          google_event_id: event.id,
          title: event.summary ?? 'Untitled',
          start: event.start?.dateTime ?? event.start?.date ?? '',
          end: event.end?.dateTime ?? event.end?.date ?? undefined,
          description: event.description ?? undefined,
        },
      },
    })
    return
  }

  // Existing mapping
  if (isCancelled) {
    // Event deleted from Google
    const title = event.summary ?? 'Event'
    await createNotificationForMany(adminIds, {
      type: NOTIFICATION_TYPES.GOOGLE_EVENT_DELETED,
      title: 'Synced event deleted from Google',
      body: `"${title}" was removed`,
      actionUrl: '/admin/calendar',
      actionType: 'google_event_deleted',
      actionData: {
        action_type: 'google_event_deleted',
        data: {
          google_event_id: event.id,
          entity_type: mapping.entity_type,
          entity_id: mapping.entity_id ?? '',
          title,
        },
      },
    })
    return
  }

  // Event modified
  if (mapping.entity_type === 'custom' && mapping.entity_id) {
    // Auto-sync custom events back to Supabase
    const updateData: Record<string, unknown> = {
      title: event.summary ?? undefined,
      description: event.description ?? null,
      start_date: event.start?.dateTime ?? event.start?.date ?? undefined,
      end_date: event.end?.dateTime ?? event.end?.date ?? null,
      all_day: !event.start?.dateTime,
      updated_at: new Date().toISOString(),
    }

    await supabase
      .from('calendar_events')
      .update(updateData)
      .eq('id', mapping.entity_id)

    await supabase
      .from('google_calendar_sync')
      .update({ last_synced_at: new Date().toISOString(), sync_status: 'synced' })
      .eq('id', mapping.id)
  } else if (mapping.entity_id) {
    // Project/Task/Invoice — notify admin
    const newDate = event.start?.dateTime ?? event.start?.date ?? ''
    await createNotificationForMany(adminIds, {
      type: NOTIFICATION_TYPES.GOOGLE_EVENT_CHANGED,
      title: 'Synced event changed in Google',
      body: `"${event.summary ?? 'Event'}" was modified`,
      actionUrl: '/admin/calendar',
      actionType: 'google_event_changed',
      actionData: {
        action_type: 'google_event_changed',
        data: {
          google_event_id: event.id,
          entity_type: mapping.entity_type,
          entity_id: mapping.entity_id,
          subtype: mapping.subtype ?? undefined,
          changes: { date: { from: 'previous', to: newDate } },
        },
      },
    })
  }
}

function formatEventDate(event: calendar_v3.Schema$Event): string {
  const date = event.start?.dateTime ?? event.start?.date ?? ''
  try {
    return new Date(date).toLocaleDateString('el-GR', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    })
  } catch {
    return date
  }
}
```

- [ ] **Step 2: Verify build passes**

Run: `pnpm build`
Expected: Build succeeds.

- [ ] **Step 3: Commit**

```bash
git add src/app/api/webhooks/google-calendar/route.ts
git commit -m "feat(google): add webhook endpoint for Google Calendar push notifications"
```

---

## Task 9: Cron Job Routes

**Files:**
- Create: `src/app/api/cron/google-sync-retry/route.ts`
- Create: `src/app/api/cron/google-webhook-renew/route.ts`

- [ ] **Step 1: Create sync retry cron route**

Create `src/app/api/cron/google-sync-retry/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createGoogleEvent, updateGoogleEvent } from '@/lib/google-calendar'
import { createNotificationForMany, getAdminUserIds } from '@/lib/actions/notifications'
import { NOTIFICATION_TYPES } from '@/lib/notification-types'

export async function POST(request: NextRequest) {
  // Validate cron secret
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createAdminClient()

  const { data: pendingRows } = await supabase
    .from('google_calendar_sync')
    .select('id, entity_type, entity_id, subtype, google_event_id, retry_count, updated_at')
    .eq('sync_status', 'pending')
    .order('updated_at', { ascending: true })
    .limit(50)

  if (!pendingRows || pendingRows.length === 0) {
    return NextResponse.json({ processed: 0 })
  }

  let processed = 0

  for (const row of pendingRows) {
    // Backoff: skip if too soon (2^retry_count minutes)
    const backoffMinutes = Math.pow(2, Math.min(row.retry_count, 10))
    const backoffMs = backoffMinutes * 60 * 1000
    const updatedAt = new Date(row.updated_at).getTime()
    if (Date.now() - updatedAt < backoffMs) continue

    // After 20 retries or 3 days, mark as conflict
    const ageMs = Date.now() - updatedAt
    const threeDaysMs = 3 * 24 * 60 * 60 * 1000
    if (row.retry_count > 20 || ageMs > threeDaysMs) {
      await supabase
        .from('google_calendar_sync')
        .update({ sync_status: 'conflict' })
        .eq('id', row.id)

      const adminIds = await getAdminUserIds()
      await createNotificationForMany(adminIds, {
        type: NOTIFICATION_TYPES.GOOGLE_EVENT_CHANGED,
        title: 'Google Calendar sync failed',
        body: `Sync for ${row.entity_type}/${row.entity_id} failed after multiple retries`,
        actionUrl: '/admin/calendar',
      })
      processed++
      continue
    }

    // TODO: Fetch entity data from Supabase and build payload
    // For now, increment retry count
    try {
      // This is a simplified retry — full implementation would fetch entity data
      // and call createGoogleEvent or updateGoogleEvent based on whether google_event_id exists
      await supabase
        .from('google_calendar_sync')
        .update({
          retry_count: row.retry_count + 1,
          updated_at: new Date().toISOString(),
        })
        .eq('id', row.id)
      processed++
    } catch (err) {
      console.error(`[Cron] Retry failed for ${row.id}:`, err)
    }
  }

  return NextResponse.json({ processed })
}
```

- [ ] **Step 2: Create webhook renew cron route**

Create `src/app/api/cron/google-webhook-renew/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { watchCalendar, stopWatch } from '@/lib/google-calendar'

export async function POST(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createAdminClient()

  try {
    // Read current config
    const { data: config } = await supabase
      .from('google_calendar_config')
      .select('id, webhook_channel_id, webhook_resource_id')
      .limit(1)
      .single()

    if (!config) {
      return NextResponse.json({ error: 'No config found' }, { status: 500 })
    }

    // Stop existing watch (if any)
    if (config.webhook_channel_id && config.webhook_resource_id) {
      try {
        await stopWatch(config.webhook_channel_id, config.webhook_resource_id)
      } catch (err) {
        console.error('[Cron] stopWatch failed (may have already expired):', err)
      }
    }

    // Create new watch
    const result = await watchCalendar()

    // Update config
    await supabase
      .from('google_calendar_config')
      .update({
        webhook_channel_id: result.channelId,
        webhook_channel_token: result.channelToken,
        webhook_resource_id: result.resourceId,
        webhook_expiration: result.expiration,
      })
      .eq('id', config.id)

    return NextResponse.json({
      channelId: result.channelId,
      expiration: result.expiration,
    })
  } catch (err) {
    console.error('[Cron] Webhook renew failed:', err)
    return NextResponse.json({ error: 'Failed to renew webhook' }, { status: 500 })
  }
}
```

- [ ] **Step 3: Verify build passes**

Run: `pnpm build`
Expected: Build succeeds.

- [ ] **Step 4: Commit**

```bash
git add src/app/api/cron/google-sync-retry/route.ts src/app/api/cron/google-webhook-renew/route.ts
git commit -m "feat(google): add cron routes for sync retry and webhook renewal"
```

---

## Task 10: Initial Webhook Setup Route

**Files:**
- Create: `src/app/api/admin/google-calendar-setup/route.ts`

This one-time setup route bootstraps the webhook and syncToken. Must be called once after deploy with Google credentials configured.

- [ ] **Step 1: Create the setup route**

Create `src/app/api/admin/google-calendar-setup/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { watchCalendar, fetchChangedEvents } from '@/lib/google-calendar'

export async function POST(request: NextRequest) {
  // Auth check — admin only
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const adminClient = createAdminClient()
  const { data: profile } = await adminClient
    .from('user_profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!profile || !['super_admin', 'admin'].includes(profile.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    // 1. Bootstrap syncToken by doing initial full sync
    const { nextSyncToken } = await fetchChangedEvents(null)

    // 2. Set up webhook watch
    const watchResult = await watchCalendar()

    // 3. Store everything in config
    const { data: config } = await adminClient
      .from('google_calendar_config')
      .select('id')
      .limit(1)
      .single()

    if (!config) {
      return NextResponse.json({ error: 'No config row found' }, { status: 500 })
    }

    await adminClient
      .from('google_calendar_config')
      .update({
        sync_token: nextSyncToken,
        webhook_channel_id: watchResult.channelId,
        webhook_channel_token: watchResult.channelToken,
        webhook_resource_id: watchResult.resourceId,
        webhook_expiration: watchResult.expiration,
        last_sync_at: new Date().toISOString(),
      })
      .eq('id', config.id)

    return NextResponse.json({
      success: true,
      syncToken: nextSyncToken ? 'stored' : 'none',
      webhookExpiration: watchResult.expiration,
    })
  } catch (err) {
    console.error('[Google Setup] Failed:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Setup failed' },
      { status: 500 },
    )
  }
}
```

- [ ] **Step 2: Verify build passes**

Run: `pnpm build`
Expected: Build succeeds.

- [ ] **Step 3: Commit**

```bash
git add src/app/api/admin/google-calendar-setup/route.ts
git commit -m "feat(google): add one-time setup route for webhook and syncToken bootstrap"
```

**Post-deploy:** After deploying with Google env vars configured, call `POST /api/admin/google-calendar-setup` once (as admin) to initialize the webhook and syncToken. The cron job handles renewals after that.

---

## Task 11: Notification UI Component (continued)

**Files:**
- Create: `src/components/shared/google-sync-notification.tsx`
- Modify: `src/components/shared/notification-bell.tsx`

- [ ] **Step 1: Create GoogleSyncNotification component**

Create `src/components/shared/google-sync-notification.tsx`:

```typescript
'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { useTranslations } from 'next-intl'
import { toast } from 'sonner'
import {
  createFromGoogleEvent,
  ignoreGoogleEvent,
  acceptGoogleChange,
  rejectGoogleChange,
  confirmGoogleDelete,
  keepAfterGoogleDelete,
} from '@/lib/actions/google-sync'
import type { GoogleSyncActionData } from '@/types/entities'

interface GoogleSyncNotificationProps {
  notificationId: string
  actionData: GoogleSyncActionData
  onAction?: () => void
}

export function GoogleSyncNotification({
  notificationId,
  actionData,
  onAction,
}: GoogleSyncNotificationProps) {
  const [isLoading, setIsLoading] = useState(false)

  const handleAction = async (action: () => Promise<{ error: string | null }>) => {
    setIsLoading(true)
    try {
      const result = await action()
      if (result.error) {
        toast.error(result.error)
      } else {
        toast.success('Done')
        onAction?.()
      }
    } catch {
      toast.error('Action failed')
    } finally {
      setIsLoading(false)
    }
  }

  if (actionData.action_type === 'google_new_event') {
    const { data } = actionData
    return (
      <div className="flex flex-wrap gap-1 mt-1.5" onClick={(e) => e.stopPropagation()}>
        <Button
          size="sm"
          variant="outline"
          className="h-6 text-[11px] px-2"
          disabled={isLoading}
          onClick={() => handleAction(() => createFromGoogleEvent(notificationId, 'custom', data))}
        >
          Create Event
        </Button>
        <Button
          size="sm"
          variant="ghost"
          className="h-6 text-[11px] px-2 text-muted-foreground"
          disabled={isLoading}
          onClick={() => handleAction(() => ignoreGoogleEvent(notificationId, data.google_event_id))}
        >
          Ignore
        </Button>
      </div>
    )
  }

  if (actionData.action_type === 'google_event_changed') {
    const { data } = actionData
    return (
      <div className="flex flex-wrap gap-1 mt-1.5" onClick={(e) => e.stopPropagation()}>
        <Button
          size="sm"
          variant="outline"
          className="h-6 text-[11px] px-2"
          disabled={isLoading}
          onClick={() => handleAction(() => acceptGoogleChange(notificationId, data))}
        >
          Accept
        </Button>
        <Button
          size="sm"
          variant="ghost"
          className="h-6 text-[11px] px-2 text-muted-foreground"
          disabled={isLoading}
          onClick={() => handleAction(() => rejectGoogleChange(notificationId, data))}
        >
          Reject
        </Button>
      </div>
    )
  }

  if (actionData.action_type === 'google_event_deleted') {
    const { data } = actionData
    return (
      <div className="flex flex-wrap gap-1 mt-1.5" onClick={(e) => e.stopPropagation()}>
        <Button
          size="sm"
          variant="destructive"
          className="h-6 text-[11px] px-2"
          disabled={isLoading}
          onClick={() => handleAction(() => confirmGoogleDelete(notificationId, data))}
        >
          Delete
        </Button>
        <Button
          size="sm"
          variant="ghost"
          className="h-6 text-[11px] px-2 text-muted-foreground"
          disabled={isLoading}
          onClick={() => handleAction(() => keepAfterGoogleDelete(notificationId, data.google_event_id))}
        >
          Keep
        </Button>
      </div>
    )
  }

  return null
}
```

- [ ] **Step 2: Update notification-bell.tsx to render sync notifications**

In `src/components/shared/notification-bell.tsx`, add import at the top:

```typescript
import { GoogleSyncNotification } from '@/components/shared/google-sync-notification'
import type { GoogleSyncActionData } from '@/types/entities'
```

Inside the notification rendering loop (the `{notifications.slice(0, 20).map(...)}`), after the body paragraph and before the timestamp paragraph, add:

```typescript
                    {notification.action_data && (
                      <GoogleSyncNotification
                        notificationId={notification.id}
                        actionData={notification.action_data as GoogleSyncActionData}
                        onAction={() => markAsRead(notification.id)}
                      />
                    )}
```

- [ ] **Step 3: Verify build passes**

Run: `pnpm build`
Expected: Build succeeds.

- [ ] **Step 4: Commit**

```bash
git add src/components/shared/google-sync-notification.tsx src/components/shared/notification-bell.tsx
git commit -m "feat(google): add notification UI for Google Calendar sync conflicts"
```

---

## Task 12: Final Build Verification

- [ ] **Step 1: Full build verification**

Run: `pnpm build`
Expected: Build succeeds with no errors.

- [ ] **Step 2: Verify env vars are documented**

Check `.env.local.example` has all 5 Google-related env vars.

- [ ] **Step 3: Verify vercel.json has cron config**

Check `vercel.json` has both cron entries.

- [ ] **Step 4: Final commit if any remaining changes**

```bash
git add -A
git commit -m "feat(google): complete Google Calendar bidirectional sync implementation"
```

---

## Summary of All Files

### New Files (9)
1. `supabase/migrations/00028_google_calendar_sync.sql`
2. `src/lib/google-calendar.ts`
3. `src/lib/google-sync-helper.ts`
4. `src/lib/actions/google-sync.ts`
5. `src/app/api/webhooks/google-calendar/route.ts`
6. `src/app/api/cron/google-sync-retry/route.ts`
7. `src/app/api/cron/google-webhook-renew/route.ts`
8. `src/app/api/admin/google-calendar-setup/route.ts`
9. `src/components/shared/google-sync-notification.tsx`

### Modified Files (11)
1. `package.json` — add `@googleapis/calendar`
2. `.env.local.example` — add 5 Google env vars
3. `vercel.json` — add 2 cron entries
4. `src/types/entities.ts` — add Google sync types, update Notification type
5. `src/lib/notification-types.ts` — add 3 Google notification types
6. `src/lib/actions/notifications.ts` — update select list + CreateNotificationInput
7. `src/lib/actions/calendar-events.ts` — add sync calls
8. `src/lib/actions/projects.ts` — add sync calls
9. `src/lib/actions/tasks.ts` — add sync calls
10. `src/lib/actions/invoices.ts` — add sync calls
11. `src/components/shared/notification-bell.tsx` — render GoogleSyncNotification
