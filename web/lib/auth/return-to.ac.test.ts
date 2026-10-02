import { describe, expect, it } from "vitest";
import {
  landingHref,
  postSignInPath,
  sanitizeReturnTo,
  signInHref
} from "./return-to";

describe("returnTo helpers (feat-land-app-route-split)", () => {
  it("AC-1 FR-AUTH-005: sanitizeReturnTo accepts /app paths, keeps the query, drops the hash and trailing slashes", () => {
    expect(sanitizeReturnTo("/app/projects")).toBe("/app/projects");
    expect(
      sanitizeReturnTo("/app/project?id=0199a1b2-7c3d-7e4f-8a9b-0c1d2e3f4a5b")
    ).toBe("/app/project?id=0199a1b2-7c3d-7e4f-8a9b-0c1d2e3f4a5b");
    expect(sanitizeReturnTo("/app")).toBe("/app");
    expect(sanitizeReturnTo("/app/time?date=2026-09-29#top")).toBe(
      "/app/time?date=2026-09-29"
    );
    expect(sanitizeReturnTo("/app/")).toBe("/app");
    expect(sanitizeReturnTo("/app/projects/")).toBe("/app/projects");
    expect(sanitizeReturnTo("/app/projects/?x=1")).toBe("/app/projects?x=1");
    expect(sanitizeReturnTo("/app//")).toBe("/app");
  });

  it("AC-2 FR-AUTH-005: sanitizeReturnTo rejects every invalid input", () => {
    const invalid: (string | null | undefined)[] = [
      null,
      undefined,
      "",
      "https://evil.example/app",
      "//evil.example/app",
      "/\\evil.example/app",
      "javascript:alert(1)",
      "/",
      "/home",
      "/auth/sign-in",
      "/application",
      "/apps/x",
      "app/projects",
      "/app/../auth/sign-in",
      "/app/%2e%2e/home",
      "/app/\n",
      "/app/\t",
      "/app/\x7f",
      "/app/" + "a".repeat(2048)
    ];
    for (const raw of invalid) {
      expect(sanitizeReturnTo(raw), JSON.stringify(raw)).toBeNull();
    }
  });

  it("AC-3 FR-AUTH-005: landingHref exact outputs", () => {
    expect(landingHref("/app/projects")).toBe("/?returnTo=%2Fapp%2Fprojects");
    expect(landingHref("/app/project?id=abc")).toBe(
      "/?returnTo=%2Fapp%2Fproject%3Fid%3Dabc"
    );
    expect(landingHref("/app")).toBe("/");
    expect(landingHref("/app/")).toBe("/");
    expect(landingHref("/home")).toBe("/");
    expect(landingHref(null)).toBe("/");
  });

  it("AC-4 FR-LAND-002: signInHref exact outputs", () => {
    expect(signInHref("/app/tasks")).toBe(
      "/auth/sign-in?returnTo=%2Fapp%2Ftasks"
    );
    expect(signInHref("/app")).toBe("/auth/sign-in?returnTo=%2Fapp");
    expect(signInHref(null)).toBe("/auth/sign-in");
    expect(signInHref("https://evil.example/")).toBe("/auth/sign-in");
    expect(signInHref("/auth/callback")).toBe("/auth/sign-in");
  });

  it("AC-5 FR-AUTH-001: postSignInPath exact outputs (default /app, also the Go to app target)", () => {
    expect(postSignInPath("/app/trash")).toBe("/app/trash");
    expect(postSignInPath(null)).toBe("/app");
    expect(postSignInPath("//evil.example/")).toBe("/app");
    expect(postSignInPath("/app/projects?x=1")).toBe("/app/projects?x=1");
    expect(postSignInPath("/home")).toBe("/app");
  });
});
