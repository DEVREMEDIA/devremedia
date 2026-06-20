# "PUSH" means an in-app Notifications log, not browser Web Push

A Client (Angelos) asked to "add PUSH to the dashboard" because notifications were
hard to read. We interpret this as **making in-app Notifications readable**, not as
building OS/browser Web Push. We add a dedicated per-role Notifications page (a full,
filterable, day-grouped log with read/unread state), keep the header bell as a quick
glance, and surface new realtime notifications with a toast. True Web Push
(service worker + VAPID + PWA) is **deliberately deferred**.

## Context

Notifications already work end to end: they are written to the `notifications` table,
delivered in realtime via Supabase `postgres_changes` while the user is in the app, and
shown in a header bell dropdown (`notification-bell.tsx`). Some events also send Email
via Resend.

Angelos's complaint was **not** about delivery — it was about **reading**:

1. The bell dropdown is cramped. When 8-9 notifications arrive together you cannot tell
   them apart.
2. There is no place to see history / "which did I see, which not".
3. Even while inside the app, a new notification only silently bumps the red badge — easy
   to miss.

The word "PUSH" is the trap. It can mean (a) a more visible in-app surface, (b) real
browser/OS Web Push that arrives when the app is closed, or (c) email-first delivery.
We confirmed with Angelos directly: he means (a) — "the functionality is perfect, I just
can't read them; let me click through to a page with a log of what I've seen". There is
no service worker, manifest, or VAPID anywhere in the repo, so reading "PUSH" literally
would have launched a large piece of unrequested infrastructure.

## Decision

- **Interpret "PUSH" as readability, not Web Push.** Build an in-app Notifications log;
  do not build a service worker / VAPID / PWA push pipeline now.
- **Per-role route, one shared component.** `/admin/notifications`,
  `/client/notifications`, `/employee/notifications`, `/salesman/notifications` each render
  a single shared `<NotificationsLog>`. This respects the role-prefixed middleware and the
  per-role layouts/headers, matching the "one core, role adapters" stance of ADR-0004.
  Each user sees only their own notifications (already enforced by RLS + `getMyNotifications`).
- **The page is a full log:** tabs All / Unread, grouping by day (Today / Yesterday /
  Earlier), "Load more" pagination over full history, click-through to `action_url` with
  mark-as-read, and "mark all read". This needs a new paginated server action
  (`getMyNotifications` caps at 50 and does not paginate).
- **Realtime gets a toast.** A new notification arriving while the user is in the app shows
  a discreet, clickable `sonner` toast in addition to the badge. The toast fires from the
  realtime subscription that already lives in the bell's `useNotifications` hook (always
  mounted in the headers), so it is not duplicated by the page.
- **The bell stays** as the quick glance and gains a "See all" footer link to the page.

## Consequences

- A future reader who sees the client literally wrote "PUSH" but finds no service worker
  should read this ADR before "fixing" it: the in-app log was the actual ask.
- Web Push remains available as a later, **additive** phase if a real
  app-closed-delivery need appears. Nothing here blocks it.
- The realtime subscription must stay single-sourced (bell hook) to avoid double toasts /
  double channels once the page also reads notifications.
- `markAsRead` / `markAllAsRead` should also `revalidatePath` the new `/{role}/notifications`
  routes alongside the dashboards they already revalidate.
- Glossary terms added to `CONTEXT.md`: Notification, Email, Web Push — fixing the
  overloaded meaning of "PUSH".
