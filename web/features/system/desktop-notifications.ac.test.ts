import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, renderHook } from "@testing-library/react";

type Module = typeof import("./desktop-notifications");

const STORAGE_KEY = "pm4.desktop-notifications";
const ICON = "/icons/icon-192.png";

/** A stand-in for the browser's Notification: a settable permission, a mocked request, and the instances made. */
class FakeNotification {
  static permission: NotificationPermission = "default";
  static requestPermission = vi.fn<() => Promise<NotificationPermission>>();
  static made: FakeNotification[] = [];

  onclick: (() => void) | null = null;
  onclose: (() => void) | null = null;
  close = vi.fn(() => this.onclose?.());

  constructor(
    public title: string,
    public options: NotificationOptions & { renotify?: boolean }
  ) {
    FakeNotification.made.push(this);
  }
}

/** The service-worker container the module sees: a controller (or none) and a registration's notifications. */
let worker: {
  controller: { postMessage: ReturnType<typeof vi.fn> } | null;
  getRegistration: ReturnType<typeof vi.fn>;
};
let getNotifications: ReturnType<typeof vi.fn>;

let notifications: Module;

function withNotification(permission: NotificationPermission) {
  FakeNotification.permission = permission;
  vi.stubGlobal("Notification", FakeNotification);
}

function turnedOn() {
  withNotification("granted");
  localStorage.setItem(STORAGE_KEY, "on");
}

function setFocus(visibility: "visible" | "hidden", focused: boolean) {
  Object.defineProperty(document, "visibilityState", {
    configurable: true,
    get: () => visibility
  });
  vi.spyOn(document, "hasFocus").mockReturnValue(focused);
}

beforeEach(async () => {
  localStorage.clear();
  FakeNotification.permission = "default";
  FakeNotification.requestPermission.mockReset();
  FakeNotification.made = [];
  getNotifications = vi.fn(async () => []);
  worker = {
    controller: null,
    getRegistration: vi.fn(async () => ({ getNotifications }))
  };
  Object.defineProperty(navigator, "serviceWorker", {
    configurable: true,
    get: () => worker
  });
  // The user is elsewhere unless a test says otherwise.
  setFocus("hidden", false);
  vi.resetModules();
  notifications = await import("./desktop-notifications");
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  delete (navigator as { serviceWorker?: unknown }).serviceWorker;
  delete (document as { visibilityState?: unknown }).visibilityState;
});

const state = () =>
  renderHook(() => notifications.useDesktopNotifications()).result.current;

describe("desktop notifications module (feat-tlog-desktop-notifications)", () => {
  it("AC-1 FR-TLOG-022 D3: the state follows support, the permission and the stored choice; turning on asks once; turning off re-renders", async () => {
    expect("Notification" in window).toBe(false);
    expect(state()).toBe("unsupported");

    withNotification("denied");
    expect(state()).toBe("denied");
    withNotification("default");
    expect(state()).toBe("off");
    withNotification("granted");
    expect(state()).toBe("off");
    localStorage.setItem(STORAGE_KEY, "on");
    expect(state()).toBe("on");

    // From default, granted → on and stored.
    localStorage.clear();
    withNotification("default");
    FakeNotification.requestPermission.mockImplementationOnce(async () => {
      FakeNotification.permission = "granted";
      return "granted";
    });
    await expect(notifications.turnOnDesktopNotifications()).resolves.toBe(
      "on"
    );
    expect(FakeNotification.requestPermission).toHaveBeenCalledTimes(1);
    expect(localStorage.getItem(STORAGE_KEY)).toBe("on");

    // From default, denied → denied and nothing stored.
    localStorage.clear();
    withNotification("default");
    FakeNotification.requestPermission.mockImplementationOnce(async () => {
      FakeNotification.permission = "denied";
      return "denied";
    });
    await expect(notifications.turnOnDesktopNotifications()).resolves.toBe(
      "denied"
    );
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();

    // From granted it doesn't ask again.
    FakeNotification.requestPermission.mockClear();
    withNotification("granted");
    await expect(notifications.turnOnDesktopNotifications()).resolves.toBe(
      "on"
    );
    expect(FakeNotification.requestPermission).not.toHaveBeenCalled();
    expect(localStorage.getItem(STORAGE_KEY)).toBe("on");

    // Turning off: "off", the key removed, and a rendered hook re-renders.
    const hook = renderHook(() => notifications.useDesktopNotifications());
    expect(hook.result.current).toBe("on");
    act(() => notifications.turnOffDesktopNotifications());
    expect(hook.result.current).toBe("off");
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
  });

  it("AC-2 FR-TLOG-022 D4: show does nothing while off; posts pm4-notify to a controller; else makes a Notification whose click focuses the window; onlyWhenAway skips while the page is in focus", async () => {
    const shown = { title: "Log your time", body: "15m", tag: "t" };

    // Not on → nothing.
    withNotification("granted");
    worker.controller = { postMessage: vi.fn() };
    await notifications.showDesktopNotification(shown);
    expect(worker.controller.postMessage).not.toHaveBeenCalled();
    expect(FakeNotification.made).toHaveLength(0);

    // On, with a controller → the message (defaults key null, onlyWhenAway false), no Notification.
    turnedOn();
    await notifications.showDesktopNotification(shown);
    expect(worker.controller.postMessage).toHaveBeenCalledTimes(1);
    expect(worker.controller.postMessage).toHaveBeenCalledWith({
      type: "pm4-notify",
      title: "Log your time",
      body: "15m",
      tag: "t",
      key: null,
      onlyWhenAway: false
    });
    await notifications.showDesktopNotification({
      ...shown,
      key: "k",
      onlyWhenAway: true
    });
    expect(worker.controller.postMessage).toHaveBeenLastCalledWith({
      type: "pm4-notify",
      title: "Log your time",
      body: "15m",
      tag: "t",
      key: "k",
      onlyWhenAway: true
    });
    expect(FakeNotification.made).toHaveLength(0);

    // On, no controller → the page shows it; a click focuses the window and closes it.
    worker.controller = null;
    const focus = vi.spyOn(window, "focus").mockImplementation(() => {});
    await notifications.showDesktopNotification(shown);
    expect(FakeNotification.made).toHaveLength(1);
    const [made] = FakeNotification.made;
    expect(made.title).toBe("Log your time");
    expect(made.options).toEqual({
      body: "15m",
      tag: "t",
      icon: ICON,
      badge: ICON,
      renotify: true
    });
    made.onclick?.();
    expect(focus).toHaveBeenCalledTimes(1);
    expect(made.close).toHaveBeenCalled();

    // onlyWhenAway: visible and focused → nothing; hidden, or not focused → shown.
    FakeNotification.made = [];
    const away = { ...shown, onlyWhenAway: true };
    setFocus("visible", true);
    await notifications.showDesktopNotification(away);
    expect(FakeNotification.made).toHaveLength(0);
    setFocus("hidden", true);
    await notifications.showDesktopNotification(away);
    expect(FakeNotification.made).toHaveLength(1);
    setFocus("visible", false);
    await notifications.showDesktopNotification(away);
    expect(FakeNotification.made).toHaveLength(2);
  });

  it("AC-3 FR-TLOG-022: close closes the page's notification with the tag and the registration's ones", async () => {
    turnedOn();
    await notifications.showDesktopNotification({
      title: "Log your time",
      body: "15m",
      tag: "pm4-log-reminder"
    });
    const [byPage] = FakeNotification.made;
    const fromWorker = [{ close: vi.fn() }, { close: vi.fn() }];
    getNotifications.mockResolvedValueOnce(fromWorker);

    await notifications.closeDesktopNotification("pm4-log-reminder");

    expect(byPage.close).toHaveBeenCalled();
    expect(worker.getRegistration).toHaveBeenCalled();
    expect(getNotifications).toHaveBeenCalledWith({ tag: "pm4-log-reminder" });
    for (const n of fromWorker) expect(n.close).toHaveBeenCalledTimes(1);
  });
});
