import { Module } from "@nestjs/common";
import { Drizzle, DRIZZLE } from "./drizzle.js";

@Module({
  providers: [
    Drizzle,
    {
      provide: DRIZZLE,
      inject: [Drizzle],
      useFactory: (drizzle: Drizzle) => drizzle.db
    }
  ],
  exports: [Drizzle, DRIZZLE]
})
export class DatabaseModule {}
