"use client";

import { RefreshCw, Unlink } from "lucide-react";
import { toast } from "sonner";
import { badgeVariants } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger
} from "@/components/ui/popover";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger
} from "@/components/ui/tooltip";
import { useMe } from "@/proto/features/users/api";
import { cn } from "@/lib/utils";
import { usePmspaLinks, useUnlink } from "../api";
import type { PmspaLinkType } from "../proposed-types";
import { ORIGIN_LABEL, formatSyncedDate, syncedLine } from "../sync";
import { PmspaRecordNote } from "./pmspa-record-note";

const NOUN: Record<PmspaLinkType, string> = {
  project: "project",
  task: "task",
  "time-log": "log"
};

/**
 * FR-INT-010: the sync flag beside a linked record. Its label says which way the link was made (OQ-164):
 * from, to or with PMSPA, and the last sync. `icon` (lists and details) is the icon alone with the label as
 * its tooltip; `tag` (log rows) also shows the label and the date. A click opens a popover with the line,
 * the PMSPA record, read live (OQ-164, OQ-170), and **Unlink**. Renders nothing for a record that isn't
 * linked, or without a saved connection.
 */
export function SyncFlag({
  type,
  id,
  variant = "icon",
  className
}: {
  type: PmspaLinkType;
  id: string;
  variant?: "icon" | "tag";
  className?: string;
}) {
  const { data: links } = usePmspaLinks(type);
  const { data: me } = useMe();
  const unlink = useUnlink();
  const link = links?.get(id);
  if (!link || !me) return null;
  const line = syncedLine(link.origin, link.syncedAt, me.timeZone);
  return (
    <Popover>
      <Tooltip>
        <TooltipTrigger
          render={
            <PopoverTrigger
              render={
                <button
                  type="button"
                  aria-label={line}
                  onClick={(e) => e.stopPropagation()}
                  className={cn(
                    variant === "icon"
                      ? "inline-flex shrink-0 cursor-pointer items-center justify-center rounded-sm p-0.5 text-muted-foreground outline-none hover:text-primary focus-visible:ring-2 focus-visible:ring-ring/50"
                      : cn(
                          badgeVariants({ variant: "outline" }),
                          "cursor-pointer font-normal text-muted-foreground hover:bg-muted hover:text-foreground"
                        ),
                    className
                  )}
                />
              }
            />
          }
        >
          <RefreshCw className="size-3.5" />
          {variant === "tag"
            ? `${ORIGIN_LABEL[link.origin]} on ${formatSyncedDate(link.syncedAt, me.timeZone)}`
            : null}
        </TooltipTrigger>
        <TooltipContent>{line}</TooltipContent>
      </Tooltip>
      <PopoverContent
        align="start"
        className="w-max max-w-[min(40rem,calc(100vw-2rem))] rounded-md!"
        onClick={(e) => e.stopPropagation()}
      >
        <PopoverHeader>
          <PopoverTitle className="flex items-start gap-2">
            <RefreshCw className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
            {line}
          </PopoverTitle>
          <PmspaRecordNote type={type} id={id} />
        </PopoverHeader>
        <Button
          variant="outline"
          size="sm"
          className="w-fit cursor-pointer"
          disabled={unlink.isPending}
          onClick={() =>
            unlink.mutate(
              { type, id },
              {
                onSuccess: () =>
                  toast(
                    `Unlinked from PMSPA. The ${NOUN[type]} stays in both apps.`
                  ),
                onError: () => toast.error("Couldn't unlink the record.")
              }
            )
          }
        >
          <Unlink data-icon="inline-start" />
          Unlink
        </Button>
      </PopoverContent>
    </Popover>
  );
}
