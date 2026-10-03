import { afterEach, describe, expect, it, vi } from "vitest";
import type { ComponentProps } from "react";
import {
  fireEvent,
  render,
  screen,
  waitFor,
  within
} from "@testing-library/react";
import type { Me } from "@/features/users/api";
import { UserProfile } from "./user-profile";

// next/link applies its own href normalization outside a Next build (next.config isn't loaded in
// Vitest). A plain anchor keeps the exact href the component passes.
vi.mock("next/link", () => ({
  default: ({ href, ...props }: { href: string } & ComponentProps<"a">) => (
    <a href={href} {...props} />
  )
}));

type MeState = {
  data?: Me;
  isPending: boolean;
  isError: boolean;
  isSuccess: boolean;
  refetch: () => void;
};

type MutationState = {
  mutate: () => void;
  isPending: boolean;
  isError: boolean;
  error: Error | null;
};

const me: Me = {
  id: "0b6c7d2e-1f3a-4c5b-9d8e-7f6a5b4c3d2e",
  email: "marko@example.com",
  displayName: "Marko Angelovski",
  avatarUrl: null,
  timeZone: "Europe/Zagreb",
  createdAt: "2026-10-02T22:30:00.000Z"
};

const hooks = vi.hoisted(() => ({
  me: {} as MeState,
  everywhere: {} as MutationState
}));

vi.mock("@/features/users/api", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/features/users/api")>()),
  useMe: () => hooks.me,
  useSignOutEverywhere: () => hooks.everywhere
}));

vi.mock("@/features/auth/use-sign-out", () => ({
  useSignOut: () => vi.fn()
}));

function loaded() {
  hooks.me = {
    data: me,
    isPending: false,
    isError: false,
    isSuccess: true,
    refetch: vi.fn()
  };
}

function idleMutation(overrides: Partial<MutationState> = {}) {
  hooks.everywhere = {
    mutate: vi.fn(),
    isPending: false,
    isError: false,
    error: null,
    ...overrides
  };
}

function openConfirm() {
  fireEvent.click(
    screen.getByRole("button", { name: "Sign out of all devices" })
  );
  return screen.getByRole("alertdialog", {
    name: "Sign out of all devices?"
  });
}

afterEach(() => {
  idleMutation();
});

describe("UserProfile (feat-shell-user-menu)", () => {
  it("AC-9 SCR-051: shows the Google identity read-only, with a link to Settings for the time zone", () => {
    loaded();
    idleMutation();
    render(<UserProfile />);

    expect(
      screen.getByRole("heading", { level: 1, name: "Marko Angelovski" })
    ).toBeInTheDocument();
    expect(screen.getAllByText("marko@example.com").length).toBeGreaterThan(0);
    expect(screen.getByText("Google")).toBeInTheDocument();
    expect(screen.getByText("3 October 2026")).toBeInTheDocument();
    expect(screen.getByText("Europe/Zagreb")).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Change in Settings" })
    ).toHaveAttribute("href", "/app/settings");
    expect(screen.queryByRole("textbox")).toBeNull();
    expect(screen.queryByRole("button", { name: /edit/i })).toBeNull();
  });

  it("AC-10 FR-AUTH-007: the confirmation shows the OQ-072 text; Cancel closes it without a request", async () => {
    loaded();
    idleMutation();
    render(<UserProfile />);

    const dialog = openConfirm();
    expect(
      within(dialog).getByText(
        "You'll be signed out here and on every other device within 15 minutes."
      )
    ).toBeInTheDocument();

    fireEvent.click(within(dialog).getByRole("button", { name: "Cancel" }));
    await waitFor(() =>
      expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument()
    );
    expect(hooks.everywhere.mutate).not.toHaveBeenCalled();
  });

  it("AC-10 FR-AUTH-007: Sign out everywhere calls mutate once", () => {
    loaded();
    idleMutation();
    render(<UserProfile />);

    const dialog = openConfirm();
    fireEvent.click(
      within(dialog).getByRole("button", { name: "Sign out everywhere" })
    );

    expect(hooks.everywhere.mutate).toHaveBeenCalledTimes(1);
  });

  it("AC-10 FR-AUTH-007: the action is disabled while the request is pending", () => {
    loaded();
    idleMutation({ isPending: true });
    render(<UserProfile />);

    const dialog = openConfirm();
    expect(
      within(dialog).getByRole("button", { name: "Sign out everywhere" })
    ).toBeDisabled();
  });

  it("AC-10 FR-AUTH-007: a failed request shows the alert and keeps the dialog open", () => {
    loaded();
    idleMutation({ isError: true, error: new Error("failed") });
    render(<UserProfile />);

    const dialog = openConfirm();
    expect(within(dialog).getByRole("alert")).toHaveTextContent(
      "Couldn't sign out of all devices. Please try again."
    );
    expect(screen.getByRole("alertdialog")).toBeInTheDocument();
  });

  it("AC-11 SCR-051: loading → no name", () => {
    hooks.me = {
      isPending: true,
      isError: false,
      isSuccess: false,
      refetch: vi.fn()
    };
    idleMutation();
    render(<UserProfile />);

    expect(screen.queryByText("Marko Angelovski")).toBeNull();
  });

  it("AC-11 SCR-051: error → the error text, and Retry refetches", () => {
    const refetch = vi.fn();
    hooks.me = { isPending: false, isError: true, isSuccess: false, refetch };
    idleMutation();
    render(<UserProfile />);

    expect(screen.getByText("Couldn't load your profile.")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Retry" }));
    expect(refetch).toHaveBeenCalledTimes(1);
  });
});
