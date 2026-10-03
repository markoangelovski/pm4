import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  REFRESH_TOKEN_KEY,
  clearRefreshToken,
  getRefreshToken,
  onRemovedElsewhere,
  setRefreshToken,
  subscribe
} from "./token-store";

/** What the browser fires in this tab when another tab changes localStorage. */
function storageEvent(key: string | null, newValue: string | null): void {
  window.dispatchEvent(
    new StorageEvent("storage", {
      key,
      oldValue: "R1",
      newValue,
      storageArea: window.localStorage
    })
  );
}

describe("token store (feat-auth-web-session)", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("AC-1 FR-AUTH-003: set/get/clear use pm4.refreshToken; empty → null; a throwing localStorage behaves as empty", () => {
    expect(REFRESH_TOKEN_KEY).toBe("pm4.refreshToken");
    expect(getRefreshToken()).toBeNull();

    setRefreshToken("R1");
    expect(window.localStorage.getItem("pm4.refreshToken")).toBe("R1");
    expect(getRefreshToken()).toBe("R1");

    clearRefreshToken();
    expect(window.localStorage.getItem("pm4.refreshToken")).toBeNull();
    expect(getRefreshToken()).toBeNull();

    window.localStorage.setItem("pm4.refreshToken", "");
    expect(getRefreshToken()).toBeNull();

    window.localStorage.setItem("pm4.refreshToken", "R1");
    const denied = () => {
      throw new DOMException("denied", "SecurityError");
    };
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(denied);
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(denied);
    vi.spyOn(Storage.prototype, "removeItem").mockImplementation(denied);
    expect(getRefreshToken()).toBeNull();
    expect(() => setRefreshToken("R2")).not.toThrow();
    expect(() => clearRefreshToken()).not.toThrow();
  });

  it("AC-2 FR-AUTH-004: subscribe fires on local changes and storage events for the key; onRemovedElsewhere only on removal elsewhere", () => {
    const listener = vi.fn();
    const unsubscribe = subscribe(listener);

    setRefreshToken("R1");
    expect(listener).toHaveBeenCalledTimes(1);
    clearRefreshToken();
    expect(listener).toHaveBeenCalledTimes(2);
    storageEvent("pm4.refreshToken", "R2");
    expect(listener).toHaveBeenCalledTimes(3);
    storageEvent("other.key", "x");
    expect(listener).toHaveBeenCalledTimes(3);

    unsubscribe();
    setRefreshToken("R3");
    storageEvent("pm4.refreshToken", null);
    expect(listener).toHaveBeenCalledTimes(3);

    const removed = vi.fn();
    const stop = onRemovedElsewhere(removed);
    storageEvent("pm4.refreshToken", "R4");
    clearRefreshToken();
    storageEvent("other.key", null);
    expect(removed).not.toHaveBeenCalled();
    storageEvent("pm4.refreshToken", null);
    expect(removed).toHaveBeenCalledTimes(1);

    stop();
    storageEvent("pm4.refreshToken", null);
    expect(removed).toHaveBeenCalledTimes(1);
  });
});
