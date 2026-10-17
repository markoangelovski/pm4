import { Module } from "@nestjs/common";
import { DatabaseModule } from "../../database/database.module.js";
import { ProjectsModule } from "../../projects/projects.module.js";
import { TasksModule } from "../../tasks/tasks.module.js";
import { TimeModule } from "../../time/time.module.js";
import { UsersModule } from "../../users/users.module.js";
import { RedisModule } from "../../redis/redis.module.js";
import { PmspaBrowseController } from "./pmspa-browse.controller.js";
import { PmspaClient } from "./pmspa-client.js";
import { PmspaConnectionController } from "./pmspa-connection.controller.js";
import { PmspaConnectionService } from "./pmspa-connection.service.js";
import { PmspaConnectionRepository } from "./pmspa-connection.repository.js";
import { PmspaCrypto } from "./pmspa-crypto.js";
import {
  DNS_LOOKUP,
  defaultDnsLookup,
  PmspaHostGuard
} from "./pmspa-host-guard.js";
import { PmspaLinksController } from "./pmspa-links.controller.js";
import { PmspaLinksRepository } from "./pmspa-links.repository.js";
import { PmspaLinksService } from "./pmspa-links.service.js";
import { PmspaRemote } from "./pmspa-remote.js";
import { PmspaStore } from "./pmspa-store.js";
import { PmspaSyncController } from "./pmspa-sync.controller.js";
import { PmspaSyncRepository } from "./pmspa-sync.repository.js";
import { PmspaSyncService } from "./pmspa-sync.service.js";
import { PMSPA_FETCH, PmspaTransport } from "./pmspa-transport.js";
import { PmspaTimeSyncService } from "./pmspa-time-sync.service.js";

/** PMSPA connector: the connection endpoints (API-INT-001…004), browsing and links (API-INT-005/006/012…014), and the shared client. */
@Module({
  imports: [
    DatabaseModule,
    RedisModule,
    ProjectsModule,
    TasksModule,
    TimeModule,
    UsersModule
  ],
  controllers: [
    PmspaConnectionController,
    PmspaBrowseController,
    PmspaLinksController,
    PmspaSyncController
  ],
  providers: [
    PmspaCrypto,
    PmspaHostGuard,
    PmspaStore,
    PmspaTransport,
    PmspaConnectionRepository,
    PmspaClient,
    PmspaConnectionService,
    PmspaRemote,
    PmspaLinksRepository,
    PmspaSyncRepository,
    PmspaLinksService,
    PmspaSyncService,
    { provide: PMSPA_FETCH, useValue: globalThis.fetch },
    { provide: DNS_LOOKUP, useValue: defaultDnsLookup },
    PmspaTimeSyncService
  ],
  exports: [PmspaClient]
})
export class PmspaModule {}
