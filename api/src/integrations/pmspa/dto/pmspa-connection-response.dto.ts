import { ApiProperty } from "@nestjs/swagger";

/** `PmspaConnectionStatus` (endpoints.md *Shared PMSPA shapes*). */
export const PMSPA_CONNECTION_STATUSES = [
  "not-configured",
  "connected",
  "invalid-credentials",
  "unreachable"
] as const;

export type PmspaConnectionStatus = (typeof PMSPA_CONNECTION_STATUSES)[number];

/** `PmspaAccount`: from PMSPA's who-am-I (OQ-166 for `avatarUrl`). */
export class PmspaAccountDto {
  /** A 24-hex ObjectId. */
  id: string;
  email: string;
  @ApiProperty({ type: String, nullable: true })
  avatarUrl: string | null;
  @ApiProperty({ enum: ["admin", "user"], enumName: "PmspaAccountRole" })
  role: "admin" | "user";
}

/** `PmspaConnection` (API-INT-001…004). Never a password or token. */
export class PmspaConnectionResponseDto {
  @ApiProperty({
    enum: PMSPA_CONNECTION_STATUSES,
    enumName: "PmspaConnectionStatus"
  })
  status: PmspaConnectionStatus;
  @ApiProperty({ type: String, nullable: true })
  url: string | null;
  @ApiProperty({ type: String, nullable: true })
  email: string | null;
  @ApiProperty({ type: PmspaAccountDto, nullable: true })
  account: PmspaAccountDto | null;
  /** ISO 8601 UTC */
  @ApiProperty({ type: String, nullable: true })
  lastCheckedAt: string | null;
  /** ISO 8601 UTC */
  @ApiProperty({ type: String, nullable: true })
  lastSyncAt: string | null;
}
