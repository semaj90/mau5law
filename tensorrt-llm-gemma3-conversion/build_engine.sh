#!/usr/bin/env bash
set -euo pipefail
if [ $# -lt 3 ]; then
  echo "Usage: $0 <converted_dir> <engine_out_dir> <profile:int4|fp8|fp16> [max_batch=1] [max_input_tokens=4096]" >&2
  exit 1
fi
CONVERTED="$1"; shift
OUT="$1"; shift
PROFILE="$1"; shift
MAX_BATCH="${1:-1}"; shift || true
MAX_IN_TOK="${1:-4096}"; shift || true
mkdir -p "$OUT"
COMMON_ARGS=( --checkpoint_dir "$CONVERTED" --output_dir "$OUT" --max_batch_size "$MAX_BATCH" --max_input_len "$MAX_IN_TOK" )
case "$PROFILE" in
  int4)  COMMON_ARGS+=( --int4 ) ;;
  fp8)   COMMON_ARGS+=( --fp8 ) ;;
  fp16)  ;;
  *) echo "Unknown profile $PROFILE"; exit 2;;
 esac
 echo "Running trtllm-build with profile=$PROFILE"
 trtllm-build "${COMMON_ARGS[@]}"
 echo "Engine build complete -> $OUT"
