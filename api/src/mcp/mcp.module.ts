import { Module } from "@nestjs/common";
import { ProjectsModule } from "../projects/projects.module.js";
import { TasksModule } from "../tasks/tasks.module.js";
import { TimeModule } from "../time/time.module.js";
import { UsersModule } from "../users/users.module.js";
import { McpController } from "./mcp.controller.js";
import { McpService } from "./mcp.service.js";
import { McpReadTools } from "./read-tools.service.js";
import { McpWriteTools } from "./write-tools.service.js";

/** `POST /mcp` (API-MCP-012): the MCP tools over the existing services (feat-mcp-tools-api). */
@Module({
  imports: [ProjectsModule, TasksModule, TimeModule, UsersModule],
  controllers: [McpController],
  providers: [McpService, McpReadTools, McpWriteTools]
})
export class McpModule {}
