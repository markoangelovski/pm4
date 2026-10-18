// The PMSPA connector's API types (M6, req-integrations): aliases of the generated OpenAPI schema
// (`npm run api:types`), named as the prototype and the screens use them.
import type { components } from "@/lib/api/schema";

type S = components["schemas"];

export type PmspaConnectionStatus = S["PmspaConnectionStatus"];
export type PmspaAccountDto = S["PmspaAccountDto"];
export type SavePmspaConnectionDto = S["SavePmspaConnectionDto"];
export type PmspaConnectionDto = S["PmspaConnectionResponseDto"];
export type PmspaLinkType = S["PmspaLinkType"];
export type PmspaLinkOrigin = S["PmspaLinkOrigin"];
export type PmspaLinkDto = S["PmspaLinkDto"];
export type PmspaRecordLinkDto = S["PmspaRecordLinkDto"];
export type PmspaRecordDetail = S["PmspaRecordDetailDto"];
export type PmspaLinkDetailDto = S["PmspaLinkDetailDto"];
export type PmspaProjectDto = S["PmspaProjectDto"];
export type PmspaColumn = S["PmspaColumn"];
export type PmspaTaskDto = S["PmspaTaskDto"];
export type PmspaLogDto = S["PmspaLogDto"];
export type PmspaEventDto = S["PmspaEventDto"];
export type PmspaDayDto = S["PmspaDayDto"];
export type PmspaDaySummaryDto = S["PmspaDaySummaryDto"];
export type PmspaDayLinkState = S["PmspaDayDto"]["linkState"];
export type PmspaImportSelectionDto = S["PmspaImportSelectionDto"];
export type PmspaSyncTargetDto = S["PmspaSyncTargetDto"];
export type PmspaPushTargetDto = S["PmspaPushTargetDto"];
export type SyncRecordType = S["SyncPreviewItemDto"]["type"];
export type SyncAction = S["SyncPreviewItemDto"]["action"];
export type SyncDirection = NonNullable<S["SyncPreviewItemDto"]["direction"]>;
export type SyncFieldDiffDto = S["SyncFieldDiffDto"];
export type SyncCandidateDto = S["SyncCandidateDto"];
export type SyncPreviewItemDto = S["SyncPreviewItemDto"];
export type SyncPreviewDto = S["SyncPreviewDto"];
export type SyncChoiceDto = S["SyncChoiceDto"];
export type PmspaImportDto = S["PmspaImportDto"];
export type PmspaSyncDto = S["PmspaSyncDto"];
export type PmspaPushDto = S["PmspaPushDto"];
export type SyncOutcome = S["SyncResultItemDto"]["outcome"];
export type SyncResultItemDto = S["SyncResultItemDto"];
export type SyncResultDto = S["SyncResultDto"];
export type PmspaRateLimitDto = S["PmspaRateLimitDto"];
export type PmspaCandidatesInputDto = S["PmspaCandidatesInputDto"];
export type PmspaCandidatesDto = S["PmspaCandidatesDto"];

/** The 409 problem's extension when the credentials log in as another PMSPA account and links exist (OQ-161). */
export interface PmspaAccountSwitchProblem {
  slug: "pmspa-account-switch";
  linkCount: number;
  accountEmail: string;
}
