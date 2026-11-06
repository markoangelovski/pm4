---
id: feat-tlog-desktop-notifications
title: "Desktop notifications for the reminder to log time"
status: approved
owner: Marko Angelovski
last_updated: 2026-11-06
milestone: M4
requirements: [FR-TLOG-021, FR-TLOG-022, SCR-008, SCR-050]
related: [req-time-logs, web-screens, web-static-export, feat-tlog-reminder, feat-shell-pwa, OQ-266, OQ-267]
prototype: 06e1004
---

# Desktop notifications for the reminder to log time

## Goal
With desktop notifications turned on (Settings → User settings, or **Turn on** in the bell), each new step of the reminder to
log time shows a system notification with the system's sound while the user isn't looking at PM4, once across all PM4 tabs;
a click brings PM4 to the front (FR-TLOG-022, SCR-008, SCR-050). Local notifications from the open app only: no Web Push,
no API change.

## Decisions
| # | Decision | Source |
| --- | --- | --- |
| D1 | Local notifications only: shown by the open app (tab or installed app); nothing while PM4 is closed. | OQ-266 (owner, 2026-11-06) |
| D2 | Turned on in a **Desktop notifications** card under User settings and from the bell's **Turn on** (shown while off); the permission is asked on that click. A step is a moment Log time opens by itself; it notifies only while PM4 isn't in focus. A click focuses PM4. System sound only. | OQ-266 (owner), prototype `bb8120d` |
| D3 | On/off lives in `localStorage` (`pm4.desktop-notifications` = `"on"`), per browser like the permission; on = stored `"on"` and permission `granted`. | Agent, prototype `bb8120d`; OQ-266 |
| D4 | A page under a service worker posts a `pm4-notify` message; the worker skips it while any PM4 window is focused and while a notification with the same tag and step key is showing, so one step notifies once across tabs. Without a controller (dev server, prototype) the page shows it with `new Notification`. | OQ-267 (owner, 2026-11-06), prototype `06e1004` |
| D5 | The production files are twins of the prototype's: `@/proto/` → `@/`, then Prettier, so `pm4 twins` reports them equal. | Agent: as feat-tlog-reminder D1 |
| D6 | The worker's notification click focuses the PM4 window whose path starts with `/app`, else the first PM4 window, else opens `/app`. | Agent, from D2 |

## Scope
**In:** the twins of the four prototype files under *Files*; the worker's `message` and `notificationclick` handlers.

**Test step (main session):** writes the four new `*.ac.*` files and the two stubs below, then `pm4 hash`. The existing
`notifications-button.ac.test.tsx` and `user-settings.ac.test.tsx` stay as they are (jsdom has no `Notification`, so the new
code does nothing there).

**Non-goals** (implementers must not touch these):
- `api/`, `web/lib/**`, `web/components/ui/*`, `web/proto/**`, `web/app/**`, `web/scripts/*`.
- The worker's caching (`install`, `activate`, `fetch` and their helpers) and `service-worker-registration.tsx`.
- `features/time/reminder.ts`, `features/system/use-attention.ts`, `features/settings/components/user-settings.tsx`.
- Web Push, an in-page sound, an account-wide (API) setting.

## Read first
| Path | Why / copy this |
| --- | --- |
| `specs/04-web/screens.md` (SCR-008, SCR-050), `specs/04-web/static-export.md#installable-app-and-service-worker-oq-237` | Behavior and copy; the worker's rules |
| `web/proto/features/system/desktop-notifications.ts` | The module the twins copy (state, turn on/off, show, close) |
| `web/sw/service-worker.js` | Where the handlers go (classic script; globals only through `self`) |

## Files
| App | File | C/M | Task | Notes |
| --- | --- | --- | --- | --- |
| web | `web/features/system/desktop-notifications.ac.test.ts` | C | tests | Acceptance tests (AC-1…AC-3) |
| web | `web/features/settings/components/desktop-notifications-settings.ac.test.tsx` | C | tests | Acceptance tests (AC-4) |
| web | `web/features/time/components/notifications-button-desktop.ac.test.tsx` | C | tests | Acceptance tests (AC-5, AC-6) |
| web | `web/sw/service-worker-notifications.ac.test.ts` | C | tests | Acceptance tests (AC-7, AC-8), node environment, the worker against fakes |
| web | `web/features/system/desktop-notifications.ts` | C | tests, T1 | Stub, then the twin |
| web | `web/features/settings/components/desktop-notifications-settings.tsx` | C | tests, T1 | Stub, then the twin |
| web | `web/features/settings/components/settings-view.tsx` | M | T1 | Twin: the card under User settings |
| web | `web/features/time/components/notifications-button.tsx` | M | T1 | Twin: `useReminderNotification`, `DesktopNotificationsOffer` |
| web | `web/sw/service-worker.js` | M | T1 | The `message` and `notificationclick` handlers |

## Interfaces

### Twins (T1)
From `web/`:
```bash
for f in features/system/desktop-notifications.ts features/settings/components/desktop-notifications-settings.tsx \
         features/settings/components/settings-view.tsx features/time/components/notifications-button.tsx; do
  sed 's#@/proto/#@/#g' "proto/$f" > "$f"
done
npx prettier --write features/system/desktop-notifications.ts features/settings/components/desktop-notifications-settings.tsx \
  features/settings/components/settings-view.tsx features/time/components/notifications-button.tsx
```
None of them imports `@/proto/mock/`. The module's exports (the stub, written in the test step, has these signatures with
each body `throw new Error("not implemented (feat-tlog-desktop-notifications)")`):
```ts
// web/features/system/desktop-notifications.ts
export type DesktopNotificationsState = "unsupported" | "denied" | "off" | "on";
export interface NotifyMessage {
  type: "pm4-notify"; title: string; body: string; tag: string; key: string | null; onlyWhenAway: boolean;
}
export function turnOnDesktopNotifications(): Promise<DesktopNotificationsState>;
export function turnOffDesktopNotifications(): void;
export function useDesktopNotifications(): DesktopNotificationsState;
export function showDesktopNotification(n: {
  title: string; body: string; tag: string; key?: string | null; onlyWhenAway?: boolean;
}): Promise<void>;
export function closeDesktopNotification(tag: string): Promise<void>;

// web/features/settings/components/desktop-notifications-settings.tsx
export function DesktopNotificationsSettings(): React.JSX.Element;
```

### Service worker (T1)
Append to `web/sw/service-worker.js`, after the `fetch` listener, then Prettier. Only `self`, `URL` and `Promise` as globals
(the test runs it with `new Function("self", "caches", "fetch", source)`):
```js
// Desktop notifications (feat-tlog-desktop-notifications): pages post a `pm4-notify` message
// (features/system/desktop-notifications.ts); the worker sees every PM4 window.
const NOTIFY = "pm4-notify";
const NOTIFICATION_ICON = "/icons/icon-192.png";
const APP_URL = "/app";

function windowClients() {
  return self.clients.matchAll({ type: "window", includeUncontrolled: true });
}

/** Skipped while a PM4 window has the focus (onlyWhenAway), or while this tag already shows this key. */
async function notify({ title, body, tag, key, onlyWhenAway }) {
  if (onlyWhenAway && (await windowClients()).some((client) => client.focused)) return;
  if (key !== null) {
    const showing = await self.registration.getNotifications({ tag });
    if (showing.some((notification) => notification.data?.key === key)) return;
  }
  await self.registration.showNotification(title, {
    body,
    tag,
    icon: NOTIFICATION_ICON,
    badge: NOTIFICATION_ICON,
    renotify: true,
    data: { url: APP_URL, key }
  });
}

self.addEventListener("message", (event) => {
  const message = event.data;
  if (message?.type !== NOTIFY) return;
  event.waitUntil(notify(message));
});

/** The PM4 window under /app, else any PM4 window, to the front; none → a new one at `url`. */
async function focusApp(url) {
  const windows = await windowClients();
  const app = windows.find((client) => new URL(client.url).pathname.startsWith(APP_URL)) ?? windows[0];
  if (app) return app.focus();
  return self.clients.openWindow(url);
}

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(focusApp(event.notification.data?.url ?? APP_URL));
});
```

## Acceptance criteria
Module tests stub `window.Notification` (a class with a settable static `permission` and `requestPermission`),
`navigator.serviceWorker`, `document.hasFocus` and `document.visibilityState`, and clear `localStorage` before each test.

| AC | Case → expected | Test | Task |
| --- | --- | --- | --- |
| AC-1 | `useDesktopNotifications`: no `Notification` → `"unsupported"`; permission `denied` → `"denied"`; `default` → `"off"`; `granted` without the stored `"on"` → `"off"`; `granted` + stored → `"on"`. `turnOnDesktopNotifications` from `default`: `requestPermission` → `granted` gives `"on"` and `localStorage["pm4.desktop-notifications"] === "on"`; → `denied` gives `"denied"` and nothing stored; from `granted` it doesn't ask again. `turnOffDesktopNotifications` → `"off"`, the key removed, and a rendered hook re-renders | `web/features/system/desktop-notifications.ac.test.ts` | T1 |
| AC-2 | `showDesktopNotification`: not `"on"` → nothing (no message, no `Notification`). On, with `navigator.serviceWorker.controller` → `controller.postMessage({ type: "pm4-notify", title, body, tag, key, onlyWhenAway })` (`key` `null` and `onlyWhenAway` `false` when left out), no `Notification`. On, no controller → `new Notification(title, { body, tag, icon: "/icons/icon-192.png", badge: "/icons/icon-192.png", renotify: true })`; its click calls `window.focus()` and closes it. `onlyWhenAway` with the page visible and focused → nothing; hidden, or `hasFocus()` false → shown | `web/features/system/desktop-notifications.ac.test.ts` | T1 |
| AC-3 | `closeDesktopNotification(tag)` closes the page's notification with that tag and every `getRegistration()` notification from `getNotifications({ tag })` | `web/features/system/desktop-notifications.ac.test.ts` | T1 |
| AC-4 | `DesktopNotificationsSettings` (module mocked): `"off"` → switch "Remind me to log time" unchecked, "Your browser will ask for permission the first time.", no test button; checking it calls `turnOnDesktopNotifications`. `"on"` → checked, "On in this browser. The sound follows your system's notification settings."; unchecking calls `turnOffDesktopNotifications`; **Send a test notification** calls `showDesktopNotification({ title: "PM4", body: "Desktop notifications are on.", tag: "pm4-test" })`. `"denied"` / `"unsupported"` → disabled, unchecked, with SCR-050's text | `web/features/settings/components/desktop-notifications-settings.ac.test.tsx` | T1 |
| AC-5 | `NotificationsButton` (module mocked, setup as `notifications-button.ac.test.tsx`), start 08:00, logs 60 + 60: at 10:15 → `showDesktopNotification({ title: "Log your time", body: "15m of billable time unlogged", tag: "pm4-log-reminder", key: "2026-10-09\|600\|1", onlyWhenAway: true })` once; at 10:16 no second call; at 10:30 a call with `"30m of billable time unlogged"` and key `"2026-10-09\|600\|2"`; saving a `30m` log (no reminder left) → `closeDesktopNotification("pm4-log-reminder")`. No reminder at mount → neither is called | `web/features/time/components/notifications-button-desktop.ac.test.tsx` | T1 |
| AC-6 | The bell's popover: `"off"` → "Get a desktop notification when it's time to log." and **Turn on**, which calls `turnOnDesktopNotifications`; `"on"`, `"denied"`, `"unsupported"` → neither | `web/features/time/components/notifications-button-desktop.ac.test.tsx` | T1 |
| AC-7 | Worker `message` `{ type: "pm4-notify", title: "Log your time", body: "15m …", tag: "pm4-log-reminder", key: "k1", onlyWhenAway: true }`: no focused window → `showNotification("Log your time", { body, tag, icon: "/icons/icon-192.png", badge: "/icons/icon-192.png", renotify: true, data: { url: "/app", key: "k1" } })`, awaited by `waitUntil`; a focused window → not shown; `onlyWhenAway: false` with a focused window → shown; `getNotifications({ tag })` already has one with `data.key` `"k1"` → not shown, with `"k0"` → shown; any other `type` (or no data) → no `waitUntil`, nothing shown | `web/sw/service-worker-notifications.ac.test.ts` | T1 |
| AC-8 | Worker `notificationclick`: closes the notification; windows `/` and `/app/time` → focuses `/app/time`; only `/` → focuses it; none → `openWindow("/app")` (or its `data.url`); awaited by `waitUntil`. The feat-shell-pwa worker tests still pass | `web/sw/service-worker-notifications.ac.test.ts` | T1 |
| AC-9 | The four twins equal their prototype files | check | T1 |

Typed stubs (created with the tests): the two files under *Twins (T1)*, the signatures above, bodies throwing.

## Checks
```bash
# AC-9: twins equal
node scripts/pm4.mjs twins
```

## Tasks
| # | Task | App | Size | Tier | Why this tier | Depends on |
| --- | --- | --- | --- | --- | --- | --- |
| T1 | Desktop notifications: the four twins and the worker's handlers | web | S | haiku | Twin copy by the command under *Twins (T1)*; the worker code is spelled out in *Service worker (T1)* | — |

## Open questions
None.

## Changelog
- 2026-11-06: Initial draft from prototypes `bb8120d`, `06e1004` (owner request 2026-11-06; OQ-266, OQ-267).
- 2026-11-06: Approved by the owner.
