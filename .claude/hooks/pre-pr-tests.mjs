#!/usr/bin/env node

/**
 * PreToolUse hook: runs typecheck + tests before PR creation.
 * Triggers on:
 *   - mcp__github__create_pull_request (MCP tool)
 *   - Bash calls containing "gh pr create"
 */

import { execFileSync } from "node:child_process";

const PROJECT_DIR = process.cwd();

let input = "";
for await (const chunk of process.stdin) {
  input += chunk;
}

const hook = JSON.parse(input);
const toolName = hook.tool_name;

// Match Bash calls that run `gh pr create`
if (toolName === "Bash") {
  const cmd = hook.tool_input?.command ?? "";
  if (!cmd.includes("gh pr create")) {
    process.exit(0);
  }
}

// If we get here, it's either mcp__github__create_pull_request or a gh pr create Bash call
console.error("Running checks before PR creation...");

const suites = [
  { name: "typecheck", args: ["typecheck"] },
  { name: "test", args: ["test"] },
];

const failures = [];

for (const suite of suites) {
  console.error(`Running ${suite.name}...`);
  try {
    execFileSync("pnpm", suite.args, {
      cwd: PROJECT_DIR,
      stdio: ["ignore", "pipe", "pipe"],
      timeout: 300_000,
    });
    console.error(`${suite.name} passed.`);
  } catch (error) {
    const stderr = error.stderr?.toString().slice(-2000) ?? "";
    const stdout = error.stdout?.toString().slice(-2000) ?? "";
    failures.push({ name: suite.name, stderr, stdout });
  }
}

if (failures.length > 0) {
  const details = failures
    .map((f) => `### ${f.name} failed\n\`\`\`\n${f.stdout || f.stderr}\n\`\`\``)
    .join("\n\n");

  const result = {
    hookSpecificOutput: {
      hookEventName: "PreToolUse",
      permissionDecision: "deny",
      permissionDecisionReason: `Checks failed — fix before creating PR.\n\n${details}`,
    },
  };
  console.log(JSON.stringify(result));
  process.exit(0);
}

console.error("All checks passed. Proceeding with PR creation.");
process.exit(0);
