import { calendar_v3 } from '@googleapis/calendar';
import { JWT } from 'google-auth-library';
import { randomUUID } from 'crypto';

// --- Auth ---

function getAuthClient() {
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const key = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY?.replace(/\\n/g, '\n');

  if (!email || !key) {
    throw new Error('Google Calendar credentials not configured');
  }

  return new JWT({
    email,
    key,
    scopes: ['https://www.googleapis.com/auth/calendar'],
  });
}

function getCalendarClient(): calendar_v3.Calendar {
  return new calendar_v3.Calendar({ auth: getAuthClient() });
}

function getCalendarId(): string {
  const calendarId = process.env.GOOGLE_CALENDAR_ID;
  if (!calendarId) throw new Error('GOOGLE_CALENDAR_ID not configured');
  return calendarId;
}

// --- Color Mapping ---

const ENTITY_COLOR_MAP: Record<string, string> = {
  project_start: '9',
  project_deadline: '11',
  task: '2',
  invoice: '6',
  custom_meeting: '3',
  custom_reminder: '7',
  custom_filming: '9',
  custom_deadline: '11',
  custom_custom: '3',
};

export function getGoogleColorId(
  entityType: string,
  subtype?: string | null,
  eventType?: string | null,
): string {
  if (entityType === 'project' && subtype) {
    return ENTITY_COLOR_MAP[`project_${subtype}`] ?? '9';
  }
  if (entityType === 'custom' && eventType) {
    return ENTITY_COLOR_MAP[`custom_${eventType}`] ?? '3';
  }
  return ENTITY_COLOR_MAP[entityType] ?? '1';
}

// --- Event Payload ---

export interface GoogleEventPayload {
  title: string;
  description?: string;
  startDate: string;
  endDate?: string;
  allDay?: boolean;
  colorId?: string;
}

function buildEventResource(payload: GoogleEventPayload): calendar_v3.Schema$Event {
  const isAllDay = payload.allDay ?? true;
  const event: calendar_v3.Schema$Event = {
    summary: payload.title,
    description: payload.description ?? undefined,
    colorId: payload.colorId ?? undefined,
  };

  if (isAllDay) {
    event.start = { date: payload.startDate.split('T')[0] };
    event.end = { date: (payload.endDate ?? payload.startDate).split('T')[0] };
  } else {
    // Supabase stores proper UTC times. Pass them directly with UTC timezone.
    // Google converts to the calendar's display timezone automatically.
    event.start = { dateTime: payload.startDate, timeZone: 'UTC' };
    event.end = {
      dateTime: payload.endDate ?? payload.startDate,
      timeZone: 'UTC',
    };
  }

  return event;
}

// --- CRUD ---

export async function createGoogleEvent(payload: GoogleEventPayload): Promise<string> {
  const calendar = getCalendarClient();
  const response = await calendar.events.insert({
    calendarId: getCalendarId(),
    requestBody: buildEventResource(payload),
  });
  if (!response.data.id) throw new Error('Google Calendar: event created but no ID returned');
  return response.data.id;
}

export async function updateGoogleEvent(
  googleEventId: string,
  payload: GoogleEventPayload,
): Promise<void> {
  const calendar = getCalendarClient();
  await calendar.events.update({
    calendarId: getCalendarId(),
    eventId: googleEventId,
    requestBody: buildEventResource(payload),
  });
}

export async function deleteGoogleEvent(googleEventId: string): Promise<void> {
  const calendar = getCalendarClient();
  await calendar.events.delete({
    calendarId: getCalendarId(),
    eventId: googleEventId,
  });
}

// --- Incremental Sync ---

export interface GoogleSyncResult {
  events: calendar_v3.Schema$Event[];
  nextSyncToken: string | null;
}

export async function fetchChangedEvents(syncToken?: string | null): Promise<GoogleSyncResult> {
  const calendar = getCalendarClient();

  try {
    const response = await calendar.events.list({
      calendarId: getCalendarId(),
      syncToken: syncToken ?? undefined,
      singleEvents: true,
      maxResults: 250,
    });

    return {
      events: response.data.items ?? [],
      nextSyncToken: response.data.nextSyncToken ?? null,
    };
  } catch (err: unknown) {
    if (err && typeof err === 'object' && 'code' in err && (err as { code: number }).code === 410) {
      const response = await calendar.events.list({
        calendarId: getCalendarId(),
        singleEvents: true,
        maxResults: 2500,
        timeMin: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString(),
      });

      return {
        events: response.data.items ?? [],
        nextSyncToken: response.data.nextSyncToken ?? null,
      };
    }
    throw err;
  }
}

// --- Watch (Push Notifications) ---

export interface WatchResult {
  channelId: string;
  channelToken: string;
  resourceId: string;
  expiration: string;
}

export async function watchCalendar(): Promise<WatchResult> {
  const calendar = getCalendarClient();
  const channelId = randomUUID();
  const channelToken = randomUUID();
  const webhookUrl = process.env.GOOGLE_WEBHOOK_URL;

  if (!webhookUrl) throw new Error('GOOGLE_WEBHOOK_URL not configured');

  const response = await calendar.events.watch({
    calendarId: getCalendarId(),
    requestBody: {
      id: channelId,
      token: channelToken,
      type: 'web_hook',
      address: webhookUrl,
    },
  });

  return {
    channelId,
    channelToken,
    resourceId: response.data.resourceId ?? '',
    expiration: new Date(Number(response.data.expiration)).toISOString(),
  };
}

export async function stopWatch(channelId: string, resourceId: string): Promise<void> {
  const calendar = getCalendarClient();
  await calendar.channels.stop({
    requestBody: {
      id: channelId,
      resourceId,
    },
  });
}
