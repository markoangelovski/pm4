"use client";

import { useState } from "react";
import { formatDistanceToNowStrict } from "date-fns";
import { Bot } from "lucide-react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "@/components/ui/card";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle
} from "@/components/ui/empty";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDateTime, formatShortDate } from "@/lib/time";
import { toastError } from "@/proto/features/system/rate-limit";
import { useMe } from "@/proto/features/users/api";
import {
  useConnectedApps,
  useRevokeConnectedApp,
  type ConnectedApp
} from "../api";
import { accessLabel, scopeLines } from "../scopes";
import { AppMark } from "./app-mark";
import { McpServerUrl } from "./mcp-server-url";

/** Settings → Connected apps (FR-MCP-009, OQ-292): one row per grant, Revoke behind a confirmation. */
export function ConnectedAppsSettings() {
  const { data: apps, isPending, isError, refetch } = useConnectedApps();
  const [revoking, setRevoking] = useState<ConnectedApp | null>(null);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Connected apps</CardTitle>
        <CardDescription>
          Apps and AI agents you allowed to use your PM4 account. Revoke one to
          disconnect it at once.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-6">
        <McpServerUrl />
        {isError && !apps ? (
          <div className="flex flex-col items-start gap-4">
            <p className="text-sm">Couldn&apos;t load your connected apps.</p>
            <Button
              variant="outline"
              className="cursor-pointer"
              onClick={() => refetch()}
            >
              Retry
            </Button>
          </div>
        ) : isPending || !apps ? (
          <div className="flex flex-col gap-3">
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
          </div>
        ) : apps.length === 0 ? (
          <Empty className="border border-dashed">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <Bot />
              </EmptyMedia>
              <EmptyTitle>No connected apps</EmptyTitle>
              <EmptyDescription>
                When you allow an app or AI agent to use your PM4 account, it
                shows here.
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : (
          <ul className="flex flex-col divide-y divide-border rounded-lg border border-border">
            {apps.map((app) => (
              <AppRow
                key={app.id}
                app={app}
                onRevoke={() => setRevoking(app)}
              />
            ))}
          </ul>
        )}
      </CardContent>
      <RevokeDialog app={revoking} onClose={() => setRevoking(null)} />
    </Card>
  );
}

function AppRow({
  app,
  onRevoke
}: {
  app: ConnectedApp;
  onRevoke: () => void;
}) {
  const { data: me } = useMe();
  const tz = me?.timeZone ?? "UTC";
  return (
    <li className="flex flex-col gap-3 p-4 sm:flex-row sm:items-start">
      <AppMark
        name={app.client.name}
        logoUri={app.logoUri}
        className="size-9 text-sm"
      />
      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <span className="font-medium [overflow-wrap:anywhere]">
            {app.client.name}
          </span>
          <Badge variant="secondary">{accessLabel(app.scopes)}</Badge>
        </div>
        <span className="font-mono text-xs text-muted-foreground [overflow-wrap:anywhere]">
          {app.client.clientIdHost}
        </span>
        <ul className="flex flex-col gap-0.5 text-sm text-muted-foreground">
          {scopeLines(app.scopes).map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
        <p className="text-xs text-muted-foreground">
          <span title={formatDateTime(app.connectedAt, tz)}>
            Connected {formatShortDate(app.connectedAt, tz)}
          </span>
          {" · "}
          {app.expired ? (
            // OQ-305: the refresh family is gone, so there is no last use to show; the row stays until revoked
            // or the app connects again.
            <span className="font-medium text-amber-700 dark:text-amber-400">
              Expired — reconnect from the app
            </span>
          ) : app.lastUsedAt ? (
            <span title={formatDateTime(app.lastUsedAt, tz)}>
              Last used{" "}
              {formatDistanceToNowStrict(app.lastUsedAt, { addSuffix: true })}
            </span>
          ) : (
            "Not used yet"
          )}
        </p>
      </div>
      <Button
        variant="outline"
        size="sm"
        className="w-fit cursor-pointer text-destructive! sm:shrink-0"
        onClick={onRevoke}
      >
        Revoke
      </Button>
    </li>
  );
}

function RevokeDialog({
  app,
  onClose
}: {
  app: ConnectedApp | null;
  onClose: () => void;
}) {
  const revoke = useRevokeConnectedApp();
  // Keep the name while the dialog animates out.
  const [shown, setShown] = useState<ConnectedApp | null>(app);
  if (app && app !== shown) setShown(app);
  const name = shown?.client.name ?? "";
  return (
    <AlertDialog
      open={app !== null}
      onOpenChange={(open) => !open && !revoke.isPending && onClose()}
    >
      <AlertDialogContent className="rounded-md!">
        <AlertDialogHeader>
          <AlertDialogTitle className="[overflow-wrap:anywhere]">
            Revoke {name}?
          </AlertDialogTitle>
          <AlertDialogDescription>
            It loses access to your PM4 account at once. To use it again, you
            have to connect it again and allow it.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="rounded-b-md">
          <AlertDialogCancel
            className="cursor-pointer"
            disabled={revoke.isPending}
          >
            Cancel
          </AlertDialogCancel>
          <Button
            variant="destructive"
            className="cursor-pointer"
            disabled={revoke.isPending || !app}
            onClick={() =>
              app &&
              revoke.mutate(app.id, {
                onSuccess: () => {
                  toast.success(`${name} disconnected`);
                  onClose();
                },
                onError: (e) => toastError(e, "Couldn't revoke the app.")
              })
            }
          >
            Revoke
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
