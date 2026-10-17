import { createHash } from "node:crypto";
import {
  clearWarnings,
  cut,
  dueAtOf,
  dueDateOf,
  fingerprint,
  formatDate,
  linkVal,
  projectDiff,
  projectTuple,
  taskDiff,
  taskTuple,
  val,
  type Pm4Project,
  type Pm4Task,
  type RemoteProject,
  type RemoteTask
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

const remoteProject = (fields: Partial<RemoteProject> = {}): RemoteProject => ({
  id: "65f1a0c0ffee0000000000a1",
  userId: "65f1a0c0ffee00000000000a",
  title: "Acme",
  description: "Website relaunch.",
  pl: "Jane Doe",
  kanboard: "https://kanboard.example.com/project/42",
  done: false,
  taskCount: 0,
  ...fields
});

const pm4Task = (fields: Partial<Pm4Task> = {}): Pm4Task => ({
  ...pm4Project({ title: "Design", description: null, leadName: null }),
  externalLink: null,
  projectId: "6b1f0b8e-2c4d-4e5f-8a9b-0c1d2e3f4a5b",
  status: "in-progress",
  dueDate: "2026-10-20",
  ...fields
});

/** 2026-10-19T22:00Z: 20 Oct 2026 in Zagreb (CEST), 19 Oct in UTC. */
const MIDNIGHT_ZAGREB = Date.UTC(2026, 9, 19, 22);

const remoteTask = (fields: Partial<RemoteTask> = {}): RemoteTask => ({
  id: "65f1a0c0ffee0000000000b1",
  projectId: "65f1a0c0ffee0000000000a1",
  title: "Design",
  description: null,
  column: "In Progress",
  pl: null,
  kanboard: null,
  dueAt: MIDNIGHT_ZAGREB,
  ...fields
});

describe("PMSPA field mapping (feat-int-sync-api)", () => {
  it("AC-20 FR-INT-008: cut, val and formatDate", () => {
    expect(cut("abcdef", 4)).toBe("abc…");
    expect(cut("abcd", 4)).toBe("abcd");
    expect(val("  ")).toBeNull();
    expect(val("")).toBeNull();
    expect(val(null)).toBeNull();
    expect(val(undefined)).toBeNull();
    expect(val(" x ")).toBe(" x ");
    expect(formatDate("2026-10-18")).toBe("18 Oct 2026");
    expect(formatDate("2026-10-03")).toBe("3 Oct 2026");
  });

  it("AC-20 FR-INT-008: linkVal keeps only http(s) URLs of at most 500 characters (D8)", () => {
    expect(linkVal("ftp://x")).toBeNull();
    expect(linkVal("not a url")).toBeNull();
    expect(linkVal("")).toBeNull();
    expect(linkVal(null)).toBeNull();
    expect(linkVal("https://kanboard.example.com/project/42")).toBe(
      "https://kanboard.example.com/project/42"
    );
    expect(linkVal("http://kanboard.example.com")).toBe(
      "http://kanboard.example.com"
    );
    const long = "https://example.com/" + "a".repeat(500);
    expect(linkVal(long)).toBeNull();
  });

  it("AC-20 FR-INT-008: dueAtOf sends 12:00 UTC of the day; dueDateOf reads the date in the user's zone (D7)", () => {
    expect(dueAtOf("2026-10-20")).toBe(String(Date.UTC(2026, 9, 20, 12)));
    expect(dueDateOf(MIDNIGHT_ZAGREB, ZAGREB)).toBe("2026-10-20");
    expect(dueDateOf(MIDNIGHT_ZAGREB, "UTC")).toBe("2026-10-19");
    for (const zone of [ZAGREB, "America/Los_Angeles", "Asia/Tokyo"]) {
      expect(dueDateOf(Number(dueAtOf("2026-03-29")), zone)).toBe("2026-03-29");
    }
  });

  it("AC-20 FR-INT-008: projectDiff → [] for the same values", () => {
    expect(projectDiff(pm4Project(), remoteProject())).toEqual([]);
  });

  it("AC-20 FR-INT-008: projectDiff compares PM4 text as PMSPA would store it", () => {
    const long = "T".repeat(160);
    const longDescription = "D".repeat(400);

    expect(
      projectDiff(
        pm4Project({ title: long, description: longDescription }),
        remoteProject({
          title: cut(long, 150),
          description: cut(longDescription, 350)
        })
      )
    ).toEqual([]);
  });

  it("AC-20 FR-INT-008: projectDiff treats empty text and an invalid link as no value", () => {
    expect(
      projectDiff(
        pm4Project({
          description: "",
          leadName: "  ",
          externalLink: "ftp://x"
        }),
        remoteProject({ description: null, pl: null, kanboard: null })
      )
    ).toEqual([]);
    expect(
      projectDiff(
        pm4Project({ externalLink: null }),
        remoteProject({ kanboard: "javascript:alert(1)" })
      )
    ).toEqual([]);
  });

  it("AC-20 FR-INT-008: projectDiff lists Title, Description, Lead, External link in that order", () => {
    expect(
      projectDiff(
        pm4Project({ description: null }),
        remoteProject({
          title: "Acme Website",
          description: "QA retainer.",
          pl: "John Roe",
          kanboard: "https://kanboard.example.com/project/7"
        })
      )
    ).toEqual([
      { field: "Title", pm4: "Acme", pmspa: "Acme Website" },
      { field: "Description", pm4: null, pmspa: "QA retainer." },
      { field: "Lead", pm4: "Jane Doe", pmspa: "John Roe" },
      {
        field: "External link",
        pm4: "https://kanboard.example.com/project/42",
        pmspa: "https://kanboard.example.com/project/7"
      }
    ]);
  });

  it("AC-20 FR-INT-008: taskDiff → [] when the due date is the same day in the user's zone", () => {
    expect(taskDiff(pm4Task(), remoteTask(), ZAGREB)).toEqual([]);
  });

  it("AC-20 FR-INT-008: taskDiff ignores the due date when the PM4 task has none", () => {
    expect(taskDiff(pm4Task({ dueDate: null }), remoteTask(), ZAGREB)).toEqual(
      []
    );
  });

  it("AC-20 FR-INT-008: taskDiff compares the status as the PMSPA column, Status after Description and Due date last", () => {
    expect(
      taskDiff(
        pm4Task({
          title: "Design v2",
          status: "upcoming",
          dueDate: "2026-10-21"
        }),
        remoteTask({ description: "Mockups." }),
        ZAGREB
      )
    ).toEqual([
      { field: "Title", pm4: "Design v2", pmspa: "Design" },
      { field: "Description", pm4: null, pmspa: "Mockups." },
      { field: "Status", pm4: "Upcoming", pmspa: "In Progress" },
      { field: "Due date", pm4: "21 Oct 2026", pmspa: "20 Oct 2026" }
    ]);
  });

  it("AC-20 FR-INT-008: fingerprint is the first 8 bytes of SHA-256 over the JSON tuple, and stable (D1)", () => {
    const tuple = ["Acme", null, "Jane Doe", null];
    const expected = createHash("sha256")
      .update(JSON.stringify(tuple))
      .digest()
      .subarray(0, 8);

    const a = fingerprint(tuple);
    const b = fingerprint([...tuple]);

    expect(Buffer.isBuffer(a)).toBe(true);
    expect(a).toHaveLength(8);
    expect(a.equals(expected)).toBe(true);
    expect(a.equals(b)).toBe(true);
    expect(a.equals(fingerprint(["Acme", null, "John Roe", null]))).toBe(false);
  });

  it("AC-20 FR-INT-008: a pair with no differences has the same tuple on both sides", () => {
    const p = pm4Project({ description: "", externalLink: "ftp://x" });
    const r = remoteProject({ description: null, kanboard: null });
    expect(projectDiff(p, r)).toEqual([]);
    expect(projectTuple(p)).toEqual(projectTuple(r));
    expect(projectTuple(p)).toHaveLength(4);

    expect(taskTuple(pm4Task(), ZAGREB)).toEqual(
      taskTuple(remoteTask(), ZAGREB)
    );
    expect(taskTuple(pm4Task(), ZAGREB)).toHaveLength(6);
    expect(taskTuple(pm4Task({ dueDate: null }), ZAGREB)[5]).toBeNull();
  });

  it("AC-20 FR-INT-008: clearWarnings warns for a Description, Lead or External link PM4 has empty and PMSPA hasn't (D11)", () => {
    expect(
      clearWarnings([
        { field: "Title", pm4: "Acme", pmspa: "Acme Website" },
        { field: "Description", pm4: null, pmspa: "QA retainer." },
        { field: "Lead", pm4: "Jane Doe", pmspa: "John Roe" },
        { field: "External link", pm4: null, pmspa: "https://k.example.com" }
      ])
    ).toEqual([
      "PMSPA can't clear the Description: it keeps its value.",
      "PMSPA can't clear the External link: it keeps its value."
    ]);
    expect(
      clearWarnings([{ field: "Lead", pm4: null, pmspa: "John Roe" }])
    ).toEqual(["PMSPA can't clear the Lead: it keeps its value."]);
    expect(
      clearWarnings([{ field: "Description", pm4: "x", pmspa: null }])
    ).toEqual([]);
  });
});
