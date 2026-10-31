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
import { promptMarkdown, promptSections, type PromptSection } from "../prompt";
import type { Day, Ref, TimeLog } from "../types";
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

/** A·X 60 + 30 min, B 45 min, an excluded A·X 120 min. */
const logs = [
  log({ id: "l1", text: "one", project: a, task: x, durationMinutes: 60 }),
  log({ id: "l2", text: "three", project: b, durationMinutes: 45 }),
  log({ id: "l3", text: "two", project: a, task: x, durationMinutes: 30 }),
  log({
    id: "l4",
    text: "commute",
    project: a,
    task: x,
    durationMinutes: 120,
    excludeFromStats: true
  })
];

const day: Day = {
  workDate: "2026-10-06",
  startMinute: 480,
  totalMinutes: 255,
  logs
};

const date = "Tuesday, 6 October 2026";

/** A section literal with D9's `durationMinutes`. */
const sectionOf = (key: string, durationMinutes: number) =>
  ({
    key,
    project: { id: "p1", title: "A" },
    task: null,
    date,
    durationMinutes,
    notes: ["one"]
  }) as PromptSection;

const res = (status: number) => new Response(null, { status });

type GetOptions = { params?: { path?: Record<string, string> } };

function routeGet() {
  api.GET.mockImplementation((path: string, options?: GetOptions) => {
    const id = options?.params?.path?.id ?? "";
    if (!["p1", "p2", "t1"].includes(id))
      throw new Error(`unexpected GET ${path}:${id}`);
    const title = id === "p1" ? "A" : id === "p2" ? "B" : "X";
    return Promise.resolve({
      data: { id, title, externalLink: null },
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

/** The section cards in first-appearance order: A·X, B. */
const card = (i: number) =>
  screen.getByRole("dialog").querySelectorAll("section")[i] as HTMLElement;

describe("Prompt: Duration line and Notes label (feat-tlog-prompt D9)", () => {
  beforeEach(() => {
    Object.values(api).forEach((fn) => fn.mockReset());
    routeGet();
    writeText.mockReset();
    writeText.mockResolvedValue(undefined);
    toast.success.mockReset();
    toast.error.mockReset();
  });

  it("AC-19 FR-TLOG-020: a section's durationMinutes sums its logs, excluded logs left out", () => {
    const sections = promptSections("2026-10-06", logs);
    expect(sections).toHaveLength(2);
    expect(sections[0]).toMatchObject({
      project: { id: "p1", title: "A" },
      task: { id: "t1", title: "X" },
      durationMinutes: 90
    });
    expect(sections[1]).toMatchObject({
      project: { id: "p2", title: "B" },
      task: null,
      durationMinutes: 45
    });
  });

  it("AC-20 FR-TLOG-020: the markdown has **Duration:** after the date, then **Notes:**", () => {
    expect(promptMarkdown([{ section: sectionOf("s1", 90), links: {} }])).toBe(
      "Book my time accordingly:\n\n" +
        `**Project:** A\n**Task:** —\n**Service:** —\n**Date:** ${date}\n**Duration:** 1h 30m\n**Notes:**\n- one`
    );
    const markdown = promptMarkdown([
      { section: sectionOf("s2", 45), links: {} },
      { section: sectionOf("s3", 120), links: {} }
    ]);
    expect(markdown).toContain(
      `**Date:** ${date}\n**Duration:** 45m\n**Notes:**\n`
    );
    expect(markdown).toContain(
      `**Date:** ${date}\n**Duration:** 2h\n**Notes:**\n`
    );
    expect(markdown).not.toContain("**Note:**");
  });

  it("AC-21 FR-TLOG-020: the cards show Date, Duration, Notes in order, and copy the Duration line", async () => {
    renderWith(<DayPromptDialog day={day} open onOpenChange={() => {}} />);
    await screen.findByRole("dialog");

    const terms = (c: HTMLElement) =>
      Array.from(c.querySelectorAll("dt")).map((dt) => dt.textContent);
    expect(terms(card(0)).slice(-3)).toEqual(["Date:", "Duration:", "Notes:"]);
    expect(terms(card(0))).not.toContain("Note:");

    const value = (c: HTMLElement) =>
      within(c).getByText("Duration:").nextElementSibling?.textContent;
    expect(value(card(0))).toBe("1h 30m");
    expect(value(card(1))).toBe("45m");

    fireEvent.click(
      within(card(0)).getByRole("button", { name: "Copy to clipboard" })
    );
    await waitFor(() => expect(writeText).toHaveBeenCalledTimes(1));
    expect(writeText.mock.calls[0][0]).toContain(
      `**Date:** ${date}\n**Duration:** 1h 30m\n**Notes:**\n- one\n- two`
    );
  });
});
