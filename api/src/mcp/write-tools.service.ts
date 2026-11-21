import { Injectable, Logger } from "@nestjs/common";
import type { McpServer } from "@modelcontextprotocol/server";
import * as z from "zod";
import { CreateTaskDto, TASK_STATUSES } from "../tasks/dto/create-task.dto.js";
import { UpdateTaskDto } from "../tasks/dto/update-task.dto.js";
import { TasksService } from "../tasks/tasks.service.js";
import { validateDto } from "../common/validation/validation-pipe.js";
import { CreateTimeLogDto } from "../time/dto/create-time-log.dto.js";
import { SetWorkdayDto } from "../time/dto/set-workday.dto.js";
import { UpdateTimeLogDto } from "../time/dto/update-time-log.dto.js";
import { TimeLogsService } from "../time/time-logs.service.js";
import { WorkdaysService } from "../time/workdays.service.js";
import { UsersRepository } from "../users/users.repository.js";
import { present, runTool, userToday } from "./mcp-tools.js";

/** The write tools (FR-MCP-008); registered for `pm4:write` tokens only (feat-mcp-tools-api T3). */
@Injectable()
export class McpWriteTools {
  private readonly logger = new Logger(McpWriteTools.name);

  constructor(
    private readonly tasks: TasksService,
    private readonly workdays: WorkdaysService,
    private readonly timeLogs: TimeLogsService,
    private readonly users: UsersRepository
  ) {}

  register(server: McpServer, userId: string): void {
    const logFields = {
      workDate: z.string().optional().describe("YYYY-MM-DD; not after today"),
      durationMinutes: z.int().describe("minutes, a multiple of 15 (15–1440)"),
      text: z.string().describe("the note, 1–1000 characters"),
      title: z.string().nullable().optional(),
      projectId: z.uuid().nullable().optional(),
      taskId: z.uuid().nullable().optional(),
      excludeFromStats: z.boolean().optional(),
      dayStartMinute: z
        .int()
        .optional()
        .describe(
          "minutes after midnight, a multiple of 15: the day's start when the date has none yet"
        )
    };

    server.registerTool(
      "log_time",
      {
        title: "Log time",
        description:
          "Creates a time log: duration in minutes (a multiple of 15), a note, and optionally a project or task. workDate is YYYY-MM-DD; default: today in the user's time zone.",
        inputSchema: z.object(logFields),
        annotations: { readOnlyHint: false, destructiveHint: false }
      },
      (args) =>
        runTool(this.logger, async () =>
          this.timeLogs.create(
            userId,
            await validateDto(
              CreateTimeLogDto,
              present({
                ...args,
                workDate: args.workDate ?? (await userToday(this.users, userId))
              }),
              "body"
            )
          )
        )
    );

    server.registerTool(
      "update_time_log",
      {
        title: "Update time log",
        description:
          "Changes a time log's fields; only the given ones change. Sending projectId or taskId replaces the log's link as a unit. Durations are in minutes, a multiple of 15.",
        inputSchema: z.object({
          id: z.uuid(),
          workDate: logFields.workDate,
          durationMinutes: logFields.durationMinutes.optional(),
          text: logFields.text.optional(),
          title: logFields.title,
          projectId: logFields.projectId,
          taskId: logFields.taskId,
          excludeFromStats: logFields.excludeFromStats,
          dayStartMinute: logFields.dayStartMinute
        }),
        annotations: { readOnlyHint: false, destructiveHint: false }
      },
      (args) =>
        runTool(this.logger, async () => {
          const { id, ...fields } = args;
          return this.timeLogs.update(
            userId,
            id,
            await validateDto(UpdateTimeLogDto, present(fields), "body")
          );
        })
    );

    server.registerTool(
      "create_task",
      {
        title: "Create task",
        description:
          "Creates a task in a project. status defaults to upcoming; dueDate is YYYY-MM-DD.",
        inputSchema: z.object({
          projectId: z.uuid(),
          title: z.string().describe("1–200 characters"),
          description: z.string().nullable().optional(),
          status: z.enum(TASK_STATUSES).optional(),
          dueDate: z.string().nullable().optional(),
          serviceId: z.uuid().nullable().optional(),
          externalLink: z.string().nullable().optional()
        }),
        annotations: { readOnlyHint: false, destructiveHint: false }
      },
      (args) =>
        runTool(this.logger, async () =>
          this.tasks.create(
            userId,
            await validateDto(CreateTaskDto, present(args), "body")
          )
        )
    );

    server.registerTool(
      "set_task_status",
      {
        title: "Set task status",
        description: "Changes a task's status.",
        inputSchema: z.object({
          id: z.uuid(),
          status: z.enum(TASK_STATUSES)
        }),
        annotations: {
          readOnlyHint: false,
          destructiveHint: false,
          idempotentHint: true
        }
      },
      (args) =>
        runTool(this.logger, async () =>
          this.tasks.update(
            userId,
            args.id,
            await validateDto(UpdateTaskDto, { status: args.status }, "body")
          )
        )
    );

    server.registerTool(
      "set_workday_start",
      {
        title: "Set workday start",
        description:
          "Sets a date's start time in minutes after midnight (a multiple of 15). workDate is YYYY-MM-DD; default: today in the user's time zone.",
        inputSchema: z.object({
          workDate: z.string().optional(),
          startMinute: z
            .int()
            .describe("minutes after midnight, a multiple of 15 (0–1425)")
        }),
        annotations: {
          readOnlyHint: false,
          destructiveHint: false,
          idempotentHint: true
        }
      },
      (args) =>
        runTool(this.logger, async () => {
          const dto = await validateDto(
            SetWorkdayDto,
            { startMinute: args.startMinute },
            "body"
          );
          return this.workdays.setStart(
            userId,
            args.workDate ?? (await userToday(this.users, userId)),
            dto.startMinute
          );
        })
    );
  }
}
