import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";
import { useSlowPmspa } from "../sync";

/**
 * OQ-165: PMSPA runs on an Azure F1 plan that sleeps when idle, so its first answer can take up to a minute.
 * Shown under a PMSPA call that has taken a few seconds; nothing before that.
 */
export function ColdStartHint({
  active,
  className
}: {
  active: boolean;
  className?: string;
}) {
  const slow = useSlowPmspa(active);
  if (!slow) return null;
  return (
    <p
      role="status"
      className={cn(
        "flex items-center gap-2 text-xs text-muted-foreground",
        className
      )}
    >
      <Spinner className="size-3.5" />
      PMSPA is waking up. This can take up to a minute.
    </p>
  );
}
