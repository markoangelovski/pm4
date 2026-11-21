import { ApiProperty } from "@nestjs/swagger";
import { OAuthClientDto, type DtoOAuthScope } from "./consent.dto.js";

/** One grant in Settings → Connected apps. */
export class ConnectedAppDto {
  /** The grant's id. */
  id: string;
  client: OAuthClientDto;
  @ApiProperty({ enum: ["pm4:read", "pm4:write"], isArray: true })
  scopes: DtoOAuthScope[];
  /** ISO 8601 UTC instant. */
  connectedAt: string;
  /** The last token issued or refreshed; null = never used since connecting. */
  @ApiProperty({ type: String, nullable: true })
  lastUsedAt: string | null;
  /** The grant's refresh family is gone (30 days unused). */
  expired: boolean;
}

export class ConnectedAppListDto {
  @ApiProperty({ type: [ConnectedAppDto] })
  items: ConnectedAppDto[];
}
