import { Inject, Injectable } from "@nestjs/common";
import {
  and,
  asc,
  count,
  desc,
  eq,
  ilike,
  isNull,
  or,
  sql,
  type SQL
} from "drizzle-orm";
import { escapeLike } from "../common/sql/escape-like.js";
import { DRIZZLE, type DrizzleDb } from "../database/drizzle.js";
import { notes, projects, tasks } from "../database/schema/index.js";
import type { NoteSort } from "./dto/list-notes-query.dto.js";

/** The writable columns of a note. */
export interface NoteValues {
  title: string | null;
  body: string;
  projectId: string | null;
  taskId: string | null;
}

/** A note with the live titles of its project and task. */
export interface NoteRow {
  id: string;
  title: string | null;
  body: string;
  projectId: string | null;
  taskId: string | null;
  projectTitle: string | null;
  taskTitle: string | null;
  deletedProjectTitle: string | null;
  deletedTaskTitle: string | null;
  createdAt: Date;
  updatedAt: Date;
}

/** The filters of `GET /notes`; `timeZone` is set when `from` or `to` is. */
export interface NoteFilter {
  projectId?: string;
  taskId?: string;
  unlinked?: boolean;
  q?: string;
  from?: string;
  to?: string;
  timeZone?: string;
}

const SORT_COLUMN = {
  updatedAt: notes.updatedAt,
  createdAt: notes.createdAt
} as const;

function orderBy(sort: NoteSort): SQL[] {
  const [field, direction] = sort.split(":") as [
    keyof typeof SORT_COLUMN,
    "asc" | "desc"
  ];
  const dir = direction === "asc" ? asc : desc;
  return [dir(SORT_COLUMN[field]), dir(notes.id)];
}

/** Data access for `notes`. Every method is scoped by `userId`. */
@Injectable()
export class NotesRepository {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDb) {}

  async insert(userId: string, values: NoteValues): Promise<string> {
    const [row] = await this.db
      .insert(notes)
      .values({ ...values, userId })
      .returning({ id: notes.id });
    return row.id;
  }

  /** The caller's note. */
  async findById(userId: string, id: string): Promise<NoteRow | null> {
    const [row] = await this.selectRows()
      .where(and(eq(notes.userId, userId), eq(notes.id, id)))
      .limit(1);
    return row ?? null;
  }

  /** A page of the caller's notes, plus the total that match. */
  async list(
    userId: string,
    filter: NoteFilter,
    sort: NoteSort,
    page: number,
    pageSize: number
  ): Promise<{ rows: NoteRow[]; total: number }> {
    const pattern = filter.q ? `%${escapeLike(filter.q)}%` : null;
    const column = SORT_COLUMN[sort.split(":")[0] as keyof typeof SORT_COLUMN];
    const where = and(
      eq(notes.userId, userId),
      filter.projectId ? eq(notes.projectId, filter.projectId) : undefined,
      filter.taskId ? eq(notes.taskId, filter.taskId) : undefined,
      filter.unlinked
        ? and(isNull(notes.projectId), isNull(notes.deletedProjectTitle))
        : undefined,
      pattern
        ? or(ilike(notes.title, pattern), ilike(notes.body, pattern))
        : undefined,
      filter.from && filter.timeZone
        ? sql`(${column} AT TIME ZONE ${filter.timeZone})::date >= ${filter.from}::date`
        : undefined,
      filter.to && filter.timeZone
        ? sql`(${column} AT TIME ZONE ${filter.timeZone})::date <= ${filter.to}::date`
        : undefined
    );
    const [rows, [{ total }]] = await Promise.all([
      this.selectRows()
        .where(where)
        .orderBy(...orderBy(sort))
        .limit(pageSize)
        .offset((page - 1) * pageSize),
      this.db.select({ total: count() }).from(notes).where(where)
    ]);
    return { rows, total };
  }

  /** Sets the given columns and `updatedAt = now()`. */
  async update(
    userId: string,
    id: string,
    values: Partial<NoteValues> &
      Partial<{
        deletedProjectTitle: string | null;
        deletedTaskTitle: string | null;
      }>
  ): Promise<void> {
    await this.db
      .update(notes)
      .set({ ...values, updatedAt: sql`now()` })
      .where(and(eq(notes.userId, userId), eq(notes.id, id)));
  }

  /** `false` = not the caller's. */
  async delete(userId: string, id: string): Promise<boolean> {
    const rows = await this.db
      .delete(notes)
      .where(and(eq(notes.userId, userId), eq(notes.id, id)))
      .returning({ id: notes.id });
    return rows.length > 0;
  }

  /** `notes` with the live titles of the project and task. */
  private selectRows() {
    return this.db
      .select({
        id: notes.id,
        title: notes.title,
        body: notes.body,
        projectId: notes.projectId,
        taskId: notes.taskId,
        projectTitle: projects.title,
        taskTitle: tasks.title,
        deletedProjectTitle: notes.deletedProjectTitle,
        deletedTaskTitle: notes.deletedTaskTitle,
        createdAt: notes.createdAt,
        updatedAt: notes.updatedAt
      })
      .from(notes)
      .leftJoin(projects, eq(projects.id, notes.projectId))
      .leftJoin(tasks, eq(tasks.id, notes.taskId))
      .$dynamic();
  }
}
