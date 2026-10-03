import { SetMetadata } from "@nestjs/common";

export const IS_PUBLIC_KEY = "isPublic";

/**
 * Marks a controller or handler as reachable without an access token
 * (endpoints.md *Shared auth shapes*: default-deny, OQ-066).
 */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
