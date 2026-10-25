import { describe, expect, it, vi } from "vitest";
import type { ReactNode } from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render } from "@testing-library/react";
import { createQueryClient } from "@/lib/query-client";
import type { Me } from "@/features/users/api";
import { LogTimeButton } from "./log-time-button";

const api = vi.hoisted(() => ({
  GET: vi.fn(),
  POST: vi.fn(),
  PATCH: vi.fn(),
  PUT: vi.fn()
}));
vi.mock("@/lib/api/client", () => ({ apiClient: api }));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  usePathname: () => "/app/projects",
  useSearchParams: () => new URLSearchParams()
}));

const me: Me = {
  id: "0b6c7d2e-1f3a-4c5b-9d8e-7f6a5b4c3d2e",
  email: "user@example.com",
  displayName: "Test User",
  avatarUrl: null,
  timeZone: "Europe/Zagreb",
  dailyTargetMinutes: 420,
  createdAt: "2026-10-02T22:30:00.000Z"
};

// jsdom has no PointerEvent, so fireEvent.pointer* would drop clientX; a MouseEvent with a pointerId stands in.
if (typeof window.PointerEvent === "undefined") {
  class PointerEventStub extends MouseEvent {
    readonly pointerId: number;
    constructor(type: string, init: PointerEventInit = {}) {
      super(type, init);
      this.pointerId = init.pointerId ?? 0;
    }
  }
  window.PointerEvent = PointerEventStub as unknown as typeof PointerEvent;
}

function renderButton() {
  const queryClient = createQueryClient();
  queryClient.setQueryData(["users", "me"], me);
  api.GET.mockResolvedValue({
    data: me,
    response: new Response(null, { status: 200 })
  });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  return render(<LogTimeButton />, { wrapper });
}

const labelled = (label: string) =>
  document.querySelector<HTMLElement>(`button[aria-label="${label}"]`)!;

describe("LogTimeButton", () => {
  it("does not swallow a key press after a touch swipe (no click follows a touch drag)", () => {
    renderButton();
    const button = labelled("Log time");
    fireEvent.pointerDown(button, { pointerId: 1, clientX: 100 });
    fireEvent.pointerMove(button, { pointerId: 1, clientX: 200 });
    fireEvent.pointerUp(button, { pointerId: 1, clientX: 200 });
    expect(button).toHaveAttribute("aria-hidden", "true");

    // Enter on the focused tab: keydown, then the native click.
    const tab = labelled("Show Log time button");
    fireEvent.keyDown(tab, { key: "Enter" });
    fireEvent.click(tab);
    expect(button).not.toHaveAttribute("aria-hidden", "true");
  });
});
