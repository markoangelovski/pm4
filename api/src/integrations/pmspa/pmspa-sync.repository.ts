import { Inject, Injectable } from "@nestjs/common";
import { and, asc, eq, inArray, or, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { DRIZZLE, type DrizzleDb } from "../../database/drizzle.js";
import {
  projects,
  tasks,
  timeLogs,
  users,
  workdays
} from "../../database/schema/index.js";
import type { Pm4Project, Pm4Task } from "./pmspa-fields.js";
import type { Pm4DayLog } from "./pmspa-time-preview.js";

const lead = alias(users, "lead");

/** The lead's read-model name: the lead user's display name, else the saved text (as the projects list). */
const leadName = sql<
  string | null
>`coalesce(${lead.displayName}, ${projects.projectLead})`;
const taskLeadName = sql<
  string | null
>`coalesce(${lead.displayName}, ${tasks.projectLead})`;

/** PM4 projects and tasks as the sync mapping needs them. Every method is scoped by `userId`. */
@Injectable()
export class PmspaSyncRepository {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDb) {}

  /** All the caller's projects, by title. */
  async pm4Projects(userId: string): Promise<Pm4Project[]> {
    return this.db
      .select({
        id: projects.id,
        title: projects.title,
        description: projects.description,
        externalLink: projects.externalLink,
        leadName
      })
      .from(projects)
      .leftJoin(lead, eq(lead.id, projects.projectLeadUserId))
      .where(eq(projects.userId, userId))
      .orderBy(asc(sql`lower(${projects.title})`), asc(projects.id));
  }

  /** The caller's project. */
  async pm4Project(userId: string, id: string): Promise<Pm4Project | null> {
    const [row] = await this.db
      .select({
        id: projects.id,
        title: projects.title,
        description: projects.description,
        externalLink: projects.externalLink,
        leadName
      })
      .from(projects)
      .leftJoin(lead, eq(lead.id, projects.projectLeadUserId))
      .where(and(eq(projects.userId, userId), eq(projects.id, id)))
      .limit(1);
    return row ?? null;
  }

  /** The work date of the caller's PM4 time log, or null when it isn't theirs (API-INT-014). */
  async pm4LogWorkDate(userId: string, id: string): Promise<string | null> {
    const [row] = await this.db
      .select({ workDate: timeLogs.workDate })
      .from(timeLogs)
      .where(and(eq(timeLogs.userId, userId), eq(timeLogs.id, id)))
      .limit(1);
    return row?.workDate ?? null;
  }

  /**
   * The caller's PM4 logs worked on one of `dates` or with one of `ids`, in entry order (API-INT-010, API-INT-008).
   * Read like `TimeRepository.listDay`, with the booked flag and the task and project as the push reads them.
   */
  async pm4Logs(
    userId: string,
    q: { dates: string[]; ids: string[] }
  ): Promise<Pm4DayLog[]> {
    const match = [
      ...(q.dates.length ? [inArray(timeLogs.workDate, q.dates)] : []),
      ...(q.ids.length ? [inArray(timeLogs.id, q.ids)] : [])
    ];
    if (match.length === 0) return [];
    const rows = await this.db
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
      .where(and(eq(timeLogs.userId, userId), or(...match)))
      .orderBy(asc(timeLogs.id));
    return rows.map((row) => ({
      id: row.id,
      workDate: row.workDate,
      text: row.text,
      title: row.title,
      durationMinutes: row.durationMinutes,
      excludeFromStats: row.excludeFromStats,
      booked: row.bookingDate !== null,
      task:
        row.taskId !== null && row.taskTitle !== null
          ? { id: row.taskId, title: row.taskTitle, deleted: false }
          : row.deletedTaskTitle !== null
            ? { id: null, title: row.deletedTaskTitle, deleted: true }
            : null,
      project:
        row.projectId !== null && row.projectTitle !== null
          ? { id: row.projectId, title: row.projectTitle, deleted: false }
          : row.deletedProjectTitle !== null
            ? { id: null, title: row.deletedProjectTitle, deleted: true }
            : null
    }));
  }

  /** The PM4 workday start (minute) of each of `dates`, `null` when the day has none (API-INT-010). */
  async pm4Starts(
    userId: string,
    dates: string[]
  ): Promise<Record<string, number | null>> {
    const starts: Record<string, number | null> = {};
    for (const date of dates) starts[date] = null;
    if (dates.length === 0) return starts;
    const rows = await this.db
      .select({
        workDate: workdays.workDate,
        startMinute: workdays.startMinute
      })
      .from(workdays)
      .where(
        and(eq(workdays.userId, userId), inArray(workdays.workDate, dates))
      );
    for (const row of rows) starts[row.workDate] = row.startMinute;
    return starts;
  }

  /** The caller's tasks, all projects or the ones of `projectId`, by title. */
  async pm4Tasks(userId: string, projectId?: string): Promise<Pm4Task[]> {
    return this.db
      .select({
        id: tasks.id,
        projectId: tasks.projectId,
        title: tasks.title,
        description: tasks.description,
        externalLink: tasks.externalLink,
        status: tasks.status,
        dueDate: tasks.dueDate,
        leadName: taskLeadName
      })
      .from(tasks)
      .leftJoin(lead, eq(lead.id, tasks.projectLeadUserId))
      .where(
        and(
          eq(tasks.userId, userId),
          projectId === undefined ? undefined : eq(tasks.projectId, projectId)
        )
      )
      .orderBy(asc(sql`lower(${tasks.title})`), asc(tasks.id));
  }

  /** The caller's task. */
  async pm4Task(userId: string, id: string): Promise<Pm4Task | null> {
    const [row] = await this.db
      .select({
        id: tasks.id,
        projectId: tasks.projectId,
        title: tasks.title,
        description: tasks.description,
        externalLink: tasks.externalLink,
        status: tasks.status,
        dueDate: tasks.dueDate,
        leadName: taskLeadName
      })
      .from(tasks)
      .leftJoin(lead, eq(lead.id, tasks.projectLeadUserId))
      .where(and(eq(tasks.userId, userId), eq(tasks.id, id)))
      .limit(1);
    return row ?? null;
  }

  /** The titles of the caller's projects or tasks among `ids`, by id. */
  async titles(
    userId: string,
    type: "project" | "task",
    ids: string[]
  ): Promise<Map<string, string>> {
    const titles = new Map<string, string>();
    if (ids.length === 0) return titles;
    const rows =
      type === "project"
        ? await this.db
            .select({ id: projects.id, title: projects.title })
            .from(projects)
            .where(and(eq(projects.userId, userId), inArray(projects.id, ids)))
        : await this.db
            .select({ id: tasks.id, title: tasks.title })
            .from(tasks)
            .where(and(eq(tasks.userId, userId), inArray(tasks.id, ids)));
    for (const row of rows) titles.set(row.id, row.title);
    return titles;
  }
}
