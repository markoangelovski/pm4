import { z } from "zod";
import type { PmspaConnectionDto, SavePmspaConnectionDto } from "./types";

/**
 * FR-INT-002's URL rule as far as the browser can tell: `https://`, or a local `http://` test instance
 * (OQ-160). The API also refuses private hosts, and local ones outside `development`.
 */
function isAllowedUrl(value: string): boolean {
  try {
    const u = new URL(value);
    if (u.protocol === "https:") return true;
    return (
      u.protocol === "http:" && ["localhost", "127.0.0.1"].includes(u.hostname)
    );
  } catch {
    return false;
  }
}

/** The PMSPA connection form. The password is required only before the first save. */
export function pmspaConnectionSchema(hasSavedPassword: boolean) {
  return z.object({
    url: z
      .string()
      .trim()
      .min(1, "Enter the PMSPA URL.")
      .max(500, "Use at most 500 characters.")
      .refine(isAllowedUrl, "Enter a full URL starting with https://."),
    email: z.email("Enter a valid email address.").trim(),
    password: z
      .string()
      .refine(
        (v) => hasSavedPassword || v.length > 0,
        "Enter your PMSPA password."
      )
  });
}

export type PmspaConnectionFormValues = z.input<
  ReturnType<typeof pmspaConnectionSchema>
>;

/** The saved URL and email; the password field always starts empty (FR-INT-002). */
export function pmspaConnectionDefaults(
  connection: PmspaConnectionDto | undefined
): PmspaConnectionFormValues {
  return {
    url: connection?.url ?? "",
    email: connection?.email ?? "",
    password: ""
  };
}

/** Form values → the API body: an empty password keeps the stored one. */
export function toSavePmspaConnection(
  values: PmspaConnectionFormValues
): SavePmspaConnectionDto {
  return {
    url: values.url.trim(),
    email: values.email.trim(),
    ...(values.password ? { password: values.password } : {})
  };
}

/** API error field → form field. */
export const PMSPA_CONNECTION_FIELD_MAP = {
  url: "url",
  email: "email",
  password: "password"
} as const;
