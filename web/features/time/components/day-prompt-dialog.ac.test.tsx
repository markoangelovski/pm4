import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ReactNode } from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import {
  fireEvent,
  render,
  screen,
  waitFor,
  within
} from "@testing-library/react";
import { createQueryClient } from "@/lib/query-client";
import type { Day, Ref, TimeLog } from "../types";
import { DayMenu } from "./day-menu";
import { DayPromptDialog } from "./day-prompt-dialog";

const api = vi.hoisted(() => ({
  GET: vi.fn(),
  POST: vi.fn(),
  PUT: vi.fn(),
  PATCH: vi.fn(),
  DELETE: vi.fn()
}));
vi.mock("@/lib/api/client", () => ({ apiClient: api }));

const toast = vi.hoisted(() =>
  Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn() })
);
vi.mock("sonner", () => ({ toast }));

const writeText = vi.fn<(text: string) => Promise<void>>();
Object.defineProperty(navigator, "clipboard", {
  value: { writeText },
  configurable: true
});

const ref = (id: string | null, title: string, deleted = false): Ref => ({
  id,
  title,
  deleted
});
const a = ref("p1", "A");
const b = ref("p2", "B");
const x = ref("t1", "X");

const log = (over: Partial<TimeLog> & { id: string }): TimeLog => ({
  workDate: "2026-10-06",
  durationMinutes: 60,
  text: "Work",
  title: null,
  project: null,
  task: null,
  excludeFromStats: false,
  ...over
});

const dayOf = (logs: TimeLog[]): Day => ({
  workDate: "2026-10-06",
  startMinute: 480,
  totalMinutes: logs.reduce((sum, l) => sum + l.durationMinutes, 0),
  logs
});

/** A·X twice, B without a task, a deleted project, and an excluded log. */
const day = dayOf([
  log({ id: "l1", text: "one", project: a, task: x }),
  log({ id: "l2", text: "three", project: b }),
  log({ id: "l3", text: "two", project: a, task: x }),
  log({ id: "l4", text: "four", project: ref(null, "Old", true) }),
  log({ id: "l5", text: "commute", project: a, excludeFromStats: true })
]);

const P1 = "https://kanboard.example.com/project/12";
const P2 = "https://kanboard.example.com/project/27";
const T1 = "https://kanboard.example.com/task/1041";
const links: Record<string, string | null> = {
  "/api/v1/projects/{id}:p1": P1,
  "/api/v1/projects/{id}:p2": P2,
  "/api/v1/tasks/{id}:t1": T1
};

const res = (status: number) => new Response(null, { status });

type GetOptions = { params?: { path?: Record<string, string> } };

/** Reads that never resolve, by "path:id". */
let pending = new Set<string>();

function routeGet() {
  api.GET.mockImplementation((path: string, options?: GetOptions) => {
    const id = options?.params?.path?.id ?? "";
    const key = `${path}:${id}`;
    if (!(key in links)) throw new Error(`unexpected GET ${key}`);
    if (pending.has(key)) return new Promise(() => {});
    const title = id === "p1" ? "A" : id === "p2" ? "B" : "X";
    // Task X is linked to the service QA (feat-prj-services).
    const service = id === "t1" ? { id: "s1", name: "QA" } : undefined;
    return Promise.resolve({
      data: { id, title, externalLink: links[key], service },
      response: res(200)
    });
  });
}

const getCalls = (path: string, id: string) =>
  api.GET.mock.calls.filter(
    ([p, o]) =>
      p === path && (o as GetOptions | undefined)?.params?.path?.id === id
  ).length;

function renderWith(ui: ReactNode) {
  const queryClient = createQueryClient();
  return render(
    <QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>
  );
}

const openDialog = (d: Day = day) =>
  renderWith(<DayPromptDialog day={d} open onOpenChange={() => {}} />);

/** The section card that holds a project name. */
const section = (project: string) =>
  screen
    .getAllByText(project, { exact: false })
    .map((el) => el.closest("section"))
    .find(Boolean) as HTMLElement;

const markdownA =
  "**Project:** A (" +
  P1 +
  ")\n**Task:** X (" +
  T1 +
  ")\n**Service:** QA\n**Date:** Tuesday, 6 October 2026\n**Duration:** 2h\n**Notes:**\n- one\n- two";
const markdownB =
  "**Project:** B (" +
  P2 +
  ")\n**Task:** —\n**Service:** —\n**Date:** Tuesday, 6 October 2026\n**Duration:** 1h\n**Notes:**\n- three";
const markdownOld =
  "**Project:** Old\n**Task:** —\n**Service:** —\n**Date:** Tuesday, 6 October 2026\n**Duration:** 1h\n**Notes:**\n- four";

describe("Prompt dialog (feat-tlog-prompt)", () => {
  beforeEach(() => {
    Object.values(api).forEach((fn) => fn.mockReset());
    pending = new Set();
    routeGet();
    writeText.mockReset();
    writeText.mockResolvedValue(undefined);
    toast.success.mockReset();
    toast.error.mockReset();
  });

  it("AC-6 FR-TLOG-020: Prompt is disabled on a day without logs, and opens the dialog on a day with logs", async () => {
    const empty = renderWith(<DayMenu day={dayOf([])} />);
    fireEvent.click(screen.getByRole("button", { name: "Day actions" }));
    expect(
      await screen.findByRole("menuitem", { name: "Prompt" })
    ).toHaveAttribute("aria-disabled", "true");
    empty.unmount();

    renderWith(<DayMenu day={day} />);
    fireEvent.click(screen.getByRole("button", { name: "Day actions" }));
    fireEvent.click(await screen.findByRole("menuitem", { name: "Prompt" }));
    const dialog = await screen.findByRole("dialog");
    expect(
      within(dialog).getByText("Prompt for Tuesday, 6 October 2026")
    ).toBeInTheDocument();
  });

  it("AC-7 FR-TLOG-020: each section reads its project and task once; external links open in a new tab", async () => {
    openDialog();
    const link = await screen.findByRole("link", { name: P1 });
    expect(link).toHaveAttribute("href", P1);
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAttribute("rel", "noopener noreferrer");
    expect(await screen.findByRole("link", { name: T1 })).toHaveAttribute(
      "target",
      "_blank"
    );
    expect(await screen.findByRole("link", { name: P2 })).toBeInTheDocument();
    expect(getCalls("/api/v1/projects/{id}", "p1")).toBe(1);
    expect(getCalls("/api/v1/projects/{id}", "p2")).toBe(1);
    expect(getCalls("/api/v1/tasks/{id}", "t1")).toBe(1);
    // The deleted project and the missing tasks aren't read.
    expect(api.GET).toHaveBeenCalledTimes(3);
  });

  it("AC-8 FR-TLOG-020 (+ AC-21 feat-prj-services): Copy to clipboard copies the section with its links, shows Copied for 2 s", async () => {
    openDialog();
    await screen.findByRole("link", { name: T1 });
    const card = section("A");
    fireEvent.click(
      within(card).getByRole("button", { name: "Copy to clipboard" })
    );
    await waitFor(() =>
      expect(writeText).toHaveBeenCalledWith(
        "Book my time accordingly:\n\n" + markdownA
      )
    );
    expect(
      await within(card).findByRole("button", { name: "Copied" })
    ).toBeInTheDocument();
    expect(
      await within(card).findByRole(
        "button",
        { name: "Copy to clipboard" },
        { timeout: 3000 }
      )
    ).toBeInTheDocument();
  }, 10000);

  it("AC-9 FR-TLOG-020 (+ AC-21 feat-prj-services): Copy all copies every section with the cached links, leaving out a link not loaded yet", async () => {
    pending = new Set(["/api/v1/projects/{id}:p2"]);
    openDialog();
    await screen.findByRole("link", { name: T1 });
    await screen.findByRole("link", { name: P1 });
    fireEvent.click(screen.getByRole("button", { name: "Copy all" }));
    await waitFor(() =>
      expect(writeText).toHaveBeenCalledWith(
        "Book my time accordingly:\n\n" +
          markdownA +
          "\n\n" +
          markdownB.replace(` (${P2})`, "") +
          "\n\n" +
          markdownOld
      )
    );
    expect(
      await screen.findByRole("button", { name: "Copied" })
    ).toBeInTheDocument();
  });

  it("AC-10 FR-TLOG-020: a failed copy shows an error toast and keeps the label", async () => {
    writeText.mockRejectedValue(new Error("denied"));
    openDialog();
    await screen.findByRole("link", { name: P1 });
    const card = section("A");
    fireEvent.click(
      within(card).getByRole("button", { name: "Copy to clipboard" })
    );
    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith(
        "Couldn't copy to the clipboard."
      )
    );
    expect(
      within(card).getByRole("button", { name: "Copy to clipboard" })
    ).toBeInTheDocument();
  });

  it("AC-11 FR-TLOG-020 FR-TLOG-018: a day of excluded logs has nothing to book", () => {
    openDialog(dayOf([log({ id: "l1", project: a, excludeFromStats: true })]));
    expect(
      screen.getByText("This day has no logs to book.")
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Copy all" })).toBeDisabled();
    expect(api.GET).not.toHaveBeenCalled();
  });
});

describe("Prompt dialog: Service line (feat-prj-services)", () => {
  beforeEach(() => {
    Object.values(api).forEach((fn) => fn.mockReset());
    pending = new Set();
    routeGet();
  });

  it("AC-21 FR-TLOG-020: each card shows Service: with its task's service, — without a task or service", async () => {
    openDialog();
    await screen.findByRole("link", { name: T1 });
    /** The value after the "Service:" term of the card at `index` (A·X, B, Old). */
    const serviceOf = (index: number) => {
      const card = screen.getByRole("dialog").querySelectorAll("section")[
        index
      ] as HTMLElement;
      return within(card).getByText("Service:").nextElementSibling?.textContent;
    };
    await waitFor(() => expect(serviceOf(0)).toBe("QA"));
    expect(serviceOf(1)).toBe("—");
    expect(serviceOf(2)).toBe("—");
  });
});
