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

const SIGN_IN = `sequenceDiagram
  autonumber
  participant B as Browser (web app)
  participant A as API
  participant R as Redis
  participant G as Google
  participant P as Postgres
  B->>A: GET /auth/google?returnTo&timeZone
  A->>R: Save state + PKCE verifier (10 min)
  A-->>B: 302 to Google
  B->>G: Choose account and consent
  G-->>B: 302 to API callback with code + state
  B->>A: GET /auth/google/callback
  A->>R: Load and delete state (single use)
  A->>G: Exchange code (PKCE), check ID token
  A->>P: Find or create user and identity
  A->>R: Save login code hash (60 s)
  A-->>B: 302 to web /auth/callback?code
  B->>A: POST /auth/token with code
  A->>R: Consume login code (single use)
  A->>R: Save refresh token hash + family
  A-->>B: access token + refresh token
  Note over B: Access token in memory<br/>Refresh token in localStorage
  B->>B: Replace URL, go to returnTo`;

const REFRESH = `sequenceDiagram
  autonumber
  participant B as Web app
  participant A as API
  participant R as Redis
  B->>A: GET /projects (Bearer access token)
  A-->>B: 200 data
  Note over B: Access token expires after 15 min
  B->>A: GET /projects (expired token)
  A-->>B: 401
  Note over B: One refresh at a time<br/>across all tabs
  B->>A: POST /auth/refresh with refresh token
  A->>R: Is it live? Mark old one rotated
  A->>R: Save new refresh token hash (30 days)
  A-->>B: new access token + new refresh token
  B->>B: Store new refresh token in localStorage
  B->>A: GET /projects (new access token)
  A-->>B: 200 data
  Note over A,R: Replaying the old refresh token<br/>revokes the whole family`;

const SIGN_OUT = `sequenceDiagram
  autonumber
  participant B as Web app
  participant A as API
  participant R as Redis
  B->>A: POST /auth/logout with refresh token
  A->>R: Revoke the token family
  A-->>B: 204
  B->>B: Clear localStorage and memory
  Note over B: Other tabs see the storage change<br/>and end their session too`;

const TOKENS = [
  {
    name: "Access token",
    what: "JWT (HS256), sub is the user id. Sent as a Bearer header.",
    life: "15 minutes",
    web: "Memory only, per tab",
    api: "Not stored. Verified by signature and expiry."
  },
  {
    name: "Refresh token",
    what: "Opaque, 32 random bytes. Single use: each refresh rotates it.",
    life: "30 days, sliding",
    web: "localStorage, key pm4.refreshToken",
    api: "Redis, only as a SHA-256 hash, with its family"
  },
  {
    name: "Login code",
    what: "One-time code that carries the sign-in from the callback to the web app.",
    life: "60 seconds",
    web: "In the callback URL, then removed from history",
    api: "Redis, hash only, deleted when used"
  },
  {
    name: "OAuth state",
    what: "Random state and PKCE verifier for one sign-in attempt, plus returnTo and timeZone.",
    life: "10 minutes",
    web: "Never sent to the web app",
    api: "Redis, deleted when used"
  }
];

const REDIS_KEYS = [
  [
    "oauth:state:<state>",
    "Verifier, returnTo and time zone of one sign-in attempt"
  ],
  ["auth:code:<hash>", "A pending login code"],
  ["auth:refresh:<hash>", "A live refresh token: user id and family id"],
  ["auth:family:<id>", "A family: user id and the hash of its live token"],
  ["auth:rotated:<hash>", "A token already used, kept to detect replays"],
  [
    "auth:families:<userId>",
    "All family ids of a user, used by sign out everywhere"
  ]
];

const LIMITS = [
  ["GET /auth/google", "10 / min"],
  ["GET /auth/google/callback", "10 / min"],
  ["POST /auth/token", "10 / min"],
  ["POST /auth/refresh", "30 / min"],
  ["POST /auth/logout", "30 / min"],
  ["Every other endpoint", "300 / min per user"]
];

const ENDPOINTS = [
  ["GET /auth/google", "Starts sign-in and redirects to Google"],
  [
    "GET /auth/google/callback",
    "Receives Google's answer, redirects to the web app"
  ],
  ["POST /auth/token", "Swaps a login code for the token pair"],
  ["POST /auth/refresh", "Rotates the refresh token, returns a new pair"],
  ["POST /auth/logout", "Revokes the family of the given refresh token"],
  [
    "POST /auth/logout-all",
    "Revokes every family of the user (needs a Bearer token)"
  ]
];

function Rows({ rows }: { rows: string[][] }) {
  return (
    <>
      {rows.map(([a, b]) => (
        <TableRow key={a}>
          <TableCell className="font-mono text-xs">{a}</TableCell>
          <TableCell className="whitespace-normal">{b}</TableCell>
        </TableRow>
      ))}
    </>
  );
}

function TwoColumnTable({
  head,
  rows
}: {
  head: [string, string];
  rows: string[][];
}) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>{head[0]}</TableHead>
          <TableHead>{head[1]}</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        <Rows rows={rows} />
      </TableBody>
    </Table>
  );
}

export function AuthDoc(): React.JSX.Element {
  return (
    <div className="flex flex-col gap-4">
      <Section
        title="Overview"
        description="Sign in with Google, then talk to the API with short-lived tokens."
      >
        <p>
          PM4 has no passwords. The API handles the Google OAuth sign-in and
          hands the web app two tokens: a short-lived{" "}
          <strong>access token</strong> and a long-lived{" "}
          <strong>refresh token</strong>. The web app sends the access token on
          every request and uses the refresh token to get a new one when it
          expires.
        </p>
        <p>
          The web app and the API live on different sites, so there are no
          cookies. The web app keeps the tokens itself and sends them as{" "}
          <Code>Authorization: Bearer</Code>. A cross-site cookie isn&apos;t an
          option because the API stays on its <Code>azurewebsites.net</Code>{" "}
          address.
        </p>
        <TwoColumnTable head={["Endpoint", "Purpose"]} rows={ENDPOINTS} />
      </Section>

      <Section
        title="Signing in"
        description="From the Continue with Google button to a signed-in app."
      >
        <MermaidDiagram title="Sign-in flow" chart={SIGN_IN} />
        <ol className="flex list-decimal flex-col gap-2 pl-5">
          <li>
            The web app sends the browser to <Code>/auth/google</Code> with{" "}
            <Code>returnTo</Code> and the browser&apos;s time zone. The time
            zone is only used when the account is new.
          </li>
          <li>
            The API creates a random <Code>state</Code> and a PKCE verifier,
            stores them in Redis for 10 minutes and redirects to Google. The
            scopes are <Code>openid email profile</Code>, and Google always
            shows the account chooser.
          </li>
          <li>
            Google redirects to the API callback. The API loads and deletes the
            state (it works once), exchanges the code with PKCE and checks the
            ID token: issuer, audience and a verified email.
          </li>
          <li>
            If an allow-list of emails is configured, only those emails may sign
            in. The API then creates or updates the user and the Google
            identity.
          </li>
          <li>
            The API creates a one-time login code (valid 60 seconds) and
            redirects to the web app&apos;s <Code>/auth/callback</Code>.
          </li>
          <li>
            The web app posts the code to <Code>/auth/token</Code>, receives the
            token pair, replaces the URL so the code leaves the history, and
            goes to <Code>returnTo</Code>.
          </li>
        </ol>
        <p>
          Any failure sends the user back to the sign-in screen with an{" "}
          <Code>error</Code> of <Code>cancelled</Code>, <Code>not-allowed</Code>
          , <Code>failed</Code> or <Code>rate-limited</Code>.
        </p>
      </Section>

      <Section
        title="The tokens"
        description="What each one is, how long it lives and where it is kept."
      >
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Token</TableHead>
              <TableHead>What it is</TableHead>
              <TableHead>Lifetime</TableHead>
              <TableHead>On the web</TableHead>
              <TableHead>On the API</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {TOKENS.map((t) => (
              <TableRow key={t.name}>
                <TableCell className="font-medium">{t.name}</TableCell>
                <TableCell className="whitespace-normal">{t.what}</TableCell>
                <TableCell className="whitespace-normal">{t.life}</TableCell>
                <TableCell className="whitespace-normal">{t.web}</TableCell>
                <TableCell className="whitespace-normal">{t.api}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <p>
          Redis never holds a raw token or code, only SHA-256 hashes. The access
          token is a JWT, so the API checks it without a lookup.
        </p>
        <TwoColumnTable head={["Redis key", "Holds"]} rows={REDIS_KEYS} />
      </Section>

      <Section
        title="Requests and refresh"
        description="How an expired access token is replaced without the user noticing."
      >
        <MermaidDiagram
          title="Authenticated request and refresh"
          chart={REFRESH}
        />
        <ol className="flex list-decimal flex-col gap-2 pl-5">
          <li>
            Every API call adds the access token. The cached token is reused
            until 30 seconds before it expires, then a refresh happens first.
          </li>
          <li>
            If the API still answers <Code>401</Code>, the web app refreshes
            once and retries the request once.
          </li>
          <li>
            <strong>Single flight:</strong> only one refresh runs at a time in a
            tab, and a browser lock (Web Locks) makes the tabs take turns. A tab
            that waits reads the refresh token after the other tab rotated it.
          </li>
          <li>
            <strong>Rotation:</strong> each refresh returns a new pair and
            invalidates the old refresh token, which is valid for another 30
            days from that moment.
          </li>
          <li>
            <strong>Reuse detection:</strong> presenting a refresh token that
            was already rotated revokes its whole family, so a stolen copy ends
            the session.
          </li>
          <li>
            The allow-list is checked on every refresh. An email removed from it
            loses access within 15 minutes, when the refresh fails with{" "}
            <Code>401</Code>.
          </li>
        </ol>
        <p>
          A <Code>401</Code> or <Code>400</Code> from the refresh ends the
          session: the stored token is removed and the user returns to the
          sign-in screen. A network error, <Code>429</Code> or <Code>5xx</Code>{" "}
          does not end it, because the session may still be valid.
        </p>
      </Section>

      <Section
        title="Several tabs"
        description="One session shared by every tab of the browser."
      >
        <p>
          The refresh token lives in <Code>localStorage</Code>, so all tabs
          share one session and it survives a browser restart. Each tab keeps
          its own access token in memory.
        </p>
        <p>
          When one tab signs out, the key disappears from{" "}
          <Code>localStorage</Code>. The other tabs see that change and end
          their session too.
        </p>
      </Section>

      <Section title="Signing out">
        <MermaidDiagram title="Sign-out" chart={SIGN_OUT} />
        <ul className="flex list-disc flex-col gap-2 pl-5">
          <li>
            <strong>Sign out:</strong> the web app tells the API to revoke the
            family, then clears its storage and memory. If the API can&apos;t be
            reached, it still signs out locally.
          </li>
          <li>
            <strong>Sign out everywhere:</strong> revokes every family of the
            user. Access tokens already issued work until they expire, at most
            15 minutes.
          </li>
          <li>
            <strong>Deleting the account</strong> revokes every session too. The
            access tokens of other devices still pass the guard for up to 15
            minutes, but they find no data, and their next refresh answers{" "}
            <Code>401</Code>.
          </li>
        </ul>
      </Section>

      <Section title="Where the user lands: returnTo">
        <p>
          When a signed-out visitor opens a private page, the web app remembers
          the path as <Code>returnTo</Code> and passes it through the whole
          sign-in. It is checked at every step, and anything unsafe is dropped
          so the user lands on the dashboard instead.
        </p>
        <ul className="flex list-disc flex-col gap-2 pl-5">
          <li>
            It must start with <Code>/</Code>, not <Code>{"//"}</Code>.
          </li>
          <li>
            No backslashes or control characters, at most 2048 characters.
          </li>
          <li>It must stay on the same site, with no other origin.</li>
          <li>
            It must be under <Code>/app</Code>. Trailing slashes and the hash
            are removed.
          </li>
        </ul>
        <p>
          The API only requires a relative path. The web app re-checks the value
          it gets back at <Code>/auth/callback</Code>.
        </p>
      </Section>

      <Section title="Rate limiting" description="Counted per minute in Redis.">
        <TwoColumnTable head={["Scope", "Limit"]} rows={LIMITS} />
        <p>
          The auth routes count per client IP, everything else per user. Over
          the limit, the API answers <Code>429</Code> with{" "}
          <Code>Retry-After</Code>. The two browser redirects go back to the
          sign-in screen with <Code>error=rate-limited</Code> instead. If Redis
          is slow or down, the request is let through.
        </p>
      </Section>

      <Section title="Why it is built this way">
        <ul className="flex list-disc flex-col gap-2 pl-5">
          <li>
            <strong>No cookies:</strong> the web app and API are different
            sites, so a bearer token is the simple option.
          </li>
          <li>
            <strong>Short access token:</strong> kept only in memory, it is gone
            when the tab closes and is useful to a thief for 15 minutes at most.
          </li>
          <li>
            <strong>Login code instead of tokens in the URL:</strong> tokens
            never appear in a redirect, and the code is single use and lasts 60
            seconds.
          </li>
          <li>
            <strong>Refresh token in localStorage:</strong> shared by all tabs
            and kept across restarts. The trade-off is that a script injected
            into the page could read it, which is why the app loads no
            third-party scripts and renders user text as text.
          </li>
        </ul>
      </Section>
    </div>
  );
}
