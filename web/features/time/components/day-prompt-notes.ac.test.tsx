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
    return Promise.resolve({
      data: { id, title, externalLink: links[key] },
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

const openDialog = () =>
  renderWith(<DayPromptDialog day={day} open onOpenChange={() => {}} />);

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
  `**Project:** A (${P1})\n**Task:** X (${T1})\n**Date:** ${date}\n**Note:**` +
  notes.map((n) => `\n- ${n}`).join("");
const markdownB = `**Project:** B (${P2})\n**Task:** —\n**Date:** ${date}\n**Note:**\n- three`;
const markdownOld = `**Project:** Old\n**Task:** —\n**Date:** ${date}\n**Note:**\n- four`;

describe("Prompt dialog: editable notes (feat-tlog-prompt D8)", () => {
  beforeEach(() => {
    Object.values(api).forEach((fn) => fn.mockReset());
    routeGet();
    writeText.mockReset();
    writeText.mockResolvedValue(undefined);
    toast.success.mockReset();
    toast.error.mockReset();
  });

  it("AC-14 FR-TLOG-020: promptMarkdown puts each note on one line and leaves out empty ones", () => {
    const s: PromptSection = {
      key: "p1:none",
      project: { id: "p1", title: "A" },
      task: null,
      date,
      notes: ["a\n  b ", "  ", "c"]
    };
    expect(promptMarkdown([{ section: s, links: {} }])).toBe(
      `${head}**Project:** A\n**Task:** —\n**Date:** ${date}\n**Note:**\n- a b\n- c`
    );
  });

  it("AC-15 FR-TLOG-020: each note is a textbox holding the log's text; project, task and date are not", async () => {
    openDialog();
    await linksLoaded();
    const cardA = section("A");
    expect(within(cardA).getByRole("textbox", { name: "Note 1" })).toHaveValue(
      "one"
    );
    expect(within(cardA).getByRole("textbox", { name: "Note 2" })).toHaveValue(
      "two"
    );
    expect(within(cardA).getAllByRole("textbox")).toHaveLength(2);
    expect(
      within(section("B")).getByRole("textbox", { name: "Note 1" })
    ).toHaveValue("three");
    expect(
      within(section("Old")).getByRole("textbox", { name: "Note 1" })
    ).toHaveValue("four");
    // Only the four notes are editable.
    expect(
      within(screen.getByRole("dialog")).getAllByRole("textbox")
    ).toHaveLength(4);
  });

  it("AC-16 FR-TLOG-020: the copies use the edited notes; a cleared note is left out", async () => {
    openDialog();
    await linksLoaded();
    const cardA = section("A");
    const copyA = within(cardA).getByRole("button", {
      name: "Copy to clipboard"
    });
    const copyAll = screen.getByRole("button", { name: "Copy all" });

    fireEvent.change(within(cardA).getByRole("textbox", { name: "Note 2" }), {
      target: { value: "two,\n  edited " }
    });
    fireEvent.click(copyA);
    await waitFor(() =>
      expect(writeText).toHaveBeenLastCalledWith(
        head + markdownA(["one", "two, edited"])
      )
    );

    fireEvent.click(copyAll);
    await waitFor(() =>
      expect(writeText).toHaveBeenLastCalledWith(
        head +
          markdownA(["one", "two, edited"]) +
          "\n\n" +
          markdownB +
          "\n\n" +
          markdownOld
      )
    );

    fireEvent.change(within(cardA).getByRole("textbox", { name: "Note 1" }), {
      target: { value: "" }
    });
    fireEvent.click(copyA);
    await waitFor(() =>
      expect(writeText).toHaveBeenLastCalledWith(
        head + markdownA(["two, edited"])
      )
    );
    expect(writeText).toHaveBeenCalledTimes(3);
  });

  it("AC-17 FR-TLOG-020: edits are discarded when the dialog closes, and nothing is written to the API", async () => {
    renderWith(<DayMenu day={day} />);
    const open = async () => {
      fireEvent.click(screen.getByRole("button", { name: "Day actions" }));
      fireEvent.click(await screen.findByRole("menuitem", { name: "Prompt" }));
      return screen.findByRole("dialog");
    };

    let dialog = await open();
    fireEvent.change(
      within(section("A")).getByRole("textbox", { name: "Note 1" }),
      { target: { value: "edited" } }
    );
    expect(
      within(section("A")).getByRole("textbox", { name: "Note 1" })
    ).toHaveValue("edited");
    fireEvent.click(within(dialog).getByRole("button", { name: "Cancel" }));
    await waitFor(() =>
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
    );

    dialog = await open();
    expect(
      within(section("A")).getByRole("textbox", { name: "Note 1" })
    ).toHaveValue("one");
    expect(api.POST).not.toHaveBeenCalled();
    expect(api.PATCH).not.toHaveBeenCalled();
    expect(api.PUT).not.toHaveBeenCalled();
    expect(api.DELETE).not.toHaveBeenCalled();
  });
});
