import {
  IsBoolean,
  IsEmail,
  IsOptional,
  IsString,
  Length,
  MaxLength
} from "class-validator";

/** `PUT /integrations/pmspa` body (API-INT-002). The URL rule is checked by the service (FR-INT-002). */
export class SavePmspaConnectionDto {
  /** ≤ 500 chars; `https://` and a public host. */
  @IsString()
  @MaxLength(500)
  url: string;

  /** ≤ 254 chars. */
  @IsEmail()
  @MaxLength(254)
  email: string;

  /** 1–200 chars. Omitted = keep the stored password. */
  @IsOptional()
  @IsString()
  @Length(1, 200)
  password?: string;

  /** Confirms a switch to another PMSPA account (FR-INT-002). */
  @IsOptional()
  @IsBoolean()
  confirmAccountSwitch?: boolean;
}
