import { Inject, Injectable } from "@nestjs/common";
import { and, asc, eq, gte, lte, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { DRIZZLE, type DrizzleDb } from "../database/drizzle.js";
import {
  projects,
  tasks,
  timeLogs,
  workdays
} from "../database/schema/index.js";

/** The writable columns of a time log. */
export interface TimeLogValues {
  workDate: string;
  durationMinutes: number;
  excludeFromStats: boolean;
  text: string;
  title: string | null;
  taskId: string | null;
  projectId: string | null;
}

/** A day start to create together with a log. */
export interface DayStart {
  date: string;
  startMinute: number;
}

/** A log with its task and project (also trashed ones) and the retained names. */
export interface TimeLogRow {
  id: string;
  workDate: string;
  durationMinutes: number;
  excludeFromStats: boolean;
  text: string;
  title: string | null;
  taskId: string | null;
  projectId: string | null;
  deletedTaskTitle: string | null;
  deletedProjectTitle: string | null;
  taskTitle: string | null;
  taskDeletedAt: Date | null;
  taskProjectDeletedAt: Date | null;
  projectTitle: string | null;
  projectDeletedAt: Date | null;
}

const taskProject = alias(projects, "task_project");

/** Data access for `workdays` and `time_logs`. Every method is scoped by `userId`. */
@Injectable()
export class TimeRepository {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDb) {}

  /** The start minute of the date's workday, or `null`. */
  async getWorkday(userId: string, date: string): Promise<number | null> {
    const [row] = await this.db
      .select({ startMinute: workdays.startMinute })
      .from(workdays)
      .where(and(eq(workdays.userId, userId), eq(workdays.workDate, date)))
      .limit(1);
    return row?.startMinute ?? null;
  }

  async upsertWorkday(
    userId: string,
    date: string,
    startMinute: number
  ): Promise<void> {
    await this.db
      .insert(workdays)
      .values({ userId, workDate: date, startMinute })
      .onConflictDoUpdate({
        target: [workdays.userId, workdays.workDate],
        set: { startMinute }
      });
  }

  /** Inserts the log (and the day start, when given) in one transaction. */
  async insertLog(
    userId: string,
    values: TimeLogValues,
    dayStart: DayStart | null
  ): Promise<string> {
    return this.db.transaction(async (tx) => {
      if (dayStart) {
        await tx
          .insert(workdays)
          .values({
            userId,
            workDate: dayStart.date,
            startMinute: dayStart.startMinute
          })
          .onConflictDoNothing();
      }
      const [row] = await tx
        .insert(timeLogs)
        .values({ ...values, userId })
        .returning({ id: timeLogs.id });
      return row.id;
    });
  }

  async findLog(userId: string, id: string): Promise<TimeLogRow | null> {
    const [row] = await this.selectRows()
      .where(and(eq(timeLogs.userId, userId), eq(timeLogs.id, id)))
      .limit(1);
    return row ?? null;
  }

  /** Sets the given columns (and the day start, when given) in one transaction. */
  async updateLog(
    userId: string,
    id: string,
    values: Partial<TimeLogValues>,
    dayStart: DayStart | null
  ): Promise<void> {
    await this.db.transaction(async (tx) => {
      if (dayStart) {
        await tx
          .insert(workdays)
          .values({
            userId,
            workDate: dayStart.date,
            startMinute: dayStart.startMinute
          })
          .onConflictDoNothing();
      }
      if (Object.keys(values).length > 0) {
        await tx
          .update(timeLogs)
          .set(values)
          .where(and(eq(timeLogs.userId, userId), eq(timeLogs.id, id)));
      }
    });
  }

  async deleteLog(userId: string, id: string): Promise<void> {
    await this.db
      .delete(timeLogs)
      .where(and(eq(timeLogs.userId, userId), eq(timeLogs.id, id)));
  }

  /** The date's logs in the order they were created. */
  async listDay(userId: string, date: string): Promise<TimeLogRow[]> {
    return this.selectRows()
      .where(and(eq(timeLogs.userId, userId), eq(timeLogs.workDate, date)))
      .orderBy(asc(timeLogs.id));
  }

  /** The workdays in `[from, to]` with the sum of their logs. */
  async listWorkdays(
    userId: string,
    from: string,
    to: string
  ): Promise<
    { workDate: string; startMinute: number; totalMinutes: number }[]
  > {
    return this.db
      .select({
        workDate: workdays.workDate,
        startMinute: workdays.startMinute,
        totalMinutes: sql<number>`coalesce(sum(${timeLogs.durationMinutes}), 0)::int`
      })
      .from(workdays)
      .leftJoin(
        timeLogs,
        and(
          eq(timeLogs.userId, workdays.userId),
          eq(timeLogs.workDate, workdays.workDate)
        )
      )
      .where(
        and(
          eq(workdays.userId, userId),
          gte(workdays.workDate, from),
          lte(workdays.workDate, to)
        )
      )
      .groupBy(workdays.userId, workdays.workDate, workdays.startMinute)
      .orderBy(asc(workdays.workDate));
  }

  private selectRows() {
    return this.db
      .select({
        id: timeLogs.id,
        workDate: timeLogs.workDate,
        durationMinutes: timeLogs.durationMinutes,
        excludeFromStats: timeLogs.excludeFromStats,
        text: timeLogs.text,
        title: timeLogs.title,
        taskId: timeLogs.taskId,
        projectId: timeLogs.projectId,
        deletedTaskTitle: timeLogs.deletedTaskTitle,
        deletedProjectTitle: timeLogs.deletedProjectTitle,
        taskTitle: tasks.title,
        taskDeletedAt: tasks.deletedAt,
        taskProjectDeletedAt: taskProject.deletedAt,
        projectTitle: projects.title,
        projectDeletedAt: projects.deletedAt
      })
      .from(timeLogs)
      .leftJoin(tasks, eq(timeLogs.taskId, tasks.id))
      .leftJoin(taskProject, eq(tasks.projectId, taskProject.id))
      .leftJoin(projects, eq(timeLogs.projectId, projects.id))
      .$dynamic();
  }
}
