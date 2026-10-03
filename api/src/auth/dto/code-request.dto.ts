import { IsString, Length } from "class-validator";

/** API-AUTH-003 request body. */
export class CodeRequestDto {
  /** The single-use login code from `/auth/callback?code=`. */
  @IsString()
  @Length(1, 128)
  code: string;
}
