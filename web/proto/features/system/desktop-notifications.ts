"use client";

import { useSyncExternalStore } from "react";

/**
 * Desktop notifications: system notifications the page shows itself (no Web Push), so only while PM4 is open in a tab
 * or as the installed app. They are on when the user turned them on in this browser (stored in localStorage) and the
 * browser's permission is granted. The sound is the system's notification sound.
 */
export type DesktopNotificationsState = "unsupported" | "denied" | "off" | "on";

const STORAGE_KEY = "pm4.desktop-notifications";
const ICON = "/icons/icon-192.png";

const listeners = new Set<() => void>();

function emit() {
  for (const listener of listeners) listener();
}

function isSupported(): boolean {
  return typeof window !== "undefined" && "Notification" in window;
}

function readTurnedOn(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) === "on";
  } catch {
    return false;
  }
}

function writeTurnedOn(on: boolean) {
  try {
    if (on) localStorage.setItem(STORAGE_KEY, "on");
    else localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Without storage they stay off; nothing else depends on it.
  }
  emit();
}

function snapshot(): DesktopNotificationsState {
  if (!isSupported()) return "unsupported";
  if (Notification.permission === "denied") return "denied";
  return Notification.permission === "granted" && readTurnedOn() ? "on" : "off";
}

/** Re-reads on our own changes, on another tab's (storage) and when the page comes back (the permission may have changed in the browser's site settings). */
function subscribe(listener: () => void) {
  listeners.add(listener);
  window.addEventListener("storage", listener);
  window.addEventListener("focus", listener);
  document.addEventListener("visibilitychange", listener);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", listener);
    window.removeEventListener("focus", listener);
    document.removeEventListener("visibilitychange", listener);
  };
}

/** Turns them on: asks the browser for permission the first time (call it from a click). */
export async function turnOnDesktopNotifications(): Promise<DesktopNotificationsState> {
  if (!isSupported()) return "unsupported";
  const permission =
    Notification.permission === "default"
      ? await Notification.requestPermission()
      : Notification.permission;
  writeTurnedOn(permission === "granted");
  return snapshot();
}

export function turnOffDesktopNotifications() {
  writeTurnedOn(false);
}

/** The state in this browser; "off" while rendering on the server. */
export function useDesktopNotifications(): DesktopNotificationsState {
  return useSyncExternalStore(subscribe, snapshot, () => "off");
}

/** True while the user is looking at PM4: its tab is visible and its window has the focus. */
export function isPageInFocus(): boolean {
  return document.visibilityState === "visible" && document.hasFocus();
}

/** The notifications the page created without a worker, by tag, so they can be closed. */
const shownByPage = new Map<string, Notification>();

/**
 * Shows a system notification when they are on; otherwise does nothing. One `tag` holds one notification: a new one
 * replaces it and alerts again. Clicking it brings PM4 to the front. Uses the service worker when one is active (it
 * also handles the click), the page's `Notification` otherwise.
 */
export async function showDesktopNotification({
  title,
  body,
  tag
}: {
  title: string;
  body: string;
  tag: string;
}): Promise<void> {
  if (snapshot() !== "on") return;
  // `renotify` isn't in TypeScript's DOM types yet.
  const options: NotificationOptions = Object.assign(
    { body, tag, icon: ICON, badge: ICON, data: { url: "/app" } },
    { renotify: true }
  );
  try {
    const registration = await navigator.serviceWorker?.getRegistration();
    if (registration?.active) {
      await registration.showNotification(title, options);
      return;
    }
  } catch {
    // Fall back to the page's Notification.
  }
  try {
    const notification = new Notification(title, options);
    shownByPage.get(tag)?.close();
    shownByPage.set(tag, notification);
    notification.onclick = () => {
      window.focus();
      notification.close();
    };
    notification.onclose = () => {
      if (shownByPage.get(tag) === notification) shownByPage.delete(tag);
    };
  } catch {
    // Some browsers (Android Chrome) only allow notifications from a service worker.
  }
}

/** Closes the notification with this `tag`, if one is showing. */
export async function closeDesktopNotification(tag: string): Promise<void> {
  if (!isSupported()) return;
  shownByPage.get(tag)?.close();
  try {
    const registration = await navigator.serviceWorker?.getRegistration();
    const shown = (await registration?.getNotifications({ tag })) ?? [];
    for (const notification of shown) notification.close();
  } catch {
    // Nothing to close.
  }
}
