"use client";

/** Desktop notifications for the reminder to log time (feat-tlog-desktop-notifications). Stub until T1. */
export type DesktopNotificationsState = "unsupported" | "denied" | "off" | "on";

/** The message a page posts to the service worker to show a notification (handled in `sw/service-worker.js`). */
export interface NotifyMessage {
  type: "pm4-notify";
  title: string;
  body: string;
  tag: string;
  key: string | null;
  onlyWhenAway: boolean;
}

export function turnOnDesktopNotifications(): Promise<DesktopNotificationsState> {
  throw new Error("not implemented (feat-tlog-desktop-notifications)");
}

export function turnOffDesktopNotifications(): void {
  throw new Error("not implemented (feat-tlog-desktop-notifications)");
}

export function useDesktopNotifications(): DesktopNotificationsState {
  throw new Error("not implemented (feat-tlog-desktop-notifications)");
}

export function showDesktopNotification(n: {
  title: string;
  body: string;
  tag: string;
  key?: string | null;
  onlyWhenAway?: boolean;
}): Promise<void> {
  void n;
  throw new Error("not implemented (feat-tlog-desktop-notifications)");
}

export function closeDesktopNotification(tag: string): Promise<void> {
  void tag;
  throw new Error("not implemented (feat-tlog-desktop-notifications)");
}
