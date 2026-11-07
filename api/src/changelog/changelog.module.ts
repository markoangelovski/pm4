import { Module } from "@nestjs/common";
import { ChangelogController } from "./changelog.controller.js";

@Module({
  controllers: [ChangelogController]
})
export class ChangelogModule {}
