#!/usr/bin/env bash
set -euo pipefail
ROOT="${DRAMAEDITOR_ROOT:-/Volumes/YANG/DramaEditor}"
cd "$ROOT"
while true; do
  node scripts/runLocalLoop.mjs >> logs/local_loop_stdout.log 2>> logs/local_loop_stderr.log || true
  sleep 86400
done
