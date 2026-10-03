import { ApiProperty } from "@nestjs/swagger";
import { IsString, Length } from "class-validator";
import { Trim } from "../../common/validation/transforms.js";

/** Query of `GET /users` (API-USR-003). */
export class UserSearchQueryDto {
  /** Matched against display name and email, case-insensitive, as a substring. */
  @Trim()
  @IsString()
  @Length(2, 100)
  q: string;
}

/** `UserSummary`: a user as shown in the lead picker. */
export class UserSummaryDto {
  id: string;
  displayName: string;
  email: string;
  @ApiProperty({ type: String, nullable: true })
  avatarUrl: string | null;
}

export class UserSearchResponseDto {
  items: UserSummaryDto[];
}
