import type { PmspaClient } from "./pmspa-client.js";
import { PmspaRemote, PmspaWriteError } from "./pmspa-remote.js";
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
