#!/usr/bin/env bash
set -e
HERE="$(cd "$(dirname "$0")" && pwd)"

# Prefer cmake if available (will auto-detect CUDA)
if command -v cmake >/dev/null 2>&1; then
  mkdir -p build && cd build
  cmake .. -DCMAKE_BUILD_TYPE=Release
  cmake --build . --config Release
  exit 0
fi

# Fallback: simple detection of nvcc
if command -v nvcc >/dev/null 2>&1; then
  echo "nvcc found -> building with nvcc"
  nvcc -O3 -arch=sm_75 -c som_cache.cu -o som_cache.o
  ar rcs libsom_cache.a som_cache.o
  exit 0
fi

# No CUDA toolchain found -> build CPU-only with g++
echo "No nvcc found -> building CPU-only (NO_CUDA)"
g++ -x c++ -O3 -DNO_CUDA -c som_cache.cu -o som_cache.o
ar rcs libsom_cache.a som_cache.o
echo "Built libsom_cache.a (CPU-only)."
