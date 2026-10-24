import { describe, expect, it } from "vitest";
import type { Todo } from "./api";
import { groupLink, groupTodos, shown } from "./group";

const live = (id: string, title: string) => ({ id, title, deleted: false });
const gone = (title: string) => ({ id: null, title, deleted: true });

const alpha = live("p-alpha", "Alpha");
const beta = live("p-beta", "Beta");

let n = 0;
const todo = (fields: Partial<Todo> = {}): Todo => {
  n += 1;
  return {
    id: `d${n}`,
    text: `To-do ${n}`,
    doneAt: null,
    project: null,
    task: null,
    createdAt: "2026-10-01T08:00:00.000Z",
    updatedAt: "2026-10-01T08:00:00.000Z",
    ...fields
  };
};

/** A group's label as the board shows it: "General", "Alpha", "Alpha · Build". */
const label = (g: ReturnType<typeof groupTodos>[number]) =>
  !g.project
    ? "General"
    : g.task
      ? `${g.project.title} · ${g.task.title}`
      : g.project.title;

describe("to-do groups (feat-note-todos)", () => {
  it("AC-14 FR-NOTE-001: General first, projects A–Z with the project's own group before its tasks', deleted links last", () => {
    const todos = [
      todo({ project: gone("Old"), task: gone("Gone task") }),
      todo({ project: beta }),
      todo({ project: alpha, task: live("t-deploy", "Deploy") }),
      todo({ project: alpha }),
      todo(),
      todo({ project: alpha, task: live("t-build", "Build") })
    ];

    const groups = groupTodos(todos);

    expect(groups.map(label)).toEqual([
      "General",
      "Alpha",
      "Alpha · Build",
      "Alpha · Deploy",
      "Beta",
      "Old · Gone task"
    ]);
    expect(groups.map((g) => g.todos.length)).toEqual([1, 1, 1, 1, 1, 1]);
  });

  it("AC-14 FR-NOTE-001: in a group, open before done, otherwise the given order", () => {
    const first = todo({ project: alpha });
    const done = todo({
      project: alpha,
      doneAt: "2026-10-05T08:00:00.000Z"
    });
    const second = todo({ project: alpha });
    const third = todo({ project: alpha });

    const [group] = groupTodos([first, done, second, third]);

    expect(group.todos.map((t) => t.id)).toEqual([
      first.id,
      second.id,
      third.id,
      done.id
    ]);
    expect(group.openCount).toBe(3);
  });

  it("AC-14 FR-NOTE-006: shown keeps a to-do ticked off on the page in the open filter", () => {
    const done = todo({ doneAt: "2026-10-05T08:00:00.000Z" });
    const open = todo();

    expect(shown(open, "open", new Set())).toBe(true);
    expect(shown(done, "open", new Set())).toBe(false);
    expect(shown(done, "open", new Set([done.id]))).toBe(true);
    expect(shown(open, "done", new Set())).toBe(false);
    expect(shown(done, "done", new Set())).toBe(true);
    expect(shown(open, "all", new Set())).toBe(true);
  });

  it("AC-14 FR-NOTE-005: groupLink: General → no link, a project or task → its link, a deleted link → null", () => {
    const groups = groupTodos([
      todo(),
      todo({ project: alpha }),
      todo({ project: alpha, task: live("t-build", "Build") }),
      todo({ project: gone("Old") }),
      todo({ project: alpha, task: gone("Gone task") })
    ]);
    const byLabel = (text: string) => groups.find((g) => label(g) === text)!;
    const alphaRef = { id: "p-alpha", title: "Alpha" };

    expect(groupLink(byLabel("General"))).toEqual({
      project: null,
      task: null
    });
    expect(groupLink(byLabel("Alpha"))).toEqual({
      project: alphaRef,
      task: null
    });
    expect(groupLink(byLabel("Alpha · Build"))).toEqual({
      project: alphaRef,
      task: { id: "t-build", title: "Build", project: alphaRef }
    });
    expect(groupLink(byLabel("Old"))).toBeNull();
    expect(groupLink(byLabel("Alpha · Gone task"))).toBeNull();
  });
});
