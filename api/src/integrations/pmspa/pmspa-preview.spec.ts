import { describe, expect, it } from "vitest";
import { fingerprint, projectTuple, taskTuple } from "./pmspa-fields.js";
import type {
  Pm4Project,
  Pm4Task,
  RemoteProject,
  RemoteTask
} from "./pmspa-fields.js";
import type { LinkRow } from "./pmspa-links.repository.js";
import {
  choiceFor,
  importRows,
  syncRows,
  type SyncSnapshot
} from "./pmspa-preview.js";

const pm4P = (
  id: string,
  title: string,
  over: Partial<Pm4Project> = {}
): Pm4Project => ({
  id,
  title,
  description: null,
  externalLink: null,
  leadName: null,
  ...over
});
const pm4T = (
  id: string,
  projectId: string,
  title: string,
  over: Partial<Pm4Task> = {}
): Pm4Task => ({
  ...pm4P(id, title),
  projectId,
  status: "upcoming",
  dueDate: null,
  ...over
});
const remP = (
  id: string,
  title: string,
  over: Partial<RemoteProject> = {}
): RemoteProject => ({
  id,
  userId: "u",
  title,
  description: null,
  pl: null,
  kanboard: null,
  done: false,
  taskCount: 0,
  ...over
});
const remT = (
  id: string,
  projectId: string,
  title: string,
  over: Partial<RemoteTask> = {}
): RemoteTask => ({
  id,
  projectId,
  title,
  description: null,
  column: "Upcoming",
  pl: null,
  kanboard: null,
  dueAt: Date.UTC(2026, 9, 20, 12),
  ...over
});
const link = (
  type: "project" | "task",
  pm4Id: string,
  pmspaId: string,
  pm4Hash: Buffer,
  pmspaHash: Buffer
): LinkRow => ({
  type,
  pm4Id,
  pmspaId,
  pmspaUserId: "u",
  origin: "linked",
  syncedAt: new Date(),
  pm4Hash,
  pmspaHash
});

const empty: SyncSnapshot = {
  timeZone: "Europe/Zagreb",
  pm4Projects: [],
  pm4Tasks: [],
  remoteProjects: [],
  remoteTasks: [],
  links: []
};

describe("importRows", () => {
  it("creates unlinked projects and tasks with candidates", () => {
    const s: SyncSnapshot = {
      ...empty,
      pm4Projects: [pm4P("p1", "Acme", { leadName: "Jane" })],
      remoteProjects: [remP("a".repeat(24), "Acme", { pl: "Jane" })],
      remoteTasks: [remT("b".repeat(24), "a".repeat(24), "Task")]
    };
    const rows = importRows(s, {
      projects: [{ id: "a".repeat(24), taskIds: null }]
    });
    expect(
      rows.map((r) => [r.key.split(":")[0], r.action, r.direction])
    ).toEqual([
      ["project", "create", "to-pm4"],
      ["task", "create", "to-pm4"]
    ]);
    expect(rows[0].candidates![0]).toMatchObject({
      id: "p1",
      detail: "Lead Jane"
    });
    expect(rows[1].parentKey).toBe(rows[0].key);
  });

  it("skips a linked pair that matches and flags the changed side otherwise", () => {
    const pm = pm4P("p1", "Acme");
    const rp = remP("a".repeat(24), "Acme");
    const same: SyncSnapshot = {
      ...empty,
      pm4Projects: [pm],
      remoteProjects: [rp],
      links: [
        link(
          "project",
          "p1",
          rp.id,
          fingerprint(projectTuple(pm)),
          fingerprint(projectTuple(rp))
        )
      ]
    };
    const sel = { projects: [{ id: rp.id, taskIds: null }] };
    expect(importRows(same, sel)[0]).toMatchObject({
      action: "skip",
      reason: "Same in PM4 and PMSPA",
      linkedId: "p1"
    });
    const changed = remP(rp.id, "Acme", { description: "New." });
    const rows = importRows({ ...same, remoteProjects: [changed] }, sel);
    expect(rows[0]).toMatchObject({ action: "differs", direction: "to-pm4" });
  });

  it("treats a link whose PM4 side is missing as no link", () => {
    const rp = remP("a".repeat(24), "Acme");
    const s: SyncSnapshot = {
      ...empty,
      remoteProjects: [rp],
      links: [link("project", "gone", rp.id, Buffer.alloc(8), Buffer.alloc(8))]
    };
    const [r] = importRows(s, { projects: [{ id: rp.id, taskIds: null }] });
    expect(r).toMatchObject({ action: "create", linkedId: null });
  });
});

describe("syncRows", () => {
  it("returns null for an unknown target", () => {
    expect(syncRows(empty, { type: "task", id: "x" })).toBeNull();
  });

  it("gives a task and its parent project, with PMSPA candidates", () => {
    const s: SyncSnapshot = {
      ...empty,
      pm4Projects: [pm4P("p1", "Acme")],
      pm4Tasks: [pm4T("t1", "p1", "T")],
      remoteProjects: [remP("a".repeat(24), "Acme")]
    };
    const rows = syncRows(s, { type: "task", id: "t1" })!;
    expect(rows[0]).toMatchObject({
      key: "project:p1",
      parent: true,
      reason: "Parent of the pushed task",
      direction: "to-pmspa"
    });
    expect(rows[1]).toMatchObject({ key: "task:t1", parentKey: "project:p1" });
    expect(rows[0].candidates).toHaveLength(1);
  });

  it("warns about long text and values PMSPA can't clear", () => {
    const rp = remP("a".repeat(24), "T".repeat(10), { description: "Keep." });
    const pm = pm4P("p1", "T".repeat(151));
    const s: SyncSnapshot = {
      ...empty,
      pm4Projects: [pm],
      remoteProjects: [rp],
      links: [link("project", "p1", rp.id, Buffer.alloc(8), Buffer.alloc(8))]
    };
    const [r] = syncRows(s, { type: "project", id: "p1" })!;
    expect(r.action).toBe("differs");
    expect(r.warnings).toEqual([
      "Title over 150 characters: cut to 149 + “…”.",
      "PMSPA can't clear the Description: it keeps its value."
    ]);
  });

  it("marks a project's tasks optional and detects a task diff", () => {
    const rp = remP("a".repeat(24), "Acme");
    const rt = remT("b".repeat(24), rp.id, "Meetings & demos");
    const pm = pm4P("p1", "Acme");
    const pt = pm4T("t1", "p1", "Meetings");
    const s: SyncSnapshot = {
      ...empty,
      pm4Projects: [pm],
      pm4Tasks: [pt],
      remoteProjects: [rp],
      remoteTasks: [rt],
      links: [
        link(
          "project",
          "p1",
          rp.id,
          fingerprint(projectTuple(pm)),
          fingerprint(projectTuple(rp))
        ),
        link(
          "task",
          "t1",
          rt.id,
          fingerprint(taskTuple(pt, s0.timeZone)),
          Buffer.alloc(8)
        )
      ]
    };
    const rows = syncRows(s, { type: "project", id: "p1" })!;
    expect(rows[1]).toMatchObject({
      optional: true,
      action: "differs",
      direction: "to-pm4"
    });
    expect(rows[1].differences[0].field).toBe("Title");
  });
});

const s0 = empty;

describe("choiceFor", () => {
  const item = {
    key: "task:t",
    action: "differs",
    linkedId: "x",
    direction: "to-pm4"
  } as never;
  it("defaults a differing row to its direction and others to create", () => {
    expect(choiceFor([], item)).toEqual({
      key: "task:t",
      kind: "link",
      id: "x",
      overwrite: "to-pm4"
    });
    expect(
      choiceFor([], { key: "k", action: "create", linkedId: null } as never)
    ).toEqual({ key: "k", kind: "create" });
    expect(choiceFor([{ key: "task:t", kind: "skip" }], item)).toEqual({
      key: "task:t",
      kind: "skip"
    });
  });
});
