#!/usr/bin/env bash
set -euo pipefail
ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"
SRC="$ROOT_DIR/som_cache.cu"
OUT_DIR="$ROOT_DIR/build"
mkdir -p "$OUT_DIR"

echo "Building som_cache (auto-detect CUDA)..."

if command -v nvcc >/dev/null 2>&1; then
  echo "nvcc found: $(nvcc --version | head -n1)"
  echo "Attempting CUDA build with nvcc..."
  if nvcc -c "$SRC" -o "$OUT_DIR/som_cache_cuda.o" --compiler-options '-fPIC'; then
    echo "Compiled with nvcc -> $OUT_DIR/som_cache_cuda.o"
    exit 0
  else
    echo "nvcc compile failed or CUDA toolkit incomplete. Falling back to CPU-only build."
  fi
else
  echo "nvcc not found in PATH."
fi

# Fallback: compile as C++ with NO_CUDA
echo "Compiling CPU-only object (g++)..."
g++ -std=c++17 -O2 -DNO_CUDA -fPIC -c "$SRC" -o "$OUT_DIR/som_cache_cpu.o" -x c++
echo "Compiled CPU-only -> $OUT_DIR/som_cache_cpu.o"
echo "If you need CUDA, install CUDA toolkit and/or set CUDA_PATH and re-run the script."
