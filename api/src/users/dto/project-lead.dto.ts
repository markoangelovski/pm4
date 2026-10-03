import { ApiProperty } from "@nestjs/swagger";

/** The PM4 user behind a `kind: "user"` lead. Never includes the email (OQ-077). */
export class LeadUserDto {
  id: string;
  /** The user's current display name (D2). */
  displayName: string;
  @ApiProperty({ type: String, nullable: true })
  avatarUrl: string | null;
}

/** `ProjectLead` (endpoints.md *Shared project and task shapes*). */
export class ProjectLeadDto {
  @ApiProperty({ enum: ["user", "text"] })
  kind: "user" | "text";
  /** `user.displayName` for a user lead, else the saved text name. */
  name: string;
  @ApiProperty({ type: LeadUserDto, nullable: true })
  user: LeadUserDto | null;
}
