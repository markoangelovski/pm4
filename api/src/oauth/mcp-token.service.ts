import { hkdfSync } from "node:crypto";
import { Injectable } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { AppConfigService } from "../config/app-config.service.js";
import {
  oauthUrls,
  scopeList,
  type GrantScope,
  type OAuthScope
} from "./oauth-urls.js";

export interface McpTokenClaims {
  userId: string;
  grantId: string;
  clientId: string;
  scopes: OAuthScope[];
}

interface Payload {
  sub?: unknown;
  gid?: unknown;
  client_id?: unknown;
  scope?: unknown;
}

/** MCP access tokens (D1): HS256 JWTs signed with HKDF-SHA256(JWT_ACCESS_SECRET, "pm4-mcp"). */
@Injectable()
export class McpTokenService {
  private readonly key: Buffer;

  constructor(
    private readonly jwt: JwtService,
    private readonly config: AppConfigService
  ) {
    this.key = Buffer.from(
      hkdfSync("sha256", config.jwtAccessSecret, Buffer.alloc(0), "pm4-mcp", 32)
    );
  }

  async sign(input: {
    userId: string;
    grantId: string;
    clientId: string;
    scope: GrantScope;
  }): Promise<{ token: string; expiresIn: number }> {
    const { issuer, resource } = oauthUrls(this.config);
    const expiresIn = this.config.accessTokenTtlSeconds;
    const token = await this.jwt.signAsync(
      {
        gid: input.grantId,
        client_id: input.clientId,
        scope: scopeList(input.scope).join(" ")
      },
      {
        secret: this.key,
        algorithm: "HS256",
        expiresIn,
        issuer,
        audience: resource,
        subject: input.userId
      }
    );
    return { token, expiresIn };
  }

  async verify(token: string): Promise<McpTokenClaims | null> {
    const { issuer, resource } = oauthUrls(this.config);
    try {
      const p = await this.jwt.verifyAsync<Payload>(token, {
        secret: this.key,
        algorithms: ["HS256"],
        issuer,
        audience: resource
      });
      if (
        typeof p.sub !== "string" ||
        typeof p.gid !== "string" ||
        typeof p.client_id !== "string" ||
        typeof p.scope !== "string" ||
        !p.sub ||
        !p.gid ||
        !p.client_id
      ) {
        return null;
      }
      const scopes = p.scope
        .split(" ")
        .filter((s): s is OAuthScope => s === "pm4:read" || s === "pm4:write");
      if (scopes.length === 0) return null;
      return {
        userId: p.sub,
        grantId: p.gid,
        clientId: p.client_id,
        scopes
      };
    } catch {
      return null;
    }
  }
}
