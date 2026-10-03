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
import ProfileSheet from "./profile";

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

const me: Me = {
  id: "0b6c7d2e-1f3a-4c5b-9d8e-7f6a5b4c3d2e",
  email: "marko@example.com",
  displayName: "Marko Angelovski",
  avatarUrl: null,
  timeZone: "Europe/Zagreb",
  createdAt: "2026-10-02T22:30:00.000Z"
};

const success: MeState = {
  data: me,
  isPending: false,
  isError: false,
  isSuccess: true,
  refetch: vi.fn()
};

const hook = vi.hoisted(() => ({ state: {} as MeState }));

vi.mock("@/features/users/api", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/features/users/api")>()),
  useMe: () => hook.state
}));

const signOut = vi.hoisted(() => vi.fn<() => Promise<void>>());

vi.mock("@/features/auth/use-sign-out", () => ({
  useSignOut: () => signOut
}));

function openDrawer() {
  fireEvent.click(screen.getByRole("button", { name: "Open user menu" }));
  return screen.getByRole("dialog", { name: "User menu" });
}

afterEach(() => {
  signOut.mockReset();
});

describe("ProfileSheet (feat-shell-user-menu)", () => {
  it("AC-5 SCR-005: the trigger shows the initials and opens the drawer with name, email, Home, Profile and Sign out", () => {
    hook.state = success;
    render(<ProfileSheet />);

    expect(
      screen.getByRole("button", { name: "Open user menu" })
    ).toHaveTextContent("MA");

    const drawer = openDrawer();
    expect(within(drawer).getByText("Marko Angelovski")).toBeInTheDocument();
    expect(within(drawer).getByText("marko@example.com")).toBeInTheDocument();
    expect(within(drawer).getByRole("link", { name: "Home" })).toHaveAttribute(
      "href",
      "/app"
    );
    expect(
      within(drawer).getByRole("link", { name: "Profile" })
    ).toHaveAttribute("href", "/app/user-profile");
    expect(
      within(drawer).getByRole("button", { name: "Sign out" })
    ).toBeInTheDocument();
  });

  it("AC-6 FR-AUTH-004: Sign out calls useSignOut's function once", () => {
    hook.state = success;
    render(<ProfileSheet />);

    const drawer = openDrawer();
    fireEvent.click(within(drawer).getByRole("button", { name: "Sign out" }));

    expect(signOut).toHaveBeenCalledTimes(1);
  });

  it("AC-6 SCR-005: clicking Profile closes the drawer", async () => {
    hook.state = success;
    render(<ProfileSheet />);

    const drawer = openDrawer();
    fireEvent.click(within(drawer).getByRole("link", { name: "Profile" }));

    await waitFor(() =>
      expect(
        screen.queryByRole("dialog", { name: "User menu" })
      ).not.toBeInTheDocument()
    );
  });

  it("AC-7 SCR-005: while /me loads → no name or email", () => {
    hook.state = {
      isPending: true,
      isError: false,
      isSuccess: false,
      refetch: vi.fn()
    };
    render(<ProfileSheet />);

    const drawer = openDrawer();
    expect(within(drawer).queryByText("Marko Angelovski")).toBeNull();
    expect(within(drawer).queryByText("marko@example.com")).toBeNull();
    expect(
      within(drawer).getByRole("button", { name: "Sign out" })
    ).toBeInTheDocument();
  });

  it("AC-7 SCR-005: /me error → the error text; links and Sign out still there", () => {
    hook.state = {
      isPending: false,
      isError: true,
      isSuccess: false,
      refetch: vi.fn()
    };
    render(<ProfileSheet />);

    const drawer = openDrawer();
    expect(
      within(drawer).getByText("Couldn't load your profile.")
    ).toBeInTheDocument();
    expect(
      within(drawer).getByRole("link", { name: "Home" })
    ).toBeInTheDocument();
    expect(
      within(drawer).getByRole("link", { name: "Profile" })
    ).toBeInTheDocument();
    expect(
      within(drawer).getByRole("button", { name: "Sign out" })
    ).toBeInTheDocument();
  });
});
