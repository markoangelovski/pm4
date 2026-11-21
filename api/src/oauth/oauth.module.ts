import { Module } from "@nestjs/common";
import { ConnectedAppsController } from "./connected-apps.controller.js";
import { ConsentController } from "./consent.controller.js";

/** OAuth authorization server, consent and Connected apps (feat-mcp-oauth-api). T1–T4 add the providers. */
@Module({
  controllers: [ConsentController, ConnectedAppsController]
})
export class OAuthModule {}
