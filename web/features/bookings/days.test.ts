import { describe, expect, it } from "vitest";

import { parseAnchor } from "./days";

describe("parseAnchor", () => {
  it("rejects a log id with characters a selector would choke on", () => {
    expect(parseAnchor('day-2026-10-07.log-a"]x.to-2026-10-07')).toBeNull();
  });

  it("accepts a UUID log id", () => {
    const id = "0b8f6c1e-3a2d-4f5b-9c7e-1d2e3f4a5b6c";
    expect(parseAnchor(`day-2026-10-07.log-${id}.to-2026-10-07`)).toEqual({
      day: "2026-10-07",
      row: `${id}:2026-10-07`
    });
  });
});
