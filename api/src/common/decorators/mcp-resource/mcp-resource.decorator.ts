import { SetMetadata } from "@nestjs/common";

export const IS_MCP_RESOURCE_KEY = "pm4:mcpResource";

/** Marks the MCP resource endpoint: `AccessTokenGuard` verifies an MCP access token instead of a web one. */
export const McpResource = () => SetMetadata(IS_MCP_RESOURCE_KEY, true);
