import type { components } from "@/lib/api/schema";

/**
 * Settings → Connected apps with the app's logo. The API takes `logo_uri` from the app's metadata document
 * (CIMD) or its registration (DCR) and returns it only when it is an HTTPS URL on the app's own host: the
 * `client_id` URL's host (CIMD) or the first redirect URI's host (DCR, never a loopback one). Otherwise null,
 * and the app's letter shows. The consent page never shows a logo: any app can claim any logo.
 */
export type ConnectedAppDto = components["schemas"]["ConnectedAppDto"] & {
  /** HTTPS URL of the app's logo, on the app's own host; null = none, or not on that host. */
  logoUri: string | null;
};
