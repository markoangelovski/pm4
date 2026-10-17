import type { UseMutationResult, UseQueryResult } from "@tanstack/react-query";
import type { components } from "@/lib/api/schema";

// Typed stubs (feat-int-web). T1 replaces this file with the twin of proto/features/integrations/api.ts.
type S = components["schemas"];

/** API-INT-001. */
export function usePmspaConnection(): UseQueryResult<
  S["PmspaConnectionResponseDto"]
> {
  throw new Error("not implemented (feat-int-web)");
}

/** API-INT-002. */
export function useSavePmspaConnection(): UseMutationResult<
  S["PmspaConnectionResponseDto"],
  Error,
  S["SavePmspaConnectionDto"]
> {
  throw new Error("not implemented (feat-int-web)");
}

/** API-INT-004. */
export function useDisconnectPmspa(): UseMutationResult<void, Error, void> {
  throw new Error("not implemented (feat-int-web)");
}

/** API-INT-012. */
export function usePmspaLinks(
  type: S["PmspaLinkType"]
): UseQueryResult<Map<string, S["PmspaLinkDto"]>> {
  void type;
  throw new Error("not implemented (feat-int-web)");
}

/** API-INT-014. */
export function usePmspaLinkDetail(
  type: S["PmspaLinkType"],
  id: string,
  enabled: boolean
): UseQueryResult<S["PmspaLinkDetailDto"]> {
  void [type, id, enabled];
  throw new Error("not implemented (feat-int-web)");
}

/** API-INT-008. */
export function useImportPreview(): UseMutationResult<
  S["SyncPreviewDto"],
  Error,
  S["PmspaImportSelectionDto"]
> {
  throw new Error("not implemented (feat-int-web)");
}

/** API-INT-009. */
export function useImport(): UseMutationResult<
  S["SyncResultDto"],
  Error,
  S["PmspaImportDto"]
> {
  throw new Error("not implemented (feat-int-web)");
}

/** API-INT-015. */
export function useSyncPreview(): UseMutationResult<
  S["SyncPreviewDto"],
  Error,
  S["PmspaSyncTargetDto"]
> {
  throw new Error("not implemented (feat-int-web)");
}

/** API-INT-016. */
export function useSync(): UseMutationResult<
  S["SyncResultDto"],
  Error,
  S["PmspaSyncDto"]
> {
  throw new Error("not implemented (feat-int-web)");
}

/** API-INT-010. */
export function usePushPreview(): UseMutationResult<
  S["SyncPreviewDto"],
  Error,
  S["PmspaPushTargetDto"]
> {
  throw new Error("not implemented (feat-int-web)");
}

/** API-INT-011. */
export function usePush(): UseMutationResult<
  S["SyncResultDto"],
  Error,
  S["PmspaPushDto"]
> {
  throw new Error("not implemented (feat-int-web)");
}
