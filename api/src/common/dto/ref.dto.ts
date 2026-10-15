import { ApiProperty } from "@nestjs/swagger";

/**
 * A reference to a project, task, or other entity within PM4 (endpoints.md *Shared
 * project and task shapes*). `deleted` is true for a deleted project or task: `id` is null and `title` is its retained name.
 */
export class RefDto {
  @ApiProperty({ type: String, nullable: true })
  id: string | null;

  title: string;

  deleted: boolean;
}
