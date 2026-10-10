import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ReactNode } from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { NuqsTestingAdapter } from "nuqs/adapters/testing";
import { createQueryClient } from "@/lib/query-client";
import type { Me } from "@/features/users/api";
import { SettingsView } from "./settings-view";

const api = vi.hoisted(() => ({ GET: vi.fn(), PATCH: vi.fn() }));
vi.mock("@/lib/api/client", () => ({ apiClient: api }));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  usePathname: () => "/app/settings",
  useSearchParams: () => new URLSearchParams()
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

const res = (status: number) => new Response(null, { status });

function renderSettings() {
  const queryClient = createQueryClient();
  queryClient.setQueryData(["users", "me"], me);
  const wrapper = ({ children }: { children: ReactNode }) => (
    <NuqsTestingAdapter hasMemory>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </NuqsTestingAdapter>
  );
  return render(<SettingsView />, { wrapper });
}

const target = () =>
  screen.getByLabelText("Daily target (hours)") as HTMLInputElement;
const setTarget = (value: string) =>
  fireEvent.change(target(), { target: { value } });
const save = () => screen.getByRole("button", { name: "Save changes" });
const reset = () => screen.getByRole("button", { name: "Reset" });
const STEP_MESSAGE = "Enter a value between 0.25 and 24, in steps of 0.25.";

describe("Settings (feat-tlog-web)", () => {
  beforeEach(() => {
    Object.values(api).forEach((fn) => fn.mockReset());
    api.GET.mockResolvedValue({ data: me, response: res(200) });
    toast.success.mockReset();
    toast.error.mockReset();
  });

  it("AC-21 FR-TLOG-017 FR-AUTH-006 SCR-050: the User settings tab, validation, PATCH of the changed field only, Reset, failure toast", async () => {
    renderSettings();
    expect(
      screen.getByRole("heading", { name: "Settings" })
    ).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "User settings" })).toHaveAttribute(
      "aria-selected",
      "true"
    );
    await waitFor(() => expect(target().value).toBe("7"));
    expect(screen.getByLabelText("Time zone")).toHaveTextContent(
      "Europe/Zagreb"
    );
    expect(save()).toBeDisabled();
    expect(reset()).toBeDisabled();

    // Out of range or off-step → the message, Save stays disabled.
    for (const value of ["20.1", "25", "0.3", "0"]) {
      setTarget(value);
      expect(await screen.findByText(STEP_MESSAGE)).toBeInTheDocument();
      expect(save()).toBeDisabled();
    }

    // Reset restores the saved values.
    setTarget("8");
    await waitFor(() => expect(save()).toBeEnabled());
    expect(screen.queryByText(STEP_MESSAGE)).not.toBeInTheDocument();
    fireEvent.click(reset());
    await waitFor(() => expect(target().value).toBe("7"));
    expect(save()).toBeDisabled();

    // A failure → toast, the value stays.
    setTarget("7.5");
    api.PATCH.mockResolvedValueOnce({
      error: "Internal Server Error",
      response: res(500)
    });
    fireEvent.click(save());
    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith("Couldn't save the settings.")
    );
    expect(target().value).toBe("7.5");

    // 7.5 h → only dailyTargetMinutes 450.
    api.PATCH.mockResolvedValueOnce({
      data: { ...me, dailyTargetMinutes: 450 },
      response: res(200)
    });
    fireEvent.click(save());
    await waitFor(() =>
      expect(toast.success).toHaveBeenCalledWith("Settings saved")
    );
    expect(api.PATCH).toHaveBeenLastCalledWith(
      "/api/v1/me",
      expect.objectContaining({ body: { dailyTargetMinutes: 450 } })
    );
    // Saved → nothing left to save or reset.
    await waitFor(() => expect(save()).toBeDisabled());
    expect(reset()).toBeDisabled();
  });
});
