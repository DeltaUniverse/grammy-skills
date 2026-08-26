#!/usr/bin/env node

/**
 * Auto-Updater and Synchronizer for grammY AI Agent Skills
 * 
 * Features:
 * 1. Pulls latest commits from Git remote (git pull origin main)
 * 2. Checks npm & JSR registries for newly released grammY versions
 * 3. Auto-syncs/repairs symlinks across all detected AI coding agents
 * 4. Can be run manually or as a background cron job
 */

import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { execSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = __dirname;
const SOURCE_DIR = path.join(ROOT_DIR, "grammy");
const HOME = os.homedir();

// ANSI Colors
const RESET = "\x1b[0m";
const BOLD = "\x1b[1m";
const GREEN = "\x1b[32m";
const CYAN = "\x1b[36m";
const YELLOW = "\x1b[33m";
const RED = "\x1b[31m";
const DIM = "\x1b[2m";

function log(msg) {
  console.log(msg);
}

function runCmd(cmd, cwd = ROOT_DIR) {
  try {
    return execSync(cmd, { cwd, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();
  } catch (err) {
    return null;
  }
}

async function fetchJson(url, timeoutMs = 5000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
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

const AGENT_TARGETS = {
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

async function main() {
  log(`\n${BOLD}${CYAN}=== grammY Skills Auto-Updater & Synchronizer ===${RESET}\n`);

  // 1. Pull Git Updates
  log(`${BOLD}1. Checking Git Repository Updates...${RESET}`);
  const isGitRepo = fs.existsSync(path.join(ROOT_DIR, ".git"));
  if (isGitRepo) {
    const gitPull = runCmd("git pull --ff-only origin main");
    if (gitPull) {
      if (gitPull.includes("Already up to date")) {
        log(`  ${GREEN}✔${RESET} Repository is already up to date with origin/main.`);
      } else {
        log(`  ${GREEN}✔${RESET} Successfully pulled updates:\n    ${DIM}${gitPull.replace(/\n/g, "\n    ")}${RESET}`);
      }
    } else {
      log(`  ${YELLOW}⚠ Could not fetch from origin (offline or uncommitted changes). Skipping git pull.${RESET}`);
    }
  } else {
    log(`  ${DIM}○ Not a git repository, skipping git pull.${RESET}`);
  }

  // 2. Check Online Registries (npm & JSR)
  log(`\n${BOLD}2. Checking grammY Release Registries...${RESET}`);
  
  let currentMeta = {};
  const metaPath = path.join(SOURCE_DIR, "references", "_meta.json");
  try {
    currentMeta = JSON.parse(fs.readFileSync(metaPath, "utf8"));
  } catch {}

  const currentVerified = currentMeta.verified_version || "1.45.1";
  log(`  Current Verified Version in Skills: ${BOLD}${currentVerified}${RESET}`);

  // Fetch npm
  const npmData = await fetchJson("https://registry.npmjs.org/grammy/latest");
  const npmLatest = npmData?.version || null;
  if (npmLatest) {
    if (npmLatest === currentVerified) {
      log(`  ${GREEN}✔${RESET} npm stable: ${BOLD}${npmLatest}${RESET} (Fully aligned)`);
    } else {
      log(`  ${YELLOW}⚡ New npm release detected: ${BOLD}${npmLatest}${RESET} (Current: ${currentVerified})`);
    }
  } else {
    log(`  ${DIM}○ npm registry check skipped (network offline).${RESET}`);
  }

  // Fetch JSR (v2 beta)
  const jsrData = await fetchJson("https://jsr.io/@grammyjs/grammy/meta.json");
  const jsrLatest = jsrData?.latest || (jsrData?.versions ? Object.keys(jsrData.versions).pop() : null);
  if (jsrLatest) {
    log(`  ${CYAN}ℹ${RESET} JSR v2 roadmap: ${BOLD}${jsrLatest}${RESET}`);
  }

  // 3. Auto-Repair and Synchronize Symlinks
  log(`\n${BOLD}3. Synchronizing Agent Symlinks across System...${RESET}`);
  let syncedCount = 0;

  for (const [agentName, targets] of Object.entries(AGENT_TARGETS)) {
    if (isAgentInstalled(agentName)) {
      for (const dest of targets) {
        try {
          fs.mkdirSync(path.dirname(dest), { recursive: true });
          
          let needsLink = true;
          if (fs.existsSync(dest) || fs.lstatSync(dest).isSymbolicLink?.()) {
            const stat = fs.lstatSync(dest);
            if (stat.isSymbolicLink()) {
              const currentLink = fs.readlinkSync(dest);
              if (path.resolve(path.dirname(dest), currentLink) === SOURCE_DIR) {
                needsLink = false; // Already perfectly linked
              } else {
                fs.unlinkSync(dest);
              }
            } else {
              // Replace folder with symlink for zero-latency live sync
              fs.rmSync(dest, { recursive: true, force: true });
            }
          }

          if (needsLink) {
            fs.symlinkSync(SOURCE_DIR, dest, "junction");
            log(`  ${GREEN}✔ Linked${RESET} -> ${CYAN}${dest}${RESET}`);
            syncedCount++;
          } else {
            log(`  ${GREEN}✔ Active${RESET} -> ${DIM}${dest}${RESET}`);
          }
        } catch (err) {
          log(`  ${RED}✖ Failed to link ${dest}:${RESET} ${err.message}`);
        }
      }
    }
  }

  log(`\n${BOLD}${GREEN}✨ Auto-update and synchronization complete!${RESET}`);
  if (syncedCount > 0) {
    log(`  Linked ${syncedCount} agent directories to live repository source.`);
  }
  log(`  All changes to ${CYAN}${SOURCE_DIR}${RESET} are live immediately.\n`);
}

main().catch((err) => {
  console.error("Update failed:", err);
  process.exit(1);
});
