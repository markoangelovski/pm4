import { Inject, Injectable } from "@nestjs/common";
import { and, asc, desc, eq, ilike, isNull, sql, type SQL } from "drizzle-orm";
import { escapeLike } from "../common/sql/escape-like.js";
import { DRIZZLE, type DrizzleDb } from "../database/drizzle.js";
import { projects, tasks, todos } from "../database/schema/index.js";
import type { NoteSort } from "./dto/list-notes-query.dto.js";

/** The writable columns of a to-do. `doneAt` is set by the service. */
export interface TodoValues {
  text: string;
  projectId: string | null;
  taskId: string | null;
  doneAt: Date | SQL | null;
}

/** A to-do with the live titles of its project and task. */
export interface TodoRow {
  id: string;
  text: string;
  doneAt: Date | null;
  projectId: string | null;
  taskId: string | null;
  projectTitle: string | null;
  taskTitle: string | null;
  deletedProjectTitle: string | null;
  deletedTaskTitle: string | null;
  createdAt: Date;
  updatedAt: Date;
}

/** The filters of `GET /todos`; `timeZone` is set when `from` or `to` is. */
export interface TodoFilter {
  projectId?: string;
  taskId?: string;
  unlinked?: boolean;
  q?: string;
  from?: string;
  to?: string;
  timeZone?: string;
}

const SORT_COLUMN = {
  updatedAt: todos.updatedAt,
  createdAt: todos.createdAt
} as const;

function orderBy(sort: NoteSort): SQL[] {
  const [field, direction] = sort.split(":") as [
    keyof typeof SORT_COLUMN,
    "asc" | "desc"
  ];
  const dir = direction === "asc" ? asc : desc;
  return [dir(SORT_COLUMN[field]), dir(todos.id)];
}

/** Data access for `todos`. Every method is scoped by `userId`. */
@Injectable()
export class TodosRepository {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDb) {}

  async insert(userId: string, values: TodoValues): Promise<string> {
    const [row] = await this.db
      .insert(todos)
      .values({ ...values, userId })
      .returning({ id: todos.id });
    return row.id;
  }

  /** The caller's to-do. */
  async findById(userId: string, id: string): Promise<TodoRow | null> {
    const [row] = await this.selectRows()
      .where(and(eq(todos.userId, userId), eq(todos.id, id)))
      .limit(1);
    return row ?? null;
  }

  /** Every to-do of the caller that matches, open and done (no paging). */
  async list(
    userId: string,
    filter: TodoFilter,
    sort: NoteSort
  ): Promise<TodoRow[]> {
    const pattern = filter.q ? `%${escapeLike(filter.q)}%` : null;
    const column = SORT_COLUMN[sort.split(":")[0] as keyof typeof SORT_COLUMN];
    const where = and(
      eq(todos.userId, userId),
      filter.projectId ? eq(todos.projectId, filter.projectId) : undefined,
      filter.taskId ? eq(todos.taskId, filter.taskId) : undefined,
      filter.unlinked
        ? and(isNull(todos.projectId), isNull(todos.deletedProjectTitle))
        : undefined,
      pattern ? ilike(todos.text, pattern) : undefined,
      filter.from && filter.timeZone
        ? sql`(${column} AT TIME ZONE ${filter.timeZone})::date >= ${filter.from}::date`
        : undefined,
      filter.to && filter.timeZone
        ? sql`(${column} AT TIME ZONE ${filter.timeZone})::date <= ${filter.to}::date`
        : undefined
    );
    return this.selectRows()
      .where(where)
      .orderBy(...orderBy(sort));
  }

  /** Sets the given columns; the caller decides whether `updatedAt` changes. */
  async update(
    userId: string,
    id: string,
    values: Partial<TodoValues> &
      Partial<{
        deletedProjectTitle: string | null;
        deletedTaskTitle: string | null;
        updatedAt: SQL;
      }>
  ): Promise<void> {
    // An empty body (API-TODO-003) has nothing to set; Drizzle throws on `.set({})`.
    if (Object.keys(values).length === 0) return;
    await this.db
      .update(todos)
      .set(values)
      .where(and(eq(todos.userId, userId), eq(todos.id, id)));
  }

  /** `false` = not the caller's. */
  async delete(userId: string, id: string): Promise<boolean> {
    const rows = await this.db
      .delete(todos)
      .where(and(eq(todos.userId, userId), eq(todos.id, id)))
      .returning({ id: todos.id });
    return rows.length > 0;
  }

  /** `todos` with the live titles of the project and task. */
  private selectRows() {
    return this.db
      .select({
        id: todos.id,
        text: todos.text,
        doneAt: todos.doneAt,
        projectId: todos.projectId,
        taskId: todos.taskId,
        projectTitle: projects.title,
        taskTitle: tasks.title,
        deletedProjectTitle: todos.deletedProjectTitle,
        deletedTaskTitle: todos.deletedTaskTitle,
        createdAt: todos.createdAt,
        updatedAt: todos.updatedAt
      })
      .from(todos)
      .leftJoin(projects, eq(projects.id, todos.projectId))
      .leftJoin(tasks, eq(tasks.id, todos.taskId))
      .$dynamic();
  }
}
