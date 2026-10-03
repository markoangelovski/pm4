import { NotFoundException } from "@nestjs/common";

/**
 * `404` with the `…/errors/in-trash` Problem type (conventions.md *Soft delete*,
 * D10): the resource exists but is in the trash. `extensions` become extra
 * members of the Problem Details body (e.g. a task's `projectId`).
 */
export class InTrashException extends NotFoundException {
  constructor(detail: string, extensions: Record<string, unknown> = {}) {
    super({ message: detail, problemType: "in-trash", extensions });
  }
}
