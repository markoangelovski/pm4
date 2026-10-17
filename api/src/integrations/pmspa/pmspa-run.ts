import type { SyncPreviewItemDto, SyncResultItemDto } from "./dto/sync.dto.js";
import type { LinkRow } from "./pmspa-links.repository.js";
import { usableLinks, type SyncSnapshot } from "./pmspa-preview.js";
import type { RemoteDay } from "./pmspa-remote.js";

// The state of one import, push or sync commit, shared by the sync and time services (feat-int-sync-api, feat-int-time-api).
// Kept apart from `pmspa-sync.service.ts` so that the services don't import each other.

export const CANT_LINK = "The chosen record can't be linked.";

export type PairType = "project" | "task";

/** A failure of one row: reported in the result, the run goes on. */
export class RowFailure extends Error {}

/** The links of a run: the snapshot's, plus the ones written so far. */
export class RunLinks {
  private readonly byPm4 = new Map<string, string>();
  private readonly byPmspa = new Map<string, string>();
  constructor(snapshot: SyncSnapshot) {
    for (const l of usableLinks(snapshot))
      this.set(l.type as PairType, l.pm4Id, l.pmspaId);
  }
  set(type: PairType, pm4Id: string, pmspaId: string) {
    this.byPm4.set(`${type}:${pm4Id}`, pmspaId);
    this.byPmspa.set(`${type}:${pmspaId}`, pm4Id);
  }
  pmspaOf(type: PairType, pm4Id: string): string | undefined {
    return this.byPm4.get(`${type}:${pm4Id}`);
  }
  pm4Of(type: PairType, pmspaId: string): string | undefined {
    return this.byPmspa.get(`${type}:${pmspaId}`);
  }
}

export interface Run {
  userId: string;
  now: Date;
  from: "pm4" | "pmspa";
  snapshot: SyncSnapshot;
  pmspaUserId: string;
  links: RunLinks;
  /** Time-log links by PMSPA log id: the usable ones of the snapshot, then the ones saved in the run (D11). */
  logLinks: Map<string, LinkRow>;
  /** A push: the pushed date's PMSPA day, replaced by each event row's re-read (undefined: the snapshot's). */
  day?: RemoteDay | null;
}

export function result(
  row: SyncPreviewItemDto,
  outcome: SyncResultItemDto["outcome"],
  reason: string | null = null
): SyncResultItemDto {
  return {
    key: row.key,
    parentKey: row.parentKey,
    type: row.type,
    title: row.title,
    newTitle: null,
    outcome,
    reason
  };
}
