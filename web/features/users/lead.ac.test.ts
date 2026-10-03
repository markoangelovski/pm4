import { describe, expect, it } from "vitest";
import { fromProjectLead, isHttpUrl, leadToInput, type LeadUser } from "./lead";

const ana: LeadUser = {
  id: "0b6c7d2e-1f3a-4c5b-9d8e-7f6a5b4c3d2e",
  displayName: "Ana Horvat",
  avatarUrl: null
};

describe("lead helpers (feat-prj-web)", () => {
  it("AC-4 FR-PRJ-006: leadToInput, fromProjectLead round-trips and isHttpUrl", () => {
    expect(leadToInput({ kind: "user", user: ana })).toEqual({
      projectLeadUserId: ana.id,
      projectLeadName: null
    });
    expect(leadToInput({ kind: "text", name: " Ana " })).toEqual({
      projectLeadUserId: null,
      projectLeadName: "Ana"
    });
    const none = { projectLeadUserId: null, projectLeadName: null };
    expect(leadToInput({ kind: "text", name: "  " })).toEqual(none);
    expect(leadToInput(null)).toEqual(none);

    expect(
      fromProjectLead({ kind: "user", user: ana, name: ana.displayName })
    ).toEqual({ kind: "user", user: ana });
    expect(fromProjectLead({ kind: "text", user: null, name: "Bob" })).toEqual({
      kind: "text",
      name: "Bob"
    });
    expect(fromProjectLead(null)).toBeNull();

    expect(isHttpUrl("https://x.dev/a")).toBe(true);
    expect(isHttpUrl("ftp://x")).toBe(false);
    expect(isHttpUrl("x.dev")).toBe(false);
  });
});
