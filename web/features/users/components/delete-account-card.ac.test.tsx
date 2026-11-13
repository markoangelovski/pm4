import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  fireEvent,
  render,
  screen,
  waitFor,
  within
} from "@testing-library/react";
import type { Me } from "@/features/users/api";
import { DeleteAccountCard } from "./delete-account-card";

type MutateOptions = { onError?: (error: Error) => void };

type DeleteState = {
  mutate: (variables: void, options?: MutateOptions) => void;
  isPending: boolean;
};

const hooks = vi.hoisted(() => ({ remove: {} as DeleteState }));

vi.mock("@/features/users/api", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/features/users/api")>()),
  useDeleteAccount: () => hooks.remove
}));

const toast = vi.hoisted(() =>
  Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn() })
);
vi.mock("sonner", () => ({ toast }));

const me: Me = {
  id: "0b6c7d2e-1f3a-4c5b-9d8e-7f6a5b4c3d2e",
  email: "marko@example.com",
  displayName: "Marko Angelovski",
  avatarUrl: null,
  timeZone: "Europe/Zagreb",
  dailyTargetMinutes: 420,
  createdAt: "2026-10-02T22:30:00.000Z"
};

function deleteState(overrides: Partial<DeleteState> = {}) {
  hooks.remove = { mutate: vi.fn(), isPending: false, ...overrides };
}

function openDialog() {
  fireEvent.click(screen.getByRole("button", { name: "Delete account" }));
  const dialog = screen.getByRole("alertdialog", {
    name: "Delete your account?"
  });
  return {
    dialog,
    input: within(dialog).getByRole("textbox") as HTMLInputElement
  };
}

const deleteButton = (dialog: HTMLElement) =>
  within(dialog).getByRole("button", { name: /^(Delete account|Deleting…)$/ });

describe("DeleteAccountCard (feat-acct-web)", () => {
  beforeEach(() => {
    deleteState();
    toast.error.mockReset();
  });

  it("AC-9 FR-AUTH-008 OQ-278: delete is enabled only by the user's email (trimmed, any case); Cancel clears the input", async () => {
    render(<DeleteAccountCard me={me} />);
    let { dialog, input } = openDialog();

    expect(deleteButton(dialog)).toBeDisabled();

    fireEvent.change(input, { target: { value: "ana@example.com" } });
    expect(deleteButton(dialog)).toBeDisabled();

    fireEvent.change(input, { target: { value: "  MARKO@Example.com " } });
    expect(deleteButton(dialog)).toBeEnabled();

    fireEvent.click(within(dialog).getByRole("button", { name: "Cancel" }));
    await waitFor(() =>
      expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument()
    );
    expect(hooks.remove.mutate).not.toHaveBeenCalled();

    ({ dialog, input } = openDialog());
    expect(input.value).toBe("");
    expect(deleteButton(dialog)).toBeDisabled();
  });

  it("AC-10 FR-AUTH-008: confirming calls mutate once", () => {
    render(<DeleteAccountCard me={me} />);
    const { dialog, input } = openDialog();

    fireEvent.change(input, { target: { value: "marko@example.com" } });
    fireEvent.click(deleteButton(dialog));

    expect(hooks.remove.mutate).toHaveBeenCalledTimes(1);
  });

  it("AC-10 FR-AUTH-008: while pending the button reads Deleting… and Cancel, the input and the button are disabled", () => {
    const { rerender } = render(<DeleteAccountCard me={me} />);
    const { input } = openDialog();
    fireEvent.change(input, { target: { value: "marko@example.com" } });

    deleteState({ isPending: true });
    rerender(<DeleteAccountCard me={me} />);

    const dialog = screen.getByRole("alertdialog", {
      name: "Delete your account?"
    });
    expect(
      within(dialog).getByRole("button", { name: "Deleting…" })
    ).toBeDisabled();
    expect(
      within(dialog).getByRole("button", { name: "Cancel" })
    ).toBeDisabled();
    expect(within(dialog).getByRole("textbox")).toBeDisabled();
  });

  it("AC-11 FR-AUTH-008: a failed delete → toast and the dialog stays open", () => {
    deleteState({
      mutate: vi.fn((_: void, options?: MutateOptions) =>
        options?.onError?.(new Error("failed"))
      )
    });
    render(<DeleteAccountCard me={me} />);
    const { dialog, input } = openDialog();

    fireEvent.change(input, { target: { value: "marko@example.com" } });
    fireEvent.click(deleteButton(dialog));

    expect(toast.error).toHaveBeenCalledWith("Couldn't delete your account.");
    expect(
      screen.getByRole("alertdialog", { name: "Delete your account?" })
    ).toBeInTheDocument();
  });
});
