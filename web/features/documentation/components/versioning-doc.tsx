import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table";

/** Inline code in documentation text. */
function Code({ children }: { children: React.ReactNode }) {
  return (
    <code className="rounded bg-muted px-1 py-0.5 font-mono text-[0.85em]">
      {children}
    </code>
  );
}

function Section({
  title,
  description,
  children
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <Card className="border rounded-md!">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {description ? <CardDescription>{description}</CardDescription> : null}
      </CardHeader>
      <CardContent className="flex flex-col gap-3 text-sm leading-relaxed">
        {children}
      </CardContent>
    </Card>
  );
}

const BUMPS = [
  {
    commit: (
      <>
        <Code>feat!: …</Code> or a <Code>BREAKING CHANGE:</Code> footer
      </>
    ),
    bump: "Major",
    example: "0.4.2 → 1.0.0"
  },
  { commit: <Code>feat: …</Code>, bump: "Minor", example: "0.4.2 → 0.5.0" },
  {
    commit: (
      <>
        Anything else (<Code>fix</Code>, <Code>chore</Code>, <Code>test</Code>,
        a non-conventional message…)
      </>
    ),
    bump: "Patch",
    example: "0.4.2 → 0.4.3"
  },
  {
    commit: "No commits for the app since its last release",
    bump: "None",
    example: "0.4.2 stays 0.4.2"
  }
];

const STEPS = [
  {
    title: "Find the last release",
    body: (
      <>
        The app&apos;s newest tag reachable from the deployed commit, e.g.{" "}
        <Code>web-v0.4.2</Code>. With no tag yet, counting starts at{" "}
        <Code>0.0.0</Code>.
      </>
    )
  },
  {
    title: "Collect the commits since then",
    body: (
      <>
        Only non-merge commits that touched the app&apos;s paths count: web{" "}
        <Code>web/</Code> and <Code>api/openapi.json</Code>, API{" "}
        <Code>api/</Code>. These are the same paths that trigger the app&apos;s
        deploy.
      </>
    )
  },
  {
    title: "Pick the highest bump",
    body: "Each commit asks for a bump (table above); the largest one wins."
  },
  {
    title: "Stamp the version",
    body: (
      <>
        After the checks and before the build, CI writes the version into the
        app&apos;s <Code>package.json</Code>. It isn&apos;t committed. The web
        build reads it at build time; the API serves it from{" "}
        <Code>GET /api/v1/version</Code>.
      </>
    )
  },
  {
    title: "Deploy, then tag",
    body: (
      <>
        Only after a successful deploy (and, for the API, a passing{" "}
        <Code>/health</Code> check) does CI create the tag on the deployed
        commit. A failed deploy uses up no version.
      </>
    )
  }
];

/** Documentation → Versioning: how PM4's release versions are derived (arch-deployment#release-versions). */
export function VersioningDoc(): React.JSX.Element {
  return (
    <div className="flex flex-col gap-4">
      <Section
        title="Versioning"
        description="How PM4 numbers its releases. Nobody bumps a version by hand."
      >
        <p>
          The web app and the API are released separately, so each has its own
          version in the{" "}
          <a
            href="https://semver.org"
            target="_blank"
            rel="noreferrer"
            className="text-primary hover:underline"
          >
            semver
          </a>{" "}
          form <Code>major.minor.patch</Code>. Each deploy works out its
          app&apos;s next version from git history.
        </p>
        <p>
          The version pill at the top of the sidebar shows the web version.
          Hover it to see both, e.g. <Code>Web v0.5.0 · API v0.3.1</Code>.
        </p>
      </Section>

      <Section
        title="Tags are the source of truth"
        description="A release is a git tag on the deployed commit."
      >
        <p>
          Web releases are tagged <Code>web-v&lt;version&gt;</Code> and API
          releases <Code>api-v&lt;version&gt;</Code>. The <Code>version</Code>{" "}
          in <Code>web/package.json</Code> and <Code>api/package.json</Code>{" "}
          stays at <Code>0.0.0</Code> in the repository, so a local build always
          shows <Code>v0.0.0</Code> and never looks like a release.
        </p>
      </Section>

      <Section
        title="How the next version is chosen"
        description="From conventional commit messages since the last release."
      >
        <div className="overflow-x-auto rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Commit</TableHead>
                <TableHead>Bump</TableHead>
                <TableHead>Example</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {BUMPS.map((b) => (
                <TableRow key={b.bump}>
                  <TableCell className="whitespace-normal">
                    {b.commit}
                  </TableCell>
                  <TableCell className="font-medium">{b.bump}</TableCell>
                  <TableCell className="font-mono text-xs">
                    {b.example}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        <p className="text-muted-foreground">
          The same rules apply while the major version is 0. A run with no bump
          redeploys the current version and creates no tag.
        </p>
      </Section>

      <Section title="What happens on a deploy">
        <ol className="flex flex-col gap-3">
          {STEPS.map((s, i) => (
            <li key={s.title} className="flex gap-3">
              <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-medium">
                {i + 1}
              </span>
              <div className="flex flex-col gap-0.5">
                <span className="font-medium">{s.title}</span>
                <span className="text-muted-foreground">{s.body}</span>
              </div>
            </li>
          ))}
        </ol>
      </Section>

      <Section
        title="Example"
        description="Web was last released as web-v0.4.2."
      >
        <p>Since then, these commits touched web/:</p>
        <ul className="flex flex-col gap-1 font-mono text-xs">
          <li>fix(web): keep the filter after reload</li>
          <li>feat(web): documentation page</li>
          <li>chore: update dependencies</li>
        </ul>
        <p>
          The highest bump is minor (<Code>feat</Code>), so the deploy ships{" "}
          <Code>0.5.0</Code> and tags the commit <Code>web-v0.5.0</Code>. The
          API had no commits, so its version stays as it is.
        </p>
      </Section>

      <Section title="Good to know">
        <ul className="flex list-disc flex-col gap-1.5 pl-5">
          <li>
            CI pushes only tags, never commits, so it never races with your own
            pushes.
          </li>
          <li>
            Re-running a deploy is safe: a tag already on the same commit is
            kept. A tag on a different commit is left alone with a warning.
          </li>
          <li>
            The API contract (<Code>openapi.json</Code>) is exported before
            stamping, so a release never changes it.
          </li>
          <li>
            Pull request checks don&apos;t release anything; only the deploy
            workflows do.
          </li>
          <li>
            The Changelog tab is built by the same deploy from the same commits,
            so it lists every release, including the one just shipped. The web
            app&apos;s list ships with the site; the API serves its own.
          </li>
        </ul>
      </Section>
    </div>
  );
}
