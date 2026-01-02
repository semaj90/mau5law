#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import sys
import io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

"""
ACE Batch Fixer: .set() corruption
Fixes: .set(a: b) -> .set(a, b)
Safe: backups, dry-run, multi-line context
"""

import json
import re
import pathlib
import shutil
import sys
from typing import List, Set

# .set(a: b, ...)  -> .set(a, b, ...)
# .set({ key: value: ... }) -> .set({ key: value, ... })
# Pattern 1: Simple arg .set(x: y) -> .set(x, y)
# Pattern 2: Object literal .set({ a: b: c }) -> .set({ a: b, c })

# Match object literal with multiple colons: { key: value: key2: ... }
SET_OBJ_FIX = re.compile(r"\.set\(\s*\{([^}]*?:\s*[^:},\n]+)\s*:\s*([^:},\n]+)")

# Simpler fallback: just fix obvious .set(arg: patterns
SET_ARG_FIX = re.compile(r"\.set\(\s*([a-zA-Z_$][a-zA-Z0-9_$]*)\s*:\s*")

def iter_matches(rg_path: str) -> List[str]:
    """Extract unique file paths from ripgrep JSON output"""
    files = set()
    with open(rg_path, "r", encoding="utf-8") as f:
        for line in f:
            try:
                obj = json.loads(line)
                if obj.get("type") == "match":
                    files.add(obj["data"]["path"]["text"])
            except:
                continue
    return sorted(files)

def patch_file(path: pathlib.Path, dry: bool = False) -> int:
    """Apply .set() corruption fix to a single file"""
    try:
        s = path.read_text(encoding="utf-8", errors="ignore")
    except Exception as e:
        print(f"[SKIP] {path}  error={e}")
        return 0

    # Apply regex substitutions
    # Fix 1: Object literals .set({ a: b: c }) -> .set({ a: b, c })
    s2, n1 = SET_OBJ_FIX.subn(r".set({ \1, \2", s)

    # Fix 2: Simple args .set(x: y) -> .set(x, y)
    s3, n2 = SET_ARG_FIX.subn(r".set(\1, ", s2)

    n = n1 + n2

    if n and s3 != s:
        if dry:
            print(f"[DRY]  {path}  edits={n} (obj={n1}, arg={n2})")
            return n

        # Create backup
        bak = path.with_suffix(path.suffix + ".bak")
        shutil.copy2(path, bak)

        # Write patched file
        path.write_text(s3, encoding="utf-8")
        print(f"[OK]   {path}  edits={n}  backup={bak.name}")
        return n

    return 0

def main():
    if len(sys.argv) < 2:
        print("Usage: python ace_batch_fix_set.py <rg_json_file> [--dry]")
        print("Example: python ace_batch_fix_set.py ace_runs/matches_set.json --dry")
        sys.exit(1)

    rg_json = sys.argv[1]
    dry = "--dry" in sys.argv

    if not pathlib.Path(rg_json).exists():
        print(f"ERROR: {rg_json} not found")
        sys.exit(1)

    print("=" * 70)
    print("ACE Batch Fixer: .set() corruption")
    print("=" * 70)
    print(f"Mode: {'DRY RUN' if dry else 'APPLY'}")
    print(f"Input: {rg_json}")
    print()

    # Extract files from ripgrep JSON
    files = iter_matches(rg_json)
    print(f"Found {len(files)} files to check")
    print()

    # Apply fixes
    total_edits = 0
    files_changed = 0

    for fp in files:
        p = pathlib.Path(fp)
        if p.exists():
            edits = patch_file(p, dry=dry)
            if edits > 0:
                total_edits += edits
                files_changed += 1

    print()
    print("=" * 70)
    print(f"TOTAL_EDITS: {total_edits}")
    print(f"FILES_CHANGED: {files_changed}")
    print("=" * 70)

    if dry:
        print()
        print("[INFO] This was a DRY RUN. No files were modified.")
        print("       Run without --dry to apply changes.")
    else:
        print()
        print("[OK] Fixes applied. Backups saved with .bak extension")
        print("     Run: npm run check")

if __name__ == "__main__":
    main()
