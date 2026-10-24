import { BadRequestException, Injectable } from "@nestjs/common";
import { ProjectsService } from "../projects/projects.service.js";
import { TasksService } from "../tasks/tasks.service.js";

/** A note's or to-do's link: a task implies its project. */
export interface ItemLink {
  projectId: string | null;
  taskId: string | null;
}

/** Resolves the link input of notes and to-dos with the time-log rules (D6). */
@Injectable()
export class ItemLinkService {
  constructor(
    private readonly tasksService: TasksService,
    private readonly projectsService: ProjectsService
  ) {}

  /**
   * The link for `taskId` / `projectId` (endpoints.md *Link input*): a task fixes the project, a
   * different `projectId` → 400, an unknown or foreign one → 404. `current` is the saved link on an update.
   */
  async resolve(
    userId: string,
    taskId: string | null | undefined,
    projectId: string | null | undefined,
    current: ItemLink | null
  ): Promise<ItemLink> {
    const task = taskId ?? null;
    const project = projectId ?? null;

    if (task !== null) {
      if (current && current.taskId === task) {
        if (project !== null && project !== current.projectId) {
          this.projectMismatch();
        }
        return { taskId: task, projectId: current.projectId };
      }
      const found = await this.tasksService.findOwned(userId, task);
      if (project !== null && project !== found.projectId) {
        this.projectMismatch();
      }
      return { taskId: task, projectId: found.projectId };
    }

    if (project !== null) {
      if (current && current.projectId === project) {
        return { taskId: null, projectId: project };
      }
      await this.projectsService.findOwned(userId, project);
      return { taskId: null, projectId: project };
    }

    return { taskId: null, projectId: null };
  }

  private projectMismatch(): never {
    throw new BadRequestException({
      errors: [{ field: "projectId", message: "must be the task's project" }]
    });
  }
}
