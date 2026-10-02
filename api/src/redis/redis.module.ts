import { Module } from "@nestjs/common";
import { Redis } from "./redis.js";

@Module({
  providers: [Redis],
  exports: [Redis]
})
export class RedisModule {}
