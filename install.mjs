#!/usr/bin/env node

/**
 * Universal & Smart Node.js installer for grammY AI Agent Skill
 * Auto-detects installed coding agents to avoid creating unused directories.
 * Cross-platform compatible (Linux, macOS, Windows)
 */

import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { execSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SOURCE_DIR = path.join(__dirname, "grammy");
const HOME = os.homedir();
const CWD = process.cwd();

// Parse arguments
const args = process.argv.slice(2);
let scope = args.includes("-g") || args.includes("--global") ? "global" : null;
if (args.includes("-p") || args.includes("--project")) scope = "project";
if (args.includes("--both")) scope = "both";

const isSymlink = args.includes("-l") || args.includes("--link") || args.includes("--symlink");
const isUninstall = args.includes("-u") || args.includes("--uninstall");
const isStatus = args.includes("-s") || args.includes("--status");
const isForce = args.includes("-f") || args.includes("--force");

let agent = "auto";
const agentIdx = args.findIndex((a) => a === "-a" || a === "--agent");
if (agentIdx !== -1 && args[agentIdx + 1]) {
  agent = args[agentIdx + 1];
}

let projectPath = CWD;
const projIdx = args.findIndex((a) => a === "-p" || a === "--project");
if (projIdx !== -1 && args[projIdx + 1] && !args[projIdx + 1].startsWith("-")) {
  projectPath = path.resolve(args[projIdx + 1]);
}

function commandExists(cmd) {
  try {
    const checkCmd = process.platform === "win32" ? `where ${cmd}` : `command -v ${cmd}`;
    execSync(checkCmd, { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

function isAgentInstalled(agentName) {
  switch (agentName) {
    case "antigravity":
    case "gemini":
      return commandExists("agy") || commandExists("gemini") || fs.existsSync(path.join(HOME, ".gemini"));
    case "pi":
      return commandExists("pi") || fs.existsSync(path.join(HOME, ".pi", "agent")) || fs.existsSync(path.join(HOME, ".pi"));
    case "claude":
      return commandExists("claude") || fs.existsSync(path.join(HOME, ".claude.json")) || fs.existsSync(path.join(HOME, ".claude"));
    case "cursor":
      return commandExists("cursor") || fs.existsSync(path.join(HOME, ".cursor"));
    case "windsurf":
      return commandExists("windsurf") || fs.existsSync(path.join(HOME, ".codeium"));
    case "roo":
      return fs.existsSync(path.join(HOME, ".roo"));
    case "cline":
      return fs.existsSync(path.join(HOME, ".cline"));
    case "universal":
      return fs.existsSync(path.join(HOME, ".agents")) || fs.existsSync(path.join(HOME, ".skills"));
    default:
      return false;
  }
}

const GLOBAL_AGENT_MAP = {
  antigravity: [
    path.join(HOME, ".gemini", "config", "skills", "grammy"),
    path.join(HOME, ".gemini", "antigravity-cli", "skills", "grammy"),
  ],
  pi: [
    path.join(HOME, ".pi", "agent", "skills", "grammy"),
    path.join(HOME, ".pi", "skills", "grammy"),
  ],
  claude: [path.join(HOME, ".claude", "skills", "grammy")],
  cursor: [path.join(HOME, ".cursor", "skills", "grammy")],
  windsurf: [path.join(HOME, ".codeium", "windsurf", "skills", "grammy")],
  roo: [path.join(HOME, ".roo", "skills", "grammy")],
  cline: [path.join(HOME, ".cline", "skills", "grammy")],
  universal: [
    path.join(HOME, ".agents", "skills", "grammy"),
    path.join(HOME, ".skills", "grammy"),
  ],
};

function getGlobalTargets(targetAgent) {
  if (targetAgent === "auto" || targetAgent === "all") {
    const targets = [];
    for (const [key, paths] of Object.entries(GLOBAL_AGENT_MAP)) {
      if (isForce || isAgentInstalled(key)) {
        targets.push(...paths);
      }
    }
    return targets;
  }
  return GLOBAL_AGENT_MAP[targetAgent] || [];
}

function getProjectTargets(targetAgent, baseDir) {
  const map = {
    antigravity: [
      path.join(baseDir, ".agents", "skills", "grammy"),
      path.join(baseDir, ".agent", "skills", "grammy"),
    ],
    pi: [path.join(baseDir, ".pi", "skills", "grammy")],
    claude: [path.join(baseDir, ".claude", "skills", "grammy")],
    cursor: [path.join(baseDir, ".cursor", "skills", "grammy")],
    windsurf: [path.join(baseDir, ".windsurf", "skills", "grammy")],
    roo: [path.join(baseDir, ".roo", "skills", "grammy")],
    cline: [path.join(baseDir, ".cline", "skills", "grammy")],
    universal: [
      path.join(baseDir, ".agents", "skills", "grammy"),
      path.join(baseDir, ".skills", "grammy"),
    ],
  };

  if (targetAgent === "auto" || targetAgent === "all") {
    const targets = [];
    let foundInProject = false;

    if (fs.existsSync(path.join(baseDir, ".agents")) || fs.existsSync(path.join(baseDir, ".agent"))) {
      targets.push(...map.antigravity);
      foundInProject = true;
    }
    if (fs.existsSync(path.join(baseDir, ".pi"))) {
      targets.push(...map.pi);
      foundInProject = true;
    }
    if (fs.existsSync(path.join(baseDir, ".claude"))) {
      targets.push(...map.claude);
      foundInProject = true;
    }
    if (fs.existsSync(path.join(baseDir, ".cursor"))) {
      targets.push(...map.cursor);
      foundInProject = true;
    }
    if (fs.existsSync(path.join(baseDir, ".windsurf"))) {
      targets.push(...map.windsurf);
      foundInProject = true;
    }
    if (fs.existsSync(path.join(baseDir, ".roo"))) {
      targets.push(...map.roo);
      foundInProject = true;
    }
    if (fs.existsSync(path.join(baseDir, ".cline"))) {
      targets.push(...map.cline);
      foundInProject = true;
    }

    if (!foundInProject) {
      for (const [key, paths] of Object.entries(map)) {
        if (isForce || isAgentInstalled(key)) {
          targets.push(...paths);
          foundInProject = true;
        }
      }
      if (!foundInProject) {
        targets.push(path.join(baseDir, ".agents", "skills", "grammy"));
      }
    }
    return targets;
  }

  return map[targetAgent] || [];
}

function installTarget(destPath, symlink) {
  fs.mkdirSync(path.dirname(destPath), { recursive: true });
  if (fs.existsSync(destPath) || fs.lstatSync(destPath).isSymbolicLink?.()) {
    fs.rmSync(destPath, { recursive: true, force: true });
  }

  if (symlink) {
    fs.symlinkSync(SOURCE_DIR, destPath, "junction");
    console.log(`  ✔ Linked  -> ${destPath}`);
  } else {
    fs.cpSync(SOURCE_DIR, destPath, { recursive: true });
    console.log(`  ✔ Copied  -> ${destPath}`);
  }
}

function uninstallTarget(destPath) {
  if (fs.existsSync(destPath) || fs.lstatSync(destPath).isSymbolicLink?.()) {
    fs.rmSync(destPath, { recursive: true, force: true });
    console.log(`  ✖ Removed -> ${destPath}`);
  }
}

function printStatus() {
  console.log("\n--- Detected AI Coding Agents on System ---\n");
  const agentsList = ["antigravity", "pi", "claude", "cursor", "windsurf", "roo", "cline", "universal"];
  for (const a of agentsList) {
    if (isAgentInstalled(a)) {
      console.log(`  ✔ ${a}: Detected on system`);
    } else {
      console.log(`  ○ ${a}: Not installed / not detected`);
    }
  }

  console.log("\n--- Active Skill Installation Footprint ---\n");
  console.log("Global Locations (Detected Agents):");
  for (const t of getGlobalTargets("auto")) {
    try {
      const stat = fs.lstatSync(t);
      if (stat.isSymbolicLink()) {
        console.log(`  [Installed (Symlink)] ${t} -> ${fs.readlinkSync(t)}`);
      } else if (stat.isDirectory()) {
        console.log(`  [Installed (Copy)]    ${t}`);
      }
    } catch {
      console.log(`  [Not Installed]       ${t}`);
    }
  }

  console.log(`\nCurrent Project (${projectPath}):`);
  for (const t of getProjectTargets("auto", projectPath)) {
    try {
      const stat = fs.lstatSync(t);
      if (stat.isSymbolicLink()) {
        console.log(`  [Installed (Symlink)] ${t} -> ${fs.readlinkSync(t)}`);
      } else if (stat.isDirectory()) {
        console.log(`  [Installed (Copy)]    ${t}`);
      }
    } catch {
      console.log(`  [Not Installed]       ${t}`);
    }
  }
  console.log("");
}

// Execute
if (isStatus) {
  printStatus();
  process.exit(0);
}

if (!scope) {
  scope = "global";
}

console.log(
  `\n${isUninstall ? "Uninstalling" : "Installing"} grammY skill (Scope: ${scope}, Agent: ${agent}, Mode: ${isSymlink ? "symlink" : "copy"})...`
);

if (scope === "global" || scope === "both") {
  console.log("\nProcessing Global Locations (Detected Agents):");
  const targets = getGlobalTargets(agent);
  if (targets.length === 0) {
    console.log("  No installed agents detected for global setup. Use -a <agent_name> or -f to force.");
  } else {
    for (const target of targets) {
      if (isUninstall) uninstallTarget(target);
      else installTarget(target, isSymlink);
    }
  }
}

if (scope === "project" || scope === "both") {
  console.log(`\nProcessing Project Locations (${projectPath}):`);
  const targets = getProjectTargets(agent, projectPath);
  for (const target of targets) {
    if (isUninstall) uninstallTarget(target);
    else installTarget(target, isSymlink);
  }
}

console.log("\n✨ Done!\n");
