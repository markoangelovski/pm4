"use client";

import Link from "next/link";
import { Globe } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { routes } from "@/proto/lib/routes";
import { usePmspaConnection } from "../api";
import { ConnectionStatusBadge } from "./connection-status-badge";
import { PmspaAccount } from "./pmspa-account";

const SETTINGS = `${routes.app.settings}?tab=integrations`;

/** The PMSPA row: the account PM4 is signed in to, or how to connect one. */
function PmspaIntegration() {
  const {
    data: connection,
    isPending,
    isError,
    refetch
  } = usePmspaConnection();

  if (isError && !connection) {
    return (
      <div className="flex flex-wrap items-center gap-3 text-sm">
        <span>Couldn&apos;t load the PMSPA connection.</span>
        <Button
          variant="outline"
          size="sm"
          className="cursor-pointer"
          onClick={() => void refetch()}
        >
          Retry
        </Button>
      </div>
    );
  }
  if (isPending || !connection) return <Skeleton className="h-16 max-w-md" />;

  if (connection.status === "not-configured" || !connection.account) {
    return (
      <div className="flex flex-wrap items-center gap-3">
        <span className="text-sm text-muted-foreground">
          No PMSPA account connected.
        </span>
        <Button
          variant="outline"
          size="sm"
          className="cursor-pointer"
          render={<Link href={SETTINGS} />}
        >
          Connect in Settings
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <span className="text-xs text-muted-foreground">
        Connected PMSPA account
      </span>
      <PmspaAccount
        connection={connection}
        actions={<ConnectionStatusBadge status={connection.status} />}
      />
    </div>
  );
}

/**
 * Profile → Integrations: one row per integration, each showing the external account it uses. Adding an
 * integration means adding its row here. Today the list holds only PMSPA.
 */
const INTEGRATIONS = [
  { id: "pmspa", name: "PMSPA", icon: Globe, row: <PmspaIntegration /> }
];

export function ProfileIntegrations() {
  return (
    <Card className="p-6">
      <div className="flex flex-col gap-1">
        <h2 className="text-base font-semibold">Integrations</h2>
        <p className="text-sm text-muted-foreground">
          External services connected to your PM4 account.
        </p>
      </div>
      <ul className="flex flex-col gap-4">
        {INTEGRATIONS.map((i) => (
          <li key={i.id} className="flex flex-col gap-2">
            <span className="flex items-center gap-2 text-sm font-medium">
              <i.icon className="size-4 text-muted-foreground" /> {i.name}
            </span>
            {i.row}
          </li>
        ))}
      </ul>
      <Link
        href={SETTINGS}
        className="w-fit text-sm text-primary hover:underline"
      >
        Manage in Settings
      </Link>
    </Card>
  );
}
