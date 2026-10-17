import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { PmspaConnectionStatus } from "../types";
import { STATUS_LABEL } from "../sync";

const DOT: Record<PmspaConnectionStatus, string> = {
  "not-configured": "bg-muted-foreground/50",
  connected: "bg-emerald-500",
  "invalid-credentials": "bg-destructive",
  unreachable: "bg-amber-500"
};

/** FR-INT-004: the connection status as a dot and a label. */
export function ConnectionStatusBadge({
  status,
  className
}: {
  status: PmspaConnectionStatus;
  className?: string;
}) {
  return (
    <Badge variant="outline" className={cn("gap-1.5 font-normal", className)}>
      <span aria-hidden className={cn("size-2 rounded-full", DOT[status])} />
      {STATUS_LABEL[status]}
    </Badge>
  );
}
