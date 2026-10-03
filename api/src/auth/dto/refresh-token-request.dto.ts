import { IsString, Length } from "class-validator";

/** API-AUTH-004 / API-AUTH-005 request body. */
export class RefreshTokenRequestDto {
  /** The opaque refresh token from the last `TokenPair`. */
  @IsString()
  @Length(1, 128)
  refreshToken: string;
}
