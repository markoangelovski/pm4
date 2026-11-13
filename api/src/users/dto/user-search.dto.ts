import { ApiProperty } from "@nestjs/swagger";
import { IsString, Length } from "class-validator";
import { Trim } from "../../common/validation/transforms.js";

/** Query of `GET /users` (API-USR-003). */
export class UserSearchQueryDto {
  /** Matched against the display name only, case-insensitive, as a substring (OQ-277). */
  @Trim()
  @IsString()
  @Length(2, 100)
  q: string;
}

/** `UserSummary`: a user as shown in the lead picker; never the email (OQ-277). */
export class UserSummaryDto {
  id: string;
  displayName: string;
  @ApiProperty({ type: String, nullable: true })
  avatarUrl: string | null;
}

export class UserSearchResponseDto {
  items: UserSummaryDto[];
}
