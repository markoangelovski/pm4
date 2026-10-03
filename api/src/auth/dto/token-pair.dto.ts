/** `TokenPair` (endpoints.md *Shared auth shapes*). */
export class TokenPairDto {
  /** HS256 JWT, sent as `Authorization: Bearer <token>`. */
  accessToken: string;
  /** ISO 8601 UTC */
  accessTokenExpiresAt: string;
  /** Opaque: 32 random bytes, base64url (43 chars). */
  refreshToken: string;
}
