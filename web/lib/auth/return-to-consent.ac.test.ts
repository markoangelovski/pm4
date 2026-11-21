import { describe, expect, it, vi } from "vitest";

// session.ts may create its API client at import: set the base URL before any import.
vi.hoisted(() => {
  process.env.NEXT_PUBLIC_API_BASE_URL = "http://api.test";
});

import { postSignInPath, sanitizeReturnTo, signInHref } from "./return-to";
import { googleSignInUrl } from "./session";

describe("returnTo accepts the consent page (feat-mcp-web)", () => {
  it("AC-1 FR-AUTH-005/D3: sanitizeReturnTo accepts /auth/consent with its query and rejects look-alikes", () => {
    expect(sanitizeReturnTo("/auth/consent?request=abc")).toBe(
      "/auth/consent?request=abc"
    );
    expect(sanitizeReturnTo("/auth/consent/?request=abc")).toBe(
      "/auth/consent?request=abc"
    );
    expect(sanitizeReturnTo("/auth/consent#x")).toBe("/auth/consent");
    for (const invalid of [
      "/auth/consent/x",
      "/auth/consentx?request=a",
      "/auth/sign-in",
      "/auth/callback",
      "//auth/consent",
      "https://evil.example/auth/consent"
    ]) {
      expect(sanitizeReturnTo(invalid), invalid).toBeNull();
    }
    expect(sanitizeReturnTo("/app/projects?q=a")).toBe("/app/projects?q=a");
  });

  it("AC-2 FR-AUTH-005/D3: the sign-in link, the post-sign-in path and the Google URL carry the consent page", () => {
    const consent = "/auth/consent?request=abc";
    const href = signInHref(consent);
    expect(href).toBe(
      "/auth/sign-in?returnTo=%2Fauth%2Fconsent%3Frequest%3Dabc"
    );
    const returnTo = new URL(href, "https://pm4.invalid").searchParams.get(
      "returnTo"
    );
    expect(postSignInPath(returnTo)).toBe(consent);
    expect(new URL(googleSignInUrl(consent)).searchParams.get("returnTo")).toBe(
      consent
    );
  });
});
