import { afterEach, describe, expect, it, vi } from "vitest";
import { formatVersion, versionSummary, webVersion } from "./version";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("version helpers (feat-shell-sidebar-branding)", () => {
  it("AC-4 SCR-004: formatVersion and versionSummary for success, pending and error", () => {
    expect(formatVersion("0.1.0")).toBe("v0.1.0");
    expect(
      versionSummary("0.1.0", { status: "success", version: "0.0.1" })
    ).toBe("Web v0.1.0 · API v0.0.1");
    expect(versionSummary("0.1.0", { status: "pending" })).toBe(
      "Web v0.1.0 · API …"
    );
    expect(versionSummary("0.1.0", { status: "error" })).toBe(
      "Web v0.1.0 · API —"
    );
  });

  it("AC-5 SCR-004: webVersion reads NEXT_PUBLIC_APP_VERSION on each call, 0.0.0 when unset", () => {
    vi.stubEnv("NEXT_PUBLIC_APP_VERSION", "1.2.3");
    expect(webVersion()).toBe("1.2.3");

    vi.stubEnv("NEXT_PUBLIC_APP_VERSION", undefined);
    expect(webVersion()).toBe("0.0.0");
  });
});
