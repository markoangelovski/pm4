import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table";
import { Code, Section } from "./doc-section";
import { MermaidDiagram } from "./mermaid-diagram";

/** Mermaid architecture diagram (`architecture-beta`): groups per provider, services inside them, with logos from `@iconify-json/logos`. */
const SYSTEM = `architecture-beta
  group pages(logos:github-icon)[GitHub Pages]
  service static(logos:html-5)[Static export] in pages

  group browser(internet)[User browser]
  service web(logos:nextjs-icon)[PM4 web app] in browser
  service sw(logos:pwa)[Service worker cache] in browser

  group azure(logos:microsoft-azure)[Azure Web App]
  service api(logos:nestjs)[PM4 API] in azure

  group google(cloud)[Google]
  service oauth(logos:google-icon)[OAuth and OIDC] in google

  group neon(logos:neon-icon)[Neon]
  service pg(logos:postgresql)[Postgres] in neon

  group rediscloud(logos:redis)[Redis Cloud]
  service redis(logos:redis)[Redis] in rediscloud

  group external(internet)[External]
  service pmspa(server)[PMSPA] in external

  junction stores

  static:R --> L:web
  web:T -- B:sw
  web:R --> L:api
  api:T <--> B:oauth
  api:R --> L:pmspa
  api:B -- T:stores
  stores:L --> R:pg
  stores:R --> L:redis`;

/** What each line of the system diagram carries (architecture diagrams have no edge labels). */
const CONNECTIONS = [
  {
    from: "GitHub Pages",
    to: "Web app",
    carries: "HTML, JS and CSS of the static export"
  },
  {
    from: "Web app",
    to: "Service worker",
    carries: "Offline cache of the app files (data stays online-only)"
  },
  {
    from: "Web app",
    to: "API",
    carries: "HTTPS JSON with a bearer token, and the sign-in redirect"
  },
  {
    from: "API",
    to: "Google",
    carries: "OAuth 2.0 with PKCE: redirect out, callback with a code back"
  },
  { from: "API", to: "Postgres", carries: "SQL over TLS through Drizzle" },
  {
    from: "API",
    to: "Redis",
    carries: "Sessions, OAuth state and rate limits"
  },
  {
    from: "API",
    to: "PMSPA",
    carries: "HTTPS connector sync with the user's own PMSPA"
  }
];

const DEPLOY = `flowchart TD
  PR["Pull request"] --> CI["ci.yml<br/>changed-path checks"]
  CI --> OK{"ci-ok"}
  OK -->|"passed or skipped"| MERGE["Squash merge to master"]
  OK -->|"failed"| FIX["Fix on the branch"]
  FIX --> PR
  MERGE -->|"web/** or api/openapi.json"| WD["web-deploy.yml"]
  MERGE -->|"api/**"| AD["api-deploy.yml"]
  WD --> WV["Release version,<br/>changelog, build"]
  WV --> PAGES["GitHub Pages"]
  PAGES --> WT["Tag web-vX.Y.Z"]
  AD --> AV["Release version,<br/>changelog, build"]
  AV --> MIG["drizzle-kit migrate<br/>on Neon"]
  MIG --> AZ["Azure Web App"]
  AZ --> HC{"/health returns 200"}
  HC -->|"yes"| AT["Tag api-vX.Y.Z"]
  HC -->|"no"| FAIL["Deploy fails, no tag"]`;

const SERVICES = [
  {
    service: "Web app (static export)",
    use: "The UI. Static HTML, JS and CSS, no server at runtime",
    host: "GitHub Pages, custom domain pm4.angelovski.top"
  },
  {
    service: "API (NestJS)",
    use: "OAuth, tokens, rules, validation, reports, OpenAPI",
    host: "Azure Web App, Linux, Node 24, Free (F1) plan"
  },
  {
    service: "Postgres 18",
    use: "All durable data, accessed with Drizzle ORM",
    host: "Neon, free tier"
  },
  {
    service: "Redis",
    use: "Sessions (refresh tokens), OAuth state, one-time codes, rate limits",
    host: "Redis Cloud, free tier"
  },
  {
    service: "Google OAuth",
    use: "Sign-in (Authorization Code with PKCE)",
    host: "Google"
  },
  {
    service: "PMSPA",
    use: "Optional connector: the user links their own account and syncs time",
    host: "The user's own PMSPA URL (external)"
  },
  {
    service: "GitHub Actions",
    use: "CI checks, deploys, release tags and changelogs",
    host: "GitHub"
  }
];

const WORKFLOWS = [
  {
    file: "ci.yml",
    trigger: "Pull request",
    does: "Detects changed paths, runs the web and/or API checks, and ci-ok aggregates them. API e2e tests run against Postgres 18 and Redis 8 service containers."
  },
  {
    file: "web-deploy.yml",
    trigger: "Push to master touching web/** or api/openapi.json, or manual",
    does: "Release version, changelog, build the static export, deploy to GitHub Pages, tag web-v…"
  },
  {
    file: "api-deploy.yml",
    trigger: "Push to master touching api/**, or manual",
    does: "Release version, changelog, build, run migrations, deploy to Azure, poll /health, tag api-v…"
  }
];

const LAYOUT = [
  { path: "web/", role: "Frontend: Next.js static export with shadcn/ui" },
  {
    path: "api/",
    role: "Backend: NestJS and Drizzle, committed migrations in drizzle/"
  },
  {
    path: "api/openapi.json",
    role: "The committed contract between the two apps"
  },
  {
    path: "specs/",
    role: "Specs, ADRs and open questions: the source of truth"
  },
  { path: "tasks/", role: "Implementation backlog" },
  {
    path: ".github/workflows/",
    role: "ci.yml, web-deploy.yml, api-deploy.yml"
  },
  { path: "scripts/", role: "Release version, changelog and workflow helpers" }
];

const ENVS = [
  {
    env: "Local",
    web: "http://localhost:3000",
    api: "http://localhost:3001",
    data: "docker compose: postgres:18 and redis:8 (api/docker-compose.yml)"
  },
  {
    env: "Production",
    web: "https://pm4.angelovski.top",
    api: "Azure Web App (pm4-api), no custom domain",
    data: "Neon Postgres and Redis Cloud, both free tier"
  }
];

export function ArchitectureDoc() {
  return (
    <div className="flex flex-col gap-4">
      <Section
        title="Overview"
        description="Two independent apps joined by one contract."
      >
        <p>
          PM4 has a static web app and a separate API. The web app is plain
          files served from GitHub Pages. The API owns all data and business
          rules, and keeps its data in Postgres (Neon) and short-lived state in
          Redis (Redis Cloud). The two apps live in one repository but share no
          code.
        </p>
        <MermaidDiagram title="System architecture" chart={SYSTEM} />
        <div className="overflow-x-auto rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>From</TableHead>
                <TableHead>To</TableHead>
                <TableHead>Carries</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {CONNECTIONS.map((c) => (
                <TableRow key={`${c.from}-${c.to}`}>
                  <TableCell className="font-medium">{c.from}</TableCell>
                  <TableCell className="font-medium">{c.to}</TableCell>
                  <TableCell className="whitespace-normal">
                    {c.carries}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </Section>

      <Section title="Services" description="What runs where.">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Service</TableHead>
              <TableHead>Used for</TableHead>
              <TableHead>Hosted on</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {SERVICES.map((s) => (
              <TableRow key={s.service}>
                <TableCell className="font-medium whitespace-normal">
                  {s.service}
                </TableCell>
                <TableCell className="whitespace-normal">{s.use}</TableCell>
                <TableCell className="whitespace-normal">{s.host}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Section>

      <Section title="Web app" description="Next.js static export.">
        <ul className="list-disc space-y-1 pl-5">
          <li>
            Built with <Code>output: &quot;export&quot;</Code>. There is no Node
            server at runtime: no route handlers, server actions, middleware or
            request-time rendering.
          </li>
          <li>
            It is served from the domain root. The browser restores the session
            with its refresh token, then fetches data from the API.
          </li>
          <li>
            Nothing secret ships in the bundle. <Code>NEXT_PUBLIC_*</Code>{" "}
            values are inlined at build time from GitHub Actions variables.
          </li>
          <li>
            Server state is cached with TanStack Query. The client computes date
            ranges in the user&apos;s time zone and sends them to the API.
          </li>
        </ul>
      </Section>

      <Section
        title="Service worker and installable app"
        description="PM4 can be installed and keeps working when the network drops."
      >
        <ul className="list-disc space-y-1 pl-5">
          <li>
            The web app manifest makes PM4 installable. The service worker is{" "}
            <Code>/sw.js</Code> at the site root.
          </li>
          <li>
            The build writes <Code>sw.js</Code> with the list of every built
            file and a content hash, so each changed deploy installs a new
            worker. Updates are silent.
          </li>
          <li>
            Pages come from the network first, then the cache if the network
            fails. Content-hashed <Code>/_next/static/**</Code> files come from
            the cache first. The API is never cached.
          </li>
          <li>
            The worker also shows desktop notifications. There is no Web Push,
            so nothing arrives while PM4 is closed.
          </li>
          <li>It is registered only in production builds.</li>
        </ul>
      </Section>

      <Section title="API" description="NestJS on an Azure Web App.">
        <ul className="list-disc space-y-1 pl-5">
          <li>
            Modules: auth, users, projects, tasks, time, notes, changelog,
            version, health, account and the PMSPA integration.
          </li>
          <li>
            Every query is scoped to the signed-in user. Validation and business
            rules live here, not in the web app.
          </li>
          <li>
            Postgres is reached through Neon&apos;s pooled connection with
            Drizzle. Migrations use the direct connection and run before each
            API deploy.
          </li>
          <li>
            <Code>GET /health</Code> checks Postgres and Redis. Azure restarts
            an unhealthy instance. The Free plan has no Always On, so the first
            request after a quiet period is a cold start.
          </li>
          <li>
            CORS allows only the web origin. Responses carry security headers
            (helmet).
          </li>
        </ul>
      </Section>

      <Section
        title="Authentication and Redis"
        description="Cross-site, so bearer tokens instead of cookies."
      >
        <p>
          The web app and the API are different sites, so PM4 uses no cookie
          sessions. The API runs Google OAuth (Authorization Code with PKCE),
          then issues its own tokens. The web client sends the access token as a
          bearer token and keeps a refresh token to restore the session.
        </p>
        <p>
          Redis holds only temporary state: OAuth state and PKCE values,
          one-time codes, refresh tokens and rate-limit counters. It never holds
          the only copy of user data.
        </p>
      </Section>

      <Section
        title="Integrations"
        description="PMSPA is the only integration today."
      >
        <p>
          The user connects a PMSPA account under Settings, Integrations. The
          API stores the PMSPA password and cached token encrypted (AES-256-GCM)
          and talks to the user&apos;s PMSPA URL on their behalf. The web app
          then offers it under Connectors. Cloudflare R2 is reserved for future
          file features and is not used.
        </p>
      </Section>

      <Section
        title="The OpenAPI contract"
        description="The only interface between web and API."
      >
        <ol className="list-decimal space-y-1 pl-5">
          <li>
            The API exports <Code>api/openapi.json</Code> and commits it.
          </li>
          <li>
            The web app generates typed client code from it with{" "}
            <Code>npm run api:types</Code> into{" "}
            <Code>web/lib/api/schema.d.ts</Code>.
          </li>
          <li>
            CI regenerates both files and fails if either differs from what is
            committed.
          </li>
          <li>
            Changes to <Code>api/openapi.json</Code> also trigger a web deploy.
            The same file is published with the web app for the API Docs tab.
          </li>
        </ol>
      </Section>

      <Section
        title="CI/CD"
        description="GitHub Actions, one workflow per concern."
      >
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Workflow</TableHead>
              <TableHead>Runs on</TableHead>
              <TableHead>Does</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {WORKFLOWS.map((w) => (
              <TableRow key={w.file}>
                <TableCell className="font-medium whitespace-normal">
                  <Code>{w.file}</Code>
                </TableCell>
                <TableCell className="whitespace-normal">{w.trigger}</TableCell>
                <TableCell className="whitespace-normal">{w.does}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <p>
          <Code>master</Code> is protected. Every change arrives through a pull
          request that passes <Code>ci-ok</Code> and is squash merged. The
          deploy workflows do not repeat CI&apos;s checks, because the branch
          must be up to date with <Code>master</Code> before merging.
        </p>
        <MermaidDiagram title="Pull request to release" chart={DEPLOY} />
        <p>
          Release tags (<Code>web-v…</Code>, <Code>api-v…</Code>) are created
          after a successful deploy, and the version comes from conventional
          commits. See the Versioning tab for the rules.
        </p>
      </Section>

      <Section title="Environments" description="Local and production only.">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Environment</TableHead>
              <TableHead>Web</TableHead>
              <TableHead>API</TableHead>
              <TableHead>Data</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {ENVS.map((e) => (
              <TableRow key={e.env}>
                <TableCell className="font-medium whitespace-normal">
                  {e.env}
                </TableCell>
                <TableCell className="whitespace-normal">{e.web}</TableCell>
                <TableCell className="whitespace-normal">{e.api}</TableCell>
                <TableCell className="whitespace-normal">{e.data}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <p>
          There is no staging. CI runs end-to-end tests against disposable
          Postgres and Redis containers instead. API settings come from Azure
          App Settings and are checked at startup, so the app refuses to boot
          with a missing value.
        </p>
      </Section>

      <Section
        title="Repository layout"
        description="One monorepo, two independent npm projects."
      >
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Path</TableHead>
              <TableHead>Role</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {LAYOUT.map((l) => (
              <TableRow key={l.path}>
                <TableCell className="font-medium whitespace-normal">
                  <Code>{l.path}</Code>
                </TableCell>
                <TableCell className="whitespace-normal">{l.role}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <p>
          There is no root <Code>package.json</Code>, no npm workspaces and no
          imports between <Code>web/</Code> and <Code>api/</Code>.
        </p>
      </Section>
    </div>
  );
}
