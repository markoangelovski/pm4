import { Injectable, OnModuleDestroy } from "@nestjs/common";
import {
  McpServer,
  WebStandardStreamableHTTPServerTransport,
  createMcpHandler,
  isLegacyRequest
} from "@modelcontextprotocol/server";
import type {
  McpHandlerRequestOptions,
  McpRequestContext
} from "@modelcontextprotocol/server";
import { toNodeHandler } from "@modelcontextprotocol/node";
import type {
  Request as ExpressRequest,
  Response as ExpressResponse
} from "express";
import packageJson from "../../package.json" with { type: "json" };
import type { McpAuthInfo } from "./mcp-tools.js";
import { McpReadTools } from "./read-tools.service.js";
import { McpWriteTools } from "./write-tools.service.js";

const INSTRUCTIONS =
  "PM4: the signed-in user's projects, tasks and time logs. Dates are YYYY-MM-DD in the user's calendar; durations and start times are minutes, in multiples of 15.";

/** One stateless MCP handler for `POST /mcp`; a server (with the caller's tools) per request. */
@Injectable()
export class McpService implements OnModuleDestroy {
  private readonly handler;
  private readonly node;

  constructor(
    private readonly readTools: McpReadTools,
    private readonly writeTools: McpWriteTools
  ) {
    const factory = (ctx: McpRequestContext): McpServer => {
      const auth = ctx.authInfo as McpAuthInfo;
      const server = new McpServer(
        { name: "pm4", version: packageJson.version },
        { instructions: INSTRUCTIONS }
      );
      this.readTools.register(server, auth.extra.userId);
      if (auth.scopes.includes("pm4:write")) {
        this.writeTools.register(server, auth.extra.userId);
      }
      return server;
    };
    this.handler = createMcpHandler(factory, {
      legacy: "reject",
      responseMode: "json"
    });
    // The SDK's own 2025-era fallback streams SSE; clients of 2025-11-25 get plain JSON instead.
    const legacy = async (
      request: Request,
      options?: McpHandlerRequestOptions
    ): Promise<Response> => {
      const server = factory({
        era: "legacy",
        authInfo: options?.authInfo,
        requestInfo: request
      });
      const transport = new WebStandardStreamableHTTPServerTransport({
        sessionIdGenerator: undefined,
        enableJsonResponse: true
      });
      try {
        await server.connect(transport);
        return await transport.handleRequest(request, {
          authInfo: options?.authInfo,
          parsedBody: options?.parsedBody
        });
      } finally {
        void transport.close().catch(() => undefined);
        void server.close().catch(() => undefined);
      }
    };
    this.node = toNodeHandler({
      fetch: async (request, options) =>
        (await isLegacyRequest(request, options?.parsedBody))
          ? legacy(request, options)
          : this.handler.fetch(request, options)
    });
  }

  handle(req: ExpressRequest, res: ExpressResponse): Promise<void> {
    return this.node(req, res, req.body);
  }

  async onModuleDestroy(): Promise<void> {
    await this.handler.close();
  }
}
