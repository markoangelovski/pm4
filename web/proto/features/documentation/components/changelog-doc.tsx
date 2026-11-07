"use client";

import { parseAsStringLiteral, useQueryState } from "nuqs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { formatWorkDate } from "@/lib/time";
import {
  useChangelog,
  type ChangelogApp,
  type ChangelogEntryDto,
  type ChangelogReleaseDto
} from "@/proto/features/documentation/api";
import {
  changelogScope,
  changelogText
} from "@/proto/features/documentation/changelog";

const APPS = [
  { value: "web", label: "Web" },
  { value: "api", label: "API" }
] as const satisfies { value: ChangelogApp; label: string }[];

/** The sections of a release, in changelog order. A change marked breaking is listed only there. */
const SECTIONS: {
  title: string;
  pick: (c: ChangelogEntryDto) => boolean;
}[] = [
  { title: "Breaking changes", pick: (c) => c.breaking },
  { title: "Features", pick: (c) => !c.breaking && c.type === "feat" },
  { title: "Bug fixes", pick: (c) => !c.breaking && c.type === "fix" }
];

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;

/** Documentation → Changelog: every release of the web app or the API, newest first, built from git. */
export function ChangelogDoc(): React.JSX.Element {
  const [app, setApp] = useQueryState(
    "app",
    parseAsStringLiteral(APPS.map((a) => a.value))
      .withDefault("web")
      .withOptions({ history: "replace", clearOnDefault: true })
  );
  const { data, isPending, isError, refetch } = useChangelog(app);
  const releases = data ?? [];

  return (
    <div className="flex flex-col gap-4">
      <Card className="border rounded-md!">
        <CardHeader>
          <CardTitle>Changelog</CardTitle>
          <CardDescription>
            What each release added and fixed, newest first. Built automatically
            from the commits in each release (see Versioning).
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ToggleGroup
            variant="outline"
            size="sm"
            spacing={0}
            aria-label="App"
            value={[app]}
            onValueChange={(value) => {
              const next = value[0] as ChangelogApp | undefined;
              if (next) void setApp(next);
            }}
          >
            {APPS.map((a) => (
              <ToggleGroupItem
                key={a.value}
                value={a.value}
                className="cursor-pointer bg-background px-3"
              >
                {a.label}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        </CardContent>
      </Card>

      {isError && !data ? (
        <Card className="flex flex-col items-start gap-4 p-6">
          <p className="text-sm">Couldn&apos;t load the changelog.</p>
          <Button
            variant="outline"
            className="cursor-pointer"
            onClick={() => refetch()}
          >
            Retry
          </Button>
        </Card>
      ) : isPending ? (
        [0, 1].map((i) => (
          <Card key={i} className="flex flex-col gap-3 p-6">
            <Skeleton className="h-6 w-40" />
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-full max-w-md" />
            <Skeleton className="h-4 w-full max-w-sm" />
          </Card>
        ))
      ) : releases.length === 0 ? (
        <Card className="p-6">
          <p className="text-sm text-muted-foreground">No releases yet.</p>
        </Card>
      ) : (
        releases.map((r, i) => (
          <ReleaseCard key={r.tag} release={r} latest={i === 0} />
        ))
      )}
    </div>
  );
}

function ReleaseCard({
  release,
  latest
}: {
  release: ChangelogReleaseDto;
  latest: boolean;
}): React.JSX.Element {
  const sections = SECTIONS.map((s) => ({
    title: s.title,
    changes: release.changes.filter(s.pick)
  })).filter((s) => s.changes.length > 0);

  return (
    <Card className="border rounded-md!" id={release.tag}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <span className="font-mono">v{release.version}</span>
          {latest ? <Badge variant="secondary">Latest</Badge> : null}
        </CardTitle>
        <CardDescription>
          {formatWorkDate(release.date)} ·{" "}
          {plural(release.changes.length, "change")} ·{" "}
          {plural(release.commitCount, "commit")}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4 text-sm">
        {sections.length === 0 ? (
          <p className="text-muted-foreground">
            Maintenance only: no new features or fixes.
          </p>
        ) : (
          sections.map((s) => (
            <section key={s.title} className="flex flex-col gap-2">
              <h3
                className={
                  s.title === "Breaking changes"
                    ? "font-medium text-destructive"
                    : "font-medium"
                }
              >
                {s.title}
              </h3>
              <ul className="flex list-disc flex-col gap-1.5 pl-5">
                {s.changes.map((c) => (
                  <li key={c.hash} className="leading-relaxed">
                    {changelogScope(c, release.app) ? (
                      <span className="font-medium">
                        {changelogScope(c, release.app)}:{" "}
                      </span>
                    ) : null}
                    {changelogText(c.description)}{" "}
                    <span className="font-mono text-xs text-muted-foreground">
                      {c.hash}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          ))
        )}
      </CardContent>
    </Card>
  );
}
