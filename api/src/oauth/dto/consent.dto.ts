import { ApiProperty } from "@nestjs/swagger";

export type DtoOAuthScope = "pm4:read" | "pm4:write";

/** The app (OAuth client) as the user sees it. */
export class OAuthClientDto {
  /** From the Client ID Metadata Document, or the DCR registration. */
  name: string;
  /** Host of the `client_id` URL; for a DCR client, the host of its first redirect URI. */
  clientIdHost: string;
}

export class ExistingGrantDto {
  /** ISO 8601 UTC instant. */
  connectedAt: string;
}

/** `GET /oauth/consent/{requestId}` (API-MCP-009). */
export class ConsentRequestDto {
  id: string;
  client: OAuthClientDto;
  /** Host (with port for a loopback address) the browser returns to. */
  redirectHost: string;
  /** `127.0.0.1`, `[::1]` or `localhost`. */
  loopback: boolean;
  @ApiProperty({ enum: ["pm4:read", "pm4:write"], isArray: true })
  scopes: DtoOAuthScope[];
  /** ISO 8601 UTC instant; after it Allow fails with 410. */
  expiresAt: string;
  @ApiProperty({ type: ExistingGrantDto, nullable: true })
  existingGrant: ExistingGrantDto | null;
}

/** Allow / Deny: where the browser goes next. */
export class ConsentResultDto {
  redirectUrl: string;
}
