import { Inject, Injectable } from "@nestjs/common";
import {
  and,
  asc,
  count,
  desc,
  eq,
  ilike,
  inArray,
  isNotNull,
  isNull,
  sql,
  type SQL
} from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { escapeLike } from "../common/sql/escape-like.js";
import { DRIZZLE, type DrizzleDb } from "../database/drizzle.js";
import {
  projects,
  tasks,
  users,
  type TaskStatus
} from "../database/schema/index.js";
import type { LeadRow } from "../users/project-lead.service.js";
import type { TaskSort } from "./dto/list-tasks-query.dto.js";

/** The writable columns of a task. */
export interface TaskValues {
  projectId: string;
  title: string;
  description: string | null;
  externalLink: string | null;
  projectLeadUserId: string | null;
  projectLead: string | null;
  status: TaskStatus;
  dueDate: string | null;
}

/** A task with its lead user's current name/avatar, project title and deleted status. */
export interface TaskRow extends LeadRow {
  id: string;
  projectId: string;
  projectTitle: string;
  projectDeletedAt: Date | null;
  title: string;
  description: string | null;
  externalLink: string | null;
  status: TaskStatus;
  dueDate: string | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

const lead = alias(users, "lead");

const ORDER_BY: Record<TaskSort, SQL[]> = {
  "updatedAt:desc": [desc(tasks.updatedAt), desc(tasks.id)],
  "updatedAt:asc": [asc(tasks.updatedAt), desc(tasks.id)],
  "dueDate:asc": [sql`${tasks.dueDate} ASC NULLS LAST`, desc(tasks.id)],
  "dueDate:desc": [sql`${tasks.dueDate} DESC NULLS LAST`, desc(tasks.id)],
  "title:asc": [asc(sql`lower(${tasks.title})`), desc(tasks.id)],
  "title:desc": [desc(sql`lower(${tasks.title})`), desc(tasks.id)]
};

/** Data access for `tasks`. Every method is scoped by `userId`. */
@Injectable()
export class TasksRepository {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDb) {}

  async insert(userId: string, values: TaskValues): Promise<string> {
    const [row] = await this.db
      .insert(tasks)
      .values({ ...values, userId })
      .returning({ id: tasks.id });
    return row.id;
  }

  /** The caller's task, including a trashed one (`deletedAt` set). */
  async findById(userId: string, id: string): Promise<TaskRow | null> {
    const [row] = await this.selectRows(userId)
      .where(and(eq(tasks.userId, userId), eq(tasks.id, id)))
      .limit(1);
    return row ?? null;
  }

  /** A page of the caller's active tasks (not in trash), plus the total that match. */
  async list(
    userId: string,
    filter: {
      projectId?: string;
      status?: TaskStatus[];
      q: string | null;
    },
    sort: TaskSort,
    page: number,
    pageSize: number
  ): Promise<{ rows: TaskRow[]; total: number }> {
    const pattern = filter.q ? `%${escapeLike(filter.q)}%` : null;

    const where = and(
      eq(tasks.userId, userId),
      isNull(tasks.deletedAt),
      isNull(projects.deletedAt),
      filter.projectId ? eq(tasks.projectId, filter.projectId) : undefined,
      filter.status && filter.status.length > 0
        ? inArray(tasks.status, filter.status)
        : undefined,
      pattern ? ilike(tasks.title, pattern) : undefined
    );

    const [rows, [{ total }]] = await Promise.all([
      this.selectRows(userId)
        .where(where)
        .orderBy(...ORDER_BY[sort])
        .limit(pageSize)
        .offset((page - 1) * pageSize),
      this.db
        .select({ total: count() })
        .from(tasks)
        .innerJoin(projects, eq(tasks.projectId, projects.id))
        .where(where)
    ]);

    return { rows, total };
  }

  /** Sets the given columns and `updatedAt = now()`. */
  async update(
    userId: string,
    id: string,
    values: Partial<TaskValues>
  ): Promise<void> {
    await this.db
      .update(tasks)
      .set({ ...values, updatedAt: sql`now()` })
      .where(and(eq(tasks.userId, userId), eq(tasks.id, id)));
  }

  /**
   * Moves an active task to the trash, or a trashed one out of it; doesn't
   * touch `updatedAt`. A row already in the target state is left alone.
   */
  async setDeletedAt(
    userId: string,
    id: string,
    deletedAt: Date | null
  ): Promise<void> {
    await this.db
      .update(tasks)
      .set({ deletedAt })
      .where(
        and(
          eq(tasks.userId, userId),
          eq(tasks.id, id),
          deletedAt === null
            ? isNotNull(tasks.deletedAt)
            : isNull(tasks.deletedAt)
        )
      );
  }

  /**
   * `tasks` with the lead user (`LEFT JOIN users AS lead`) and project info.
   */
  private selectRows(userId: string) {
    return this.db
      .select({
        id: tasks.id,
        projectId: tasks.projectId,
        projectTitle: projects.title,
        projectDeletedAt: projects.deletedAt,
        title: tasks.title,
        description: tasks.description,
        externalLink: tasks.externalLink,
        projectLeadUserId: tasks.projectLeadUserId,
        projectLead: tasks.projectLead,
        leadDisplayName: lead.displayName,
        leadAvatarUrl: lead.avatarUrl,
        status: tasks.status,
        dueDate: tasks.dueDate,
        createdAt: tasks.createdAt,
        updatedAt: tasks.updatedAt,
        deletedAt: tasks.deletedAt
      })
      .from(tasks)
      .innerJoin(projects, eq(tasks.projectId, projects.id))
      .leftJoin(lead, eq(lead.id, tasks.projectLeadUserId))
      .where(eq(tasks.userId, userId))
      .$dynamic();
  }
}
