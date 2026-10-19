import { describe, expect, it } from "vitest";
import { promptMarkdown, promptSections } from "./prompt";
import type { Ref, TimeLog } from "./types";

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

const date = "Tuesday, 6 October 2026";

describe("prompt (feat-tlog-prompt)", () => {
  it("AC-1 FR-TLOG-020: one section per project + task in first-appearance order, excluded logs left out", () => {
    const sections = promptSections("2026-10-06", [
      log({ id: "l1", text: "one", project: a, task: x }),
      log({ id: "l2", text: "three", project: b }),
      log({ id: "l3", text: "two", project: a, task: x }),
      log({
        id: "l4",
        text: "commute",
        project: a,
        task: x,
        excludeFromStats: true
      })
    ]);
    expect(sections).toHaveLength(2);
    expect(sections[0]).toMatchObject({
      project: { id: "p1", title: "A" },
      task: { id: "t1", title: "X" },
      date,
      notes: ["one", "two"]
    });
    expect(sections[1]).toMatchObject({
      project: { id: "p2", title: "B" },
      task: null,
      date,
      notes: ["three"]
    });
    expect(sections[0].key).not.toBe(sections[1].key);
  });

  it("AC-2 FR-TLOG-020: a note is the log text on one line", () => {
    const [section] = promptSections("2026-10-06", [
      log({ id: "l1", text: "  Specs\nreview   and\n\nfixes ", project: a })
    ]);
    expect(section.notes).toEqual(["Specs review and fixes"]);
  });

  it("AC-3 FR-TLOG-020 FR-TLOG-014: a deleted project is its own section, by its retained name", () => {
    const sections = promptSections("2026-10-06", [
      log({ id: "l1", text: "one", project: a }),
      log({ id: "l2", text: "two", project: ref(null, "Old", true) }),
      log({ id: "l3", text: "three", project: ref(null, "Old", true) })
    ]);
    expect(sections).toHaveLength(2);
    expect(sections[1]).toMatchObject({
      project: { id: null, title: "Old" },
      task: null,
      notes: ["two", "three"]
    });
  });

  it("AC-4 FR-TLOG-020 FR-TLOG-018: only excluded logs → no sections", () => {
    expect(
      promptSections("2026-10-06", [
        log({ id: "l1", project: a, excludeFromStats: true })
      ])
    ).toEqual([]);
  });

  it("AC-5 FR-TLOG-020: the markdown: the heading once, links after the names, '—' for none, a blank line between sections", () => {
    const [first, second] = promptSections("2026-10-06", [
      log({ id: "l1", text: "one", project: a, task: x }),
      log({ id: "l2", text: "two", project: a, task: x }),
      log({ id: "l3", text: "three", project: b })
    ]);
    expect(
      promptMarkdown([
        {
          section: first,
          links: { project: "https://p", task: "https://t" }
        },
        { section: second, links: { project: null } }
      ])
    ).toBe(
      "Book my time accordingly:\n\n" +
        "**Project:** A (https://p)\n**Task:** X (https://t)\n**Date:** Tuesday, 6 October 2026\n**Note:**\n- one\n- two\n\n" +
        "**Project:** B\n**Task:** —\n**Date:** Tuesday, 6 October 2026\n**Note:**\n- three"
    );
  });
});
