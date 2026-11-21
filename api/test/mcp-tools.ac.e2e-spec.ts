import { NestExpressApplication } from "@nestjs/platform-express";
import request from "supertest";
import { createTestApp } from "./create-test-app.js";
import {
  accessTokenFor,
  closeTestClients,
  deleteTestUsers,
  insertUser,
  type UserRow
} from "./support/auth-test-utils.js";
import {
  callTool,
  mcpAccessTokenFor,
  mcpPost
} from "./support/mcp-test-utils.js";
import { insertProject, insertTask } from "./support/project-test-utils.js";

const READ_TOOLS = [
  "search_projects",
  "search_tasks",
  "get_day",
  "list_time_logs",
  "report_summary"
];
const WRITE_TOOLS = [
  "log_time",
  "update_time_log",
  "create_task",
  "set_task_status",
  "set_workday_start"
];

/** Today in `Europe/Zagreb` (the time zone `insertUser()` uses), as YYYY-MM-DD. */
function todayZagreb(offsetDays = 0): string {
  const now = new Date(Date.now() + offsetDays * 86_400_000);
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Zagreb",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(now);
}

interface LogBody {
  id: string;
  workDate: string;
  durationMinutes: number;
  text: string;
  project: { id: string | null; title: string } | null;
}

interface DayBody {
  startMinute: number | null;
  logs: LogBody[];
}

interface ToolInfo {
  name: string;
  description?: string;
  inputSchema?: { type?: string };
}

describe("MCP tools (feat-mcp-tools-api)", () => {
  let app: NestExpressApplication;

  beforeAll(async () => {
    app = await createTestApp();
  });

  afterAll(async () => {
    await deleteTestUsers();
    await closeTestClients();
    await app.close();
  });

  const write = (user: UserRow) => mcpAccessTokenFor(user.id);
  const read = (user: UserRow) => mcpAccessTokenFor(user.id, { scope: "read" });

  /** A REST call as `user` (to seed data and to check effects). */
  const rest = (user: UserRow) => {
    const auth = `Bearer ${accessTokenFor(user.id)}`;
    const server = app.getHttpServer();
    return {
      get: (url: string) =>
        request(server).get(`/api/v1${url}`).set("Authorization", auth),
      post: (url: string, body: object) =>
        request(server)
          .post(`/api/v1${url}`)
          .set("Authorization", auth)
          .send(body)
    };
  };

  /** Creates a log through the REST API (day start 09:00 for a new date). */
  const seedLog = async (
    user: UserRow,
    fields: Record<string, unknown>
  ): Promise<LogBody> => {
    const response = await rest(user).post("/time-logs", {
      durationMinutes: 30,
      text: "Work",
      dayStartMinute: 540,
      ...fields
    });
    expect(response.status, JSON.stringify(response.body)).toBe(201);
    return response.body as LogBody;
  };

  const listTools = async (
    token: string
  ): Promise<
    { name: string; description?: string; inputSchema?: { type?: string } }[]
  > => {
    const response = await mcpPost(app, token, {
      jsonrpc: "2.0",
      id: 1,
      method: "tools/list"
    });
    expect(response.status).toBe(200);
    return (response.body as { result: { tools: ToolInfo[] } }).result.tools;
  };

  it("AC-7 FR-MCP-008: tools/list → ten tools for a write token, the five read tools for a read token, each with an object inputSchema and a description", async () => {
    const user = await insertUser();

    const writeTools = await listTools(write(user));
    expect(writeTools.map((t) => t.name).sort()).toEqual(
      [...READ_TOOLS, ...WRITE_TOOLS].sort()
    );
    const readTools = await listTools(read(user));
    expect(readTools.map((t) => t.name).sort()).toEqual([...READ_TOOLS].sort());

    for (const tool of [...writeTools, ...readTools]) {
      expect(tool.inputSchema?.type, tool.name).toBe("object");
      expect(tool.description, tool.name).toBeTruthy();
    }
  });

  it("AC-8 FR-MCP-008: a read token calling log_time → an error and no new log", async () => {
    const user = await insertUser();

    const response = await mcpPost(app, read(user), {
      jsonrpc: "2.0",
      id: 1,
      method: "tools/call",
      params: {
        name: "log_time",
        arguments: {
          durationMinutes: 60,
          text: "Nope",
          dayStartMinute: 540
        }
      }
    });

    const rpc = response.body as {
      error?: unknown;
      result?: { isError?: boolean };
    };
    const refused = rpc.error !== undefined || rpc.result?.isError === true;
    expect(refused, JSON.stringify(response.body)).toBe(true);
    const day = await rest(user).get(`/workdays/${todayZagreb()}`);
    expect((day.body as DayBody).logs).toEqual([]);
  });

  it("AC-9 FR-MCP-008: search_projects {query} → only the user's matching project; pageSize 101 → isError", async () => {
    const a = await insertUser();
    const other = await insertUser();
    await insertProject(a.id, { title: "Alpha site" });
    await insertProject(a.id, { title: "Beta" });
    await insertProject(other.id, { title: "Alpha other" });

    const result = await callTool(app, write(a), "search_projects", {
      query: "Alpha"
    });

    expect(result.isError).toBe(false);
    const body = result.json as {
      items: { title: string }[];
      page: number;
      pageSize: number;
      total: number;
    };
    expect(body.items.map((p) => p.title)).toEqual(["Alpha site"]);
    expect(body.page).toBe(1);
    expect(body.pageSize).toBe(25);
    expect(body.total).toBe(1);

    const tooBig = await callTool(app, write(a), "search_projects", {
      pageSize: 101
    });
    expect(tooBig.isError).toBe(true);
  });

  it("AC-10 FR-MCP-008: search_tasks {projectId, status} → only that project's in-progress tasks", async () => {
    const a = await insertUser();
    const p = await insertProject(a.id, { title: "P" });
    const q = await insertProject(a.id, { title: "Q" });
    const wanted = await insertTask(a.id, p.id, {
      status: "in-progress",
      title: "Wanted"
    });
    await insertTask(a.id, p.id, { status: "upcoming", title: "Not started" });
    await insertTask(a.id, q.id, { status: "in-progress", title: "Elsewhere" });

    const result = await callTool(app, write(a), "search_tasks", {
      projectId: p.id,
      status: ["in-progress"]
    });

    expect(result.isError).toBe(false);
    const body = result.json as { items: { id: string }[]; total: number };
    expect(body.items.map((t) => t.id)).toEqual([wanted.id]);
    expect(body.total).toBe(1);
  });

  it("AC-11 FR-MCP-008: get_day → today by default, a day's logs in order with its start, a bad date → isError", async () => {
    const a = await insertUser();

    const today = await callTool(app, write(a), "get_day", {});
    expect(today.isError).toBe(false);
    expect((today.json as { workDate: string }).workDate).toBe(todayZagreb());

    const first = await seedLog(a, { workDate: "2026-01-05", text: "First" });
    const second = await seedLog(a, { workDate: "2026-01-05", text: "Second" });
    const day = await callTool(app, write(a), "get_day", {
      workDate: "2026-01-05"
    });
    expect(day.isError).toBe(false);
    const body = day.json as {
      workDate: string;
      startMinute: number;
      logs: LogBody[];
    };
    expect(body.workDate).toBe("2026-01-05");
    expect(body.startMinute).toBe(540);
    expect(body.logs.map((l) => l.id)).toEqual([first.id, second.id]);

    const bad = await callTool(app, write(a), "get_day", {
      workDate: "2026-13-01"
    });
    expect(bad.isError).toBe(true);
    expect(bad.text).toContain("- date: must be a date in YYYY-MM-DD format");
  });

  it("AC-12 FR-MCP-008: list_time_logs → the logs of the range by date then entry order, with their total; project filter; a range over 366 days → isError", async () => {
    const a = await insertUser();
    const other = await insertUser();
    const p = await insertProject(a.id, { title: "P" });
    const l1 = await seedLog(a, {
      workDate: "2026-01-05",
      durationMinutes: 30,
      projectId: p.id
    });
    const l2 = await seedLog(a, {
      workDate: "2026-01-05",
      durationMinutes: 45
    });
    const l3 = await seedLog(a, {
      workDate: "2026-01-06",
      durationMinutes: 60,
      projectId: p.id
    });
    await seedLog(a, { workDate: "2026-01-07", durationMinutes: 15 });
    await seedLog(other, { workDate: "2026-01-05", durationMinutes: 90 });

    const all = await callTool(app, write(a), "list_time_logs", {
      from: "2026-01-05",
      to: "2026-01-06"
    });
    expect(all.isError).toBe(false);
    const allBody = all.json as {
      from: string;
      to: string;
      totalMinutes: number;
      items: LogBody[];
    };
    expect(allBody.from).toBe("2026-01-05");
    expect(allBody.to).toBe("2026-01-06");
    expect(allBody.items.map((l) => l.id)).toEqual([l1.id, l2.id, l3.id]);
    expect(allBody.totalMinutes).toBe(135);

    const filtered = await callTool(app, write(a), "list_time_logs", {
      from: "2026-01-05",
      to: "2026-01-06",
      projectId: p.id
    });
    expect(filtered.isError).toBe(false);
    const filteredBody = filtered.json as {
      totalMinutes: number;
      items: LogBody[];
    };
    expect(filteredBody.items.map((l) => l.id)).toEqual([l1.id, l3.id]);
    expect(filteredBody.totalMinutes).toBe(90);

    const tooLong = await callTool(app, write(a), "list_time_logs", {
      from: "2026-01-01",
      to: "2027-01-03"
    });
    expect(tooLong.isError).toBe(true);
    expect(tooLong.text).toContain(
      "- to: must not be before from and at most 366 days after it"
    );
  });

  it("AC-13 FR-MCP-008: report_summary → worked, booked, weekdays, target and the per-project rows", async () => {
    const a = await insertUser();
    const p = await insertProject(a.id, { title: "Report project" });
    await seedLog(a, {
      workDate: "2026-01-01",
      durationMinutes: 120,
      projectId: p.id
    });
    await seedLog(a, {
      workDate: "2026-01-03",
      durationMinutes: 60,
      projectId: p.id
    });

    const result = await callTool(app, write(a), "report_summary", {
      from: "2026-01-01",
      to: "2026-01-04"
    });

    expect(result.isError).toBe(false);
    expect(result.json).toMatchObject({
      workedMinutes: 180,
      bookedMinutes: 0,
      weekdays: 2,
      dailyTargetMinutes: 420,
      targetMinutes: 840,
      projects: [
        {
          kind: "project",
          project: { title: "Report project" },
          workedMinutes: 180,
          bookedMinutes: 0
        }
      ]
    });
    expect((result.json as { projects: unknown[] }).projects).toHaveLength(1);
  });

  it("AC-15 FR-MCP-008: log_time → a log dated today; the day shows it and the start", async () => {
    const a = await insertUser();
    const p = await insertProject(a.id, { title: "P" });
    const today = todayZagreb();

    const result = await callTool(app, write(a), "log_time", {
      durationMinutes: 60,
      text: "Wrote spec",
      projectId: p.id,
      dayStartMinute: 540
    });

    expect(result.isError, result.text).toBe(false);
    const log = result.json as LogBody;
    expect(log).toMatchObject({
      workDate: today,
      durationMinutes: 60,
      text: "Wrote spec"
    });
    expect(log.project?.id).toBe(p.id);

    const day = await rest(a).get(`/workdays/${today}`);
    expect(day.status).toBe(200);
    const dayBody = day.body as DayBody;
    expect(dayBody.startMinute).toBe(540);
    expect(dayBody.logs.map((l) => l.id)).toEqual([log.id]);
  });

  it("AC-16 FR-MCP-008: log_time errors → isError with the REST messages", async () => {
    const a = await insertUser();
    const other = await insertUser();
    const otherProject = await insertProject(other.id, { title: "Theirs" });
    const otherTask = await insertTask(other.id, otherProject.id);

    const future = await callTool(app, write(a), "log_time", {
      workDate: todayZagreb(2),
      durationMinutes: 30,
      text: "Future",
      dayStartMinute: 540
    });
    expect(future.isError).toBe(true);
    expect(future.text).toContain("- workDate: must not be after today");

    const noStart = await callTool(app, write(a), "log_time", {
      durationMinutes: 30,
      text: "No start"
    });
    expect(noStart.isError).toBe(true);
    expect(noStart.text).toContain(
      "- dayStartMinute: is required when the day has no start time"
    );

    const badDuration = await callTool(app, write(a), "log_time", {
      durationMinutes: 20,
      text: "Odd",
      dayStartMinute: 540
    });
    expect(badDuration.isError).toBe(true);
    expect(badDuration.text).toMatch(/^- durationMinutes:/m);

    const foreignTask = await callTool(app, write(a), "log_time", {
      durationMinutes: 30,
      text: "Theirs",
      taskId: otherTask.id,
      dayStartMinute: 540
    });
    expect(foreignTask.isError).toBe(true);
    expect(foreignTask.text).toBe("Task not found.");

    const noText = await callTool(app, write(a), "log_time", {
      durationMinutes: 30,
      dayStartMinute: 540
    });
    expect(noText.isError).toBe(true);
  });

  it("AC-17 FR-MCP-008: update_time_log → the updated log; another user's log → isError Time log not found.", async () => {
    const a = await insertUser();
    const other = await insertUser();
    const mine = await seedLog(a, { workDate: "2026-01-05" });
    const theirs = await seedLog(other, { workDate: "2026-01-05" });

    const updated = await callTool(app, write(a), "update_time_log", {
      id: mine.id,
      durationMinutes: 90
    });
    expect(updated.isError, updated.text).toBe(false);
    expect(updated.json).toMatchObject({ id: mine.id, durationMinutes: 90 });

    const foreign = await callTool(app, write(a), "update_time_log", {
      id: theirs.id,
      durationMinutes: 90
    });
    expect(foreign.isError).toBe(true);
    expect(foreign.text).toBe("Time log not found.");
  });

  it("AC-18 FR-MCP-008: create_task → an upcoming task; set_task_status → the new status; another user's task → isError Task not found.", async () => {
    const a = await insertUser();
    const other = await insertUser();
    const p = await insertProject(a.id, { title: "P" });
    const otherProject = await insertProject(other.id, { title: "Theirs" });
    const theirs = await insertTask(other.id, otherProject.id);

    const created = await callTool(app, write(a), "create_task", {
      projectId: p.id,
      title: "Draft"
    });
    expect(created.isError, created.text).toBe(false);
    const task = created.json as { id: string; title: string; status: string };
    expect(task.title).toBe("Draft");
    expect(task.status).toBe("upcoming");

    const moved = await callTool(app, write(a), "set_task_status", {
      id: task.id,
      status: "in-progress"
    });
    expect(moved.isError, moved.text).toBe(false);
    expect(moved.json).toMatchObject({ id: task.id, status: "in-progress" });

    const foreign = await callTool(app, write(a), "set_task_status", {
      id: theirs.id,
      status: "in-progress"
    });
    expect(foreign.isError).toBe(true);
    expect(foreign.text).toBe("Task not found.");
  });

  it("AC-19 FR-MCP-008: set_workday_start → the day's start; an off-grid start → isError", async () => {
    const a = await insertUser();

    const set = await callTool(app, write(a), "set_workday_start", {
      startMinute: 480
    });
    expect(set.isError, set.text).toBe(false);
    expect(set.json).toMatchObject({
      workDate: todayZagreb(),
      startMinute: 480
    });

    const bad = await callTool(app, write(a), "set_workday_start", {
      startMinute: 485
    });
    expect(bad.isError).toBe(true);
    expect(bad.text).toMatch(/^- startMinute:/m);
  });
});
