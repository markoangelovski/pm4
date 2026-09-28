#!/usr/bin/env node
// PreToolUse guard for subagents (registered in .claude/settings.json).
// The main session is left to the permission rules; this only narrows what
// subagents may do (AGENTS.md §3 and §5):
// - no subagent changes git state (add, commit, push, stash, reset, …);
// - implementers (api-engineer, web-engineer) edit only their own app and
//   tasks/, never acceptance tests (*.ac.*), specs or agent config.
// It stops accidents, not a determined workaround: the reviewer's sha256
// check on acceptance tests is the backstop.
import path from "node:path";

const IMPLEMENTER_APP = { "api-engineer": "api", "web-engineer": "web" };
const FILE_TOOLS = new Set(["Edit", "Write", "MultiEdit", "NotebookEdit"]);
const AC_FILE = /\.ac\.(spec|e2e-spec|test)\.tsx?$/;
const AC_WRITE_IN_BASH = /(>|\btee\b|\bsed\s+-i|\bperl\s+-\w*i|\bmv\b|\bcp\b|\brm\b)[^|;&]*\.ac\.(spec|e2e-spec|test)\.tsx?/;
const GIT_MUTATION = /\bgit\s+(add|commit|push|stash|reset|rebase|merge|restore|clean|cherry-pick|revert|am|apply|checkout\s+--)\b/;

function deny(reason) {
  process.stdout.write(
    JSON.stringify({
      hookSpecificOutput: {
        hookEventName: "PreToolUse",
        permissionDecision: "deny",
        permissionDecisionReason: reason,
      },
    }),
  );
  process.exit(0);
}

let raw = "";
for await (const chunk of process.stdin) raw += chunk;
const input = JSON.parse(raw || "{}");

// Main session: nothing to do here.
if (!input.agent_id) process.exit(0);

const agent = input.agent_type ?? "";
const tool = input.tool_name ?? "";
const toolInput = input.tool_input ?? {};
const root = process.env.CLAUDE_PROJECT_DIR || input.cwd || process.cwd();

if (tool === "Bash") {
  const cmd = String(toolInput.command ?? "");
  if (GIT_MUTATION.test(cmd)) {
    deny("Subagents never change git state (AGENTS.md §3). Leave changes uncommitted; the owner reviews first.");
  }
  if (agent in IMPLEMENTER_APP && AC_WRITE_IN_BASH.test(cmd)) {
    deny("Implementers must not modify acceptance tests (*.ac.*). Report FAILED or BLOCKED instead (AGENTS.md §5).");
  }
  process.exit(0);
}

if (FILE_TOOLS.has(tool) && agent in IMPLEMENTER_APP) {
  const target = toolInput.file_path ?? toolInput.notebook_path ?? "";
  const rel = path.relative(root, path.resolve(root, target)).split(path.sep).join("/");
  const app = IMPLEMENTER_APP[agent];

  if (AC_FILE.test(rel)) {
    deny("Implementers must not modify acceptance tests (*.ac.*). Report FAILED or BLOCKED instead (AGENTS.md §5).");
  }
  if (!(rel.startsWith(`${app}/`) || rel.startsWith("tasks/"))) {
    deny(`${agent} may only edit ${app}/ and its task file under tasks/ (AGENTS.md §4). To change ${rel}, report BLOCKED.`);
  }
}

process.exit(0);
