import type { PmspaClient } from "./pmspa-client.js";
import {
  inParallel,
  PMSPA_PARALLEL,
  PmspaRemote,
  PmspaWriteError
} from "./pmspa-remote.js";
import type { PmspaResponse } from "./pmspa-transport.js";

const USER = "65f1a0c0ffee00000000000a";

const reply = (status: number, body: unknown = null): PmspaResponse => ({
  status,
  headers: new Headers(),
  body
});

function setup(...replies: PmspaResponse[]) {
  const request = vi.fn();
  for (const r of replies) request.mockResolvedValueOnce(r);
  const client = { request } as unknown as PmspaClient;
  /** The request the fake was called with (the second argument of `PmspaClient.request`). */
  const sent = (i: number) =>
    request.mock.calls[i]?.[1] as {
      method: string;
      path: string;
      query?: Record<string, string>;
      body?: unknown;
    };
  return { remote: new PmspaRemote(client), request, sent };
}

describe("PmspaRemote (feat-int-sync-api)", () => {
  it("listProjects reads every page of 50 sorted by title until stats.remaining is 0", async () => {
    const page1 = Array.from({ length: 50 }, (_, i) => ({
      _id: `p${i}`,
      owner: USER,
      title: `P${i}`,
      openTasksCount: 1,
      closedTasksCount: 2
    }));
    const { remote, request, sent } = setup(
      reply(200, { projects: page1, stats: { remaining: 1 } }),
      reply(200, {
        projects: [{ _id: "p50", owner: USER, title: "P50", done: true }],
        stats: { remaining: 0 }
      })
    );

    const projects = await remote.listProjects(USER);

    expect(projects).toHaveLength(51);
    expect(projects[0]).toEqual({
      id: "p0",
      userId: USER,
      title: "P0",
      description: null,
      pl: null,
      kanboard: null,
      done: false,
      taskCount: 3
    });
    expect(projects[50]?.done).toBe(true);
    expect(request.mock.calls[0]?.[0]).toBe(USER);
    expect(sent(0)).toMatchObject({
      method: "GET",
      path: "/v1/projects",
      query: { sort: "title", skip: "0", limit: "50" }
    });
    expect(sent(1).query).toMatchObject({ skip: "50" });
  });

  it("listProjects → [] when PMSPA answers 404", async () => {
    const { remote } = setup(reply(404, { message: "gone" }));
    await expect(remote.listProjects(USER)).resolves.toEqual([]);
  });

  it("a read with another non-2xx status → pmspa-error", async () => {
    const { remote } = setup(
      reply(500, { message: "boom" }),
      reply(500, { message: "boom" })
    );
    await expect(remote.getProject(USER, "p1")).rejects.toMatchObject({
      status: 502
    });
    await expect(remote.getProject(USER, "p1")).rejects.toThrow(
      "PMSPA answered with an error."
    );
  });

  it("getProject → null on 404 and maps the record on 200", async () => {
    const { remote } = setup(
      reply(404),
      reply(200, {
        project: {
          _id: "p1",
          owner: USER,
          title: "Acme",
          description: "Site.",
          pl: "Jane",
          kanboard: "https://k.example.com/p/1"
        }
      })
    );
    await expect(remote.getProject(USER, "p1")).resolves.toBeNull();
    await expect(remote.getProject(USER, "p1")).resolves.toMatchObject({
      id: "p1",
      title: "Acme",
      description: "Site.",
      pl: "Jane",
      kanboard: "https://k.example.com/p/1"
    });
  });

  it("getTask reads GET /v1/tasks?task={id}", async () => {
    const { remote, sent } = setup(
      reply(200, {
        task: {
          _id: "t1",
          project: "p1",
          title: "Design",
          column: "In Progress",
          dueDate: 1792500000000
        }
      })
    );
    const task = await remote.getTask(USER, "t1");
    expect(sent(0)).toMatchObject({
      method: "GET",
      path: "/v1/tasks",
      query: { task: "t1" }
    });
    expect(task).toMatchObject({
      id: "t1",
      projectId: "p1",
      column: "In Progress",
      dueAt: 1792500000000
    });
  });

  it("updateProject PATCHes only the non-empty fields as propName/propValue", async () => {
    const { remote, sent } = setup(reply(200, { message: "ok" }));
    await remote.updateProject(USER, "p1", {
      title: "Acme",
      description: null,
      pl: "",
      kanboard: "https://k.example.com"
    });
    expect(sent(0)).toMatchObject({
      method: "PATCH",
      path: "/v1/projects/p1",
      body: [
        { propName: "title", propValue: "Acme" },
        { propName: "kanboard", propValue: "https://k.example.com" }
      ]
    });
  });

  it("updateTask sends done as a string and leaves out a null due date", async () => {
    const { remote, sent } = setup(reply(201, { task: {} }));
    await remote.updateTask(USER, "t1", {
      title: "Design",
      description: null,
      pl: null,
      kanboard: null,
      column: "Completed",
      done: true,
      dueAt: null
    });
    expect(sent(0).body).toEqual([
      { propName: "title", propValue: "Design" },
      { propName: "column", propValue: "Completed" },
      { propName: "done", propValue: "true" }
    ]);
  });

  it("createTask POSTs the project and the fields as strings", async () => {
    const { remote, sent } = setup(
      reply(201, {
        task: {
          _id: "t9",
          project: "p1",
          title: "Design",
          column: "Upcoming",
          dueDate: 1792500000000
        }
      })
    );
    const task = await remote.createTask(USER, {
      project: "p1",
      title: "Design",
      description: null,
      pl: null,
      kanboard: null,
      column: "Upcoming",
      done: false,
      dueAt: "1792500000000"
    });
    expect(sent(0)).toMatchObject({
      method: "POST",
      path: "/v1/tasks",
      body: {
        project: "p1",
        title: "Design",
        column: "Upcoming",
        done: "false",
        dueDate: "1792500000000"
      }
    });
    expect(task.id).toBe("t9");
  });

  it("a write answered with a non-2xx → PmspaWriteError with D10's reason", async () => {
    const { remote } = setup(
      reply(500, { message: "Bad column", error: "ERR_VALIDATION" })
    );
    const err = await remote
      .updateProject(USER, "p1", {
        title: "Acme",
        description: null,
        pl: null,
        kanboard: null
      })
      .catch((e: unknown) => e);
    expect(err).toBeInstanceOf(PmspaWriteError);
    expect((err as Error).message).toBe(
      "PMSPA rejected it: Bad column (ERR_VALIDATION)"
    );
  });

  it("a write without a body → the status as the reason", async () => {
    const { remote } = setup(reply(422, null));
    await expect(
      remote.updateProject(USER, "p1", {
        title: "Acme",
        description: null,
        pl: null,
        kanboard: null
      })
    ).rejects.toThrow("PMSPA rejected it: HTTP 422");
  });
});

describe("PmspaRemote days writes (feat-int-time-api)", () => {
  it("createEvent posts the event without a task key when it has none", async () => {
    const { remote, sent } = setup(reply(200, {}), reply(200, {}));
    await remote.createEvent(USER, {
      day: "2026-10-14",
      start: 8,
      title: "nonprod",
      task: null,
      duration: 0.5
    });
    await remote.createEvent(USER, {
      day: "2026-10-14",
      start: 8,
      title: "Dev",
      task: "t1",
      duration: 1
    });
    expect(sent(0)).toMatchObject({
      method: "POST",
      path: "/v1/days/event.create",
      body: { day: "2026-10-14", start: 8, title: "nonprod", duration: 0.5 }
    });
    expect(sent(0).body).not.toHaveProperty("task");
    expect(sent(1).body).toMatchObject({ task: "t1" });
  });

  it("updateEvent patches propName/propValue pairs", async () => {
    const { remote, sent } = setup(reply(200, {}));
    await remote.updateEvent(USER, "e1", { booked: true });
    expect(sent(0)).toMatchObject({
      method: "PATCH",
      path: "/v1/days/event.update/e1",
      body: [{ propName: "booked", propValue: true }]
    });
  });

  it("deleteEvent, createLog and updateLog hit their paths", async () => {
    const { remote, sent } = setup(
      reply(200, {}),
      reply(200, {}),
      reply(200, {})
    );
    await remote.deleteEvent(USER, "d1", "e1");
    await remote.createLog(USER, "e1", { title: "T", duration: 1 });
    await remote.updateLog(USER, "l1", { title: "T", duration: 2 });
    expect(sent(0)).toMatchObject({
      method: "DELETE",
      path: "/v1/days/event.delete/d1/e1"
    });
    expect(sent(1)).toMatchObject({
      method: "POST",
      path: "/v1/days/log.create",
      body: { event: "e1", title: "T", duration: 1 }
    });
    expect(sent(2)).toMatchObject({
      method: "PATCH",
      path: "/v1/days/log.update/l1",
      body: [
        { propName: "title", propValue: "T" },
        { propName: "duration", propValue: 2 }
      ]
    });
  });

  it("deleteLog resolves on 404 and rejects on another failure", async () => {
    const { remote, sent } = setup(
      reply(404, {}),
      reply(204),
      reply(500, { message: "boom" })
    );
    await expect(remote.deleteLog(USER, "l1")).resolves.toBeUndefined();
    await expect(remote.deleteLog(USER, "l2")).resolves.toBeUndefined();
    await expect(remote.deleteLog(USER, "l3")).rejects.toBeDefined();
    expect(sent(0)).toMatchObject({
      method: "DELETE",
      path: "/v1/days/log.delete/l1"
    });
  });
});

describe("inParallel (feat-int-budget)", () => {
  it("keeps the input order", async () => {
    const out = await inParallel([30, 1, 10, 2], async (n) => {
      await new Promise((r) => setTimeout(r, n));
      return n * 2;
    });
    expect(out).toEqual([60, 2, 20, 4]);
  });

  it("runs at most PMSPA_PARALLEL at a time", async () => {
    let active = 0;
    let peak = 0;
    await inParallel([1, 2, 3, 4, 5, 6], async () => {
      active += 1;
      peak = Math.max(peak, active);
      await new Promise((r) => setTimeout(r, 5));
      active -= 1;
    });
    expect(peak).toBe(PMSPA_PARALLEL);
  });

  it("rejects with the first rejection", async () => {
    await expect(
      inParallel([1, 2, 3], (n) =>
        n >= 2 ? Promise.reject(new Error(`bad ${n}`)) : Promise.resolve(n)
      )
    ).rejects.toThrow("bad 2");
  });

  it("is empty for no items", async () => {
    expect(await inParallel([], () => Promise.resolve(1))).toEqual([]);
  });
});
