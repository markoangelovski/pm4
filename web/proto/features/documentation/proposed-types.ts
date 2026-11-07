/**
 * Changelog shapes the Documentation → Changelog tab needs. Each deploy derives its app's changelog from
 * git (the same tags and conventional commits as the release version), including the release it ships:
 * the web deploy writes the web releases into the static site, the API deploy builds the API releases into
 * its package and serves them at GET /api/v1/changelog.
 */

/** A released app: the web app and the API are versioned separately. */
export type ChangelogApp = "web" | "api";

/** One user-visible change: a `feat` or `fix` commit, or any commit marked breaking. */
export type ChangelogEntryDto = {
  /** The conventional-commit type: `feat` or `fix`, or any type when breaking (OQ-271). */
  type: string;
  /** The conventional-commit scope, e.g. "web" in `feat(web): …`; null when absent. */
  scope: string | null;
  /** The commit subject after `type(scope): `. */
  description: string;
  /** `type!:` or a `BREAKING CHANGE:` footer. */
  breaking: boolean;
  /** Short commit hash. */
  hash: string;
};

/** One release of one app, newest first in the list. */
export type ChangelogReleaseDto = {
  app: ChangelogApp;
  /** Semver without the `v`, e.g. "0.6.0". */
  version: string;
  /** The release's git tag, e.g. "web-v0.6.0". */
  tag: string;
  /** Release date, `YYYY-MM-DD` (the tagged commit's date). */
  date: string;
  /** Every non-merge commit in the release for this app, including those the changelog hides. */
  commitCount: number;
  changes: ChangelogEntryDto[];
};

/** GET /api/v1/changelog: the API's own releases, newest first (built into the API package at deploy). */
export type ChangelogResponseDto = { items: ChangelogReleaseDto[] };

/** The proposed endpoint as an openapi-fetch `paths` entry, until `npm run api:types` generates it. */
export type ChangelogPaths = {
  "/api/v1/changelog": {
    parameters: { query?: never; header?: never; path?: never; cookie?: never };
    get: {
      parameters: {
        query?: never;
        header?: never;
        path?: never;
        cookie?: never;
      };
      requestBody?: never;
      responses: {
        200: {
          headers: { [name: string]: unknown };
          content: { "application/json": ChangelogResponseDto };
        };
      };
    };
  };
};
