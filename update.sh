#!/bin/sh
# ==============================================================================
# grammY Skills Auto-Updater & Synchronizer
# ==============================================================================

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

if command -v node >/dev/null 2>&1; then
  exec node "${SCRIPT_DIR}/update.mjs" "$@"
else
  echo "[Error] Node.js is required to run the auto-updater."
  exit 1
fi
