#!/bin/sh
# ==============================================================================
# grammY Skill Smart & Universal Installer for AI Coding Agents
# Detects installed agents automatically to avoid creating unused folders.
# Supports: Antigravity / Gemini CLI, Pi Coding Agent, Claude Code, Cursor,
#           Windsurf, Roo/Cline, and Universal Agent standards.
# ==============================================================================

# Re-execute with bash if not already running in bash
if [ -z "${BASH_VERSION:-}" ]; then
  if command -v bash >/dev/null 2>&1; then
    exec bash "$0" "$@"
  fi
fi

set -euo pipefail

# Colors
BOLD="\033[1m"
GREEN="\033[0;32m"
BLUE="\033[0;34m"
CYAN="\033[0;36m"
YELLOW="\033[1;33m"
RED="\033[0;31m"
DIM="\033[2m"
RESET="\033[0m"

# Script Directory and Source Skill Directory
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
SOURCE_SKILL_DIR="${SCRIPT_DIR}/grammy"

if [ ! -d "${SOURCE_SKILL_DIR}" ] || [ ! -f "${SOURCE_SKILL_DIR}/SKILL.md" ]; then
  echo -e "${RED}[Error] Could not find grammy skill source at: ${SOURCE_SKILL_DIR}${RESET}"
  exit 1
fi

# Options
SCOPE=""             # "global", "project", or "both"
TARGET_AGENT="auto"  # "auto", "all", "antigravity", "pi", "claude", "cursor", "windsurf", "roo", "cline", "universal"
INSTALL_MODE="copy"  # "copy" or "symlink"
PROJECT_PATH="$(pwd)"
UNINSTALL=false
SHOW_STATUS=false
FORCE_ALL=false

# Help menu
show_help() {
  cat << EOH
${BOLD}grammY Skill Smart Installer${RESET}

${BOLD}USAGE:${RESET}
  ./install.sh [OPTIONS]
  bash install.sh [OPTIONS]

${BOLD}OPTIONS:${RESET}
  -g, --global              Install globally (auto-detects installed agents only)
  -p, --project [PATH]      Install into project directory (default: current directory)
  -a, --agent <NAME>        Target specific agent: antigravity, pi, claude, cursor, windsurf, roo, cline, universal, all
  -l, --link                Use symbolic links instead of copying (recommended for active development)
  -f, --force               Force installation even if the agent is not detected on the machine
  -u, --uninstall           Remove grammY skill from target locations
  -s, --status              Check installation status across detected agent environments
  -h, --help                Show this help message

${BOLD}SUPPORTED AGENTS:${RESET}
  • antigravity / gemini    (Google Antigravity & Gemini CLI)
  • pi                      (Pi Coding Agent - @earendil-works/pi-coding-agent)
  • claude                  (Anthropic Claude Code)
  • cursor                  (Cursor IDE)
  • windsurf                (Windsurf / Codeium Cascade)
  • roo / cline             (Roo Code & Cline extensions)
  • universal               (Standard .agents/ and .skills/ specs)

${BOLD}EXAMPLES:${RESET}
  ./install.sh --global                     # Auto-detect installed agents & install globally
  ./install.sh -g -a pi                     # Install specifically for Pi Coding Agent
  ./install.sh -g -a antigravity            # Install specifically for Antigravity / Gemini
  ./install.sh -p                           # Install into current project for detected agents
  ./install.sh -g -l                        # Install globally as symlinks for live updates
  ./install.sh --status                     # View current installation footprint
  ./install.sh --uninstall -g               # Remove all global installations
EOH
}

# Parse Command-Line Arguments
while [ $# -gt 0 ]; do
  case $1 in
    -g|--global)
      SCOPE="global"
      shift
      ;;
    -p|--project)
      SCOPE="project"
      if [ $# -gt 1 ] && [ "${2#-}" = "$2" ]; then
        PROJECT_PATH="$(cd "$2" 2>/dev/null && pwd || echo "$2")"
        shift
      fi
      shift
      ;;
    -a|--agent)
      TARGET_AGENT="$2"
      shift 2
      ;;
    -l|--link|--symlink)
      INSTALL_MODE="symlink"
      shift
      ;;
    -f|--force)
      FORCE_ALL=true
      shift
      ;;
    -u|--uninstall)
      UNINSTALL=true
      shift
      ;;
    -s|--status)
      SHOW_STATUS=true
      shift
      ;;
    -h|--help)
      show_help
      exit 0
      ;;
    *)
      echo -e "${RED}[Error] Unknown argument: $1${RESET}"
      show_help
      exit 1
      ;;
  esac
done

# Agent Detection Functions
is_agent_installed() {
  local agent="$1"
  case "$agent" in
    antigravity|gemini)
      command -v agy >/dev/null 2>&1 || command -v gemini >/dev/null 2>&1 || [ -d "${HOME}/.gemini" ]
      ;;
    pi)
      command -v pi >/dev/null 2>&1 || [ -d "${HOME}/.pi/agent" ] || [ -d "${HOME}/.pi" ]
      ;;
    claude)
      command -v claude >/dev/null 2>&1 || [ -f "${HOME}/.claude.json" ] || [ -d "${HOME}/.claude" ]
      ;;
    cursor)
      command -v cursor >/dev/null 2>&1 || [ -d "${HOME}/.cursor" ]
      ;;
    windsurf)
      command -v windsurf >/dev/null 2>&1 || [ -d "${HOME}/.codeium" ]
      ;;
    roo)
      [ -d "${HOME}/.roo" ]
      ;;
    cline)
      [ -d "${HOME}/.cline" ]
      ;;
    universal)
      [ -d "${HOME}/.agents" ] || [ -d "${HOME}/.skills" ]
      ;;
    *)
      false
      ;;
  esac
}

# Resolve Global Target Directories for Agents
get_global_targets() {
  local agent="$1"
  local targets=()

  add_agent_global() {
    local a="$1"
    case "$a" in
      antigravity|gemini)
        targets+=("${HOME}/.gemini/config/skills/grammy")
        targets+=("${HOME}/.gemini/antigravity-cli/skills/grammy")
        ;;
      pi)
        targets+=("${HOME}/.pi/agent/skills/grammy")
        targets+=("${HOME}/.pi/skills/grammy")
        ;;
      claude)
        targets+=("${HOME}/.claude/skills/grammy")
        ;;
      cursor)
        targets+=("${HOME}/.cursor/skills/grammy")
        ;;
      windsurf)
        targets+=("${HOME}/.codeium/windsurf/skills/grammy")
        ;;
      roo)
        targets+=("${HOME}/.roo/skills/grammy")
        ;;
      cline)
        targets+=("${HOME}/.cline/skills/grammy")
        ;;
      universal)
        targets+=("${HOME}/.agents/skills/grammy")
        targets+=("${HOME}/.skills/grammy")
        ;;
    esac
  }

  if [ "$agent" = "auto" ] || [ "$agent" = "all" ]; then
    local checked_agents=("antigravity" "pi" "claude" "cursor" "windsurf" "roo" "cline" "universal")
    for a in "${checked_agents[@]}"; do
      if [ "$FORCE_ALL" = true ] || is_agent_installed "$a"; then
        add_agent_global "$a"
      fi
    done
  else
    add_agent_global "$agent"
  fi

  echo "${targets[@]}"
}

# Resolve Project Target Directories for Agents
get_project_targets() {
  local agent="$1"
  local base_dir="$2"
  local targets=()

  add_agent_project() {
    local a="$1"
    case "$a" in
      antigravity|gemini)
        targets+=("${base_dir}/.agents/skills/grammy")
        targets+=("${base_dir}/.agent/skills/grammy")
        ;;
      pi)
        targets+=("${base_dir}/.pi/skills/grammy")
        ;;
      claude)
        targets+=("${base_dir}/.claude/skills/grammy")
        ;;
      cursor)
        targets+=("${base_dir}/.cursor/skills/grammy")
        ;;
      windsurf)
        targets+=("${base_dir}/.windsurf/skills/grammy")
        ;;
      roo)
        targets+=("${base_dir}/.roo/skills/grammy")
        ;;
      cline)
        targets+=("${base_dir}/.cline/skills/grammy")
        ;;
      universal)
        targets+=("${base_dir}/.agents/skills/grammy")
        targets+=("${base_dir}/.skills/grammy")
        ;;
    esac
  }

  if [ "$agent" = "auto" ] || [ "$agent" = "all" ]; then
    # Check if project has existing agent directories
    local found_in_project=false
    local all_agents=("antigravity" "pi" "claude" "cursor" "windsurf" "roo" "cline")
    
    # If project already has folders like .agents, .pi, etc.
    [ -d "${base_dir}/.agents" ] || [ -d "${base_dir}/.agent" ] && { add_agent_project "antigravity"; found_in_project=true; }
    [ -d "${base_dir}/.pi" ] && { add_agent_project "pi"; found_in_project=true; }
    [ -d "${base_dir}/.claude" ] && { add_agent_project "claude"; found_in_project=true; }
    [ -d "${base_dir}/.cursor" ] && { add_agent_project "cursor"; found_in_project=true; }
    [ -d "${base_dir}/.windsurf" ] && { add_agent_project "windsurf"; found_in_project=true; }
    [ -d "${base_dir}/.roo" ] && { add_agent_project "roo"; found_in_project=true; }
    [ -d "${base_dir}/.cline" ] && { add_agent_project "cline"; found_in_project=true; }
    [ -d "${base_dir}/.skills" ] && { targets+=("${base_dir}/.skills/grammy"); found_in_project=true; }

    # If no agent directories exist in project yet, fallback to detected agents on system
    if [ "$found_in_project" = false ]; then
      for a in "${all_agents[@]}"; do
        if [ "$FORCE_ALL" = true ] || is_agent_installed "$a"; then
          add_agent_project "$a"
          found_in_project=true
        fi
      done
      # If nothing detected at all, default to universal standard
      if [ "$found_in_project" = false ]; then
        targets+=("${base_dir}/.agents/skills/grammy")
      fi
    fi
  else
    add_agent_project "$agent"
  fi

  echo "${targets[@]}"
}

# Installation Logic
install_to_destination() {
  local dest="$1"
  local mode="$2"
  local parent_dir
  parent_dir="$(dirname "$dest")"

  mkdir -p "$parent_dir"

  # Clean existing destination if present
  if [ -L "$dest" ] || [ -d "$dest" ] || [ -f "$dest" ]; then
    rm -rf "$dest"
  fi

  if [ "$mode" = "symlink" ]; then
    ln -s "$SOURCE_SKILL_DIR" "$dest"
    echo -e "  ${GREEN}✔${RESET} Linked -> ${CYAN}${dest}${RESET}"
  else
    cp -R "$SOURCE_SKILL_DIR" "$dest"
    echo -e "  ${GREEN}✔${RESET} Copied -> ${CYAN}${dest}${RESET}"
  fi
}

# Uninstallation Logic
uninstall_from_destination() {
  local dest="$1"
  if [ -L "$dest" ] || [ -d "$dest" ]; then
    rm -rf "$dest"
    echo -e "  ${YELLOW}✖${RESET} Removed -> ${CYAN}${dest}${RESET}"
  fi
}

# Status Check
check_status() {
  echo -e "\n${BOLD}${CYAN}--- Detected AI Coding Agents on Machine ---${RESET}\n"
  
  local agents_list=("antigravity" "pi" "claude" "cursor" "windsurf" "roo" "cline" "universal")
  for a in "${agents_list[@]}"; do
    if is_agent_installed "$a"; then
      echo -e "  ${GREEN}✔${RESET} ${BOLD}${a}${RESET}: Detected on system"
    else
      echo -e "  ${DIM}○ ${a}: Not installed / not detected${RESET}"
    fi
  done

  echo -e "\n${BOLD}${CYAN}--- Active Skill Installation Footprint ---${RESET}\n"
  
  echo -e "${BOLD}Global Locations (Detected Agents):${RESET}"
  local global_locs=()
  for a in "${agents_list[@]}"; do
    if [ "$FORCE_ALL" = true ] || is_agent_installed "$a"; then
      for target in $(get_global_targets "$a"); do
        global_locs+=("$target")
      done
    fi
  done

  for target in "${global_locs[@]}"; do
    if [ -L "$target" ]; then
      echo -e "  ${GREEN}[Installed (Symlink)]${RESET} $target -> $(readlink "$target")"
    elif [ -d "$target" ]; then
      echo -e "  ${GREEN}[Installed (Copy)]${RESET}    $target"
    else
      echo -e "  ${YELLOW}[Not Installed]${RESET}       $target"
    fi
  done

  echo -e "\n${BOLD}Project Locations (${PROJECT_PATH}):${RESET}"
  for target in $(get_project_targets "auto" "$PROJECT_PATH"); do
    if [ -L "$target" ]; then
      echo -e "  ${GREEN}[Installed (Symlink)]${RESET} $target -> $(readlink "$target")"
    elif [ -d "$target" ]; then
      echo -e "  ${GREEN}[Installed (Copy)]${RESET}    $target"
    else
      echo -e "  ${YELLOW}[Not Installed]${RESET}       $target"
    fi
  done
  echo ""
}

# Main Execution Flow
if [ "$SHOW_STATUS" = true ]; then
  check_status
  exit 0
fi

# Interactive Menu if no scope specified
if [ -z "$SCOPE" ]; then
  echo -e "\n${BOLD}${CYAN}=== grammY Skill Smart Installer ===${RESET}\n"
  echo -e "Source Skill: ${BLUE}${SOURCE_SKILL_DIR}${RESET}\n"

  echo -e "${BOLD}Detected Agents on this machine:${RESET}"
  for a in "antigravity" "pi" "claude" "cursor" "windsurf" "roo" "cline"; do
    if is_agent_installed "$a"; then
      echo -e "  ${GREEN}✔${RESET} ${BOLD}${a}${RESET}"
    fi
  done
  echo ""

  echo -e "Choose installation scope:"
  echo -e "  ${BOLD}1)${RESET} Global (Detected Agents Only - Recommended)"
  echo -e "  ${BOLD}2)${RESET} Current Project (${PROJECT_PATH})"
  echo -e "  ${BOLD}3)${RESET} Both Global and Current Project"
  echo -e "  ${BOLD}4)${RESET} Custom Project Path"
  echo -e "  ${BOLD}5)${RESET} Check Installation Status"
  echo -e "  ${BOLD}6)${RESET} Uninstall"
  echo ""
  read -rp "Enter choice [1-6] (default: 1): " choice
  choice="${choice:-1}"

  case "$choice" in
    1) SCOPE="global" ;;
    2) SCOPE="project" ;;
    3) SCOPE="both" ;;
    4)
      SCOPE="project"
      read -rp "Enter target project directory path: " custom_p
      PROJECT_PATH="$(cd "$custom_p" 2>/dev/null && pwd || echo "$custom_p")"
      ;;
    5)
      check_status
      exit 0
      ;;
    6)
      UNINSTALL=true
      read -rp "Uninstall from (1) Global, (2) Project, (3) Both? [1-3]: " uchoice
      case "$uchoice" in
        1) SCOPE="global" ;;
        2) SCOPE="project" ;;
        *) SCOPE="both" ;;
      esac
      ;;
    *) SCOPE="global" ;;
  esac

  if [ "$UNINSTALL" = false ]; then
    echo -e "\nTarget Agent Selection:"
    echo -e "  ${BOLD}1)${RESET} Auto-Detect Installed Agents (Recommended)"
    echo -e "  ${BOLD}2)${RESET} Pi Coding Agent"
    echo -e "  ${BOLD}3)${RESET} Antigravity / Gemini CLI"
    echo -e "  ${BOLD}4)${RESET} Claude Code"
    echo -e "  ${BOLD}5)${RESET} Cursor"
    echo -e "  ${BOLD}6)${RESET} Windsurf"
    echo -e "  ${BOLD}7)${RESET} Roo Code / Cline"
    echo -e "  ${BOLD}8)${RESET} Universal / Standard (.agents/skills)"
    read -rp "Enter choice [1-8] (default: 1): " achoice
    case "$achoice" in
      2) TARGET_AGENT="pi" ;;
      3) TARGET_AGENT="antigravity" ;;
      4) TARGET_AGENT="claude" ;;
      5) TARGET_AGENT="cursor" ;;
      6) TARGET_AGENT="windsurf" ;;
      7) TARGET_AGENT="roo" ;;
      8) TARGET_AGENT="universal" ;;
      *) TARGET_AGENT="auto" ;;
    esac

    echo -e "\nChoose install mode:"
    echo -e "  ${BOLD}1)${RESET} Copy files (Isolated & standalone - default)"
    echo -e "  ${BOLD}2)${RESET} Symlink (Live sync with repository source)"
    read -rp "Enter choice [1-2] (default: 1): " mchoice
    if [ "$mchoice" = "2" ]; then
      INSTALL_MODE="symlink"
    fi
  fi
fi

# Execute Installation or Uninstallation
echo ""
if [ "$UNINSTALL" = true ]; then
  echo -e "${BOLD}${YELLOW}Uninstalling grammY skill...${RESET}"
else
  echo -e "${BOLD}${GREEN}Installing grammY skill (Mode: ${INSTALL_MODE}, Target Agent: ${TARGET_AGENT})...${RESET}"
fi

# Process Global Targets
if [ "$SCOPE" = "global" ] || [ "$SCOPE" = "both" ]; then
  echo -e "\n${BOLD}Processing Global Locations:${RESET}"
  local_targets=($(get_global_targets "$TARGET_AGENT"))
  if [ ${#local_targets[@]} -eq 0 ]; then
    echo -e "  ${YELLOW}No installed agents detected for global setup.${RESET}"
    echo -e "  ${DIM}Use -a <agent_name> or -f/--force to install explicitly.${RESET}"
  else
    for target in "${local_targets[@]}"; do
      if [ "$UNINSTALL" = true ]; then
        uninstall_from_destination "$target"
      else
        install_to_destination "$target" "$INSTALL_MODE"
      fi
    done
  fi
fi

# Process Project Targets
if [ "$SCOPE" = "project" ] || [ "$SCOPE" = "both" ]; then
  echo -e "\n${BOLD}Processing Project Locations (${PROJECT_PATH}):${RESET}"
  proj_targets=($(get_project_targets "$TARGET_AGENT" "$PROJECT_PATH"))
  if [ ${#proj_targets[@]} -eq 0 ]; then
    echo -e "  ${YELLOW}No project target locations resolved.${RESET}"
  else
    for target in "${proj_targets[@]}"; do
      if [ "$UNINSTALL" = true ]; then
        uninstall_from_destination "$target"
      else
        install_to_destination "$target" "$INSTALL_MODE"
      fi
    done
  fi
fi

echo -e "\n${BOLD}${GREEN}✨ Done!${RESET}\n"
