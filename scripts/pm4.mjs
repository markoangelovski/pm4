#!/usr/bin/env node
// PM4 workflow helper: the mechanical steps of the spec → tests → implement → review workflow,
// so no model spends tokens on them. No dependencies. Run from anywhere in the repo.
//
//   node scripts/pm4.mjs tasks  <feature-spec>       create task files + BOARD rows from the spec's Tasks table
//   node scripts/pm4.mjs hash   <feature-spec>       record sha256 of the acceptance tests in the tasks' ac_files
//   node scripts/pm4.mjs ready  <T-####>             can this task start? (spec approved, deps, tests, hashes)
//   node scripts/pm4.mjs status <T-####> <status>    set status in the task file and BOARD, unblock dependents
//   node scripts/pm4.mjs brief  <T-####>             the slice of the feature spec an implementer needs
//   node scripts/pm4.mjs check  <T-####> [--no-gates]          scope, hashes, gates, spec checks for one task
//   node scripts/pm4.mjs check  --feature <spec> [--no-gates]  the same for a whole feature (review)
//
// Spec format: specs/06-features/_TEMPLATE.md. Older specs (Edge cases + Acceptance tests tables,
// "Done when" column, "Definition of done" bash block) are understood too.
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const TASKS_DIR = path.join(ROOT, "tasks");
const BOARD = path.join(TASKS_DIR, "BOARD.md");
const STATUSES = ["blocked", "ready", "in-progress", "review", "done"];
const GATES = {
  web: ["lint", "format:check", "typecheck", "test", "build"],
  api: ["lint", "format:check", "typecheck", "test", "test:e2e", "build"],
};
const TEST_GATES = new Set(["test", "test:e2e"]);
const CONTRACT = {
  api: { file: "api/openapi.json", script: "openapi:export" },
  web: { file: "web/lib/api/schema.d.ts", script: "api:types" },
};

// ---------- small utilities ----------

const read = (p) => fs.readFileSync(path.resolve(ROOT, p), "utf8");
const write = (p, s) => fs.writeFileSync(path.resolve(ROOT, p), s);
const rel = (p) => path.relative(ROOT, path.resolve(ROOT, p)).split(path.sep).join("/");
const sha256 = (p) => crypto.createHash("sha256").update(fs.readFileSync(path.resolve(ROOT, p))).digest("hex");
const exists = (p) => fs.existsSync(path.resolve(ROOT, p));
const unique = (xs) => [...new Set(xs)];
const stripAnsi = (s) => s.replace(/\x1b\[[0-9;]*[A-Za-z]/g, "");

function die(msg) {
  console.error(`pm4: ${msg}`);
  process.exit(2);
}

function tail(text, n = 40) {
  const lines = stripAnsi(text).trimEnd().split("\n");
  return lines.slice(-n).map((l) => `    ${l}`).join("\n");
}

// ---------- frontmatter ----------

function splitFrontmatter(text) {
  const m = text.match(/^---\n([\s\S]*?)\n---\n?/);
  return m ? { fm: m[1], body: text.slice(m[0].length) } : { fm: "", body: text };
}

function field(text, key) {
  const { fm } = splitFrontmatter(text);
  const m = fm.match(new RegExp(`^${key}:[ \\t]*(.*)$`, "m"));
  if (!m) return undefined;
  const v = m[1].replace(/\s+#.*$/, "").trim();
  if (v === "") {
    // YAML block list: `key:` followed by `  - item` lines.
    const after = fm.slice(m.index + m[0].length).split("\n").slice(1);
    const items = [];
    for (const line of after) {
      const item = line.match(/^\s+-\s+(.*)$/);
      if (!item) break;
      items.push(item[1].trim().replace(/^(["'])(.*)\1$/, "$2"));
    }
    if (items.length) return items;
  }
  if (v.startsWith("[")) {
    return v.slice(1, -1).split(",").map((s) => s.trim()).filter(Boolean);
  }
  return v;
}

function setField(text, key, value) {
  const re = new RegExp(`^(${key}:[ \\t]*)([^\\n]*?)([ \\t]+#[^\\n]*)?$`, "m");
  if (!re.test(text)) die(`no "${key}:" field to update`);
  return text.replace(re, (_, k, _v, comment = "") => `${k}${value}${comment}`);
}

function readAcFiles(text) {
  const { fm } = splitFrontmatter(text);
  return [...fm.matchAll(/^\s+- \{\s*path:\s*([^,}\s]+)\s*,\s*sha256:\s*([^}\s]+)\s*\}/gm)].map((m) => ({
    path: m[1],
    sha256: m[2],
  }));
}

function writeAcFiles(text, entries) {
  const lines = text.split("\n");
  const i = lines.findIndex((l) => /^ac_files:/.test(l));
  if (i < 0) die('no "ac_files:" field to update');
  let j = i + 1;
  while (j < lines.length && /^\s+- \{/.test(lines[j])) j++;
  const block = entries.length
    ? ["ac_files:", ...entries.map((e) => `  - { path: ${e.path}, sha256: ${e.sha256} }`)]
    : ["ac_files: []"];
  lines.splice(i, j - i, ...block);
  return lines.join("\n");
}

// ---------- markdown ----------

function sections(body) {
  const out = [];
  let inFence = false;
  let cur = null;
  for (const line of body.split("\n")) {
    if (/^```/.test(line)) inFence = !inFence;
    const m = !inFence && line.match(/^## (.+)$/);
    if (m) {
      cur = { title: m[1].trim(), lines: [] };
      out.push(cur);
    } else if (cur) {
      cur.lines.push(line);
    }
  }
  return out.map((s) => ({ title: s.title, text: s.lines.join("\n") }));
}

function section(secs, ...names) {
  const wanted = names.map((n) => n.toLowerCase());
  return secs.find((s) => wanted.some((n) => s.title.toLowerCase().startsWith(n)));
}

function splitRow(line) {
  const cells = [];
  let cur = "";
  let code = false;
  const s = line.trim().replace(/^\|/, "").replace(/\|$/, "");
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (c === "`") code = !code;
    if (c === "|" && !code && s[i - 1] !== "\\") {
      cells.push(cur.trim());
      cur = "";
    } else cur += c;
  }
  cells.push(cur.trim());
  return cells;
}

// Every table in a block of text: { header, rows, lines: [headerLine, sepLine, ...rowLines] }.
function tables(text) {
  const out = [];
  const lines = text.split("\n");
  for (let i = 0; i < lines.length; i++) {
    if (!lines[i].trim().startsWith("|") || !/^\s*\|[\s:|-]+\|\s*$/.test(lines[i + 1] ?? "")) continue;
    const t = { header: splitRow(lines[i]), rows: [], rowLines: [], headLines: [lines[i], lines[i + 1]] };
    let j = i + 2;
    while (j < lines.length && lines[j].trim().startsWith("|")) {
      t.rows.push(splitRow(lines[j]));
      t.rowLines.push(lines[j]);
      j++;
    }
    out.push(t);
    i = j - 1;
  }
  return out;
}

// Index of the first of `names` (in priority order) that is a header of the table, or -1.
function col(table, ...names) {
  const headers = table.header.map((h) => h.toLowerCase());
  for (const n of names) {
    const i = headers.indexOf(n.toLowerCase());
    if (i >= 0) return i;
  }
  return -1;
}

const codeSpans = (cell) => [...(cell ?? "").matchAll(/`([^`]+)`/g)].map((m) => m[1]);
const taskRefs = (cell) => [...(cell ?? "").matchAll(/\bT\d+\b/g)].map((m) => m[0]);

// "AC-1–AC-5, AC-9 and AC-11/AC-12" → [1..5, 9, 11, 12]
function acRefs(cell) {
  const text = (cell ?? "").replace(/`/g, "");
  const out = [];
  for (const m of text.matchAll(/AC-(\d+)(?:\s*[–-]\s*AC-(\d+))?/g)) {
    const a = Number(m[1]);
    const b = m[2] ? Number(m[2]) : a;
    for (let n = a; n <= b; n++) out.push(`AC-${n}`);
  }
  return unique(out);
}

// ---------- the feature spec ----------

function loadSpec(specPath) {
  const p = rel(specPath.split("#")[0]);
  if (!exists(p)) die(`feature spec not found: ${p}`);
  const text = read(p);
  const { body } = splitFrontmatter(text);
  const secs = sections(body);

  const tasksSec = section(secs, "Tasks");
  const tt = tasksSec && tables(tasksSec.text)[0];
  const rows = [];
  if (tt) {
    const c = {
      id: col(tt, "#"),
      title: col(tt, "Task"),
      app: col(tt, "App"),
      size: col(tt, "Size"),
      tier: col(tt, "Tier"),
      why: col(tt, "Why this tier", "Why"),
      deps: col(tt, "Depends on"),
      done: col(tt, "Done when"),
    };
    tt.rows.forEach((r, i) => {
      rows.push({
        row: r[c.id],
        order: i,
        title: r[c.title],
        app: r[c.app],
        size: c.size >= 0 ? r[c.size] : "S",
        tier: r[c.tier],
        why: c.why >= 0 ? r[c.why] : "",
        deps: taskRefs(r[c.deps]),
        doneWhen: c.done >= 0 ? r[c.done] : "",
        line: tt.rowLines[i],
      });
    });
  }
  const order = new Map(rows.map((r) => [r.row, r.order]));

  // Files table: row → paths (both sides of a move).
  const files = [];
  const filesSec = section(secs, "Files");
  const ft = filesSec && tables(filesSec.text)[0];
  if (ft) {
    const cApp = col(ft, "App");
    const cFile = col(ft, "File");
    const cTask = col(ft, "Task");
    ft.rows.forEach((r, i) => {
      const app = r[cApp];
      const paths = codeSpans(r[cFile])
        .filter((s) => s.includes("/") || s.includes("."))
        .map((s) => (app && !s.startsWith(`${app}/`) && !s.startsWith(".") ? `${app}/${s}` : s));
      files.push({ tasks: taskRefs(r[cTask]), tests: /test/i.test(r[cTask]), paths, line: ft.rowLines[i] });
    });
  }

  // Acceptance criteria: AC → { task, tests: [paths], manual, check }.
  const acs = new Map();
  const acSecs = secs.filter((s) => /^(acceptance criteria|acceptance tests|edge cases)/i.test(s.title));
  for (const s of acSecs) {
    for (const t of tables(s.text)) {
      const cAc = col(t, "AC", "ID", "Covered by");
      if (cAc < 0) continue;
      const cTest = col(t, "File", "Test");
      const cTask = col(t, "Task");
      t.rows.forEach((r) => {
        for (const ac of acRefs(r[cAc])) {
          const e = acs.get(ac) ?? { tests: [], manual: false, check: false, task: undefined };
          const testCell = cTest >= 0 ? r[cTest] : "";
          // In the old Acceptance-tests table the "Test" column is the description; only `.ac.` paths count.
          e.tests.push(...codeSpans(testCell).filter((p) => /\.ac\./.test(p)));
          if (cTest >= 0 && /manual/i.test(testCell)) e.manual = true;
          if (cTest >= 0 && /\bcheck\b|DoD command/i.test(testCell)) e.check = true;
          if (cTask >= 0 && taskRefs(r[cTask])[0]) e.task ??= taskRefs(r[cTask])[0];
          acs.set(ac, e);
        }
      });
    }
  }
  // Old format: the AC belongs to the first task whose "Done when" names it.
  for (const r of rows) {
    for (const ac of acRefs(r.doneWhen)) {
      const e = acs.get(ac);
      if (e && !e.task) e.task = r.row;
    }
  }
  for (const e of acs.values()) e.tests = unique(e.tests);

  // Checks: the first bash block of "Checks" (or the old "Definition of done"), chunked by "# AC-n" comments.
  const checks = [];
  const checksSec = section(secs, "Checks", "Definition of done");
  const block = checksSec?.text.match(/```(?:bash|sh)\n([\s\S]*?)```/);
  if (block) checks.push(...chunkChecks(block[1], false));

  return {
    path: p,
    text,
    status: field(text, "status"),
    milestone: field(text, "milestone"),
    secs,
    rows,
    order,
    files,
    acs,
    checks,
  };
}

// Split a bash block into runnable chunks. A chunk starts at a "# AC-n…" comment. Untagged lines
// before the first tag are the standard gates (already run) unless keepUntagged is set.
function chunkChecks(src, keepUntagged) {
  const chunks = [];
  let cur = keepUntagged ? { acs: [], lines: [] } : null;
  for (const line of src.split("\n")) {
    const m = line.match(/^#\s*(AC-\d+(?:\s*[,/–-]\s*AC-\d+)*)/);
    if (m) {
      if (cur && cur.lines.some((l) => l.trim() && !l.trim().startsWith("#"))) chunks.push(cur);
      cur = { acs: acRefs(m[1]), label: line.replace(/^#\s*/, ""), lines: [] };
    } else if (cur) cur.lines.push(line);
  }
  if (cur && cur.lines.some((l) => l.trim() && !l.trim().startsWith("#"))) chunks.push(cur);
  return chunks.map((c) => ({ ...c, label: c.label ?? "checks", cmd: c.lines.join("\n").trim() }));
}

// ---------- tasks and the board ----------

function allTaskFiles() {
  const out = [];
  for (const d of fs.readdirSync(TASKS_DIR, { withFileTypes: true })) {
    if (!d.isDirectory()) continue;
    for (const f of fs.readdirSync(path.join(TASKS_DIR, d.name))) {
      if (/^T-\d{4}.*\.md$/.test(f)) out.push(rel(path.join(TASKS_DIR, d.name, f)));
    }
  }
  return out.sort();
}

function loadTask(idOrPath) {
  const p = idOrPath.endsWith(".md")
    ? rel(idOrPath)
    : allTaskFiles().find((f) => path.basename(f).startsWith(`${idOrPath}-`) || path.basename(f) === `${idOrPath}.md`);
  if (!p) die(`task not found: ${idOrPath}`);
  const text = read(p);
  const spec = field(text, "feature_spec");
  const row =
    field(text, "spec_row") ??
    text.match(/row "(T\d+)"/)?.[1] ??
    text.match(/\*\*Feature spec row:\*\*\s*(T\d+)/)?.[1];
  return {
    path: p,
    text,
    id: field(text, "id"),
    title: field(text, "title"),
    app: field(text, "app"),
    status: field(text, "status"),
    tier: field(text, "tier"),
    deps: field(text, "depends_on") ?? [],
    files: field(text, "files") ?? [],
    spec: spec && spec !== "—" ? rel(spec.split("#")[0]) : undefined,
    row,
    acFiles: readAcFiles(text),
  };
}

function specTasks(spec) {
  return allTaskFiles()
    .map(loadTask)
    .filter((t) => t.spec === spec.path);
}

function setBoardStatus(id, status) {
  const text = read(BOARD);
  const t = tables(text)[0];
  const cStatus = col(t, "Status");
  const i = t.rowLines.findIndex((l) => l.startsWith(`| [${id}](`));
  if (i < 0) die(`${id} has no row in tasks/BOARD.md`);
  const cells = [...t.rows[i]];
  cells[cStatus] = status;
  write(BOARD, text.replace(t.rowLines[i], `| ${cells.join(" | ")} |`));
}

function setStatus(task, status) {
  write(task.path, setField(read(task.path), "status", status));
  setBoardStatus(task.id, status);
  task.status = status;
}

// Reasons a task can't start yet (empty = it can).
function readiness(task) {
  const reasons = [];
  for (const dep of task.deps) {
    const d = loadTask(dep);
    if (!["review", "done"].includes(d.status)) reasons.push(`depends on ${dep} (${d.status})`);
  }
  if (task.spec) {
    const spec = loadSpec(task.spec);
    if (spec.status !== "approved") reasons.push(`feature spec is ${spec.status}, not approved`);
    const needsTests = [...spec.acs.values()].some((e) => e.task === task.row && e.tests.length);
    if (needsTests && !task.acFiles.length) reasons.push("no acceptance tests recorded yet (write-acceptance-tests, then pm4 hash)");
  }
  for (const e of task.acFiles) {
    if (!exists(e.path)) reasons.push(`acceptance test missing: ${e.path}`);
    else if (sha256(e.path) !== e.sha256) reasons.push(`acceptance test changed since it was hashed: ${e.path}`);
  }
  return reasons;
}

// After a status change: blocked tasks whose blockers are gone become ready.
function refreshBlocked() {
  for (const f of allTaskFiles()) {
    const t = loadTask(f);
    if (t.status === "blocked" && t.spec && readiness(t).length === 0) {
      setStatus(t, "ready");
      console.log(`${t.id}: blocked → ready`);
    }
  }
}

// ---------- commands ----------

function cmdTasks(specPath) {
  const spec = loadSpec(specPath);
  if (spec.status !== "approved") die(`${spec.path} is ${spec.status}; tasks are created only from approved specs`);
  if (!spec.rows.length) die(`${spec.path} has no Tasks table`);
  const mDir = fs
    .readdirSync(TASKS_DIR)
    .find((d) => d.toLowerCase().startsWith(`${(spec.milestone ?? "").toLowerCase()}-`));
  if (!mDir) die(`no tasks/${(spec.milestone ?? "m?").toLowerCase()}-* folder for milestone ${spec.milestone}`);

  const existing = new Map(specTasks(spec).map((t) => [t.row, t.id]));
  let board = read(BOARD);
  let next = Number(board.match(/\*\*Next free ID:\*\*\s*T-(\d+)/)?.[1] ?? die("BOARD.md has no next free ID"));
  const ids = new Map(existing);
  for (const r of spec.rows) if (!ids.has(r.row)) ids.set(r.row, `T-${String(next++).padStart(4, "0")}`);

  const created = [];
  for (const r of spec.rows) {
    if (existing.has(r.row)) continue;
    const id = ids.get(r.row);
    const deps = r.deps.map((d) => ids.get(d) ?? die(`row ${r.row} depends on unknown row ${d}`));
    const plain = r.title.replace(/`/g, "");
    const slug = plain
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .split("-")
      .filter(Boolean)
      .slice(0, 6)
      .join("-");
    const file = `tasks/${mDir}/${id}-${slug}.md`;
    write(
      file,
      `---
id: ${id}
title: ${plain}
milestone: ${spec.milestone}
app: ${r.app}
status: blocked
size: ${r.size || "S"}
tier: ${r.tier}
depends_on: [${deps.join(", ")}]
feature_spec: ${spec.path}
spec_row: ${r.row}
ac_files: []
---

# ${id}: ${plain}

**Tier reason:** ${r.why || "—"}

Work from the brief: \`node scripts/pm4.mjs brief ${id}\`. Verify with \`node scripts/pm4.mjs check ${id}\`.

## Implementation notes
_Implementer: what changed, and anything the reviewer should look at._

### Attempts
| # | Tier | Result | Summary |
| --- | --- | --- | --- |

## Review
_Filled in by \`review-feature\`._
`,
    );
    created.push({ id, file, r, deps, plain });
  }

  if (created.length) {
    const t = tables(board)[0];
    const last = t.rowLines.at(-1);
    const newRows = created.map(
      (c) =>
        `| [${c.id}](${c.file.replace(/^tasks\//, "")}) | ${c.plain} | ${spec.milestone} | ${c.r.app} | ${c.r.size || "S"} | blocked | ${c.deps.join(", ") || "—"} |`,
    );
    board = board.replace(last, [last, ...newRows].join("\n"));
    board = board.replace(/(\*\*Next free ID:\*\*\s*)T-\d+/, `$1T-${String(next).padStart(4, "0")}`);
    write(BOARD, board);
  }
  for (const c of created) console.log(`${c.r.row} → ${c.id}  ${c.file}`);
  for (const [row, id] of existing) console.log(`${row} → ${id}  (exists)`);
  if (created.length) console.log("All new tasks are blocked until their acceptance tests are hashed (pm4 hash).");
}

function cmdHash(specPath) {
  const spec = loadSpec(specPath);
  const tasks = specTasks(spec);
  if (!tasks.length) die(`no tasks for ${spec.path} (run pm4 tasks first)`);
  let missing = false;
  for (const t of tasks) {
    const paths = unique([...spec.acs.values()].filter((e) => e.task === t.row).flatMap((e) => e.tests));
    const entries = [];
    for (const p of paths) {
      if (!exists(p)) {
        console.log(`MISSING ${p} (${t.id})`);
        missing = true;
        continue;
      }
      entries.push({ path: p, sha256: sha256(p) });
    }
    write(t.path, writeAcFiles(read(t.path), entries));
    console.log(`${t.id} (${t.row}): ${entries.map((e) => e.path).join(", ") || "no acceptance test files"}`);
  }
  refreshBlocked();
  if (missing) process.exit(1);
}

function cmdReady(id) {
  const t = loadTask(id);
  const reasons = readiness(t);
  if (["in-progress", "review", "done"].includes(t.status)) reasons.unshift(`status is ${t.status}`);
  if (reasons.length) {
    console.log(`NOT READY ${t.id}:\n${reasons.map((r) => `  - ${r}`).join("\n")}`);
    process.exit(1);
  }
  console.log(`READY ${t.id} (${t.app}, tier ${t.tier})`);
}

function cmdStatus(id, status) {
  if (!STATUSES.includes(status)) die(`status must be one of ${STATUSES.join(", ")}`);
  const t = loadTask(id);
  setStatus(t, status);
  console.log(`${t.id}: ${status}`);
  refreshBlocked();
}

function cmdBrief(id) {
  const t = loadTask(id);
  if (!t.spec) die(`${t.id} has no feature_spec; its task file is the whole brief`);
  const spec = loadSpec(t.spec);
  const row = spec.rows.find((r) => r.row === t.row) ?? die(`${t.id}: row ${t.row} not in ${spec.path}`);
  const myAcs = new Set([...spec.acs].filter(([, e]) => e.task === t.row).map(([ac]) => ac));
  const out = [];
  const add = (s) => out.push(s.trimEnd());

  add(`# Brief: ${t.id} = row ${t.row} of ${spec.path}`);
  add(`App ${t.app} · tier ${t.tier} · ACs ${[...myAcs].join(", ") || "none"}`);
  add("This is the part of the feature spec you need. Open the full spec only if something here is unclear.\n");

  for (const name of ["Goal", "Scope", "Read first", "Reuse"]) {
    const s = section(spec.secs, name);
    if (s) add(`## ${s.title}\n${s.text.trim()}\n`);
  }

  const filesSec = section(spec.secs, "Files");
  if (filesSec) {
    const ft = tables(filesSec.text)[0];
    const intro = filesSec.text.split("\n").filter((l) => l.trim() && !l.trim().startsWith("|")).join("\n");
    const mine = spec.files.filter((f) => f.tasks.includes(t.row));
    add(`## Files (yours: ${t.row})\n${intro}\n\n${ft.headLines.join("\n")}\n${mine.map((f) => f.line).join("\n")}\n`);
  }

  const ifs = section(spec.secs, "Interfaces");
  if (ifs) {
    // A ###/#### subsection whose heading ends in "(…T1, T3…)" is only for those tasks; untagged ones are for all.
    const parts = ifs.text.split(/\n(?=#{3,4} )/);
    const kept = parts.filter((p) => {
      const tag = p.match(/^#{3,4} .*\(([^()]*)\)\s*$/m)?.[1];
      const refs = /^#{3,4} /.test(p) ? taskRefs(tag) : [];
      return !refs.length || refs.includes(t.row);
    });
    add(`## Interfaces\nCode that earlier tasks wrote is already in the tree: read it there.\n${kept.join("\n").trim()}\n`);
  }

  for (const s of spec.secs.filter((x) => /^(acceptance criteria|acceptance tests|edge cases)/i.test(x.title))) {
    const ts = tables(s.text);
    const filtered = ts
      .map((tb) => {
        const c = col(tb, "AC", "ID", "Covered by");
        if (c < 0) return null;
        const rows = tb.rowLines.filter((_, i) => acRefs(tb.rows[i][c]).some((a) => myAcs.has(a)));
        return rows.length ? `${tb.headLines.join("\n")}\n${rows.join("\n")}` : null;
      })
      .filter(Boolean);
    const stubs = s.text
      .split("\n")
      .filter((l) => /^- /.test(l) && codeSpans(l).some((p) => spec.files.some((f) => f.tasks.includes(t.row) && f.paths.includes(p))));
    if (filtered.length || stubs.length) {
      add(`## ${s.title} (yours)\n${filtered.join("\n\n")}${stubs.length ? `\n\nTyped stubs you replace:\n${stubs.join("\n")}` : ""}\n`);
    }
  }

  const myChecks = spec.checks.filter((c) => c.acs.some((a) => myAcs.has(a)));
  if (myChecks.length) {
    add(`## Checks (run by pm4 check)\n\`\`\`bash\n${myChecks.map((c) => `# ${c.label}\n${c.cmd}`).join("\n")}\n\`\`\`\n`);
  }

  const tasksSec = section(spec.secs, "Tasks");
  add(`## Your row of the Tasks table\n${tables(tasksSec.text)[0].headLines.join("\n")}\n${row.line}\n`);

  const notes = t.text.match(/### Attempts\n[\s\S]*$/)?.[0] ?? "";
  if (/\|\s*1\s*\|/.test(notes) || /## Review\n(?!_Filled)/.test(notes)) add(`## From your task file\n${notes.trim()}\n`);

  console.log(out.join("\n"));
}

function gitChanged() {
  const r = spawnSync("git", ["status", "--porcelain=v1", "-uall", "-z"], { cwd: ROOT, encoding: "utf8" });
  const parts = r.stdout.split("\0").filter(Boolean);
  const changed = [];
  for (let i = 0; i < parts.length; i++) {
    const x = parts[i][0];
    changed.push(parts[i].slice(3));
    if (x === "R" || x === "C") changed.push(parts[++i]);
  }
  return unique(changed);
}

function globRe(p) {
  const esc = p.replace(/[.+^${}()|[\]\\]/g, "\\$&").replace(/\*\*/g, "\0").replace(/\*/g, "[^/]*").replace(/\0/g, ".*");
  return new RegExp(`^${esc}${p.endsWith("/") ? ".*" : ""}$`);
}

function runGate(app, script, extraArgs = []) {
  const started = Date.now();
  const args = ["run", script, ...(extraArgs.length ? ["--", ...extraArgs] : [])];
  const r = spawnSync("npm", args, {
    cwd: path.join(ROOT, app),
    encoding: "utf8",
    maxBuffer: 256 * 1024 * 1024,
    env: { ...process.env, CI: "1", FORCE_COLOR: "0", NO_COLOR: "1" },
  });
  const secs = Math.round((Date.now() - started) / 1000);
  const output = `${r.stdout ?? ""}${r.stderr ?? ""}`;
  return { ok: r.status === 0, secs, output };
}

function cmdCheck(args) {
  const noGates = args.includes("--no-gates");
  const fi = args.indexOf("--feature");
  const featureMode = fi >= 0;
  const target = featureMode ? args[fi + 1] : args.find((a) => !a.startsWith("--"));
  if (!target) die("usage: check <T-####> | check --feature <spec>");

  let spec, task, apps, allowed, acFiles, pendingAcs, checks, manual, label;
  if (featureMode) {
    spec = loadSpec(target);
    const tasks = specTasks(spec);
    label = spec.path;
    apps = unique(spec.rows.map((r) => r.app).filter((a) => GATES[a]));
    allowed = spec.files.flatMap((f) => f.paths);
    acFiles = tasks.flatMap((t) => t.acFiles);
    pendingAcs = new Set();
  } else {
    task = loadTask(target);
    label = task.id;
    apps = GATES[task.app] ? [task.app] : [];
    acFiles = task.acFiles;
    if (task.spec) {
      spec = loadSpec(task.spec);
      const mine = spec.order.get(task.row);
      const done = (rows) => rows.some((r) => spec.order.get(r) <= mine);
      allowed = spec.files.filter((f) => f.tests || done(f.tasks)).flatMap((f) => f.paths);
      pendingAcs = new Set([...spec.acs].filter(([, e]) => e.task && spec.order.get(e.task) > mine).map(([ac]) => ac));
    } else {
      allowed = task.files;
      pendingAcs = new Set();
    }
  }
  if (spec) {
    allowed.push(...[...spec.acs.values()].flatMap((e) => e.tests));
    checks = spec.checks;
    manual = [...spec.acs].filter(([ac, e]) => e.manual && !pendingAcs.has(ac)).map(([ac]) => ac);
  } else {
    const s = section(sections(splitFrontmatter(task.text).body), "Checks");
    const block = s?.text.match(/```(?:bash|sh)\n([\s\S]*?)```/);
    checks = block ? chunkChecks(block[1], true) : [];
    manual = [];
  }

  const problems = [];
  const report = (line) => console.log(line);
  report(`pm4 check ${label}${noGates ? " (no gates)" : ""}`);

  // 1. Nothing staged.
  const staged = spawnSync("git", ["diff", "--cached", "--name-only"], { cwd: ROOT, encoding: "utf8" }).stdout.trim();
  if (staged) problems.push(`staged changes (nothing may be staged):\n    ${staged.split("\n").join("\n    ")}`);

  // 2. Acceptance tests unchanged.
  for (const e of acFiles) {
    if (!exists(e.path)) problems.push(`acceptance test missing: ${e.path}`);
    else if (sha256(e.path) !== e.sha256) problems.push(`acceptance test modified (hash mismatch): ${e.path}`);
  }
  report(`  ac hashes: ${acFiles.length ? (problems.some((p) => p.startsWith("acceptance")) ? "FAIL" : `ok (${acFiles.length})`) : "none recorded"}`);

  // 3. Scope: every changed file outside tasks/ must be listed for this task (or an earlier one).
  const res = allowed.map(globRe);
  const later = spec && !featureMode ? spec.files.filter((f) => !f.tests && !allowed.some((a) => f.paths.includes(a))) : [];
  const outside = gitChanged().filter((f) => !f.startsWith("tasks/") && !res.some((r) => r.test(f)));
  if (outside.length) {
    const why = (f) => {
      const owner = later.find((l) => l.paths.some((p) => globRe(p).test(f)));
      return owner ? ` (belongs to ${owner.tasks.join(", ")})` : " (not in the Files table)";
    };
    problems.push(`changed files outside scope:\n${outside.map((f) => `    ${f}${why(f)}`).join("\n")}`);
  }
  report(`  scope: ${outside.length ? `FAIL (${outside.length} file(s))` : "ok"}`);

  if (!noGates) {
    const tPattern = pendingAcs.size
      ? [`-t`, `^(?!.*\\b(?:${[...pendingAcs].join("|")})\\b)`]
      : [];
    if (pendingAcs.size) report(`  pending ACs (later tasks, excluded): ${[...pendingAcs].join(", ")}`);
    for (const app of apps) {
      for (const g of GATES[app]) {
        const r = runGate(app, g, TEST_GATES.has(g) ? tPattern : []);
        report(`  ${app} ${g}: ${r.ok ? "ok" : "FAIL"} (${r.secs}s)`);
        if (!r.ok) problems.push(`${app} ${g} failed:\n${tail(r.output)}`);
      }
      const c = CONTRACT[app];
      if (c && (allowed.includes(c.file) || gitChanged().includes(c.file))) {
        const before = exists(c.file) ? sha256(c.file) : "";
        const r = runGate(app, c.script);
        const stale = r.ok && before !== sha256(c.file);
        report(`  ${app} ${c.script}: ${!r.ok ? "FAIL" : stale ? "STALE (regenerated now)" : "ok"} (${r.secs}s)`);
        if (!r.ok) problems.push(`${app} ${c.script} failed:\n${tail(r.output)}`);
        if (stale) problems.push(`${c.file} was out of date; it has been regenerated. Re-run check.`);
      }
    }
    for (const ch of checks) {
      if (ch.acs.some((a) => pendingAcs.has(a))) {
        report(`  check ${ch.label}: skipped (later task)`);
        continue;
      }
      const r = spawnSync("bash", ["-o", "pipefail", "-c", `set -e\n${ch.cmd}`], { cwd: ROOT, encoding: "utf8" });
      report(`  check ${ch.label}: ${r.status === 0 ? "ok" : "FAIL"}`);
      if (r.status !== 0) problems.push(`check "${ch.label}" failed:\n${tail(`${r.stdout}${r.stderr}`)}`);
    }
  }
  if (manual?.length) report(`  manual (owner verifies): ${manual.join(", ")}`);

  if (problems.length) {
    report(`\nFAIL ${label}\n${problems.map((p) => `- ${p}`).join("\n")}`);
    process.exit(1);
  }
  report(`\nPASS ${label}`);
}

// ---------- main ----------

const [cmd, ...args] = process.argv.slice(2);
switch (cmd) {
  case "tasks":
    cmdTasks(args[0] ?? die("usage: tasks <feature-spec>"));
    break;
  case "hash":
    cmdHash(args[0] ?? die("usage: hash <feature-spec>"));
    break;
  case "ready":
    cmdReady(args[0] ?? die("usage: ready <T-####>"));
    break;
  case "status":
    cmdStatus(args[0] ?? die("usage: status <T-####> <status>"), args[1]);
    break;
  case "brief":
    cmdBrief(args[0] ?? die("usage: brief <T-####>"));
    break;
  case "check":
    cmdCheck(args);
    break;
  default:
    console.log(fs.readFileSync(fileURLToPath(import.meta.url), "utf8").split("\n").slice(1, 13).join("\n").replace(/^\/\/ ?/gm, ""));
    process.exit(cmd ? 2 : 0);
}
