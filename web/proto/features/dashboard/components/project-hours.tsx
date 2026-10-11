"use client";

import Link from "next/link";
import { FolderKanban } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ProjectIcon } from "@/proto/features/projects/components/project-icon";
import { formatDuration } from "@/lib/time";
import { routes } from "@/proto/lib/routes";
import type { ProjectShare } from "../stats";

function Name({ row }: { row: ProjectShare }) {
  if (row.kind === "unsorted" || row.kind === "nonprod") {
    return (
      <span className="min-w-0 truncate text-muted-foreground">
        {row.kind === "unsorted" ? "Unsorted" : "Non-prod"}
      </span>
    );
  }
  if (!row.projectId) {
    return (
      <span className="min-w-0 truncate">
        <span>{row.title}</span>{" "}
        <span className="text-muted-foreground">(deleted)</span>
      </span>
    );
  }
  return (
    <Link
      href={`${routes.app.project}?id=${row.projectId}`}
      className="flex min-w-0 items-center gap-2 hover:underline"
    >
      <ProjectIcon project={{ id: row.projectId }} className="size-5" />
      <span className="truncate">{row.title}</span>
    </Link>
  );
}

/** Worked hours per project in the range, the booked part inside each bar. Unsorted and Non-prod can't be booked. */
export function ProjectHours({ rows }: { rows: ProjectShare[] }) {
  const max = Math.max(0, ...rows.map((r) => r.worked));
  return (
    <Card className="h-full gap-0! border rounded-md! py-0!">
      <CardHeader className="flex h-11 flex-row items-center justify-between border-b px-4 py-0! pb-0!">
        <CardTitle className="flex items-center gap-2 text-sm">
          <FolderKanban size={16} className="text-muted-foreground" /> Hours by
          project
        </CardTitle>
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <span
              className="size-2 rounded-full"
              style={{ background: "var(--dash-booked)" }}
            />
            Booked
          </span>
          <span className="flex items-center gap-1">
            <span
              className="size-2 rounded-full"
              style={{ background: "var(--dash-worked)" }}
            />
            Not booked
          </span>
        </div>
      </CardHeader>
      <CardContent className="p-5">
        {rows.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            Nothing logged in this range.
          </p>
        ) : (
          <ul className="space-y-4">
            {rows.map((row) => {
              const bucket = row.kind !== "project";
              const share = max > 0 ? (row.worked / max) * 100 : 0;
              const booked =
                row.worked > 0
                  ? Math.min((row.booked / row.worked) * 100, 100)
                  : 0;
              return (
                <li key={row.key} className="space-y-1.5">
                  <div className="flex items-center justify-between gap-3 text-sm">
                    <Name row={row} />
                    <span className="flex shrink-0 items-baseline gap-2 tabular-nums">
                      <span className="font-medium">
                        {formatDuration(row.worked)}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {bucket ? "—" : `${formatDuration(row.booked)} booked`}
                      </span>
                    </span>
                  </div>
                  <div
                    className="h-2 overflow-hidden rounded-full"
                    style={{
                      width: `max(2.5rem, ${share}%)`,
                      background: bucket
                        ? "var(--muted-foreground)"
                        : "var(--dash-worked)"
                    }}
                  >
                    {bucket ? null : (
                      <div
                        className="h-full"
                        style={{
                          width: `${booked}%`,
                          background: "var(--dash-booked)"
                        }}
                      />
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
