import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ReactNode } from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen } from "@testing-library/react";
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

const res = (status: number) => new Response(null, { status });

type GetOptions = { params?: { path?: Record<string, string> } };

/** GET router: /me, the day of a date (a start, no logs), and empty picker lists. */
function routeGet() {
  api.GET.mockImplementation(async (path: string, options?: GetOptions) => {
    if (path === "/api/v1/me") return { data: me, response: res(200) };
    if (path === "/api/v1/workdays/{date}") {
      return {
        data: {
          workDate: options!.params!.path!.date,
          startMinute: 480,
          totalMinutes: 0,
          logs: []
        },
        response: res(200)
      };
    }
    if (path === "/api/v1/projects" || path === "/api/v1/tasks") {
      return {
        data: { items: [], total: 0, page: 1, pageSize: 100 },
        response: res(200)
      };
    }
    throw new Error(`unexpected GET ${path}`);
  });
}

function withProviders(ui: React.ReactElement) {
  const queryClient = createQueryClient();
  // The shell has loaded the signed-in user before the button renders.
  queryClient.setQueryData(["users", "me"], me);
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  return render(ui, { wrapper });
}

/** A control by its aria-label: the button and the tab carry aria-hidden while the other one shows, which empties their role name. */
function labelled(label: string) {
  const el = document.querySelector<HTMLElement>(
    `button[aria-label="${label}"]`
  );
  expect(el, `button "${label}"`).not.toBeNull();
  return el!;
}
const logButton = () => labelled("Log time");
const tab = () => labelled("Show Log time button");

/** A press from `from` to `to` (px along x), then the click the browser fires after it. */
function press(el: HTMLElement, from: number, to: number) {
  fireEvent.pointerDown(el, { pointerId: 1, clientX: from });
  fireEvent.pointerMove(el, { pointerId: 1, clientX: to });
  fireEvent.pointerUp(el, { pointerId: 1, clientX: to });
  fireEvent.click(el);
}

const dialogHeading = () =>
  screen.queryByRole("heading", { name: "Log time" });

describe("LogTimeButton (feat-shell-new-menu)", () => {
  beforeEach(() => {
    // "Now" is 2026-10-07 09:17 in Zagreb; only Date is faked, timers stay real.
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-10-07T07:17:00.000Z"));
    Object.values(api).forEach((fn) => fn.mockReset());
    routeGet();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("AC-4 FR-TLOG-011: a click on Log time opens the dialog for today; it is a focusable native button, so Enter and Space click it", async () => {
    withProviders(<LogTimeButton />);
    const button = logButton();
    // jsdom doesn't turn Enter into a click; a focusable native <button> with the action on click is what makes Enter work.
    expect(button.tagName).toBe("BUTTON");
    button.focus();
    expect(button).toHaveFocus();
    expect(button).toHaveAttribute("tabIndex", "0");
    fireEvent.click(button);
    expect(
      await screen.findByRole("heading", { name: "Log time" })
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Date")).toHaveTextContent("7 Oct 2026");
  });

  it("AC-5 FR-TLOG-011: a 100 px swipe right hides the button behind the tab and opens no dialog", () => {
    withProviders(<LogTimeButton />);
    press(logButton(), 100, 200);
    expect(dialogHeading()).toBeNull();
    expect(logButton()).toHaveAttribute("aria-hidden", "true");
    expect(logButton()).toHaveAttribute("tabIndex", "-1");
    expect(tab()).toHaveAttribute("tabIndex", "0");
  });

  it("AC-6 FR-TLOG-011: while hidden, a click on the tab or a 100 px swipe left on it shows the button again, without the dialog", () => {
    withProviders(<LogTimeButton />);
    press(logButton(), 100, 200);
    expect(logButton()).toHaveAttribute("aria-hidden", "true");

    fireEvent.click(tab());
    expect(logButton()).not.toHaveAttribute("aria-hidden", "true");
    expect(tab()).toHaveAttribute("tabIndex", "-1");
    expect(dialogHeading()).toBeNull();

    press(logButton(), 100, 200);
    expect(logButton()).toHaveAttribute("aria-hidden", "true");
    press(tab(), 200, 100);
    expect(logButton()).not.toHaveAttribute("aria-hidden", "true");
    expect(dialogHeading()).toBeNull();
  });

  it("AC-7 FR-TLOG-011: a 30 px move (past the tap slop, short of a swipe) keeps the button shown and opens no dialog", () => {
    withProviders(<LogTimeButton />);
    press(logButton(), 100, 130);
    expect(logButton()).not.toHaveAttribute("aria-hidden", "true");
    expect(logButton()).toHaveAttribute("tabIndex", "0");
    expect(dialogHeading()).toBeNull();
  });
});
