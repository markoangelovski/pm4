import {
  BadRequestException,
  Injectable,
  NotFoundException,
  UnauthorizedException
} from "@nestjs/common";
import { isISO8601, isUUID } from "class-validator";
import type { RefDto } from "../common/dto/ref.dto.js";
import { ProjectsService } from "../projects/projects.service.js";
import { TasksService } from "../tasks/tasks.service.js";
import { UsersRepository } from "../users/users.repository.js";
import { formatDuration } from "../common/duration.js";
import { toBookingLogDto } from "./bookings.service.js";
import { CreateTimeLogDto } from "./dto/create-time-log.dto.js";
import { ListTimeLogsQueryDto } from "./dto/list-time-logs-query.dto.js";
import { TimeLogListResponseDto } from "./dto/time-log-list-response.dto.js";
import { TimeLogResponseDto } from "./dto/time-log-response.dto.js";
import { UpdateTimeLogDto } from "./dto/update-time-log.dto.js";
import {
  type DayStart,
  type TimeLogRow,
  type TimeLogValues,
  TimeRepository
} from "./time.repository.js";

/** `400` naming `field` unless `value` is a real `YYYY-MM-DD` date. */
export function assertDate(value: string, field: string): void {
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(value) ||
    !isISO8601(value, { strict: true })
  ) {
    throw new BadRequestException({
      errors: [{ field, message: "must be a date in YYYY-MM-DD format" }]
    });
  }
}

/** Whole days from `from` to `to` (both `YYYY-MM-DD`). */
export function daysBetween(from: string, to: string): number {
  return Math.round((Date.parse(to) - Date.parse(from)) / 86_400_000);
}

/** Today's date in the time zone, as `YYYY-MM-DD`. */
export function todayIn(timeZone: string): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(new Date());
}

/** `400` naming `field` when `date` is after today in the caller's time zone (D5). */
export async function assertNotFuture(
  usersRepository: UsersRepository,
  userId: string,
  date: string,
  field: string
): Promise<void> {
  const user = await usersRepository.findById(userId);
  if (!user) {
    throw new UnauthorizedException("Missing or invalid access token.");
  }
  const today = todayIn(user.timeZone);
  if (date > today) {
    throw new BadRequestException({
      errors: [{ field, message: "must not be after today" }]
    });
  }
}

/** PATCH would leave the log shorter than its booked time (API-TLOG-004, OQ-213). */
export class BookedTimeException extends BadRequestException {
  constructor(readonly bookedMinutes: number) {
    const t = formatDuration(bookedMinutes);
    super({
      errors: [
        {
          field: "durationMinutes",
          message: `${t} of this log is booked. Remove bookings first, or keep at least ${t}.`
        }
      ]
    });
  }
}

/** A live link (`title` set), else the retained name of a deleted one (data-model.md *Retained names*). */
export function toRef(
  id: string | null,
  title: string | null,
  snapshot: string | null
): RefDto | null {
  if (title !== null) return { id, title, deleted: false };
  if (snapshot !== null) return { id: null, title: snapshot, deleted: true };
  return null;
}

/** The `TimeLog` read model, with the retained names of deleted links. */
export function toTimeLogDto(row: TimeLogRow): TimeLogResponseDto {
  return {
    id: row.id,
    workDate: row.workDate,
    durationMinutes: row.durationMinutes,
    text: row.text,
    title: row.title,
    project: toRef(row.projectId, row.projectTitle, row.deletedProjectTitle),
    task: toRef(row.taskId, row.taskTitle, row.deletedTaskTitle),
    excludeFromStats: row.excludeFromStats
  };
}

interface Link {
  taskId: string | null;
  projectId: string | null;
}

/** Time logs (API-TLOG-001/002/004/006), always the caller's own. */
@Injectable()
export class TimeLogsService {
  constructor(
    private readonly timeRepository: TimeRepository,
    private readonly usersRepository: UsersRepository,
    private readonly tasksService: TasksService,
    private readonly projectsService: ProjectsService
  ) {}

  async list(
    userId: string,
    query: ListTimeLogsQueryDto
  ): Promise<TimeLogListResponseDto> {
    const { projectId, taskId } = query;
    let filter: { projectId: string } | { taskId: string };
    if (projectId !== undefined && taskId === undefined) {
      filter = { projectId };
    } else if (taskId !== undefined && projectId === undefined) {
      filter = { taskId };
    } else {
      throw new BadRequestException({
        errors: [
          {
            field: "projectId",
            message: "exactly one of projectId and taskId is required"
          }
        ]
      });
    }
    const { rows, total, totalMinutes, bookedMinutes, days } =
      await this.timeRepository.listLogs(
        userId,
        filter,
        query.page,
        query.pageSize
      );
    return {
      items: rows.map(toBookingLogDto),
      page: query.page,
      pageSize: query.pageSize,
      total,
      totalMinutes,
      bookedMinutes,
      days
    };
  }

  async create(
    userId: string,
    dto: CreateTimeLogDto
  ): Promise<TimeLogResponseDto> {
    await assertNotFuture(
      this.usersRepository,
      userId,
      dto.workDate,
      "workDate"
    );
    const link = await this.resolveLink(
      userId,
      dto.taskId,
      dto.projectId,
      null
    );
    const dayStart = await this.dayStartFor(
      userId,
      dto.workDate,
      dto.dayStartMinute
    );
    const id = await this.timeRepository.insertLog(
      userId,
      {
        workDate: dto.workDate,
        durationMinutes: dto.durationMinutes,
        excludeFromStats: dto.excludeFromStats ?? false,
        text: dto.text,
        title: dto.title ?? null,
        ...link
      },
      dayStart
    );
    return this.get(userId, id);
  }

  async update(
    userId: string,
    id: string,
    dto: UpdateTimeLogDto
  ): Promise<TimeLogResponseDto> {
    const log = await this.findOwned(userId, id);

    const values: Partial<TimeLogValues> = {};
    let dayStart: DayStart | null = null;

    if (dto.workDate !== undefined && dto.workDate !== log.workDate) {
      await assertNotFuture(
        this.usersRepository,
        userId,
        dto.workDate,
        "workDate"
      );
      dayStart = await this.dayStartFor(
        userId,
        dto.workDate,
        dto.dayStartMinute
      );
      values.workDate = dto.workDate;
    }
    const linkReplaced =
      dto.taskId !== undefined || dto.projectId !== undefined;
    let link: Link | null = null;
    if (linkReplaced) {
      link = await this.resolveLink(userId, dto.taskId, dto.projectId, log);
      Object.assign(values, link);
      values.deletedTaskTitle = null;
      values.deletedProjectTitle = null;
    }
    if (dto.durationMinutes !== undefined) {
      values.durationMinutes = dto.durationMinutes;
    }
    if (dto.text !== undefined) values.text = dto.text;
    if (dto.title !== undefined) values.title = dto.title;
    if (dto.excludeFromStats !== undefined) {
      values.excludeFromStats = dto.excludeFromStats;
    }

    // D5 / FR-BOOK-006: a log that becomes unbookable loses its booking.
    const excluded = dto.excludeFromStats ?? log.excludeFromStats;
    const hasProject = link
      ? link.projectId !== null
      : log.projectId !== null || log.deletedProjectTitle !== null;
    const clear = excluded || !hasProject;

    const result = await this.timeRepository.updateLog(
      userId,
      id,
      values,
      dayStart,
      clear ? "clear" : "keep"
    );
    if (result.status === "over-booked") {
      throw new BookedTimeException(result.bookedMinutes);
    }
    return this.get(userId, id);
  }

  async remove(userId: string, id: string): Promise<void> {
    await this.findOwned(userId, id);
    await this.timeRepository.deleteLog(userId, id);
  }

  private async get(userId: string, id: string): Promise<TimeLogResponseDto> {
    return toTimeLogDto(await this.findOwned(userId, id));
  }

  private async findOwned(userId: string, id: string): Promise<TimeLogRow> {
    const row = isUUID(id)
      ? await this.timeRepository.findLog(userId, id)
      : null;
    if (!row) throw new NotFoundException("Time log not found.");
    return row;
  }

  /** `dayStartMinute` is required when the date has no workday (D2). */
  private async dayStartFor(
    userId: string,
    date: string,
    startMinute: number | undefined
  ): Promise<DayStart | null> {
    const existing = await this.timeRepository.getWorkday(userId, date);
    if (existing !== null) return null;
    if (startMinute === undefined) {
      throw new BadRequestException({
        errors: [
          {
            field: "dayStartMinute",
            message: "is required when the day has no start time"
          }
        ]
      });
    }
    return { date, startMinute };
  }

  /**
   * The link as a unit (absent counts as `null`): a task fixes the project;
   * a link equal to the log's current one skips the existence check (D1).
   */
  private async resolveLink(
    userId: string,
    taskIdInput: string | null | undefined,
    projectIdInput: string | null | undefined,
    current: Link | null
  ): Promise<Link> {
    const taskId = taskIdInput ?? null;
    const projectId = projectIdInput ?? null;

    if (taskId !== null) {
      if (current && current.taskId === taskId) {
        if (projectId !== null && projectId !== current.projectId) {
          this.projectMismatch();
        }
        return { taskId, projectId: current.projectId };
      }
      const task = await this.tasksService.findOwned(userId, taskId);
      if (projectId !== null && projectId !== task.projectId) {
        this.projectMismatch();
      }
      return { taskId, projectId: task.projectId };
    }

    if (projectId !== null) {
      if (current && current.projectId === projectId) {
        return { taskId: null, projectId };
      }
      await this.projectsService.findOwned(userId, projectId);
      return { taskId: null, projectId };
    }

    return { taskId: null, projectId: null };
  }

  private projectMismatch(): never {
    throw new BadRequestException({
      errors: [{ field: "projectId", message: "must be the task's project" }]
    });
  }
}
