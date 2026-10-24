/* eslint-disable @typescript-eslint/no-unused-vars -- stubs (feat-note-todos) */
import { Injectable } from "@nestjs/common";

/** A note's or to-do's link: a task implies its project. */
export interface ItemLink {
  projectId: string | null;
  taskId: string | null;
}

/** Resolves the link input of notes and to-dos with the time-log rules (D6). */
@Injectable()
export class ItemLinkService {
  /**
   * The link for `taskId` / `projectId` (endpoints.md *Link input*): a task fixes the project, a
   * different `projectId` → 400, an unknown or foreign one → 404. `current` is the saved link on an update.
   */
  resolve(
    userId: string,
    taskId: string | null | undefined,
    projectId: string | null | undefined,
    current: ItemLink | null
  ): Promise<ItemLink> {
    throw new Error("not implemented (feat-note-todos)");
  }
}
