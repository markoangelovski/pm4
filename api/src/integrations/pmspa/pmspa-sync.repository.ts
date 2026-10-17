import { Inject, Injectable } from "@nestjs/common";
import { and, asc, eq, inArray, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { DRIZZLE, type DrizzleDb } from "../../database/drizzle.js";
import { projects, tasks, users } from "../../database/schema/index.js";
import type { Pm4Project, Pm4Task } from "./pmspa-fields.js";

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
