// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const ORIGIN = "https://pm4.example";
const ICON = "/icons/icon-192.png";
const SOURCE = readFileSync(
  fileURLToPath(new URL("./service-worker.js", import.meta.url)),
  "utf8"
);

type Listener = (event: unknown) => void;

interface FakeWindow {
  url: string;
  focused: boolean;
  focus: ReturnType<typeof vi.fn>;
}

let listeners: Map<string, Listener>;
let windows: FakeWindow[];
let showing: { data?: { key?: string | null } }[];
let self: {
  __PM4_BUILD: { version: string; urls: string[] };
  location: { href: string; origin: string };
  addEventListener: (type: string, listener: Listener) => void;
  skipWaiting: ReturnType<typeof vi.fn>;
  clients: {
    claim: ReturnType<typeof vi.fn>;
    matchAll: ReturnType<typeof vi.fn>;
    openWindow: ReturnType<typeof vi.fn>;
  };
  registration: {
    showNotification: ReturnType<typeof vi.fn>;
    getNotifications: ReturnType<typeof vi.fn>;
  };
};

function listener(type: string): Listener {
  const found = listeners.get(type);
  if (!found) throw new Error(`the worker has no ${type} listener`);
  return found;
}

/** Dispatches an event; returns the promise given to waitUntil, or undefined if it wasn't called. */
function dispatch(
  type: string,
  event: Record<string, unknown>
): Promise<unknown> | undefined {
  let pending: Promise<unknown> | undefined;
  listener(type)({
    ...event,
    waitUntil: (p: Promise<unknown>) => (pending = p)
  });
  return pending;
}

const appWindow = (path: string, focused = false): FakeWindow => ({
  url: ORIGIN + path,
  focused,
  focus: vi.fn(async () => {})
});

const reminder = {
  type: "pm4-notify",
  title: "Log your time",
  body: "15m of billable time unlogged",
  tag: "pm4-log-reminder",
  key: "k1",
  onlyWhenAway: true
};

beforeEach(() => {
  listeners = new Map();
  windows = [];
  showing = [];
  self = {
    __PM4_BUILD: { version: "0123456789abcdef", urls: [] },
    location: { href: `${ORIGIN}/sw.js`, origin: ORIGIN },
    addEventListener: (type, l) => listeners.set(type, l),
    skipWaiting: vi.fn(async () => {}),
    clients: {
      claim: vi.fn(async () => {}),
      matchAll: vi.fn(async () => windows),
      openWindow: vi.fn(async () => null)
    },
    registration: {
      showNotification: vi.fn(async () => {}),
      getNotifications: vi.fn(async () => showing)
    }
  };
  new Function("self", "caches", "fetch", SOURCE)(self, {}, vi.fn());
});

describe("service worker notifications (feat-tlog-desktop-notifications)", () => {
  it("AC-7 FR-TLOG-022 D4: pm4-notify shows the notification while no PM4 window has the focus, once per tag and key", async () => {
    // No focused window → shown, awaited by waitUntil.
    windows = [appWindow("/app/time")];
    const pending = dispatch("message", { data: reminder });
    expect(pending).toBeDefined();
    await pending;
    expect(self.clients.matchAll).toHaveBeenCalledWith({
      type: "window",
      includeUncontrolled: true
    });
    expect(self.registration.showNotification).toHaveBeenCalledTimes(1);
    expect(self.registration.showNotification).toHaveBeenCalledWith(
      "Log your time",
      {
        body: "15m of billable time unlogged",
        tag: "pm4-log-reminder",
        icon: ICON,
        badge: ICON,
        renotify: true,
        data: { url: "/app", key: "k1" }
      }
    );

    // A focused window → not shown.
    self.registration.showNotification.mockClear();
    windows = [appWindow("/"), appWindow("/app/time", true)];
    await dispatch("message", { data: reminder });
    expect(self.registration.showNotification).not.toHaveBeenCalled();

    // onlyWhenAway false → shown even with a focused window.
    await dispatch("message", { data: { ...reminder, onlyWhenAway: false } });
    expect(self.registration.showNotification).toHaveBeenCalledTimes(1);

    // The same key already showing under the tag → not shown; another key → shown.
    self.registration.showNotification.mockClear();
    windows = [];
    showing = [{ data: { key: "k1" } }];
    await dispatch("message", { data: reminder });
    expect(self.registration.getNotifications).toHaveBeenCalledWith({
      tag: "pm4-log-reminder"
    });
    expect(self.registration.showNotification).not.toHaveBeenCalled();
    showing = [{ data: { key: "k0" } }];
    await dispatch("message", { data: reminder });
    expect(self.registration.showNotification).toHaveBeenCalledTimes(1);
  });

  it("AC-7 FR-TLOG-022 D4: other messages are ignored", () => {
    expect(
      dispatch("message", { data: { ...reminder, type: "other" } })
    ).toBeUndefined();
    expect(dispatch("message", { data: undefined })).toBeUndefined();
    expect(dispatch("message", {})).toBeUndefined();
    expect(self.registration.showNotification).not.toHaveBeenCalled();
  });

  it("AC-8 FR-TLOG-022 D6: a click closes the notification and focuses the /app window, else any PM4 window, else opens one", async () => {
    const click = (data?: { url?: string }) => {
      const notification = { close: vi.fn(), data };
      const pending = dispatch("notificationclick", { notification });
      expect(notification.close).toHaveBeenCalledTimes(1);
      expect(pending).toBeDefined();
      return pending;
    };

    // A /app window → focused.
    const landing = appWindow("/");
    const app = appWindow("/app/time");
    windows = [landing, app];
    await click({ url: "/app" });
    expect(app.focus).toHaveBeenCalledTimes(1);
    expect(landing.focus).not.toHaveBeenCalled();

    // Only the landing page → focused.
    const only = appWindow("/");
    windows = [only];
    await click({ url: "/app" });
    expect(only.focus).toHaveBeenCalledTimes(1);
    expect(self.clients.openWindow).not.toHaveBeenCalled();

    // None → a new window at the notification's url, else /app.
    windows = [];
    await click({ url: "/app/time" });
    expect(self.clients.openWindow).toHaveBeenLastCalledWith("/app/time");
    await click();
    expect(self.clients.openWindow).toHaveBeenLastCalledWith("/app");
  });
});
