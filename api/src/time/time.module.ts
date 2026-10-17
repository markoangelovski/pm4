import { Module } from "@nestjs/common";
import { DatabaseModule } from "../database/database.module.js";
import { ProjectsModule } from "../projects/projects.module.js";
import { TasksModule } from "../tasks/tasks.module.js";
import { UsersModule } from "../users/users.module.js";
import { TimeLogsController } from "./time-logs.controller.js";
import { TimeLogsService } from "./time-logs.service.js";
import { TimeRepository } from "./time.repository.js";
import { WorkdaysController } from "./workdays.controller.js";
import { WorkdaysService } from "./workdays.service.js";
import { BookingsController } from "./bookings.controller.js";
import { BookingsService } from "./bookings.service.js";
import { ReportsController } from "./reports.controller.js";
import { ReportsService } from "./reports.service.js";

@Module({
  imports: [DatabaseModule, UsersModule, ProjectsModule, TasksModule],
  exports: [TimeLogsService, WorkdaysService],
  controllers: [
    WorkdaysController,
    TimeLogsController,
    BookingsController,
    ReportsController
  ],
  providers: [
    WorkdaysService,
    TimeLogsService,
    TimeRepository,
    BookingsService,
    ReportsService
  ]
})
export class TimeModule {}
