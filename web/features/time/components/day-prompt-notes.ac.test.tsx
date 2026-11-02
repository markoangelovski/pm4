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
import { promptMarkdown, type PromptSection } from "../prompt";
import type { Day, Ref, TimeLog } from "../types";
import { DayMenu } from "./day-menu";

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

/** A·X twice, B without a task, a deleted project. */
const day = dayOf([
  log({ id: "l1", text: "one", project: a, task: x }),
  log({ id: "l2", text: "three", project: b }),
  log({ id: "l3", text: "two", project: a, task: x }),
  log({ id: "l4", text: "four", project: ref(null, "Old", true) })
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

function routeGet() {
  api.GET.mockImplementation((path: string, options?: GetOptions) => {
    const id = options?.params?.path?.id ?? "";
    const key = `${path}:${id}`;
    if (!(key in links)) throw new Error(`unexpected GET ${key}`);
    const title = id === "p1" ? "A" : id === "p2" ? "B" : "X";
    // Task X is linked to the service QA (feat-prj-services).
    const service = id === "t1" ? { id: "s1", name: "QA" } : undefined;
    return Promise.resolve({
      data: { id, title, externalLink: links[key], service },
      response: res(200)
    });
  });
}

function renderWith(ui: ReactNode) {
  const queryClient = createQueryClient();
  return render(
    <QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>
  );
}

/** Waits until every section's links are loaded. */
const linksLoaded = async () => {
  await screen.findByRole("link", { name: P1 });
  await screen.findByRole("link", { name: T1 });
  await screen.findByRole("link", { name: P2 });
};

/** The section cards in first-appearance order: A·X, B, Old. */
const cards = { A: 0, B: 1, Old: 2 };
const section = (project: keyof typeof cards) =>
  screen.getByRole("dialog").querySelectorAll("section")[
    cards[project]
  ] as HTMLElement;

const date = "Tuesday, 6 October 2026";
const head = "Book my time accordingly:\n\n";
const markdownA = (notes: string[]) =>
  `**Project:** A (${P1})\n**Task:** X (${T1})\n**Service:** QA\n**Date:** ${date}\n**Duration:** 2h\n**Notes:**` +
  notes.map((n) => `\n- ${n}`).join("");
const markdownB = `**Project:** B (${P2})\n**Task:** —\n**Service:** —\n**Date:** ${date}\n**Duration:** 1h\n**Notes:**\n- three`;
const markdownOld = `**Project:** Old\n**Task:** —\n**Service:** —\n**Date:** ${date}\n**Duration:** 1h\n**Notes:**\n- four`;

describe("Prompt dialog: notes and Edit (feat-tlog-prompt, feat-tlog-reminder D7)", () => {
  beforeEach(() => {
    Object.values(api).forEach((fn) => fn.mockReset());
    routeGet();
    writeText.mockReset();
    writeText.mockResolvedValue(undefined);
    toast.success.mockReset();
    toast.error.mockReset();
  });

  it("AC-14 FR-TLOG-020 (+ AC-22 feat-prj-services): promptMarkdown puts each note on one line and leaves out empty ones", () => {
    // A literal with D9's durationMinutes (feat-tlog-prompt T4).
    const s = {
      key: "p1:none",
      project: { id: "p1", title: "A" },
      task: null,
      date,
      durationMinutes: 90,
      notes: ["a\n  b ", "  ", "c"]
    } as PromptSection;
    expect(promptMarkdown([{ section: s, links: {} }])).toBe(
      `${head}**Project:** A\n**Task:** —\n**Service:** —\n**Date:** ${date}\n**Duration:** 1h 30m\n**Notes:**\n- a b\n- c`
    );
  });

  it("AC-7 FR-TLOG-020 (feat-tlog-reminder D7): the notes are text; Edit shows the Copy all text in one textbox and hides itself; Copy all copies the edit; reopening shows the cards; no API write", async () => {
    renderWith(<DayMenu day={day} today="2026-10-31" />);
    const open = async () => {
      fireEvent.click(screen.getByRole("button", { name: "Day actions" }));
      fireEvent.click(await screen.findByRole("menuitem", { name: "Prompt" }));
      return screen.findByRole("dialog");
    };
    const all =
      head +
      markdownA(["one", "two"]) +
      "\n\n" +
      markdownB +
      "\n\n" +
      markdownOld;

    let dialog = await open();
    await linksLoaded();
    // The notes are plain text, not textboxes.
    expect(within(section("A")).getByText("one")).toBeInTheDocument();
    expect(within(section("A")).getByText("two")).toBeInTheDocument();
    expect(within(section("B")).getByText("three")).toBeInTheDocument();
    expect(within(section("Old")).getByText("four")).toBeInTheDocument();
    expect(within(dialog).queryByRole("textbox")).toBeNull();

    // Edit: one textbox with exactly what Copy all would copy; Edit is gone.
    fireEvent.click(within(dialog).getByRole("button", { name: "Edit" }));
    const text = await within(dialog).findByRole("textbox", {
      name: "Prompt text"
    });
    expect(text).toHaveValue(all);
    expect(within(dialog).getAllByRole("textbox")).toHaveLength(1);
    expect(within(dialog).queryByRole("button", { name: "Edit" })).toBeNull();

    // Copy all copies the edited text.
    fireEvent.change(text, { target: { value: "Book it all as QA." } });
    fireEvent.click(within(dialog).getByRole("button", { name: "Copy all" }));
    await waitFor(() =>
      expect(writeText).toHaveBeenLastCalledWith("Book it all as QA.")
    );
    expect(writeText).toHaveBeenCalledTimes(1);

    // Cancel discards the edit: reopening shows the cards again.
    fireEvent.click(within(dialog).getByRole("button", { name: "Cancel" }));
    await waitFor(() =>
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
    );
    dialog = await open();
    expect(within(section("A")).getByText("one")).toBeInTheDocument();
    expect(within(dialog).queryByRole("textbox")).toBeNull();
    expect(
      within(dialog).getByRole("button", { name: "Edit" })
    ).toBeInTheDocument();

    expect(api.POST).not.toHaveBeenCalled();
    expect(api.PATCH).not.toHaveBeenCalled();
    expect(api.PUT).not.toHaveBeenCalled();
    expect(api.DELETE).not.toHaveBeenCalled();
  });
});
