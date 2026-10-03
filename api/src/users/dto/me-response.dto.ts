import { ApiProperty } from "@nestjs/swagger";

/** `Me` (API-USR-001): the signed-in user. */
export class MeResponseDto {
  id: string;
  email: string;
  displayName: string;
  @ApiProperty({ type: String, nullable: true })
  avatarUrl: string | null;
  /** IANA time zone, e.g. `Europe/Zagreb`. */
  timeZone: string;
  /** ISO 8601 UTC */
  createdAt: string;
}
