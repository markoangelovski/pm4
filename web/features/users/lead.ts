import type { Me } from "@/features/users/api";
import type { components } from "@/lib/api/schema";

export type LeadUser = components["schemas"]["LeadUserDto"];
export type LeadValue =
  { kind: "user"; user: LeadUser } | { kind: "text"; name: string } | null;

export const LEAD_NAME_MAX = 100;

/** The API's project lead → the form value. */
export function fromProjectLead(
  lead: components["schemas"]["ProjectLeadDto"] | null
): LeadValue {
  if (lead === null) return null;
  if (lead.kind === "user" && lead.user !== null) {
    return { kind: "user", user: lead.user };
  }
  return { kind: "text", name: lead.name };
}

/** The signed-in user as a lead; undefined → null. */
export function leadFromMe(me: Me | undefined): LeadValue {
  if (me === undefined) return null;
  return {
    kind: "user",
    user: { id: me.id, displayName: me.displayName, avatarUrl: me.avatarUrl }
  };
}

/** Text trimmed; "" → both null. */
export function leadToInput(value: LeadValue): {
  projectLeadUserId: string | null;
  projectLeadName: string | null;
} {
  if (value?.kind === "user") {
    return { projectLeadUserId: value.user.id, projectLeadName: null };
  }
  const name = value?.kind === "text" ? value.name.trim() : "";
  return { projectLeadUserId: null, projectLeadName: name === "" ? null : name };
}

/** new URL() parses and the protocol is http: or https:. */
export function isHttpUrl(value: string): boolean {
  try {
    const { protocol } = new URL(value);
    return protocol === "http:" || protocol === "https:";
  } catch {
    return false;
  }
}
