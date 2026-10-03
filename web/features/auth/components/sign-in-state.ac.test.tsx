import { beforeEach, describe, expect, it, vi } from "vitest";
import { act, render, screen, waitFor } from "@testing-library/react";
import { SignInState, signInErrorMessage } from "./sign-in-state";

const replace = vi.fn();
let searchParams = new URLSearchParams();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace, push: vi.fn() }),
  useSearchParams: () => searchParams
}));

describe("SignInState (feat-auth-web-session)", () => {
  beforeEach(() => {
    replace.mockReset();
    searchParams = new URLSearchParams();
    window.localStorage.clear();
  });

  it("AC-18 SCR-002: the error message for each reason, shown as an alert; nothing without an error", async () => {
    expect(signInErrorMessage(null)).toBeNull();
    expect(signInErrorMessage("cancelled")).toBe("Sign-in was cancelled.");
    expect(signInErrorMessage("not-allowed")).toBe(
      "This account isn't allowed to use PM4. Continue with Google to choose a different account."
    );
    expect(signInErrorMessage("whatever")).toBe(
      "Sign-in failed. Please try again."
    );

    searchParams = new URLSearchParams("error=cancelled");
    const cancelled = render(<SignInState />);
    expect(screen.getByText("Sign-in was cancelled.")).toBeInTheDocument();
    cancelled.unmount();

    searchParams = new URLSearchParams("error=failed&returnTo=%2Fapp");
    const failed = render(<SignInState />);
    expect(
      screen.getByText("Sign-in failed. Please try again.")
    ).toBeInTheDocument();
    failed.unmount();

    searchParams = new URLSearchParams();
    const { container } = render(<SignInState />);
    await act(async () => {});
    expect(container).toBeEmptyDOMElement();
  });

  it("AC-19 FR-AUTH-005: with a stored token, forwards to a valid returnTo, else /app; without one, stays", async () => {
    window.localStorage.setItem("pm4.refreshToken", "R1");
    searchParams = new URLSearchParams("returnTo=%2Fapp%2Fprojects");
    const valid = render(<SignInState />);
    await waitFor(() => expect(replace).toHaveBeenCalledWith("/app/projects"));
    valid.unmount();

    replace.mockReset();
    searchParams = new URLSearchParams("returnTo=%2Fhome");
    const invalid = render(<SignInState />);
    await waitFor(() => expect(replace).toHaveBeenCalledWith("/app"));
    invalid.unmount();

    replace.mockReset();
    window.localStorage.clear();
    searchParams = new URLSearchParams("returnTo=%2Fapp%2Fprojects");
    render(<SignInState />);
    await act(async () => {});
    expect(replace).not.toHaveBeenCalled();
  });
});
