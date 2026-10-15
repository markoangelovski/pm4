import { Inject, Injectable } from "@nestjs/common";
import {
  and,
  asc,
  count,
  desc,
  eq,
  gte,
  inArray,
  lte,
  or,
  sql,
  type SQL
} from "drizzle-orm";
import { DRIZZLE, type DrizzleDb } from "../database/drizzle.js";
import {
  projects,
  tasks,
  timeLogs,
  workdays
} from "../database/schema/index.js";
import type { ReportProjectKind } from "./dto/dashboard-report-response.dto.js";

/** The writable columns of a time log. */
export interface TimeLogValues {
  workDate: string;
  durationMinutes: number;
  excludeFromStats: boolean;
  text: string;
  title: string | null;
  taskId: string | null;
  projectId: string | null;
  /** Only the update path sets it (D5); `create` never books a log. */
  bookingDate?: string | null;
  /** Only the update path sets it: a replaced link drops the retained task title. */
  deletedTaskTitle?: string | null;
  /** Only the update path sets it: a replaced link drops the retained project title. */
  deletedProjectTitle?: string | null;
}

/** The result of setting the booking date of several logs. */
export type SetBookingResult =
  | { status: "ok"; rows: TimeLogRow[] }
  | { status: "not-found" }
  | { status: "not-bookable" };

/** A day start to create together with a log. */
export interface DayStart {
  date: string;
  startMinute: number;
}

/** A log with its task and project (also deleted ones) and the retained names. */
export interface TimeLogRow {
  id: string;
  workDate: string;
  bookingDate: string | null;
  durationMinutes: number;
  excludeFromStats: boolean;
  text: string;
  title: string | null;
  taskId: string | null;
  projectId: string | null;
  deletedTaskTitle: string | null;
  deletedProjectTitle: string | null;
  taskTitle: string | null;
  projectTitle: string | null;
}

/** One dashboard day: its workday start (if any) and the sums of its logs. */
export interface ReportDayRow {
  workDate: string;
  startMinute: number | null;
  workedMinutes: number;
  bookedMinutes: number;
}

/** One dashboard project row: a `kind` group, with the retained name for deleted projects. */
export interface ReportProjectRow {
  kind: ReportProjectKind;
  projectId: string | null;
  projectTitle: string | null;
  deletedProjectTitle: string | null;
  workedMinutes: number;
  bookedMinutes: number;
}

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

  /** API-WD-004 (D3): the day's workday and logs (their bookings go with them). false = there was neither. */
  async deleteDay(userId: string, date: string): Promise<boolean> {
    const result = await this.db.execute<{ n: number }>(sql`
      WITH l AS (DELETE FROM ${timeLogs} WHERE ${timeLogs.userId} = ${userId} AND ${timeLogs.workDate} = ${date} RETURNING 1),
           w AS (DELETE FROM ${workdays} WHERE ${workdays.userId} = ${userId} AND ${workdays.workDate} = ${date} RETURNING 1)
      SELECT ((SELECT count(*) FROM l) + (SELECT count(*) FROM w))::int AS n`);
    return result.rows[0].n > 0;
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

  /** Logs worked or booked in `[from, to]`, ordered by work date, then entry order (API-BOOK-001). */
  async listBookingRange(
    userId: string,
    from: string,
    to: string
  ): Promise<TimeLogRow[]> {
    return this.selectRows(this.db)
      .where(
        and(
          eq(timeLogs.userId, userId),
          or(
            and(gte(timeLogs.workDate, from), lte(timeLogs.workDate, to)),
            and(gte(timeLogs.bookingDate, from), lte(timeLogs.bookingDate, to))
          )
        )
      )
      .orderBy(asc(timeLogs.workDate), asc(timeLogs.id));
  }

  /** API-TLOG-001: one page of a project's or task's logs (workDate desc, then id asc) and the totals over all of them. */
  async listLogs(
    userId: string,
    filter: { projectId: string } | { taskId: string },
    page: number,
    pageSize: number
  ): Promise<{
    rows: TimeLogRow[];
    total: number;
    totalMinutes: number;
    bookedMinutes: number;
  }> {
    const link: SQL =
      "projectId" in filter
        ? eq(timeLogs.projectId, filter.projectId)
        : eq(timeLogs.taskId, filter.taskId);
    const where = and(eq(timeLogs.userId, userId), link);
    const [rows, [totals]] = await Promise.all([
      this.selectRows(this.db)
        .where(where)
        .orderBy(desc(timeLogs.workDate), asc(timeLogs.id))
        .limit(pageSize)
        .offset((page - 1) * pageSize),
      this.db
        .select({
          total: count(),
          totalMinutes:
            sql<number>`coalesce(sum(${timeLogs.durationMinutes}), 0)`.mapWith(
              Number
            ),
          bookedMinutes:
            sql<number>`coalesce(sum(${timeLogs.durationMinutes}) FILTER (WHERE ${timeLogs.bookingDate} IS NOT NULL), 0)`.mapWith(
              Number
            )
        })
        .from(timeLogs)
        .where(where)
    ]);
    return {
      rows,
      total: totals.total,
      totalMinutes: totals.totalMinutes,
      bookedMinutes: totals.bookedMinutes
    };
  }

  /**
   * Sets (or clears, for `null`) the booking date of every listed log in one
   * transaction (API-BOOK-002). Nothing changes unless every log is the caller's
   * and, for a date, every log is bookable.
   */
  async setBookingDate(
    userId: string,
    ids: string[],
    bookingDate: string | null
  ): Promise<SetBookingResult> {
    const unique = [...new Set(ids)];
    return this.db.transaction(async (tx) => {
      const locked = await tx
        .select({
          id: timeLogs.id,
          excludeFromStats: timeLogs.excludeFromStats,
          projectId: timeLogs.projectId,
          deletedProjectTitle: timeLogs.deletedProjectTitle
        })
        .from(timeLogs)
        .where(and(eq(timeLogs.userId, userId), inArray(timeLogs.id, unique)))
        .for("update");
      if (locked.length < unique.length) return { status: "not-found" };
      if (
        bookingDate !== null &&
        locked.some(
          (row) =>
            row.excludeFromStats ||
            (row.projectId === null && row.deletedProjectTitle === null)
        )
      ) {
        return { status: "not-bookable" };
      }
      await tx
        .update(timeLogs)
        .set({ bookingDate })
        .where(and(eq(timeLogs.userId, userId), inArray(timeLogs.id, unique)));
      const rows = await this.selectRows(tx)
        .where(and(eq(timeLogs.userId, userId), inArray(timeLogs.id, unique)))
        .orderBy(asc(timeLogs.id));
      return { status: "ok", rows };
    });
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

  /** The workdays and logs of `[from, to]` per date (API-RPT-001 `days`). */
  async reportDays(
    userId: string,
    from: string,
    to: string
  ): Promise<ReportDayRow[]> {
    const result = await this.db.execute<{
      work_date: string;
      start_minute: number | null;
      worked: number;
      booked: number;
    }>(sql`
      WITH l AS (
        SELECT work_date, SUM(duration_minutes)::int AS worked,
               COALESCE(SUM(duration_minutes) FILTER (WHERE booking_date IS NOT NULL), 0)::int AS booked
        FROM time_logs
        WHERE user_id = ${userId} AND work_date BETWEEN ${from}::date AND ${to}::date
        GROUP BY work_date
      ), w AS (
        SELECT work_date, start_minute FROM workdays
        WHERE user_id = ${userId} AND work_date BETWEEN ${from}::date AND ${to}::date
      )
      SELECT COALESCE(w.work_date, l.work_date)::text AS work_date, w.start_minute,
             COALESCE(l.worked, 0) AS worked, COALESCE(l.booked, 0) AS booked
      FROM w FULL JOIN l ON l.work_date = w.work_date
      ORDER BY 1
    `);
    return result.rows.map((row) => ({
      workDate: row.work_date,
      startMinute: row.start_minute,
      workedMinutes: row.worked,
      bookedMinutes: row.booked
    }));
  }

  /** The logs of `[from, to]` grouped by project, retained name or kind (API-RPT-001 `projects`). */
  async reportProjects(
    userId: string,
    from: string,
    to: string
  ): Promise<ReportProjectRow[]> {
    const result = await this.db.execute<{
      kind: ReportProjectKind;
      project_id: string | null;
      deleted_project_title: string | null;
      project_title: string | null;
      worked: number;
      booked: number;
    }>(sql`
      SELECT g.kind, g.project_id, g.deleted_project_title, p.title AS project_title,
             SUM(g.duration_minutes)::int AS worked,
             COALESCE(SUM(g.duration_minutes) FILTER (WHERE g.booking_date IS NOT NULL), 0)::int AS booked
      FROM (
        SELECT duration_minutes, booking_date,
               CASE WHEN exclude_from_stats THEN 'nonprod'
                    WHEN project_id IS NULL AND deleted_project_title IS NULL THEN 'unsorted'
                    ELSE 'project' END AS kind,
               CASE WHEN NOT exclude_from_stats THEN project_id END AS project_id,
               CASE WHEN NOT exclude_from_stats AND project_id IS NULL THEN deleted_project_title END AS deleted_project_title
        FROM time_logs
        WHERE user_id = ${userId} AND work_date BETWEEN ${from}::date AND ${to}::date
      ) g
      LEFT JOIN projects p ON p.id = g.project_id
      GROUP BY g.kind, g.project_id, g.deleted_project_title, p.title
    `);
    return result.rows.map((row) => ({
      kind: row.kind,
      projectId: row.project_id,
      projectTitle: row.project_title,
      deletedProjectTitle: row.deleted_project_title,
      workedMinutes: row.worked,
      bookedMinutes: row.booked
    }));
  }

  private selectRows(db: Pick<DrizzleDb, "select"> = this.db) {
    return db
      .select({
        id: timeLogs.id,
        workDate: timeLogs.workDate,
        bookingDate: timeLogs.bookingDate,
        durationMinutes: timeLogs.durationMinutes,
        excludeFromStats: timeLogs.excludeFromStats,
        text: timeLogs.text,
        title: timeLogs.title,
        taskId: timeLogs.taskId,
        projectId: timeLogs.projectId,
        deletedTaskTitle: timeLogs.deletedTaskTitle,
        deletedProjectTitle: timeLogs.deletedProjectTitle,
        taskTitle: tasks.title,
        projectTitle: projects.title
      })
      .from(timeLogs)
      .leftJoin(tasks, eq(timeLogs.taskId, tasks.id))
      .leftJoin(projects, eq(timeLogs.projectId, projects.id))
      .$dynamic();
  }
}
