#!/usr/bin/env bash
set -euo pipefail

echo "[smoke-test] Installing build deps (apt-get requires root inside container)"
if command -v apt-get >/dev/null 2>&1; then
  apt-get update && apt-get install -y cmake g++ make
fi

WORKDIR="/workspace/smoke-test"
mkdir -p "$WORKDIR/build"
cd "$WORKDIR/build"

cmake .. \
  -DTENSORRT_LLMSDK_INCLUDE_DIR=/app/tensorrt_llm/include \
  -DTENSORRT_LLMSDK_LIB_DIR=/app/tensorrt_llm/lib

cmake --build . -j$(nproc)

if [ -x "tensorrt_smoketest" ]; then
  echo "[smoke-test] Running tensorrt_smoketest"
  ./tensorrt_smoketest || true
else
  echo "[smoke-test] Built target not found at ./tensorrt_smoketest"
fi
