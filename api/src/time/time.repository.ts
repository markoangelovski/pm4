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
  bookings,
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
  /** Only the update path sets it: a replaced link drops the retained task title. */
  deletedTaskTitle?: string | null;
  /** Only the update path sets it: a replaced link drops the retained project title. */
  deletedProjectTitle?: string | null;
}

/** One booking of a log. */
export interface BookingValue {
  date: string;
  minutes: number;
}

/** The result of replacing the bookings of several logs. */
export type SetBookingsResult =
  | { status: "ok"; rows: BookingLogRow[] }
  | { status: "not-found" }
  | {
      status: "invalid";
      index: number;
      message: "can't be booked" | "adds up to more than the log's duration";
    };

/** The result of updating a log. */
export type UpdateLogResult =
  { status: "ok" } | { status: "over-booked"; bookedMinutes: number };

/** A day start to create together with a log. */
export interface DayStart {
  date: string;
  startMinute: number;
}

/** A log with its task and project (also deleted ones) and the retained names. */
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
  projectTitle: string | null;
}

/** A log row with its bookings, by date ascending. */
export type BookingLogRow = TimeLogRow & { bookings: BookingValue[] };

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

  /**
   * Sets the given columns (and the day start, when given) in one transaction.
   * `keep`: refuses a duration below the booked minutes; `clear`: deletes the log's bookings (D5).
   */
  async updateLog(
    userId: string,
    id: string,
    values: Partial<TimeLogValues>,
    dayStart: DayStart | null,
    bookingsMode: "keep" | "clear"
  ): Promise<UpdateLogResult> {
    return this.db.transaction(async (tx) => {
      await tx
        .select({ id: timeLogs.id })
        .from(timeLogs)
        .where(and(eq(timeLogs.userId, userId), eq(timeLogs.id, id)))
        .for("update");
      if (bookingsMode === "keep" && values.durationMinutes !== undefined) {
        const [row] = await tx
          .select({
            booked: sql<number>`coalesce(sum(${bookings.minutes}), 0)`.mapWith(
              Number
            )
          })
          .from(bookings)
          .where(eq(bookings.timeLogId, id));
        if (values.durationMinutes < row.booked) {
          return { status: "over-booked", bookedMinutes: row.booked };
        }
      }
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
      if (bookingsMode === "clear") {
        await tx
          .delete(bookings)
          .where(and(eq(bookings.userId, userId), eq(bookings.timeLogId, id)));
      }
      return { status: "ok" };
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
  ): Promise<BookingLogRow[]> {
    const rows = await this.selectRows(this.db)
      .where(
        and(
          eq(timeLogs.userId, userId),
          or(
            and(gte(timeLogs.workDate, from), lte(timeLogs.workDate, to)),
            inArray(
              timeLogs.id,
              this.db
                .select({ id: bookings.timeLogId })
                .from(bookings)
                .where(
                  and(
                    eq(bookings.userId, userId),
                    gte(bookings.bookingDate, from),
                    lte(bookings.bookingDate, to)
                  )
                )
            )
          )
        )
      )
      .orderBy(asc(timeLogs.workDate), asc(timeLogs.id));
    return this.withBookings(this.db, userId, rows);
  }

  /** API-TLOG-001: one page of a project's or task's logs (workDate desc, then id asc) and the totals over all of them. */
  async listLogs(
    userId: string,
    filter: { projectId: string } | { taskId: string },
    page: number,
    pageSize: number
  ): Promise<{
    rows: BookingLogRow[];
    total: number;
    totalMinutes: number;
    bookedMinutes: number;
  }> {
    const link: SQL =
      "projectId" in filter
        ? eq(timeLogs.projectId, filter.projectId)
        : eq(timeLogs.taskId, filter.taskId);
    const where = and(eq(timeLogs.userId, userId), link);
    const [rawRows, [totals], [booked]] = await Promise.all([
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
            )
        })
        .from(timeLogs)
        .where(where),
      this.db
        .select({
          bookedMinutes:
            sql<number>`coalesce(sum(${bookings.minutes}), 0)`.mapWith(Number)
        })
        .from(bookings)
        .innerJoin(timeLogs, eq(timeLogs.id, bookings.timeLogId))
        .where(where)
    ]);
    const rows = await this.withBookings(this.db, userId, rawRows);
    return {
      rows,
      total: totals.total,
      totalMinutes: totals.totalMinutes,
      bookedMinutes: booked.bookedMinutes
    };
  }

  /**
   * Replaces the bookings of every listed log in one transaction (API-BOOK-002).
   * Nothing changes unless every log is the caller's and every entry is valid.
   */
  async setBookings(
    userId: string,
    entries: { logId: string; bookings: BookingValue[] }[]
  ): Promise<SetBookingsResult> {
    const ids = entries.map((e) => e.logId);
    return this.db.transaction(async (tx) => {
      const locked = await tx
        .select({
          id: timeLogs.id,
          durationMinutes: timeLogs.durationMinutes,
          excludeFromStats: timeLogs.excludeFromStats,
          projectId: timeLogs.projectId,
          deletedProjectTitle: timeLogs.deletedProjectTitle
        })
        .from(timeLogs)
        .where(and(eq(timeLogs.userId, userId), inArray(timeLogs.id, ids)))
        .for("update");
      if (locked.length < entries.length) return { status: "not-found" };
      const byId = new Map(locked.map((row) => [row.id, row]));
      for (const [index, entry] of entries.entries()) {
        if (entry.bookings.length === 0) continue;
        const log = byId.get(entry.logId)!;
        if (
          log.excludeFromStats ||
          (log.projectId === null && log.deletedProjectTitle === null)
        ) {
          return { status: "invalid", index, message: "can't be booked" };
        }
        const sum = entry.bookings.reduce((n, b) => n + b.minutes, 0);
        if (sum > log.durationMinutes) {
          return {
            status: "invalid",
            index,
            message: "adds up to more than the log's duration"
          };
        }
      }
      await tx
        .delete(bookings)
        .where(
          and(eq(bookings.userId, userId), inArray(bookings.timeLogId, ids))
        );
      const values = entries.flatMap((e) =>
        e.bookings.map((b) => ({
          userId,
          timeLogId: e.logId,
          bookingDate: b.date,
          minutes: b.minutes
        }))
      );
      if (values.length > 0) await tx.insert(bookings).values(values);
      const rows = await this.selectRows(tx)
        .where(and(eq(timeLogs.userId, userId), inArray(timeLogs.id, ids)))
        .orderBy(asc(timeLogs.id));
      return { status: "ok", rows: await this.withBookings(tx, userId, rows) };
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
               COALESCE(SUM(booked_minutes), 0)::int AS booked
        FROM (
          SELECT work_date, duration_minutes,
                 (SELECT SUM(bk.minutes) FROM bookings bk WHERE bk.time_log_id = time_logs.id) AS booked_minutes
          FROM time_logs
          WHERE user_id = ${userId} AND work_date BETWEEN ${from}::date AND ${to}::date
        ) per_log
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
             COALESCE(SUM(g.booked_minutes), 0)::int AS booked
      FROM (
        SELECT duration_minutes,
               (SELECT SUM(bk.minutes) FROM bookings bk WHERE bk.time_log_id = time_logs.id) AS booked_minutes,
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

  /** The bookings of the given logs, by date ascending; [] for a log without any. */
  private async withBookings(
    db: Pick<DrizzleDb, "select">,
    userId: string,
    rows: TimeLogRow[]
  ): Promise<BookingLogRow[]> {
    if (rows.length === 0) return [];
    const found = await db
      .select({
        timeLogId: bookings.timeLogId,
        date: bookings.bookingDate,
        minutes: bookings.minutes
      })
      .from(bookings)
      .where(
        and(
          eq(bookings.userId, userId),
          inArray(
            bookings.timeLogId,
            rows.map((r) => r.id)
          )
        )
      )
      .orderBy(asc(bookings.bookingDate));
    const byLog = new Map<string, BookingValue[]>();
    for (const b of found) {
      const list = byLog.get(b.timeLogId) ?? [];
      list.push({ date: b.date, minutes: b.minutes });
      byLog.set(b.timeLogId, list);
    }
    return rows.map((row) => ({ ...row, bookings: byLog.get(row.id) ?? [] }));
  }

  private selectRows(db: Pick<DrizzleDb, "select"> = this.db) {
    return db
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
        projectTitle: projects.title
      })
      .from(timeLogs)
      .leftJoin(tasks, eq(timeLogs.taskId, tasks.id))
      .leftJoin(projects, eq(timeLogs.projectId, projects.id))
      .$dynamic();
  }
}
