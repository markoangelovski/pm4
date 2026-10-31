"use client";

import { useState } from "react";
import { RefreshCw, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger
} from "@/components/ui/tooltip";
import {
  usePmspaConnection,
  usePush,
  usePushPreview,
  useSync,
  useSyncPreview
} from "../api";
import type {
  PmspaPushTargetDto,
  PmspaSyncTargetDto,
  SyncChoiceDto
} from "../types";
import { STATUS_LABEL } from "../sync";
import { SyncPreviewDialog } from "./sync-preview-dialog";

type Target = PmspaSyncTargetDto | PmspaPushTargetDto;

const DESCRIPTION: Record<Target["type"], string> = {
  project:
    "The project and its tasks sync with PMSPA, both ways. Untick a task to leave it out.",
  task: "The task syncs with PMSPA, both ways, with its project if that isn't there yet.",
  day: "The day's logs go to PMSPA as one event per task, titled after its project (logs without a project go by their title), with any missing projects and tasks."
};

/**
 * The PMSPA action of a target: what its control shows (hidden without a saved connection; disabled, with the status
 * as its hint, unless the status is Connected) and the preview dialog it opens. The control and the dialog render
 * apart, so a menu item can open a dialog that outlives the menu.
 */
export function usePmspaAction({
  target,
  label,
  disabled,
  disabledHint
}: {
  target: Target;
  /** Used in the dialog title, e.g. the project's name or the date. */
  label: string;
  /** E.g. a day without logs. */
  disabled?: boolean;
  disabledHint?: string;
}) {
  const { data: connection } = usePmspaConnection();
  const syncPreview = useSyncPreview();
  const sync = useSync();
  const pushPreview = usePushPreview();
  const push = usePush();
  const [open, setOpen] = useState(false);
  const mode = target.type === "day" ? "push" : "sync";
  const preview = target.type === "day" ? pushPreview : syncPreview;
  const load = () =>
    target.type === "day"
      ? pushPreview.mutate(target)
      : syncPreview.mutate(target);
  const run = (choices: SyncChoiceDto[]) =>
    target.type === "day"
      ? push.mutateAsync({ target, choices })
      : sync.mutateAsync({ target, choices });

  const hidden = !connection || connection.status === "not-configured";
  const connected = connection?.status === "connected";
  const hint =
    connection && !connected
      ? `PMSPA: ${STATUS_LABEL[connection.status]}. Check it in Settings → Integrations.`
      : disabled
        ? disabledHint
        : undefined;

  return {
    hidden,
    mode,
    label: mode === "sync" ? "Sync with PMSPA" : "Push to PMSPA",
    disabled: !connected || !!disabled,
    hint,
    start: () => {
      preview.reset();
      load();
      setOpen(true);
    },
    dialog: hidden ? null : (
      <SyncPreviewDialog
        open={open}
        onOpenChange={setOpen}
        mode={mode}
        title={
          mode === "sync"
            ? `Sync ${label} with PMSPA`
            : `Push ${label} to PMSPA`
        }
        description={DESCRIPTION[target.type]}
        items={preview.data?.items}
        isPending={preview.isPending}
        isError={preview.isError}
        error={preview.error}
        onRetry={load}
        onRun={run}
      />
    )
  };
}

export type PmspaAction = ReturnType<typeof usePmspaAction>;

/**
 * FR-INT-012: **Sync with PMSPA** on the project detail and the task detail (both ways, OQ-172). The day view's
 * **Push to PMSPA** is an item of its ⋯ menu (`DayMenu`), over `usePmspaAction`.
 */
export function PushToPmspaButton(props: Parameters<typeof usePmspaAction>[0]) {
  const action = usePmspaAction(props);
  if (action.hidden) return null;

  const button = (
    <Button
      variant="outline"
      className="cursor-pointer"
      disabled={action.disabled}
      onClick={action.start}
    >
      {action.mode === "sync" ? (
        <RefreshCw data-icon="inline-start" />
      ) : (
        <Upload data-icon="inline-start" />
      )}
      {action.label}
    </Button>
  );

  return (
    <>
      {action.hint ? (
        <Tooltip>
          {/* A disabled button gets no pointer events: the wrapper carries the hint. */}
          <TooltipTrigger
            render={<span tabIndex={0} className="inline-flex" />}
          >
            {button}
          </TooltipTrigger>
          <TooltipContent>{action.hint}</TooltipContent>
        </Tooltip>
      ) : (
        button
      )}
      {action.dialog}
    </>
  );
}
