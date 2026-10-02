#!/usr/bin/env node
// PM4 dashboard: reads tasks/ and the docs, writes one self-contained HTML file you open in a browser.
// Not part of the spec → tests → implement → review workflow; read-only over the repo.
//
//   node scripts/dashboard.mjs [--out <file>]      default: dashboard.html at the repo root
//
// The page loads marked and mermaid from a CDN, so it needs a network connection to render.
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outArg = process.argv.indexOf("--out");
const OUT = path.resolve(outArg > -1 ? process.argv[outArg + 1] : path.join(ROOT, "dashboard.html"));

const read = (p) => fs.readFileSync(path.join(ROOT, p), "utf8");
const exists = (p) => fs.existsSync(path.join(ROOT, p));

function walk(dir, out = []) {
  if (!exists(dir)) return out;
  for (const e of fs.readdirSync(path.join(ROOT, dir), { withFileTypes: true })) {
    const p = `${dir}/${e.name}`;
    if (e.isDirectory()) walk(p, out);
    else if (e.name.endsWith(".md")) out.push(p);
  }
  return out.sort();
}

// ---------- frontmatter (the small YAML subset the repo uses) ----------

function splitFrontmatter(text) {
  const m = text.match(/^---\n([\s\S]*?)\n---\n?/);
  return m ? { fm: m[1], body: text.slice(m[0].length) } : { fm: "", body: text };
}

function parseFrontmatter(fm) {
  const out = {};
  let listKey = null;
  for (const line of fm.split("\n")) {
    const item = line.match(/^\s+-\s+(.*)$/);
    if (item && listKey) {
      const obj = item[1].match(/^\{(.*)\}$/);
      if (obj) {
        const o = {};
        for (const kv of obj[1].split(",")) {
          const [k, ...v] = kv.split(":");
          if (k.trim()) o[k.trim()] = v.join(":").trim();
        }
        out[listKey].push(o);
      } else out[listKey].push(item[1].trim());
      continue;
    }
    const kv = line.match(/^([A-Za-z_][\w-]*):[ \t]*(.*)$/);
    if (!kv) continue;
    const [, key, raw] = kv;
    const v = raw.replace(/\s+#.*$/, "").trim();
    if (v === "") {
      out[key] = [];
      listKey = key;
    } else if (v.startsWith("[")) {
      out[key] = v.slice(1, -1).split(",").map((s) => s.trim()).filter(Boolean);
      listKey = null;
    } else {
      out[key] = v;
      listKey = null;
    }
  }
  return out;
}

function firstHeading(body) {
  const m = body.match(/^#\s+(.+)$/m);
  return m ? m[1].trim() : null;
}

// ---------- docs ----------

const DOC_GROUPS = [
  { key: "project", label: "Project", match: (p) => !p.includes("/") || /^(web|api)\/AGENTS\.md$/.test(p) },
  { key: "product", label: "Product", match: (p) => p.startsWith("specs/00-product/") },
  { key: "req", label: "Requirements", match: (p) => p.startsWith("specs/01-requirements/") },
  { key: "arch", label: "Architecture", match: (p) => p.startsWith("specs/02-architecture/") },
  { key: "api", label: "API", match: (p) => p.startsWith("specs/03-api/") },
  { key: "web", label: "Web", match: (p) => p.startsWith("specs/04-web/") },
  { key: "quality", label: "Quality", match: (p) => p.startsWith("specs/05-quality/") },
  { key: "features", label: "Feature specs", match: (p) => p.startsWith("specs/06-features/") },
  { key: "adr", label: "Decisions (ADRs)", match: (p) => p.startsWith("specs/decisions/") },
  { key: "specs", label: "Specs index", match: (p) => /^specs\/[^/]+\.md$/.test(p) },
  { key: "tasks", label: "Backlog docs", match: (p) => p.startsWith("tasks/") },
  { key: "skills", label: "Agent skills", match: (p) => p.startsWith(".agents/") },
];

const docPaths = [
  ...["AGENTS.md", "CLAUDE.md", "README.md", "web/AGENTS.md", "api/AGENTS.md"].filter(exists),
  ...walk("specs"),
  ...walk("tasks").filter((p) => !/\/T-\d+/.test(p)),
  ...walk(".agents/skills"),
];

function adrMeta(body) {
  const status = body.match(/^-\s+\*\*Status:\*\*\s*(\S+)/m);
  const date = body.match(/^-\s+\*\*Date:\*\*\s*(\S+)/m);
  return { status: status?.[1], last_updated: date?.[1] };
}

const docs = docPaths.map((p) => {
  const text = read(p);
  const { fm, body } = splitFrontmatter(text);
  const meta = parseFrontmatter(fm);
  if (p.startsWith("specs/decisions/ADR-")) Object.assign(meta, { ...adrMeta(body), ...meta });
  const adrId = path.basename(p).match(/^(ADR-\d+)/)?.[1];
  const group = DOC_GROUPS.find((g) => g.match(p))?.key ?? "project";
  return {
    path: p,
    group,
    id: meta.id ?? adrId ?? meta.name ?? null,
    title: meta.title ?? firstHeading(body) ?? path.basename(p, ".md"),
    status: meta.status ?? null,
    meta,
    body,
  };
});

// Requirement IDs (FR-*, NFR-*) → the doc and heading that defines them.
const reqIndex = {};
for (const d of docs) {
  for (const line of d.body.split("\n")) {
    const m = line.match(/^#{2,4}\s+((?:N?FR)(?:-[A-Z]+)*-\d+)\b(.*)$/);
    if (m && !reqIndex[m[1]]) reqIndex[m[1]] = { path: d.path, heading: line.replace(/^#+\s+/, "").trim() };
  }
}

const openQuestions = (() => {
  if (!exists("specs/open-questions.md")) return { open: 0, resolved: 0 };
  const body = read("specs/open-questions.md");
  const section = (name) => (body.split(new RegExp(`^## ${name}\\s*$`, "m"))[1] ?? "").split(/^## /m)[0];
  const count = (s) => s.split("\n").filter((l) => /^\|\s*OQ-\d+/.test(l)).length;
  return { open: count(section("Open")), resolved: count(section("Resolved")) };
})();

// ---------- milestones ----------

const milestones = (() => {
  if (!exists("specs/00-product/scope.md")) return [];
  return read("specs/00-product/scope.md")
    .split("\n")
    .map((l) => l.match(/^\|\s*(M\d+)\s*\|\s*([^|]+?)\s*\|\s*([^|]+?)\s*\|/))
    .filter(Boolean)
    .map(([, id, name, goal]) => ({ id, name, goal }));
})();

// ---------- tasks and their phase in the workflow ----------

function attemptsOf(body) {
  const sec = body.split(/^###\s+Attempts\s*$/m)[1];
  if (!sec) return [];
  return sec
    .split("\n")
    .filter((l) => /^\|\s*\d+\s*\|/.test(l))
    .map((l) => {
      const c = l.split("|").slice(1, -1).map((s) => s.trim());
      return { n: c[0], tier: c[1], result: c[2], summary: c[3] };
    });
}

const taskFiles = walk("tasks").filter((p) => /\/T-\d+[^/]*\.md$/.test(p));
const tasks = taskFiles
  .map((p) => {
    const text = read(p);
    const { fm, body } = splitFrontmatter(text);
    const meta = parseFrontmatter(fm);
    if (!meta.id) return null;
    const featureSpec = meta.feature_spec && meta.feature_spec !== "—" ? meta.feature_spec.split("#")[0] : null;
    const verdict = body.match(/\*\*Verdict:\s*([^*]+?)\*\*/)?.[1]?.trim() ?? null;
    return {
      id: meta.id,
      title: meta.title ?? meta.id,
      milestone: meta.milestone ?? "—",
      app: meta.app ?? "—",
      status: meta.status ?? "blocked",
      size: meta.size ?? "—",
      tier: meta.tier ?? "—",
      dependsOn: Array.isArray(meta.depends_on) ? meta.depends_on : [],
      featureSpec,
      featureSpecRow: meta.feature_spec?.match(/row "([^"]+)"/)?.[1] ?? null,
      requirements: Array.isArray(meta.requirements) ? meta.requirements : [],
      acFiles: (Array.isArray(meta.ac_files) ? meta.ac_files : [])
        .filter((a) => typeof a === "object")
        .map((a) => ({ path: a.path, sha256: a.sha256, exists: exists(a.path) })),
      attempts: attemptsOf(body),
      verdict,
      path: p,
      body,
    };
  })
  .filter(Boolean)
  .sort((a, b) => a.id.localeCompare(b.id));

const byId = Object.fromEntries(tasks.map((t) => [t.id, t]));
const docByPath = Object.fromEntries(docs.map((d) => [d.path, d]));

// Where a task sits in its lane. Node ids match the charts drawn by the page.
function phaseOf(t) {
  const unmet = t.dependsOn.filter((d) => !["review", "done"].includes(byId[d]?.status));
  const last = t.attempts.at(-1);
  const stuck = last && /BLOCKED|FAILED/.test(last.result) && t.status !== "review" && t.status !== "done";

  if (!t.featureSpec) {
    const lane = "quick";
    if (t.status === "done") return { lane, node: "QDONE", state: "done", note: "Accepted by the owner." };
    if (t.status === "review") return { lane, node: "QOWNER", state: "active", note: "pm4 check passed. The owner reviews the diff." };
    if (t.status === "in-progress")
      return { lane, node: "QIMPL", state: stuck ? "blocked" : "active", note: stuck ? `Last attempt: ${last.result}. ${last.summary}` : "An implementer is working on it." };
    if (t.status === "blocked")
      return { lane, node: "QFILE", state: "blocked", note: unmet.length ? `Waiting on ${unmet.join(", ")}.` : "Blocked. See the task file." };
    return { lane, node: "QFILE", state: "waiting", note: "Task file written. Ready to implement." };
  }

  const lane = "feature";
  const spec = docByPath[t.featureSpec];
  if (t.status === "done") return { lane, node: "DONE", state: "done", note: "Reviewed and accepted by the owner." };
  if (t.status === "review") {
    if (t.verdict) return { lane, node: "COMMIT2", state: "active", note: `Review verdict: ${t.verdict}. Waiting for the owner to commit and mark done.` };
    return { lane, node: "REVIEW", state: "active", note: "pm4 check passed. Waiting for the feature review." };
  }
  if (t.status === "in-progress")
    return { lane, node: "IMPL", state: stuck ? "blocked" : "active", note: stuck ? `Last attempt: ${last.result}. ${last.summary}` : "An implementer is working on it." };
  if (spec && spec.status !== "approved")
    return { lane, node: spec.status === "review" ? "APPROVE" : "SPEC", state: "waiting", note: `Feature spec is ${spec.status ?? "not approved"}.` };
  if (!t.acFiles.length) return { lane, node: "TESTS", state: "waiting", note: "Acceptance tests not written or not hashed yet." };
  if (t.status === "blocked")
    return { lane, node: "READY", state: "blocked", note: unmet.length ? `Waiting on ${unmet.join(", ")}.` : "Blocked. See the task file." };
  return { lane, node: "READY", state: "waiting", note: "Spec approved, tests hashed, dependencies met." };
}

for (const t of tasks) {
  t.phase = phaseOf(t);
  t.dependents = tasks.filter((o) => o.dependsOn.includes(t.id)).map((o) => o.id);
}

function git(...args) {
  const r = spawnSync("git", args, { cwd: ROOT, encoding: "utf8" });
  return r.status === 0 ? r.stdout.trim() : null;
}

const data = {
  generatedAt: new Date().toISOString(),
  git: { branch: git("rev-parse", "--abbrev-ref", "HEAD"), commit: git("log", "-1", "--format=%h %s"), dirty: (git("status", "--porcelain") ?? "").split("\n").filter(Boolean).length },
  tasks,
  docs,
  groups: DOC_GROUPS.map(({ key, label }) => ({ key, label })),
  reqIndex,
  openQuestions,
  milestones,
  nextId: exists("tasks/BOARD.md") ? read("tasks/BOARD.md").match(/Next free ID:\*\*\s*(T-\d+)/)?.[1] ?? null : null,
};

// ---------- page ----------

const CSS = String.raw`
/* App shell: sticky top bar with three views. Board = summary strip + kanban by status, task detail in a
   right-hand drawer. Process = the workflow charts. Docs = a tree and a reader. Dark only, by request. */
:root {
  --ink: #0e1118;        /* page ground, blue-black */
  --panel: #151a24;      /* raised surfaces */
  --panel-2: #1c2230;    /* hover, inset */
  --line: #262e3f;       /* hairlines */
  --text: #e3e6ee;
  --muted: #8d95a9;
  --faint: #5d667c;
  --accent: #93a6ff;     /* interactive: tabs, links, focus */
  --s-blocked: #f07a87;
  --s-ready: #6bb6ff;
  --s-progress: #f2c25a;
  --s-review: #b693ff;
  --s-done: #62d39e;
  --f-display: "Bricolage Grotesque", "IBM Plex Sans", system-ui, sans-serif;
  --f-body: "IBM Plex Sans", system-ui, -apple-system, "Segoe UI", sans-serif;
  --f-mono: "IBM Plex Mono", ui-monospace, "SFMono-Regular", Menlo, monospace;
  --r: 10px;
  color-scheme: dark;
}
* { box-sizing: border-box; }
html, body { margin: 0; }
body {
  background: var(--ink);
  background-image: radial-gradient(1200px 500px at 85% -10%, rgba(147,166,255,.07), transparent 60%);
  background-attachment: fixed;
  color: var(--text);
  font: 14px/1.55 var(--f-body);
  -webkit-font-smoothing: antialiased;
}
a { color: var(--accent); text-decoration: none; }
a:hover { text-decoration: underline; }
button { font: inherit; color: inherit; }
:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; border-radius: 4px; }
.mono { font-family: var(--f-mono); }
.num { font-variant-numeric: tabular-nums; }

/* ---- top bar ---- */
.top {
  position: sticky; top: 0; z-index: 20;
  display: flex; align-items: center; gap: 24px; flex-wrap: wrap;
  padding: 12px 24px;
  background: rgba(14,17,24,.82); backdrop-filter: blur(12px);
  border-bottom: 1px solid var(--line);
}
.brand { display: flex; align-items: baseline; gap: 10px; }
.brand b { font: 700 20px/1 var(--f-display); letter-spacing: -.01em; }
.brand span { color: var(--faint); font: 12px var(--f-mono); }
.tabs { display: flex; gap: 2px; background: var(--panel); border: 1px solid var(--line); border-radius: 9px; padding: 3px; }
.tabs button {
  border: 0; background: none; padding: 6px 14px; border-radius: 6px; cursor: pointer; color: var(--muted); font-weight: 500;
}
.tabs button:hover { color: var(--text); }
.tabs button[aria-selected="true"] { background: var(--panel-2); color: var(--text); box-shadow: inset 0 0 0 1px var(--line); }
.gitinfo { margin-left: auto; color: var(--faint); font: 12px var(--f-mono); display: flex; gap: 14px; flex-wrap: wrap; }
.gitinfo em { font-style: normal; color: var(--muted); }

main { padding: 24px; max-width: 1600px; margin: 0 auto; }
.view[hidden] { display: none !important; }
h1, h2, h3 { font-family: var(--f-display); text-wrap: balance; letter-spacing: -.01em; }
.eyebrow { font: 600 11px var(--f-body); text-transform: uppercase; letter-spacing: .09em; color: var(--faint); }

/* ---- summary strip ---- */
.summary { display: grid; grid-template-columns: minmax(0, 2fr) minmax(0, 1fr) minmax(0, 1fr); gap: 16px; margin-bottom: 24px; }
.sum { background: var(--panel); border: 1px solid var(--line); border-radius: var(--r); padding: 16px 18px; min-width: 0; }
.sum h3 { margin: 0 0 12px; font: 600 11px var(--f-body); text-transform: uppercase; letter-spacing: .09em; color: var(--faint); }
.bar { display: flex; height: 8px; border-radius: 99px; overflow: hidden; background: var(--panel-2); gap: 2px; }
.bar i { display: block; height: 100%; }
.legend { display: flex; flex-wrap: wrap; gap: 6px 18px; margin-top: 12px; }
.legend span { display: inline-flex; align-items: center; gap: 7px; color: var(--muted); font-size: 13px; }
.legend b { color: var(--text); font: 600 15px var(--f-display); font-variant-numeric: tabular-nums; }
.dot { width: 8px; height: 8px; border-radius: 50%; display: inline-block; flex: none; }
.bigrow { display: flex; gap: 22px; align-items: baseline; flex-wrap: wrap; }
.big { font: 700 28px/1 var(--f-display); font-variant-numeric: tabular-nums; }
.big small { display: block; font: 500 12px var(--f-body); color: var(--muted); margin-top: 6px; letter-spacing: 0; }

/* ---- filters ---- */
.filters { display: flex; flex-wrap: wrap; gap: 10px; align-items: center; margin-bottom: 16px; }
.search {
  flex: 1 1 260px; max-width: 360px; background: var(--panel); border: 1px solid var(--line); border-radius: 8px;
  padding: 8px 12px; color: var(--text); font: inherit;
}
.search::placeholder { color: var(--faint); }
.chipset { display: flex; gap: 4px; flex-wrap: wrap; }
.fchip {
  border: 1px solid var(--line); background: var(--panel); color: var(--muted); border-radius: 99px;
  padding: 5px 12px; cursor: pointer; font-size: 13px;
}
.fchip:hover { color: var(--text); border-color: #36405a; }
.fchip[aria-pressed="true"] { color: var(--text); background: var(--panel-2); border-color: var(--accent); }
.filters .sep { width: 1px; height: 22px; background: var(--line); }

/* ---- kanban ---- */
.board-wrap { overflow-x: auto; padding-bottom: 6px; }
.board { display: grid; grid-template-columns: repeat(5, minmax(230px, 1fr)); gap: 14px; min-width: 1200px; }
.col { min-width: 0; }
.col-h { display: flex; align-items: center; gap: 8px; padding: 0 4px 10px; border-bottom: 2px solid var(--c); margin-bottom: 12px; }
.col-h b { font: 600 14px var(--f-display); text-transform: capitalize; }
.col-h span { margin-left: auto; color: var(--faint); font: 12px var(--f-mono); }
.cards { display: flex; flex-direction: column; gap: 10px; }
.card {
  display: block; width: 100%; text-align: left; cursor: pointer;
  background: var(--panel); border: 1px solid var(--line); border-radius: var(--r); padding: 12px 14px;
  transition: border-color .15s, transform .15s, background .15s;
}
.card:hover { border-color: #3a4560; background: #171d29; transform: translateY(-1px); }
.card.sel { border-color: var(--accent); }
.card-top { display: flex; justify-content: space-between; align-items: center; gap: 8px; margin-bottom: 6px; }
.card-id { font: 500 12px var(--f-mono); color: var(--muted); }
.card-title { font-weight: 500; line-height: 1.4; margin-bottom: 10px; }
.card-title code, .dtitle code { font-size: .92em; }
.meta { display: flex; flex-wrap: wrap; gap: 5px; }
.tag {
  font: 500 11px var(--f-mono); color: var(--muted); border: 1px solid var(--line); border-radius: 5px; padding: 1px 6px; white-space: nowrap;
}
.tag.tier-opus { color: #f3b8ff; border-color: #4a3456; }
.tag.tier-sonnet { color: #b9c6ff; border-color: #343d5e; }
.tag.tier-haiku { color: #9ee6d6; border-color: #2b4b47; }
.card-phase { display: flex; align-items: center; gap: 7px; margin-top: 10px; padding-top: 9px; border-top: 1px dashed var(--line); color: var(--muted); font-size: 12px; }
.empty { color: var(--faint); font-size: 13px; padding: 14px; border: 1px dashed var(--line); border-radius: var(--r); text-align: center; }

.pill {
  display: inline-flex; align-items: center; gap: 6px; font: 600 11px var(--f-body); letter-spacing: .04em; text-transform: uppercase;
  color: var(--c); background: color-mix(in srgb, var(--c) 13%, transparent); border: 1px solid color-mix(in srgb, var(--c) 35%, transparent);
  padding: 2px 8px; border-radius: 99px; white-space: nowrap;
}
.pill::before { content: ""; width: 6px; height: 6px; border-radius: 50%; background: var(--c); }

/* ---- sections ---- */
.section { margin-top: 36px; }
.section-h { display: flex; align-items: baseline; gap: 12px; flex-wrap: wrap; margin-bottom: 14px; }
.section-h h2 { margin: 0; font-size: 20px; }
.section-h p { margin: 0; color: var(--muted); }
.chart {
  background: var(--panel); border: 1px solid var(--line); border-radius: var(--r); padding: 20px; overflow-x: auto;
}
.chart svg { display: block; margin: 0 auto; height: auto; }
.chart .loading { color: var(--faint); font-size: 13px; }

/* ---- drawer ---- */
.scrim { position: fixed; inset: 0; background: rgba(5,7,12,.55); z-index: 30; opacity: 0; pointer-events: none; transition: opacity .2s; }
.scrim.open { opacity: 1; pointer-events: auto; }
.drawer {
  position: fixed; top: 0; right: 0; bottom: 0; width: min(880px, 100vw); z-index: 31;
  background: var(--ink); border-left: 1px solid var(--line); box-shadow: -30px 0 80px rgba(0,0,0,.45);
  transform: translateX(102%); transition: transform .25s cubic-bezier(.2,.8,.2,1);
  display: flex; flex-direction: column;
}
.drawer.open { transform: none; }
.dhead { padding: 20px 24px 16px; border-bottom: 1px solid var(--line); background: var(--panel); }
.dhead-row { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
.dtitle { margin: 10px 0 0; font-size: 22px; line-height: 1.25; }
.close { margin-left: auto; border: 1px solid var(--line); background: var(--panel-2); border-radius: 8px; width: 32px; height: 32px; cursor: pointer; color: var(--muted); font-size: 18px; line-height: 1; }
.close:hover { color: var(--text); }
.dbody { overflow-y: auto; padding: 22px 24px 40px; display: flex; flex-direction: column; gap: 26px; }
.dbody > * { flex-shrink: 0; }
.where { border: 1px solid var(--line); border-radius: var(--r); background: var(--panel); overflow: hidden; }
.where-h { display: flex; gap: 14px; align-items: flex-start; padding: 14px 18px; border-bottom: 1px solid var(--line); }
.where-h .lamp { width: 10px; height: 10px; border-radius: 50%; margin-top: 6px; background: var(--c); box-shadow: 0 0 0 4px color-mix(in srgb, var(--c) 20%, transparent); flex: none; }
.where-h b { display: block; font: 600 15px var(--f-display); }
.where-h p { margin: 2px 0 0; color: var(--muted); }
.where .chart { border: 0; border-radius: 0; background: none; }
.kv { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 1px; background: var(--line); border: 1px solid var(--line); border-radius: var(--r); overflow: hidden; }
.kv div { background: var(--panel); padding: 10px 14px; min-width: 0; }
.kv dt { font: 600 10.5px var(--f-body); text-transform: uppercase; letter-spacing: .09em; color: var(--faint); margin-bottom: 4px; }
.kv dd { margin: 0; overflow-wrap: anywhere; }
.links { display: flex; flex-wrap: wrap; gap: 6px; }
.linkchip { font: 500 12px var(--f-mono); padding: 2px 8px; border-radius: 6px; background: var(--panel-2); border: 1px solid var(--line); color: var(--text); cursor: pointer; }
.linkchip:hover { border-color: var(--accent); text-decoration: none; }
.sub-h { margin: 0 0 10px; font-size: 15px; }
table.plain { width: 100%; border-collapse: collapse; font-size: 13px; }
table.plain th { text-align: left; font: 600 10.5px var(--f-body); text-transform: uppercase; letter-spacing: .09em; color: var(--faint); padding: 8px 10px; border-bottom: 1px solid var(--line); }
table.plain td { padding: 8px 10px; border-bottom: 1px solid var(--line); vertical-align: top; }
.ok { color: var(--s-done); } .bad { color: var(--s-blocked); }

/* ---- process ---- */
.proc-grid { display: grid; grid-template-columns: minmax(0, 1fr); gap: 28px; }
.picker { display: flex; gap: 10px; align-items: center; flex-wrap: wrap; margin-bottom: 20px; padding: 14px 16px; border: 1px solid var(--line); border-radius: var(--r); background: var(--panel); }
.picker select { background: var(--panel-2); color: var(--text); border: 1px solid var(--line); border-radius: 8px; padding: 7px 10px; font: inherit; max-width: 100%; }
.picker .note { color: var(--muted); }
.steps { display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: 12px; margin-top: 14px; }
.step { border: 1px solid var(--line); border-radius: var(--r); padding: 14px; background: var(--panel); }
.step .n { font: 600 12px var(--f-mono); color: var(--faint); }
.step b { display: block; margin: 4px 0; font: 600 14px var(--f-display); }
.step p { margin: 0; color: var(--muted); font-size: 13px; }
.step .who { margin-top: 8px; font: 12px var(--f-mono); color: var(--accent); }

/* ---- docs ---- */
.docs { display: grid; grid-template-columns: 300px minmax(0, 1fr); gap: 24px; align-items: start; }
.tree { position: sticky; top: 76px; max-height: calc(100vh - 100px); overflow-y: auto; border: 1px solid var(--line); border-radius: var(--r); background: var(--panel); padding: 12px; }
.tree .search { max-width: none; width: 100%; margin-bottom: 10px; }
.tgroup + .tgroup { margin-top: 12px; }
.tgroup h4 { margin: 0 0 4px; padding: 0 8px; font: 600 10.5px var(--f-body); text-transform: uppercase; letter-spacing: .09em; color: var(--faint); display: flex; justify-content: space-between; }
.titem { display: flex; align-items: center; gap: 8px; width: 100%; text-align: left; border: 0; background: none; padding: 5px 8px; border-radius: 6px; cursor: pointer; color: var(--muted); font-size: 13px; line-height: 1.35; }
.titem:hover { background: var(--panel-2); color: var(--text); }
.titem.sel { background: var(--panel-2); color: var(--text); box-shadow: inset 2px 0 0 var(--accent); }
.titem .dot { width: 6px; height: 6px; }
.reader { min-width: 0; border: 1px solid var(--line); border-radius: var(--r); background: var(--panel); padding: 28px 36px 48px; }
.crumb { font: 12px var(--f-mono); color: var(--faint); overflow-wrap: anywhere; }
.reader > h1 { margin: 8px 0 12px; font-size: 30px; line-height: 1.15; }
.docmeta { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; padding-bottom: 18px; margin-bottom: 8px; border-bottom: 1px solid var(--line); color: var(--muted); font-size: 13px; }

/* ---- markdown ---- */
.md { max-width: 860px; overflow-wrap: break-word; }
.md h1 { font-size: 26px; margin: 28px 0 10px; }
.md h2 { font-size: 20px; margin: 32px 0 10px; padding-top: 6px; }
.md h3 { font-size: 16px; margin: 24px 0 8px; }
.md h4 { font-size: 14px; margin: 20px 0 6px; }
.md p, .md li { color: #cfd4df; }
.md p { margin: 10px 0; max-width: 75ch; }
.md ul, .md ol { padding-left: 22px; }
.md li { margin: 3px 0; }
.md code { font: 12.5px var(--f-mono); background: var(--panel-2); border: 1px solid var(--line); border-radius: 4px; padding: 0 4px; }
.md pre { background: #0b0e14; border: 1px solid var(--line); border-radius: 8px; padding: 14px 16px; overflow-x: auto; }
.md pre code { background: none; border: 0; padding: 0; font-size: 12.5px; line-height: 1.6; }
.md blockquote { margin: 14px 0; padding: 6px 16px; border-left: 3px solid var(--accent); background: color-mix(in srgb, var(--accent) 6%, transparent); border-radius: 0 6px 6px 0; }
.md hr { border: 0; border-top: 1px solid var(--line); margin: 24px 0; }
.md .tablewrap { overflow-x: auto; margin: 14px 0; border: 1px solid var(--line); border-radius: 8px; }
.md table { border-collapse: collapse; width: 100%; font-size: 13px; }
.md th { text-align: left; background: var(--panel-2); font-weight: 600; color: var(--text); }
.md th, .md td { padding: 8px 12px; border-bottom: 1px solid var(--line); vertical-align: top; }
.md tr:last-child td { border-bottom: 0; }
.md input[type=checkbox] { accent-color: var(--accent); margin-right: 6px; }
.md .mermaid-block { background: #0b0e14; border: 1px solid var(--line); border-radius: 8px; padding: 16px; overflow-x: auto; }

@media (max-width: 1000px) {
  .summary { grid-template-columns: minmax(0, 1fr); }
  .docs { grid-template-columns: minmax(0, 1fr); }
  .tree { position: static; max-height: 340px; }
}
@media (max-width: 640px) {
  .top { padding: 10px 16px; gap: 12px; }
  main { padding: 16px; }
  .gitinfo { margin-left: 0; width: 100%; }
  .reader { padding: 20px 18px 32px; }
  .dhead, .dbody { padding-left: 16px; padding-right: 16px; }
}
@media (prefers-reduced-motion: reduce) { * { transition: none !important; } }
`;

// Browser code. Serialized with toString(), so it can use template literals freely.
function client() {
  const D = JSON.parse(document.getElementById("pm4-data").textContent);
  const STATUSES = ["blocked", "ready", "in-progress", "review", "done"];
  const SC = { blocked: "var(--s-blocked)", ready: "var(--s-ready)", "in-progress": "var(--s-progress)", review: "var(--s-review)", done: "var(--s-done)" };
  const HEX = { blocked: "#f07a87", ready: "#6bb6ff", "in-progress": "#f2c25a", review: "#b693ff", done: "#62d39e" };
  const DOC_STATUS = { approved: "var(--s-done)", accepted: "var(--s-done)", review: "var(--s-review)", draft: "var(--s-progress)", superseded: "var(--faint)", deprecated: "var(--faint)" };
  const byId = Object.fromEntries(D.tasks.map((t) => [t.id, t]));
  const docByPath = Object.fromEntries(D.docs.map((d) => [d.path, d]));
  const docById = {};
  for (const d of D.docs) if (d.id) docById[d.id] = d;
  const $ = (s, el = document) => el.querySelector(s);
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
  const inlineCode = (s) => esc(s).replace(/`([^`]+)`/g, "<code>$1</code>");
  const pill = (status, map = SC) => `<span class="pill" style="--c:${map[status] ?? "var(--muted)"}">${esc(status ?? "none")}</span>`;

  // ---------- workflow charts ----------
  const LANES = {
    feature: {
      title: "Feature lane",
      rows: [["Plan · once per feature", 5], ["Build · once per task", 6]],
      main: [
        ["SPEC", "Write the feature spec", "write-spec · main session"],
        ["APPROVE", "Owner approves the spec", "owner"],
        ["TASKS", "Create task files", "write-task · pm4 tasks"],
        ["TESTS", "Write acceptance tests", "write-acceptance-tests · pm4 hash"],
        ["COMMIT1", "Owner commits the tests", "owner"],
        ["READY", "Ready to implement", "spec approved, tests hashed, deps met"],
        ["IMPL", "Implement the task", "implement-task · tier model"],
        ["CHECK", "Scope, hashes and gates", "pm4 check"],
        ["REVIEW", "Feature review", "review-feature · opus"],
        ["COMMIT2", "Owner commits the feature", "owner sets done"],
        ["DONE", "Done", ""],
      ],
      inner: { 1: ['ESC["Escalate one tier<br/><small>haiku → sonnet → opus</small>"]', "CHECK -. FAILED twice .-> ESC", "ESC -.-> IMPL"] },
      extra: ["R0 --> R1"],
    },
    quick: {
      title: "Quick lane and M0 tasks",
      main: [
        ["QFILE", "Quick-lane task file", "main session · tasks/_TEMPLATE.md"],
        ["QIMPL", "Implement the task", "implement-task"],
        ["QCHECK", "Scope and gates", "pm4 check"],
        ["QOWNER", "Owner reviews the diff", "no Opus review"],
        ["QDONE", "Done", ""],
      ],
      extra: ["QCHECK -. FAILED twice .-> QIMPL"],
      rows: null,
    },
  };

  function laneChart(laneKey, focus, counts) {
    const lane = LANES[laneKey];
    const lines = [lane.rows ? "flowchart TB" : "flowchart LR"];
    const idx = focus ? lane.main.findIndex((n) => n[0] === focus.node) : -1;
    const node = ([id, label, sub]) => {
      const c = counts?.[id];
      const badge = c ? `<br/><b>${c} task${c > 1 ? "s" : ""}</b>` : "";
      const subTxt = sub ? `<br/><small>${sub}</small>` : "";
      const shape = id.endsWith("DONE") ? ["([", "])"] : id.startsWith("APPROVE") || id.includes("COMMIT") || id === "QOWNER" ? ["{{", "}}"] : ["[", "]"];
      return `${id}${shape[0]}"${label}${subTxt}${badge}"${shape[1]}`;
    };
    const chain = (nodes) => nodes.map((n, i) => (i ? `    ${nodes[i - 1][0]} --> ${node(n)}` : `    ${node(n)}`));
    if (lane.rows) {
      // Two rows: subgraph edges stay inside their row so each row keeps direction LR.
      let at = 0;
      lane.rows.forEach(([title, n], r) => {
        lines.push(`  subgraph R${r}["${title}"]`, "    direction LR", ...chain(lane.main.slice(at, at + n)), ...(lane.inner?.[r] ?? []).map((l) => "    " + l), "  end");
        at += n;
      });
    } else lines.push(...chain(lane.main));
    lines.push(...lane.extra.map((l) => "  " + l));
    lines.push("  classDef past fill:#17261f,stroke:#2f5a45,color:#9fd8bb");
    lines.push("  classDef owner stroke-dasharray:4 3");
    lines.push("  classDef hot fill:#1d2540,stroke:#93a6ff,color:#e3e6ee,stroke-width:2px");
    lane.main.forEach(([id]) => {
      if (id.includes("COMMIT") || id === "APPROVE" || id === "QOWNER") lines.push(`  class ${id} owner`);
    });
    if (idx > -1) {
      const t = focus.task;
      const color = focus.state === "blocked" ? HEX.blocked : HEX[t.status];
      const past = lane.main.slice(0, idx).map((n) => n[0]);
      if (focus.state === "done") past.push(focus.node);
      if (past.length) lines.push(`  class ${past.join(",")} past`);
      if (focus.state !== "done")
        lines.push(`  style ${focus.node} fill:${color}22,stroke:${color},stroke-width:3px,color:#ffffff`);
    } else if (counts) {
      const hot = Object.keys(counts).filter((k) => counts[k] && lane.main.some((n) => n[0] === k));
      if (hot.length) lines.push(`  class ${hot.join(",")} hot`);
    }
    return lines.join("\n");
  }

  function lifecycleChart(status) {
    const id = (s) => s.replace("-", "_");
    const lines = [
      "stateDiagram-v2",
      "  direction LR",
      '  state "in-progress" as in_progress',
      "  [*] --> blocked",
      "  blocked --> ready: spec approved, tests hashed, deps met",
      "  ready --> in_progress: implement-task",
      "  in_progress --> review: pm4 check passes",
      "  review --> done: owner accepts",
      "  review --> in_progress: changes requested",
      "  in_progress --> blocked: BLOCKED",
      "  done --> [*]",
    ];
    if (status) {
      const c = HEX[status];
      lines.push(`  classDef cur fill:${c}2a,stroke:${c},stroke-width:3px,color:#ffffff`);
      lines.push(`  class ${id(status)} cur`);
    }
    return lines.join("\n");
  }

  function escalationChart(task) {
    const lines = [
      "flowchart LR",
      '  H["haiku"] -- FAILED --> S["sonnet"] -- FAILED --> O["opus"] -- FAILED --> B{{"blocked<br/><small>ask the owner</small>"}}',
      '  X["BLOCKED: spec"] --> Q{{"status: blocked<br/><small>OQ to the owner</small>"}}',
      '  Y["BLOCKED: test"] --> Z["test author checks the test<br/><small>re-delegate, same tier</small>"]',
    ];
    if (task && ["haiku", "sonnet", "opus"].includes(task.tier)) {
      const n = { haiku: "H", sonnet: "S", opus: "O" }[task.tier];
      lines.push(`  style ${n} fill:#93a6ff22,stroke:#93a6ff,stroke-width:3px,color:#ffffff`);
    }
    return lines.join("\n");
  }

  function depGraph(tasks) {
    const nid = (id) => id.replace("-", "");
    const lines = ["flowchart LR"];
    for (const t of tasks) {
      const title = t.title.replace(/["`]/g, "'").replace(/[<>]/g, "");
      const short = title.length > 46 ? title.slice(0, 44) + "…" : title;
      lines.push(`  ${nid(t.id)}["<b>${t.id}</b><br/><small>${esc(short)}</small>"]`);
    }
    for (const t of tasks) for (const d of t.dependsOn) if (byId[d] && tasks.includes(byId[d])) lines.push(`  ${nid(d)} --> ${nid(t.id)}`);
    for (const s of STATUSES) lines.push(`  classDef st_${s.replace("-", "_")} fill:${HEX[s]}1f,stroke:${HEX[s]},color:#e3e6ee`);
    for (const t of tasks) {
      lines.push(`  class ${nid(t.id)} st_${t.status.replace("-", "_")}`);
      lines.push(`  click ${nid(t.id)} pm4OpenTask "${t.id}"`);
    }
    return lines.join("\n");
  }
  window.pm4OpenTask = (id) => openTask(id);

  // ---------- mermaid ----------
  let mmSeq = 0;
  const mermaidReady = () => typeof window.mermaid !== "undefined";
  if (mermaidReady()) {
    mermaid.initialize({
      startOnLoad: false,
      securityLevel: "loose",
      theme: "base",
      fontFamily: "IBM Plex Sans, system-ui, sans-serif",
      themeVariables: {
        darkMode: true,
        background: "#151a24",
        primaryColor: "#1c2230",
        primaryTextColor: "#e3e6ee",
        primaryBorderColor: "#3a4560",
        secondaryColor: "#1c2230",
        tertiaryColor: "#151a24",
        lineColor: "#5d667c",
        textColor: "#c9cedb",
        edgeLabelBackground: "#151a24",
        clusterBkg: "#121620",
        clusterBorder: "#2c3447",
        titleColor: "#8d95a9",
        fontSize: "14px",
      },
      flowchart: { curve: "basis", htmlLabels: true, padding: 12, nodeSpacing: 34, rankSpacing: 46 },
      state: { padding: 10 },
    });
  }
  // mermaid.render isn't safe to call concurrently, so renders run one at a time.
  let queue = Promise.resolve();
  function draw(el, code) {
    queue = queue.then(() => drawNow(el, code));
    return queue;
  }
  async function drawNow(el, code) {
    if (!el) return;
    if (!mermaidReady()) {
      el.innerHTML = `<pre class="mono" style="white-space:pre-wrap;color:var(--muted)">${esc(code)}</pre><p class="loading">Mermaid didn't load (offline?). Showing the chart source.</p>`;
      return;
    }
    try {
      const { svg, bindFunctions } = await mermaid.render(`mm${++mmSeq}`, code);
      el.innerHTML = svg;
      const s = el.querySelector("svg");
      const vbw = s?.viewBox?.baseVal?.width;
      if (vbw) {
        s.removeAttribute("width");
        s.style.width = `${Math.ceil(vbw)}px`;
        s.style.maxWidth = "100%";
      }
      bindFunctions?.(el);
    } catch (e) {
      el.innerHTML = `<p class="bad">Chart failed to render: ${esc(e.message)}</p>`;
    }
  }

  // ---------- markdown ----------
  const slug = (s) => s.toLowerCase().replace(/<[^>]+>/g, "").replace(/[^\w\- ]+/g, "").trim().replace(/\s+/g, "-");
  if (window.marked) {
    marked.use({
      gfm: true,
      renderer: {
        heading(text, level, raw) {
          return `<h${level} id="${slug(raw)}">${text}</h${level}>`;
        },
        table(header, body) {
          return `<div class="tablewrap"><table><thead>${header}</thead><tbody>${body}</tbody></table></div>`;
        },
      },
    });
  }
  function resolvePath(base, href) {
    const parts = base.split("/").slice(0, -1);
    for (const seg of href.split("/")) {
      if (seg === "..") parts.pop();
      else if (seg && seg !== ".") parts.push(seg);
    }
    return parts.join("/");
  }
  function renderMd(md, basePath) {
    const host = document.createElement("div");
    host.className = "md";
    if (!window.marked) {
      host.innerHTML = `<pre style="white-space:pre-wrap">${esc(md)}</pre>`;
      return host;
    }
    host.innerHTML = marked.parse(md);
    for (const a of host.querySelectorAll("a[href]")) {
      const href = a.getAttribute("href");
      if (/^[a-z]+:/i.test(href)) {
        a.target = "_blank";
        a.rel = "noopener";
        continue;
      }
      if (href.startsWith("#")) {
        a.addEventListener("click", (e) => {
          e.preventDefault();
          host.querySelector(`[id="${CSS.escape(href.slice(1))}"]`)?.scrollIntoView({ behavior: "smooth" });
        });
        continue;
      }
      const [file, anchor] = href.split("#");
      const target = resolvePath(basePath, file);
      if (docByPath[target]) a.setAttribute("href", `#doc/${target}${anchor ? "::" + anchor : ""}`);
      const task = D.tasks.find((t) => t.path === target);
      if (task) a.setAttribute("href", `#task/${task.id}`);
    }
    for (const code of host.querySelectorAll("pre code.language-mermaid")) {
      const box = document.createElement("div");
      box.className = "mermaid-block";
      code.parentElement.replaceWith(box);
      draw(box, code.textContent);
    }
    return host;
  }

  // ---------- board ----------
  const state = { q: "", milestone: "all", app: "all" };
  const milestones = [...new Set(D.tasks.map((t) => t.milestone))].sort();
  const apps = [...new Set(D.tasks.map((t) => t.app))].sort();

  function renderSummary() {
    const total = D.tasks.length;
    const counts = Object.fromEntries(STATUSES.map((s) => [s, D.tasks.filter((t) => t.status === s).length]));
    const specs = D.docs.filter((d) => d.path.startsWith("specs/") && d.status && !d.path.includes("_TEMPLATE"));
    const sc = (s) => specs.filter((d) => d.status === s).length;
    $("#summary").innerHTML = `
      <div class="sum">
        <h3>Tasks by status · ${total} total</h3>
        <div class="bar" role="img" aria-label="Tasks by status">${STATUSES.filter((s) => counts[s]).map((s) => `<i style="flex:${counts[s]};background:${SC[s]}" title="${s}: ${counts[s]}"></i>`).join("")}</div>
        <div class="legend">${STATUSES.map((s) => `<span><i class="dot" style="background:${SC[s]}"></i><b>${counts[s]}</b> ${s}</span>`).join("")}</div>
      </div>
      <div class="sum">
        <h3>Specs</h3>
        <div class="bigrow">
          <div class="big">${sc("approved") + sc("accepted")}<small>approved</small></div>
          <div class="big" style="color:var(--s-review)">${sc("review")}<small>in review</small></div>
          <div class="big" style="color:var(--s-progress)">${sc("draft")}<small>draft</small></div>
        </div>
      </div>
      <div class="sum">
        <h3>Backlog</h3>
        <div class="bigrow">
          <div class="big" style="color:${D.openQuestions.open ? "var(--s-progress)" : "inherit"}">${D.openQuestions.open}<small><a href="#doc/specs/open-questions.md">open questions</a></small></div>
          <div class="big">${D.nextId ?? "—"}<small>next free ID</small></div>
        </div>
      </div>`;
  }

  function renderFilters() {
    const chip = (group, val, label) => `<button class="fchip" data-g="${group}" data-v="${val}" aria-pressed="${state[group] === val}">${esc(label)}</button>`;
    $("#filters").innerHTML = `
      <input id="task-q" class="search" type="search" placeholder="Search tasks, IDs, requirements…" value="${esc(state.q)}" aria-label="Search tasks">
      <div class="chipset">${chip("milestone", "all", "All milestones")}${milestones.map((m) => chip("milestone", m, m + (D.milestones.find((x) => x.id === m) ? " · " + D.milestones.find((x) => x.id === m).name : ""))).join("")}</div>
      <span class="sep"></span>
      <div class="chipset">${chip("app", "all", "All apps")}${apps.map((a) => chip("app", a, a)).join("")}</div>`;
    $("#task-q").addEventListener("input", (e) => {
      state.q = e.target.value;
      renderBoard();
    });
    for (const b of document.querySelectorAll("#filters .fchip"))
      b.addEventListener("click", () => {
        state[b.dataset.g] = b.dataset.v;
        renderFilters();
        renderBoard();
      });
  }

  const PHASE_LABEL = Object.fromEntries([...LANES.feature.main, ...LANES.quick.main].map(([id, label]) => [id, label]));

  function filtered() {
    const q = state.q.trim().toLowerCase();
    return D.tasks.filter(
      (t) =>
        (state.milestone === "all" || t.milestone === state.milestone) &&
        (state.app === "all" || t.app === state.app) &&
        (!q || [t.id, t.title, t.app, t.tier, t.status, ...t.requirements].join(" ").toLowerCase().includes(q)),
    );
  }

  function card(t) {
    const ph = t.phase;
    const lampColor = ph.state === "blocked" ? SC.blocked : SC[t.status];
    return `<button class="card${current === t.id ? " sel" : ""}" data-task="${t.id}">
      <div class="card-top"><span class="card-id">${t.id}</span><span class="tag">${esc(t.milestone)}</span></div>
      <div class="card-title">${inlineCode(t.title)}</div>
      <div class="meta"><span class="tag">${esc(t.app)}</span><span class="tag">size ${esc(t.size)}</span><span class="tag tier-${esc(t.tier)}">${esc(t.tier)}</span>${t.dependsOn.length ? `<span class="tag">after ${t.dependsOn.join(", ")}</span>` : ""}</div>
      <div class="card-phase"><i class="dot" style="background:${lampColor}"></i>${esc(PHASE_LABEL[ph.node] ?? ph.node)}</div>
    </button>`;
  }

  function renderBoard() {
    const list = filtered();
    $("#board").innerHTML = STATUSES.map((s) => {
      const items = list.filter((t) => t.status === s);
      return `<section class="col" style="--c:${SC[s]}">
        <div class="col-h"><i class="dot" style="background:${SC[s]}"></i><b>${s}</b><span>${items.length}</span></div>
        <div class="cards">${items.length ? items.map(card).join("") : `<div class="empty">No tasks</div>`}</div>
      </section>`;
    }).join("");
    for (const c of document.querySelectorAll("#board .card")) c.addEventListener("click", () => openTask(c.dataset.task));
    draw($("#depgraph"), list.length ? depGraph(list) : "flowchart LR\n  E[No tasks match the filters]");
  }

  // ---------- drawer ----------
  let current = null;
  function docLink(p, label) {
    return docByPath[p] ? `<a class="linkchip" href="#doc/${esc(p)}">${esc(label ?? p)}</a>` : `<span class="tag">${esc(label ?? p)}</span>`;
  }
  function reqLink(r) {
    const hit = D.reqIndex[r];
    return hit ? `<a class="linkchip" href="#doc/${esc(hit.path)}::${slug(hit.heading)}" title="${esc(hit.heading)}">${esc(r)}</a>` : `<span class="tag">${esc(r)}</span>`;
  }
  const taskLink = (id) => (byId[id] ? `<a class="linkchip" href="#task/${id}" style="border-color:${SC[byId[id].status]}55">${id}</a>` : `<span class="tag">${esc(id)}</span>`);

  function openTask(id) {
    const t = byId[id];
    if (!t) return;
    current = id;
    if (location.hash !== `#task/${id}`) history.replaceState(null, "", `#task/${id}`);
    if ($("#view-board").hidden) showView("board", false);
    for (const c of document.querySelectorAll(".card")) c.classList.toggle("sel", c.dataset.task === id);
    const ph = t.phase;
    const lamp = ph.state === "blocked" ? SC.blocked : SC[t.status];
    const spec = t.featureSpec ? docByPath[t.featureSpec] : null;
    $("#drawer").innerHTML = `
      <div class="dhead">
        <div class="dhead-row"><span class="card-id">${t.id}</span>${pill(t.status)}<span class="tag tier-${esc(t.tier)}">${esc(t.tier)}</span>
          <button class="close" id="close" aria-label="Close task details">×</button></div>
        <h2 class="dtitle">${inlineCode(t.title)}</h2>
      </div>
      <div class="dbody">
        <section class="where" aria-label="Where this task is in the workflow">
          <div class="where-h" style="--c:${lamp}"><i class="lamp"></i>
            <div><span class="eyebrow">${esc(LANES[ph.lane].title)} · current phase</span><b>${esc(PHASE_LABEL[ph.node])}</b><p>${inlineCode(ph.note)}</p></div>
          </div>
          <div class="chart" id="d-lane"><span class="loading">Drawing…</span></div>
          <div class="chart" id="d-life" style="border-top:1px solid var(--line)"><span class="loading">Drawing…</span></div>
        </section>
        <dl class="kv">
          <div><dt>Milestone</dt><dd>${esc(t.milestone)}${D.milestones.find((m) => m.id === t.milestone) ? " · " + esc(D.milestones.find((m) => m.id === t.milestone).name) : ""}</dd></div>
          <div><dt>App</dt><dd>${esc(t.app)}</dd></div>
          <div><dt>Size</dt><dd>${esc(t.size)}</dd></div>
          <div><dt>Tier</dt><dd>${esc(t.tier)}</dd></div>
          <div><dt>Depends on</dt><dd class="links">${t.dependsOn.length ? t.dependsOn.map(taskLink).join("") : "—"}</dd></div>
          <div><dt>Unblocks</dt><dd class="links">${t.dependents.length ? t.dependents.map(taskLink).join("") : "—"}</dd></div>
          <div><dt>Feature spec</dt><dd class="links">${spec ? docLink(spec.path, spec.title) + (t.featureSpecRow ? ` <span class="tag">row ${esc(t.featureSpecRow)}</span>` : "") + " " + pill(spec.status, DOC_STATUS) : "— quick lane / self-contained"}</dd></div>
          <div><dt>Requirements</dt><dd class="links">${t.requirements.length ? t.requirements.map(reqLink).join("") : "—"}</dd></div>
          <div><dt>Review verdict</dt><dd>${t.verdict ? esc(t.verdict) : "—"}</dd></div>
          <div><dt>Task file</dt><dd class="mono" style="font-size:12px">${esc(t.path)}</dd></div>
        </dl>
        ${t.acFiles.length ? `<section><h3 class="sub-h">Acceptance tests</h3><div style="overflow-x:auto"><table class="plain"><thead><tr><th>File</th><th>sha256</th><th>On disk</th></tr></thead><tbody>
          ${t.acFiles.map((a) => `<tr><td class="mono" style="font-size:12px;overflow-wrap:anywhere">${esc(a.path)}</td><td class="mono num" style="font-size:12px">${esc((a.sha256 || "").slice(0, 12))}…</td><td class="${a.exists ? "ok" : "bad"}">${a.exists ? "present" : "missing"}</td></tr>`).join("")}
        </tbody></table></div></section>` : ""}
        ${t.attempts.length ? `<section><h3 class="sub-h">Attempts</h3><div style="overflow-x:auto"><table class="plain"><thead><tr><th>#</th><th>Tier</th><th>Result</th><th>Summary</th></tr></thead><tbody>
          ${t.attempts.map((a) => `<tr><td class="num">${esc(a.n)}</td><td>${esc(a.tier)}</td><td class="${/done/.test(a.result) ? "ok" : /BLOCKED|FAILED/.test(a.result) ? "bad" : ""}">${esc(a.result)}</td><td>${inlineCode(a.summary)}</td></tr>`).join("")}
        </tbody></table></div></section>` : ""}
        <section><h3 class="sub-h">Task file</h3><div id="d-body"></div></section>
      </div>`;
    $("#d-body").append(renderMd(t.body, t.path));
    $("#close").addEventListener("click", closeTask);
    $("#drawer").classList.add("open");
    $("#scrim").classList.add("open");
    $("#close").focus({ preventScroll: true });
    draw($("#d-lane"), laneChart(ph.lane, { ...ph, task: t }));
    draw($("#d-life"), lifecycleChart(t.status));
  }
  function closeTask() {
    current = null;
    $("#drawer").classList.remove("open");
    $("#scrim").classList.remove("open");
    for (const c of document.querySelectorAll(".card.sel")) c.classList.remove("sel");
    if (location.hash.startsWith("#task/")) history.replaceState(null, "", "#board");
  }
  $("#scrim").addEventListener("click", closeTask);
  document.addEventListener("keydown", (e) => e.key === "Escape" && current && closeTask());

  // ---------- process ----------
  function renderProcess() {
    const sel = $("#proc-task");
    sel.innerHTML = `<option value="">All tasks (counts per phase)</option>` + D.tasks.map((t) => `<option value="${t.id}">${t.id} · ${esc(t.title.replace(/`/g, ""))}</option>`).join("");
    sel.addEventListener("change", drawProcess);
    $("#steps").innerHTML = [
      ["Spec", "Write the feature spec", "Reads the code first. No open questions left when it goes to the owner.", "main session (opus) · write-spec"],
      ["Tasks", "Create task files", "Task files and BOARD rows from the spec's Tasks table.", "pm4 tasks · write-task"],
      ["Tests", "Acceptance tests first", "*.ac.* tests and typed stubs, failing for the right reason. Hashes recorded.", "main session · write-acceptance-tests · pm4 hash"],
      ["Implement", "One task per subagent", "api-engineer or web-engineer, on the model the task's tier names. Two fix attempts, then escalate.", "implement-task · haiku / sonnet / opus"],
      ["Check", "Scope, hashes, gates", "Lint, typecheck, test, build, plus the spec's checks. Its summary goes in the task.", "pm4 check"],
      ["Review", "One review per feature", "The diff against the spec, acceptance tests and Definition of Done. Verdicts go into the tasks.", "reviewer (opus) · review-feature"],
      ["Commit", "The owner commits", "After reviewing the diff. Agents never commit or push.", "owner"],
    ].map(([n, b, p, who], i) => `<div class="step"><span class="n">${String(i + 1).padStart(2, "0")} · ${n}</span><b>${b}</b><p>${p}</p><div class="who">${who}</div></div>`).join("");
    drawProcess();
  }
  function drawProcess() {
    const id = $("#proc-task").value;
    const t = byId[id];
    const counts = {};
    for (const x of D.tasks) counts[x.phase.node] = (counts[x.phase.node] ?? 0) + 1;
    $("#proc-note").innerHTML = t ? `${pill(t.status)} <b>${esc(PHASE_LABEL[t.phase.node])}</b> · ${inlineCode(t.phase.note)} <a href="#task/${t.id}">Open task</a>` : "Each node shows how many tasks sit there now. Pick a task to see where it is.";
    const focus = t ? { ...t.phase, task: t } : null;
    draw($("#p-feature"), laneChart("feature", focus?.lane === "feature" ? focus : null, t ? null : counts));
    draw($("#p-quick"), laneChart("quick", focus?.lane === "quick" ? focus : null, t ? null : counts));
    draw($("#p-life"), lifecycleChart(t?.status));
    draw($("#p-esc"), escalationChart(t));
    $("#p-feature").closest(".section").style.opacity = t && t.phase.lane !== "feature" ? ".45" : "1";
    $("#p-quick").closest(".section").style.opacity = t && t.phase.lane !== "quick" ? ".45" : "1";
  }

  // ---------- docs ----------
  let docQ = "";
  let currentDoc = null;
  function renderTree() {
    const q = docQ.trim().toLowerCase();
    const match = (d) => !q || (d.title + " " + d.path + " " + (d.id ?? "") + " " + d.body).toLowerCase().includes(q);
    $("#tree-list").innerHTML = D.groups.map((g) => {
      const items = D.docs.filter((d) => d.group === g.key && match(d));
      if (!items.length) return "";
      return `<div class="tgroup"><h4><span>${esc(g.label)}</span><span class="num">${items.length}</span></h4>${items.map((d) =>
        `<button class="titem${currentDoc === d.path ? " sel" : ""}" data-doc="${esc(d.path)}" title="${esc(d.path)}"><i class="dot" style="background:${DOC_STATUS[d.status] ?? "var(--line)"}"></i><span>${esc(d.title)}</span></button>`).join("")}</div>`;
    }).join("") || `<div class="empty">No documents match</div>`;
    for (const b of document.querySelectorAll("#tree-list .titem")) b.addEventListener("click", () => (location.hash = `doc/${b.dataset.doc}`));
  }
  function relatedChip(r) {
    if (docById[r]) return docLink(docById[r].path, r);
    if (/^OQ-\d+/.test(r)) return docLink("specs/open-questions.md", r);
    if (D.reqIndex[r]) return reqLink(r);
    if (/^T-\d+/.test(r)) return taskLink(r);
    return `<span class="tag">${esc(r)}</span>`;
  }
  function openDoc(p, anchor) {
    const d = docByPath[p] ?? docByPath["specs/README.md"] ?? D.docs[0];
    if (!d) return;
    currentDoc = d.path;
    renderTree();
    const m = d.meta;
    const related = Array.isArray(m.related) ? m.related : [];
    const reqs = Array.isArray(m.requirements) ? m.requirements : [];
    const linked = D.tasks.filter((t) => t.featureSpec === d.path || t.requirements.some((r) => D.reqIndex[r]?.path === d.path));
    const r = $("#reader");
    r.innerHTML = `<div class="crumb">${esc(d.path)}</div><h1>${inlineCode(d.title)}</h1>
      <div class="docmeta">
        ${d.status ? pill(d.status, DOC_STATUS) : ""}
        ${d.id ? `<span class="tag">${esc(d.id)}</span>` : ""}
        ${m.owner ? `<span>${esc(m.owner)}</span>` : ""}
        ${m.last_updated ? `<span class="num">updated ${esc(m.last_updated)}</span>` : ""}
        ${m.milestone ? `<span class="tag">${esc(m.milestone)}</span>` : ""}
      </div>
      ${related.length || reqs.length || linked.length ? `<dl class="kv" style="margin:16px 0 8px">
        ${reqs.length ? `<div><dt>Requirements</dt><dd class="links">${reqs.map(reqLink).join("")}</dd></div>` : ""}
        ${related.length ? `<div><dt>Related</dt><dd class="links">${related.map(relatedChip).join("")}</dd></div>` : ""}
        ${linked.length ? `<div><dt>Tasks</dt><dd class="links">${linked.map((t) => taskLink(t.id)).join("")}</dd></div>` : ""}
      </dl>` : ""}`;
    // The H1 is already in the header.
    r.append(renderMd(d.body.replace(/^\s*#\s+.+\n/, ""), d.path));
    if (anchor) setTimeout(() => r.querySelector(`[id="${CSS.escape(anchor)}"]`)?.scrollIntoView({ block: "start" }), 30);
    else if (!$("#view-docs").hidden) window.scrollTo({ top: 0 });
  }
  $("#doc-q").addEventListener("input", (e) => {
    docQ = e.target.value;
    renderTree();
  });

  // ---------- routing ----------
  function showView(v, push = true) {
    for (const s of ["board", "process", "docs"]) {
      $(`#view-${s}`).hidden = s !== v;
      $(`#tab-${s}`).setAttribute("aria-selected", String(s === v));
    }
    if (push && !location.hash.startsWith(`#${v}`)) history.replaceState(null, "", `#${v}`);
  }
  for (const v of ["board", "process", "docs"]) $(`#tab-${v}`).addEventListener("click", () => (location.hash = v === "docs" && currentDoc ? `doc/${currentDoc}` : v));

  function route() {
    const h = decodeURIComponent(location.hash.slice(1));
    if (h.startsWith("task/")) {
      showView("board", false);
      openTask(h.slice(5));
    } else if (h.startsWith("doc/")) {
      closeTask();
      showView("docs", false);
      const [p, anchor] = h.slice(4).split("::");
      openDoc(p, anchor);
    } else if (h === "process") {
      closeTask();
      showView("process", false);
    } else if (h === "docs") {
      closeTask();
      showView("docs", false);
      openDoc(currentDoc ?? "specs/README.md");
    } else {
      if (current) closeTask();
      showView("board", false);
    }
  }
  window.addEventListener("hashchange", route);

  // ---------- boot ----------
  const g = D.git;
  $("#gitinfo").innerHTML = `${g.branch ? `<span>branch <em>${esc(g.branch)}</em></span>` : ""}${g.commit ? `<span title="${esc(g.commit)}">${esc(g.commit.length > 54 ? g.commit.slice(0, 52) + "…" : g.commit)}</span>` : ""}${g.dirty ? `<span style="color:var(--s-progress)">${g.dirty} uncommitted</span>` : ""}<span>generated <em>${new Date(D.generatedAt).toLocaleString()}</em></span>`;
  renderSummary();
  renderFilters();
  renderBoard();
  renderProcess();
  renderTree();
  route();
}

const json = JSON.stringify(data).replace(/</g, "\\u003c").replace(/\u2028/g, "\\u2028").replace(/\u2029/g, "\\u2029");

const HTML = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>PM4 Control Room</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,500;12..96,600;12..96,700&family=IBM+Plex+Mono:wght@400;500;600&family=IBM+Plex+Sans:wght@400;500;600&display=swap">
<style>${CSS}</style>
</head>
<body>
<header class="top">
  <div class="brand"><b>PM4</b><span>control room</span></div>
  <nav class="tabs" role="tablist" aria-label="Views">
    <button id="tab-board" role="tab" aria-selected="true">Board</button>
    <button id="tab-process" role="tab" aria-selected="false">Process</button>
    <button id="tab-docs" role="tab" aria-selected="false">Docs</button>
  </nav>
  <div class="gitinfo" id="gitinfo"></div>
</header>
<main>
  <section id="view-board" class="view">
    <div class="summary" id="summary"></div>
    <div class="filters" id="filters"></div>
    <div class="board-wrap"><div class="board" id="board"></div></div>
    <section class="section">
      <div class="section-h"><h2>Dependencies</h2><p>Arrows point from a task to the tasks it unblocks. Click a node to open it.</p></div>
      <div class="chart" id="depgraph"><span class="loading">Drawing…</span></div>
    </section>
  </section>

  <section id="view-process" class="view" hidden>
    <div class="section-h"><h2 style="font-size:26px">Feature development process</h2><p>Spec → acceptance tests → implement → review. Dashed hexagons are owner steps.</p></div>
    <div class="picker">
      <label for="proc-task" class="eyebrow">Show a task</label>
      <select id="proc-task"></select>
      <span class="note" id="proc-note"></span>
    </div>
    <div class="proc-grid">
      <section class="section" style="margin-top:0">
        <div class="section-h"><h2>Feature lane</h2><p>Everything that isn't a small, single-app change. A <code class="mono">BLOCKED: spec</code> or <code class="mono">BLOCKED: test</code> result sends the task back to the spec or the tests.</p></div>
        <div class="chart" id="p-feature"></div>
      </section>
      <section class="section" style="margin-top:0">
        <div class="section-h"><h2>Quick lane</h2><p>One app, at most 3 files, size S. No feature spec, no Opus review. M0 tasks use it too.</p></div>
        <div class="chart" id="p-quick"></div>
      </section>
      <section class="section" style="margin-top:0">
        <div class="section-h"><h2>Task status lifecycle</h2><p>Set with <code class="mono">pm4 status</code>. Only the owner sets done.</p></div>
        <div class="chart" id="p-life"></div>
      </section>
      <section class="section" style="margin-top:0">
        <div class="section-h"><h2>Escalation</h2><p>Each FAILED climbs one tier. A task is never retried at the same tier.</p></div>
        <div class="chart" id="p-esc"></div>
      </section>
      <section class="section" style="margin-top:0">
        <div class="section-h"><h2>Who does what</h2></div>
        <div class="steps" id="steps"></div>
      </section>
    </div>
  </section>

  <section id="view-docs" class="view" hidden>
    <div class="docs">
      <aside class="tree" aria-label="Documents">
        <input id="doc-q" class="search" type="search" placeholder="Search specs and docs…" aria-label="Search documents">
        <div id="tree-list"></div>
      </aside>
      <article class="reader" id="reader"></article>
    </div>
  </section>
</main>
<div class="scrim" id="scrim"></div>
<aside class="drawer" id="drawer" aria-label="Task details"></aside>

<script id="pm4-data" type="application/json">${json}</script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/marked/12.0.2/marked.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/mermaid@11.4.1/dist/mermaid.min.js"></script>
<script>(${client.toString()})();</script>
</body>
</html>
`;

fs.writeFileSync(OUT, HTML);
const counts = tasks.reduce((m, t) => ((m[t.status] = (m[t.status] ?? 0) + 1), m), {});
console.log(`pm4 dashboard: ${tasks.length} tasks (${Object.entries(counts).map(([k, v]) => `${v} ${k}`).join(", ")}), ${docs.length} docs`);
console.log(`→ ${path.relative(process.cwd(), OUT) || OUT}`);
