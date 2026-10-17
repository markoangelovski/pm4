import {
  toPm4Project,
  toPm4Task,
  toPmspaProject,
  toPmspaTask
} from "./pmspa-writes.js";
import type {
  Pm4Project,
  Pm4Task,
  RemoteProject,
  RemoteTask
} from "./pmspa-fields.js";

const ZAGREB = "Europe/Zagreb";

const pm4Project = (fields: Partial<Pm4Project> = {}): Pm4Project => ({
  id: "6b1f0b8e-2c4d-4e5f-8a9b-0c1d2e3f4a5b",
  title: "Acme",
  description: "Website relaunch.",
  externalLink: "https://kanboard.example.com/project/42",
  leadName: "Jane Doe",
  ...fields
});

const pm4Task = (fields: Partial<Pm4Task> = {}): Pm4Task => ({
  ...pm4Project({ description: null, leadName: null, externalLink: null }),
  projectId: "6b1f0b8e-2c4d-4e5f-8a9b-0c1d2e3f4a5b",
  status: "in-progress",
  dueDate: "2026-10-20",
  ...fields
});

const remoteProject = (fields: Partial<RemoteProject> = {}): RemoteProject => ({
  id: "65f1a0c0ffee0000000000a1",
  userId: "65f1a0c0ffee00000000000a",
  title: "Acme",
  description: null,
  pl: "Jane Doe",
  kanboard: null,
  done: false,
  taskCount: 0,
  ...fields
});

const remoteTask = (fields: Partial<RemoteTask> = {}): RemoteTask => ({
  id: "65f1a0c0ffee0000000000b1",
  projectId: "65f1a0c0ffee0000000000a1",
  title: "Design",
  description: null,
  column: "In Progress",
  pl: null,
  kanboard: null,
  dueAt: Date.UTC(2026, 9, 19, 22),
  ...fields
});

describe("PMSPA write mappers (feat-int-sync-api *Entity mapping*)", () => {
  it("toPmspaProject cuts the title and the description, drops an invalid link", () => {
    expect(
      toPmspaProject(
        pm4Project({
          title: "T".repeat(160),
          description: "D".repeat(400),
          externalLink: "ftp://x",
          leadName: "  "
        })
      )
    ).toEqual({
      title: "T".repeat(149) + "…",
      description: "D".repeat(349) + "…",
      pl: null,
      kanboard: null
    });
  });

  it("toPmspaTask maps the column, done and the due date at noon UTC (D7)", () => {
    expect(
      toPmspaTask(pm4Task({ status: "completed", dueDate: "2026-10-20" }))
    ).toMatchObject({
      column: "Completed",
      done: true,
      dueAt: String(Date.UTC(2026, 9, 20, 12))
    });
    expect(toPmspaTask(pm4Task({ dueDate: null }))).toMatchObject({
      column: "In Progress",
      done: false,
      dueAt: null
    });
  });

  it("toPm4Project keeps the PM4 lead when its name equals PMSPA's pl (D6)", () => {
    const same = toPm4Project(
      remoteProject({ pl: "Jane Doe" }),
      pm4Project({ leadName: "Jane Doe" })
    );
    expect(same).not.toHaveProperty("projectLeadName");
    expect(same).not.toHaveProperty("projectLeadUserId");
    expect(same.title).toBe("Acme");
  });

  it("toPm4Project sets a text lead when the name differs, and drops an invalid link", () => {
    expect(
      toPm4Project(
        remoteProject({ pl: "John Roe", kanboard: "javascript:alert(1)" }),
        pm4Project({ leadName: "Jane Doe" })
      )
    ).toEqual({
      title: "Acme",
      description: null,
      externalLink: null,
      projectLeadName: "John Roe",
      projectLeadUserId: null
    });
  });

  it("toPm4Task maps the status, the due date in the user's zone and the project id", () => {
    const task = toPm4Task(
      remoteTask({ column: "Upcoming" }),
      null,
      "6b1f0b8e-2c4d-4e5f-8a9b-0c1d2e3f4a5b",
      ZAGREB
    );
    expect(task).toMatchObject({
      status: "upcoming",
      dueDate: "2026-10-20",
      projectId: "6b1f0b8e-2c4d-4e5f-8a9b-0c1d2e3f4a5b",
      title: "Design"
    });
  });
});
