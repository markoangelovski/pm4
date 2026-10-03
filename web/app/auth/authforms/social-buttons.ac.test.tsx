import { afterEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";

vi.hoisted(() => {
  process.env.NEXT_PUBLIC_API_BASE_URL = "http://api.test";
});

import { googleSignInUrl } from "@/lib/auth/session";
import SocialButtons from "./social-buttons";

describe("SocialButtons (feat-auth-web-session)", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("AC-20 FR-AUTH-001: Continue with Google starts the API flow with the page's returnTo", () => {
    const assign = vi.fn();
    vi.stubGlobal("location", {
      ...window.location,
      pathname: "/auth/sign-in",
      search: "?returnTo=%2Fapp%2Fprojects",
      assign
    });

    render(<SocialButtons />);
    fireEvent.click(
      screen.getByRole("button", { name: "Continue with Google" })
    );

    expect(assign).toHaveBeenCalledTimes(1);
    expect(assign).toHaveBeenCalledWith(googleSignInUrl("/app/projects"));
  });
});
