import type { Me } from "@/features/users/api";
import type { components } from "@/lib/api/schema";

const NOT_IMPLEMENTED = "not implemented (feat-prj-web)";

export type LeadUser = components["schemas"]["LeadUserDto"];
export type LeadValue =
  { kind: "user"; user: LeadUser } | { kind: "text"; name: string } | null;

export const LEAD_NAME_MAX = 100;

export function fromProjectLead(
  lead: components["schemas"]["ProjectLeadDto"] | null
): LeadValue {
  void lead;
  throw new Error(NOT_IMPLEMENTED);
}

/** undefined → null. */
export function leadFromMe(me: Me | undefined): LeadValue {
  void me;
  throw new Error(NOT_IMPLEMENTED);
}

/** Text trimmed; "" → both null. */
export function leadToInput(value: LeadValue): {
  projectLeadUserId: string | null;
  projectLeadName: string | null;
} {
  void value;
  throw new Error(NOT_IMPLEMENTED);
}

/** new URL() parses and the protocol is http: or https:. */
export function isHttpUrl(value: string): boolean {
  void value;
  throw new Error(NOT_IMPLEMENTED);
}
