import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import type { DesktopNotificationsState } from "@/features/system/desktop-notifications";
import { DesktopNotificationsSettings } from "./desktop-notifications-settings";

const desktop = vi.hoisted(() => ({
  state: "off" as DesktopNotificationsState,
  turnOnDesktopNotifications: vi.fn(async () => "on" as const),
  turnOffDesktopNotifications: vi.fn(),
  showDesktopNotification: vi.fn(async () => {}),
  closeDesktopNotification: vi.fn(async () => {})
}));
vi.mock("@/features/system/desktop-notifications", () => ({
  useDesktopNotifications: () => desktop.state,
  turnOnDesktopNotifications: desktop.turnOnDesktopNotifications,
  turnOffDesktopNotifications: desktop.turnOffDesktopNotifications,
  showDesktopNotification: desktop.showDesktopNotification,
  closeDesktopNotification: desktop.closeDesktopNotification
}));

// jsdom has no PointerEvent, which Base UI's Switch creates on a click; a MouseEvent stands in.
if (typeof window.PointerEvent === "undefined") {
  class PointerEventStub extends MouseEvent {
    readonly pointerId: number;
    constructor(type: string, init: PointerEventInit = {}) {
      super(type, init);
      this.pointerId = init.pointerId ?? 0;
    }
  }
  window.PointerEvent = PointerEventStub as unknown as typeof PointerEvent;
}

/** Base UI's Switch: a span with role switch, aria-checked and aria-disabled. */
const toggle = () =>
  screen.getByRole("switch", { name: "Remind me to log time" });
const testButton = () =>
  screen.queryByRole("button", { name: "Send a test notification" });

function renderCard(state: DesktopNotificationsState) {
  desktop.state = state;
  return render(<DesktopNotificationsSettings />);
}

describe("DesktopNotificationsSettings (feat-tlog-desktop-notifications, SCR-050)", () => {
  beforeEach(() => {
    desktop.turnOnDesktopNotifications.mockClear();
    desktop.turnOffDesktopNotifications.mockClear();
    desktop.showDesktopNotification.mockClear();
  });

  it("AC-4 FR-TLOG-022 SCR-050: off → unchecked, the permission hint, no test button; checking turns them on", () => {
    renderCard("off");
    expect(screen.getByText("Desktop notifications")).toBeInTheDocument();
    expect(toggle()).not.toBeChecked();
    expect(toggle()).not.toHaveAttribute("aria-disabled", "true");
    expect(
      screen.getByText("Your browser will ask for permission the first time.")
    ).toBeInTheDocument();
    expect(testButton()).not.toBeInTheDocument();

    fireEvent.click(toggle());
    expect(desktop.turnOnDesktopNotifications).toHaveBeenCalledTimes(1);
    expect(desktop.turnOffDesktopNotifications).not.toHaveBeenCalled();
  });

  it("AC-4 FR-TLOG-022 SCR-050: on → checked, the on hint; unchecking turns them off; Send a test notification shows one", () => {
    renderCard("on");
    expect(toggle()).toBeChecked();
    expect(
      screen.getByText(
        "On in this browser. The sound follows your system's notification settings."
      )
    ).toBeInTheDocument();

    fireEvent.click(testButton()!);
    expect(desktop.showDesktopNotification).toHaveBeenCalledTimes(1);
    expect(desktop.showDesktopNotification).toHaveBeenCalledWith({
      title: "PM4",
      body: "Desktop notifications are on.",
      tag: "pm4-test"
    });

    fireEvent.click(toggle());
    expect(desktop.turnOffDesktopNotifications).toHaveBeenCalledTimes(1);
    expect(desktop.turnOnDesktopNotifications).not.toHaveBeenCalled();
  });

  it.each([
    [
      "denied",
      "Notifications are blocked for PM4 in this browser. Allow them in the browser's site settings, then turn this on."
    ],
    ["unsupported", "This browser doesn't support desktop notifications."]
  ] as const)(
    "AC-4 FR-TLOG-022 SCR-050: %s → disabled, unchecked, with its hint and no test button",
    (state, hint) => {
      renderCard(state);
      expect(toggle()).not.toBeChecked();
      expect(toggle()).toHaveAttribute("aria-disabled", "true");
      expect(screen.getByText(hint)).toBeInTheDocument();
      expect(testButton()).not.toBeInTheDocument();
    }
  );
});
