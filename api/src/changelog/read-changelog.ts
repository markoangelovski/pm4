import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import type { ChangelogResponseDto } from "./dto/changelog-response.dto.js";

/** Where api-deploy stages the generated file: next to package.json, the process's working directory. */
export const CHANGELOG_PATH = resolve(process.cwd(), "changelog.json");

/** No file → `{ items: [] }`; otherwise the parsed file. Invalid JSON throws (the API then doesn't start). */
export function readChangelog(
  path: string = CHANGELOG_PATH
): ChangelogResponseDto {
  if (!existsSync(path)) {
    return { items: [] };
  }
  return JSON.parse(readFileSync(path, "utf8")) as ChangelogResponseDto;
}
