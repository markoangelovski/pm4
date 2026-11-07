import { describe, expect, it } from "vitest";
import type { ChangelogEntryDto } from "./api";
import { changelogScope, changelogText } from "./changelog";

const change = (scope: string | null): ChangelogEntryDto => ({
  type: "feat",
  scope,
  description: "x",
  breaking: false,
  hash: "abc1234"
});

describe("Changelog text (feat-shell-documentation)", () => {
  it("AC-9 SCR-053: changelogText drops task, spec and OQ references from parentheses", () => {
    expect(changelogText("full marketing page (T-0147)")).toBe(
      "full marketing page"
    );
    expect(changelogText("sync (T-0063, push 2)")).toBe("sync (push 2)");
    expect(
      changelogText("rate limiting (T-0125…T-0128, feat-api-rate-limit)")
    ).toBe("rate limiting");
    expect(changelogText("nonprodMinutes (T-0130, feat-rpt-api D5)")).toBe(
      "nonprodMinutes"
    );
    expect(changelogText("x (OQ-196, ADR-0012)")).toBe("x");
    expect(changelogText("keep (optional) text")).toBe("keep (optional) text");
  });

  it("AC-9 SCR-053: changelogScope hides a scope equal to the viewed app", () => {
    expect(changelogScope(change("web"), "web")).toBeNull();
    expect(changelogScope(change("api"), "web")).toBe("api");
    expect(changelogScope(change(null), "web")).toBeNull();
    expect(changelogScope(change("tooling"), "web")).toBe("tooling");
  });
});
