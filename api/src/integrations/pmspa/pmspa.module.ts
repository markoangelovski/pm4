import { Module } from "@nestjs/common";
import { DatabaseModule } from "../../database/database.module.js";
import { RedisModule } from "../../redis/redis.module.js";
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
import { PmspaStore } from "./pmspa-store.js";
import { PMSPA_FETCH, PmspaTransport } from "./pmspa-transport.js";

/** PMSPA connector: the connection endpoints (API-INT-001…004) and the shared client. */
@Module({
  imports: [DatabaseModule, RedisModule],
  controllers: [PmspaConnectionController],
  providers: [
    PmspaCrypto,
    PmspaHostGuard,
    PmspaStore,
    PmspaTransport,
    PmspaConnectionRepository,
    PmspaClient,
    PmspaConnectionService,
    { provide: PMSPA_FETCH, useValue: globalThis.fetch },
    { provide: DNS_LOOKUP, useValue: defaultDnsLookup }
  ],
  exports: [PmspaClient]
})
export class PmspaModule {}
