import { Controller, Get, Header } from "@nestjs/common";
import { ApiExcludeController } from "@nestjs/swagger";
import { Public } from "../common/decorators/public/public.decorator.js";
import { AppConfigService } from "../config/app-config.service.js";
import { NoRateLimit } from "../rate-limit/rate-limits.js";
import { SCOPES_SUPPORTED, oauthUrls } from "./oauth-urls.js";

/**
 * Discovery documents for MCP clients (FR-MCP-002): API-MCP-001 (protected
 * resource) and API-MCP-002 (authorization server). Root paths, outside
 * `api/v1`, unauthenticated, not rate limited.
 */
@Public()
@NoRateLimit()
@ApiExcludeController()
@Controller(".well-known")
export class OAuthMetadataController {
  constructor(private readonly config: AppConfigService) {}

  /** API-MCP-001, at the root path. */
  @Get("oauth-protected-resource")
  @Header("Cache-Control", "public, max-age=3600")
  protectedResource(): object {
    return this.protectedResourceDocument();
  }

  /** API-MCP-001, at the `/mcp` path (one handler per route: Nest keeps only one path per method). */
  @Get("oauth-protected-resource/mcp")
  @Header("Cache-Control", "public, max-age=3600")
  protectedResourceForMcp(): object {
    return this.protectedResourceDocument();
  }

  private protectedResourceDocument(): object {
    const { issuer, resource } = oauthUrls(this.config);
    return {
      resource,
      authorization_servers: [issuer],
      scopes_supported: SCOPES_SUPPORTED,
      bearer_methods_supported: ["header"],
      resource_name: "PM4"
    };
  }

  /** API-MCP-002 */
  @Get("oauth-authorization-server")
  @Header("Cache-Control", "public, max-age=3600")
  authorizationServer(): object {
    const { issuer } = oauthUrls(this.config);
    return {
      issuer,
      authorization_endpoint: issuer + "/oauth/authorize",
      token_endpoint: issuer + "/oauth/token",
      revocation_endpoint: issuer + "/oauth/revoke",
      registration_endpoint: issuer + "/oauth/register",
      scopes_supported: SCOPES_SUPPORTED,
      response_types_supported: ["code"],
      grant_types_supported: ["authorization_code", "refresh_token"],
      code_challenge_methods_supported: ["S256"],
      token_endpoint_auth_methods_supported: ["none"],
      revocation_endpoint_auth_methods_supported: ["none"],
      client_id_metadata_document_supported: true
    };
  }
}
