import type { AppConfigService } from "../../config/app-config.service.js";
import { type DnsLookup, PmspaHostGuard } from "./pmspa-host-guard.js";

function guardWith(
  lookup: DnsLookup,
  nodeEnv: "development" | "production" = "production"
): PmspaHostGuard {
  return new PmspaHostGuard({ nodeEnv } as AppConfigService, lookup);
}

describe("PmspaHostGuard (feat-int-conn-api)", () => {
  it("ok when every resolved address is public", async () => {
    const lookup = vi.fn(() =>
      Promise.resolve([{ address: "203.0.113.10", family: 4 }])
    );
    await expect(
      guardWith(lookup).check("https://pmspa.example.com/app")
    ).resolves.toBe("ok");
  });

  it("private when any resolved address is private", async () => {
    const lookup = () =>
      Promise.resolve([
        { address: "203.0.113.10", family: 4 },
        { address: "10.0.0.5", family: 4 }
      ]);
    await expect(
      guardWith(lookup).check("https://internal.example.com")
    ).resolves.toBe("private");
  });

  it("refuses an IP literal in a private range without DNS", async () => {
    const lookup = vi.fn(() => Promise.resolve([]));
    await expect(guardWith(lookup).check("https://[fd00::1]")).resolves.toBe(
      "private"
    );
    expect(lookup).not.toHaveBeenCalled();
  });

  it("unresolved when the lookup rejects or returns nothing", async () => {
    const rejecting = () => Promise.reject(new Error("ENOTFOUND"));
    await expect(
      guardWith(rejecting).check("https://nowhere.example.com")
    ).resolves.toBe("unresolved");
    await expect(
      guardWith(() => Promise.resolve([])).check("https://nowhere.example.com")
    ).resolves.toBe("unresolved");
  });

  it("skips DNS for localhost in development", async () => {
    const lookup = vi.fn(() => Promise.resolve([]));
    await expect(
      guardWith(lookup, "development").check("http://localhost:3000")
    ).resolves.toBe("ok");
    expect(lookup).not.toHaveBeenCalled();
  });
});
