"use client";

import { badgeVariants } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger
} from "@/components/ui/tooltip";
import { useApiVersion } from "@/features/system/api";
import { cn } from "@/lib/utils";
import {
  formatVersion,
  versionSummary,
  webVersion,
  type ApiVersionState
} from "@/lib/version";

export function VersionBadge({
  className
}: {
  className?: string;
}): React.JSX.Element {
  const { isSuccess, isError, data } = useApiVersion();
  const state: ApiVersionState = isSuccess
    ? { status: "success", version: data }
    : isError
      ? { status: "error" }
      : { status: "pending" };
  const summary = versionSummary(webVersion(), state);

  return (
    <Tooltip>
      <TooltipTrigger
        aria-label={summary}
        className={cn(
          badgeVariants({ variant: "secondary" }),
          "cursor-default",
          className
        )}
      >
        {formatVersion(webVersion())}
      </TooltipTrigger>
      <TooltipContent side="bottom">{summary}</TooltipContent>
    </Tooltip>
  );
}
