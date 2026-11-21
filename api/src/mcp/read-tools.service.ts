import { Injectable, Logger, UnauthorizedException } from "@nestjs/common";
import type { McpServer } from "@modelcontextprotocol/server";
import * as z from "zod";
import {
  ListProjectsQueryDto,
  PROJECT_SORTS
} from "../projects/dto/list-projects-query.dto.js";
import { ProjectsService } from "../projects/projects.service.js";
import { TASK_STATUSES } from "../tasks/dto/create-task.dto.js";
import {
  ListTasksQueryDto,
  TASK_SORTS
} from "../tasks/dto/list-tasks-query.dto.js";
import { TasksService } from "../tasks/tasks.service.js";
import { validateDto } from "../common/validation/validation-pipe.js";
import { ReportsService } from "../time/reports.service.js";
import { TimeLogsService } from "../time/time-logs.service.js";
import { WorkdaysQueryDto } from "../time/dto/workdays-query.dto.js";
import { WorkdaysService } from "../time/workdays.service.js";
import { UsersRepository } from "../users/users.repository.js";
import { present, runTool, userToday } from "./mcp-tools.js";
import { summarizeReport } from "./report-summary.js";

/** The read tools (FR-MCP-008); registered by feat-mcp-tools-api T2. */
@Injectable()
export class McpReadTools {
  private readonly logger = new Logger(McpReadTools.name);

  constructor(
    private readonly projects: ProjectsService,
    private readonly tasks: TasksService,
    private readonly workdays: WorkdaysService,
    private readonly timeLogs: TimeLogsService,
    private readonly reports: ReportsService,
    private readonly users: UsersRepository
  ) {}

  register(server: McpServer, userId: string): void {
    server.registerTool(
      "search_projects",
      {
        title: "Search projects",
        description:
          "Search the user's projects by title or project lead (case-insensitive). Default: most recently updated first, page 1, 25 per page (pageSize 1–100).",
        inputSchema: z.object({
          query: z.string().optional(),
          sort: z.enum(PROJECT_SORTS).optional(),
          page: z.int().min(1).optional(),
          pageSize: z.int().min(1).max(100).optional()
        }),
        annotations: { readOnlyHint: true }
      },
      (args) =>
        runTool(this.logger, async () =>
          this.projects.list(
            userId,
            await validateDto(
              ListProjectsQueryDto,
              present({
                q: args.query,
                sort: args.sort,
                page: args.page,
                pageSize: args.pageSize
              }),
              "query"
            )
          )
        )
    );

    server.registerTool(
      "search_tasks",
      {
        title: "Search tasks",
        description:
          "Search the user's tasks by title, optionally within one project (projectId) and by status. Default: most recently updated first, page 1, 25 per page (pageSize 1–100).",
        inputSchema: z.object({
          query: z.string().optional(),
          projectId: z.uuid().optional(),
          status: z.array(z.enum(TASK_STATUSES)).min(1).optional(),
          sort: z.enum(TASK_SORTS).optional(),
          page: z.int().min(1).optional(),
          pageSize: z.int().min(1).max(100).optional()
        }),
        annotations: { readOnlyHint: true }
      },
      (args) =>
        runTool(this.logger, async () =>
          this.tasks.list(
            userId,
            await validateDto(
              ListTasksQueryDto,
              present({
                q: args.query,
                projectId: args.projectId,
                status: args.status,
                sort: args.sort,
                page: args.page,
                pageSize: args.pageSize
              }),
              "query"
            )
          )
        )
    );

    server.registerTool(
      "get_day",
      {
        title: "Get day",
        description:
          "A day's start time and its time logs in entry order. workDate is YYYY-MM-DD; default: today in the user's time zone.",
        inputSchema: z.object({ workDate: z.string().optional() }),
        annotations: { readOnlyHint: true }
      },
      (args) =>
        runTool(this.logger, async () =>
          this.workdays.getDay(
            userId,
            args.workDate ?? (await userToday(this.users, userId))
          )
        )
    );

    server.registerTool(
      "list_time_logs",
      {
        title: "List time logs",
        description:
          "The time logs worked from `from` to `to` (YYYY-MM-DD, at most 366 days apart), by date then entry order, with their total in minutes. Optionally only one project or task.",
        inputSchema: z.object({
          from: z.string(),
          to: z.string(),
          projectId: z.uuid().optional(),
          taskId: z.uuid().optional()
        }),
        annotations: { readOnlyHint: true }
      },
      (args) =>
        runTool(this.logger, () =>
          this.timeLogs.listRange(userId, {
            from: args.from,
            to: args.to,
            projectId: args.projectId,
            taskId: args.taskId
          })
        )
    );

    server.registerTool(
      "report_summary",
      {
        title: "Report summary",
        description:
          "Worked, booked and non-productive minutes from `from` to `to` (YYYY-MM-DD, at most 366 days apart), with the weekdays in the range, the target (weekdays × the user's daily target) and the per-project rows.",
        inputSchema: z.object({ from: z.string(), to: z.string() }),
        annotations: { readOnlyHint: true }
      },
      (args) =>
        runTool(this.logger, async () => {
          const query = await validateDto(
            WorkdaysQueryDto,
            { from: args.from, to: args.to },
            "query"
          );
          const report = await this.reports.dashboard(userId, query);
          const user = await this.users.findById(userId);
          if (!user) throw new UnauthorizedException();
          return summarizeReport(
            report,
            args.from,
            args.to,
            user.dailyTargetMinutes
          );
        })
    );
  }
}
