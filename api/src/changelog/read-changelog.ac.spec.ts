import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { ChangelogResponseDto } from "./dto/changelog-response.dto.js";
import { readChangelog } from "./read-changelog.js";

describe("readChangelog (feat-shell-documentation)", () => {
  let dir: string;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "pm4-changelog-"));
  });

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  it("AC-6 API-SYS-004: no file → { items: [] }; a file → its object; invalid JSON throws", () => {
    expect(readChangelog(join(dir, "missing.json"))).toEqual({ items: [] });

    const file: ChangelogResponseDto = {
      items: [
        {
          app: "api",
          version: "0.6.0",
          tag: "api-v0.6.0",
          date: "2026-11-07",
          commitCount: 4,
          changes: [
            {
              type: "feat",
              scope: "api",
              description: "changelog endpoint",
              breaking: false,
              hash: "abc1234"
            }
          ]
        }
      ]
    };
    const valid = join(dir, "changelog.json");
    writeFileSync(valid, JSON.stringify(file, null, 2) + "\n");
    expect(readChangelog(valid)).toEqual(file);

    const invalid = join(dir, "invalid.json");
    writeFileSync(invalid, "{ not json");
    expect(() => readChangelog(invalid)).toThrow();
  });
});
