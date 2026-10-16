"use client";

import { useState } from "react";
import Link from "next/link";
import { parseAsStringLiteral, useQueryState } from "nuqs";
import { useIsFetching, useQueryClient } from "@tanstack/react-query";
import {
  Clock,
  Download,
  FolderKanban,
  Globe,
  ListChecks,
  RefreshCw,
  Unplug
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Item,
  ItemActions,
  ItemContent,
  ItemMedia,
  ItemTitle
} from "@/components/ui/item";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle
} from "@/components/ui/empty";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useMe } from "@/proto/features/users/api";
import { routes } from "@/proto/lib/routes";
import {
  integrationKeys,
  useImport,
  useImportPreview,
  usePmspaConnection,
  type PmspaConnection
} from "../api";
import type { PmspaImportSelectionDto } from "../proposed-types";
import { STATUS_LABEL, formatSyncedAt } from "../sync";
import { ColdStartHint } from "./cold-start-hint";
import { ConnectionStatusBadge } from "./connection-status-badge";
import { PmspaAccount } from "./pmspa-account";
import { PmspaProjectsTab, type ProjectSelection } from "./pmspa-projects-tab";
import { PmspaTimeTab } from "./pmspa-time-tab";
import { SyncPreviewDialog } from "./sync-preview-dialog";

const TABS = ["projects", "time"] as const;

function SettingsLink() {
  return (
    <Button
      variant="outline"
      className="cursor-pointer"
      render={<Link href={`${routes.app.settings}?tab=integrations`} />}
    >
      Open Integrations settings
    </Button>
  );
}

/** FR-INT-007: Connectors → PMSPA (`/app/connectors/pmspa`): browse PMSPA live and import (FR-INT-011). */
export function PmspaConnector() {
  const {
    data: connection,
    isPending,
    isError,
    refetch
  } = usePmspaConnection();

  let body: React.ReactNode;
  if (isPending) {
    body = (
      <div className="flex flex-col gap-3">
        <Skeleton className="h-5 w-80" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  } else if (isError || !connection) {
    body = (
      <Empty>
        <EmptyHeader>
          <EmptyTitle>Couldn&apos;t load the PMSPA connection.</EmptyTitle>
        </EmptyHeader>
        <EmptyContent>
          <Button
            variant="outline"
            className="cursor-pointer"
            onClick={() => void refetch()}
          >
            Retry
          </Button>
        </EmptyContent>
      </Empty>
    );
  } else if (connection.status === "not-configured") {
    body = (
      <Empty className="border rounded-md">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <Unplug />
          </EmptyMedia>
          <EmptyTitle>PMSPA isn&apos;t connected</EmptyTitle>
          <EmptyDescription>
            Connect your PMSPA account in Settings to browse and import it here.
          </EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <SettingsLink />
        </EmptyContent>
      </Empty>
    );
  } else if (connection.status !== "connected") {
    body = (
      <Empty className="border rounded-md">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <Globe />
          </EmptyMedia>
          <EmptyTitle>PMSPA: {STATUS_LABEL[connection.status]}</EmptyTitle>
          <EmptyDescription>
            {connection.status === "invalid-credentials"
              ? "PMSPA rejected the saved email or password. Update them to browse PMSPA again."
              : `PM4 got no answer from ${connection.url}. Check the URL, or test the connection again later.`}
          </EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <SettingsLink />
        </EmptyContent>
      </Empty>
    );
  } else {
    return <Browser connection={connection} />;
  }

  return (
    <div className="flex flex-col gap-6">
      <Heading />
      {body}
    </div>
  );
}

function Heading({ actions }: { actions?: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-4">
      <h1 className="flex items-center gap-2 text-2xl font-semibold">
        <Globe className="size-6 text-muted-foreground" />
        PMSPA
      </h1>
      {actions}
    </div>
  );
}

function Browser({ connection }: { connection: PmspaConnection }) {
  const queryClient = useQueryClient();
  const { data: me } = useMe();
  const [tab, setTab] = useQueryState(
    "tab",
    parseAsStringLiteral(TABS)
      .withDefault("projects")
      .withOptions({ history: "replace", clearOnDefault: true })
  );
  const [projects, setProjects] = useState<ProjectSelection>(new Map());
  const [dates, setDates] = useState<Set<string>>(new Set());
  const [importing, setImporting] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const reading = useIsFetching({ queryKey: integrationKeys.remote() }) > 0;
  const preview = useImportPreview();
  const runImport = useImport();

  async function refresh() {
    setRefreshing(true);
    try {
      await queryClient.invalidateQueries({
        queryKey: integrationKeys.remote()
      });
    } finally {
      setRefreshing(false);
    }
  }

  const selection: PmspaImportSelectionDto = {
    projects: [...projects].map(([id, s]) => ({
      id,
      taskIds: s.tasks === "all" ? null : [...s.tasks]
    })),
    dates: [...dates]
  };
  const taskCount = [...projects.values()].reduce(
    (n, s) => n + (s.tasks === "all" ? s.taskCount : s.tasks.size),
    0
  );
  const parts = [
    projects.size &&
      `${projects.size} ${projects.size === 1 ? "project" : "projects"}`,
    taskCount && `${taskCount} ${taskCount === 1 ? "task" : "tasks"}`,
    dates.size && `${dates.size} ${dates.size === 1 ? "day" : "days"}`
  ].filter(Boolean) as string[];
  const selected =
    parts.length === 0
      ? null
      : parts.length === 1
        ? parts[0]
        : `${parts.slice(0, -1).join(", ")} and ${parts.at(-1)}`;

  return (
    <div className="flex flex-col gap-6">
      <Heading
        actions={
          <Button
            variant="outline"
            className="cursor-pointer"
            disabled={refreshing}
            onClick={() => void refresh()}
          >
            <RefreshCw
              data-icon="inline-start"
              className={cn(refreshing && "animate-spin")}
            />
            {refreshing ? "Refreshing…" : "Refresh"}
          </Button>
        }
      />

      <div className="flex flex-col gap-2">
        <PmspaAccount
          connection={connection}
          className="rounded-md!"
          actions={
            <div className="flex flex-wrap items-center justify-end gap-x-3 gap-y-1 text-xs text-muted-foreground">
              <span>
                Last sync{" "}
                {connection.lastSyncAt && me
                  ? formatSyncedAt(connection.lastSyncAt, me.timeZone)
                  : "never"}
              </span>
              <ConnectionStatusBadge status={connection.status} />
            </div>
          }
        />
        <ColdStartHint active={reading} />
      </div>

      <Tabs
        value={tab}
        onValueChange={(v) => void setTab(v as (typeof TABS)[number])}
      >
        <TabsList>
          <TabsTrigger value="projects" className="cursor-pointer">
            <FolderKanban /> Projects &amp; tasks
          </TabsTrigger>
          <TabsTrigger value="time" className="cursor-pointer">
            <Clock /> Time
          </TabsTrigger>
        </TabsList>
        <TabsContent value="projects" className="mt-2">
          <PmspaProjectsTab
            selection={projects}
            onSelectionChange={setProjects}
          />
        </TabsContent>
        <TabsContent value="time" className="mt-2">
          <PmspaTimeTab selection={dates} onSelectionChange={setDates} />
        </TabsContent>
      </Tabs>

      {selected ? (
        <Item
          variant="outline"
          className="sticky bottom-4 z-10 mx-auto max-w-2xl rounded-md! bg-background shadow-lg"
        >
          <ItemMedia variant="icon" className="text-muted-foreground">
            <ListChecks />
          </ItemMedia>
          <ItemContent>
            <ItemTitle>{selected} selected</ItemTitle>
          </ItemContent>
          <ItemActions>
            <Button
              variant="ghost"
              className="cursor-pointer"
              onClick={() => {
                setProjects(new Map());
                setDates(new Set());
              }}
            >
              Clear
            </Button>
            <Button
              className="cursor-pointer"
              onClick={() => {
                preview.mutate(selection);
                setImporting(true);
              }}
            >
              <Download data-icon="inline-start" />
              Import…
            </Button>
          </ItemActions>
        </Item>
      ) : null}

      <SyncPreviewDialog
        open={importing}
        onOpenChange={setImporting}
        mode="import"
        title="Import from PMSPA"
        description="What will change in PM4. Projects and tasks that aren't linked can be created, or linked to one you already have."
        items={preview.data?.items}
        isPending={preview.isPending}
        isError={preview.isError}
        onRetry={() => preview.mutate(selection)}
        onRun={async (choices) => {
          const result = await runImport.mutateAsync({ selection, choices });
          setProjects(new Map());
          setDates(new Set());
          return result;
        }}
      />
    </div>
  );
}
