import { ApiProperty } from "@nestjs/swagger";

export const CHANGELOG_APPS = ["web", "api"] as const;
export type ChangelogApp = (typeof CHANGELOG_APPS)[number];

/** `ChangelogEntry` (API-SYS-004): a `feat` or `fix` commit, or a breaking commit of any type. */
export class ChangelogEntryDto {
  /** The conventional-commit type, e.g. `feat`. */
  type: string;
  /** The conventional-commit scope, e.g. `web`; null when absent. */
  @ApiProperty({ type: String, nullable: true })
  scope: string | null;
  /** The commit subject after `type(scope)!: `. */
  description: string;
  /** `type!:` or a `BREAKING CHANGE:` footer. */
  breaking: boolean;
  /** Short commit hash. */
  hash: string;
}

/** `ChangelogRelease`: one release of one app. */
export class ChangelogReleaseDto {
  @ApiProperty({ enum: CHANGELOG_APPS, enumName: "ChangelogApp" })
  app: ChangelogApp;
  /** Semver without the `v`, e.g. `0.6.0`. */
  version: string;
  /** The release's git tag, e.g. `api-v0.6.0`. */
  tag: string;
  /** `YYYY-MM-DD`, the tagged commit's date. */
  date: string;
  /** Every non-merge commit of the release for this app, hidden ones included. */
  @ApiProperty({ type: Number })
  commitCount: number;
  changes: ChangelogEntryDto[];
}

/** API-SYS-004: the API's releases, newest first. */
export class ChangelogResponseDto {
  items: ChangelogReleaseDto[];
}
