#!/usr/bin/env bash

# Launches the Phase H+ adaptive bridge stack with GPU diagnostics, build, and compose up.
# Usage:
#   ./run_adaptive_stack.sh [--skip-diagnostics] [-- [additional docker compose up args]]
#
# Examples:
#   ./run_adaptive_stack.sh
#   ./run_adaptive_stack.sh --skip-diagnostics -- -d        # skip checks, run detached

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
pushd "$ROOT_DIR" >/dev/null

SERVICES=(
  analytics-bridge
  behavior-router
  qlora-trainer
  adapter-merge-worker
  cpu-synthesizer
  triton
)

SKIP_DIAGNOSTICS=0
UP_ARGS=()

while [[ $# -gt 0 ]]; do
  case "$1" in
    --skip-diagnostics)
      SKIP_DIAGNOSTICS=1
      shift
      ;;
    --)
      shift
      UP_ARGS=("$@")
      break
      ;;
    *)
      UP_ARGS+=("$1")
      shift
      ;;
  esac
done

if [[ $SKIP_DIAGNOSTICS -eq 0 ]]; then
  echo "==> Running GPU diagnostics..."
  if ! ./native/autoencoder/scripts/gpu-diagnostics.sh; then
    echo "GPU diagnostics reported an issue. Re-run with --skip-diagnostics to bypass this check." >&2
    exit 1
  fi
else
  echo "==> Skipping GPU diagnostics (per flag)."
fi

echo "==> Building services: ${SERVICES[*]}"
docker compose build "${SERVICES[@]}"

echo "==> Starting services (Ctrl+C to stop)..."
docker compose up "${UP_ARGS[@]}" "${SERVICES[@]}"

popd >/dev/null
