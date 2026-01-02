#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import sys
import io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

"""
ACE Batch Fixer: .set() object literal colon corruption
Fixes: .set({ a: b: c }) -> .set({ a: b, c })
Example: gpuStatus.set({ available: true: layers: 35 })
      -> gpuStatus.set({ available: true, layers: 35 })
"""

import json
import re
import pathlib
import shutil
from typing import List

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

def fix_set_obj_colons(text: str) -> tuple:
    """
    Fix .set({ ... }) with colon corruption
    Replace ": key:" with ", key:" inside object literals
    """
    # Pattern: inside .set({ }), replace value: key: with value, key:
    # This is a multi-pass approach for safety

    changes = 0
    lines = text.split('\n')
    result = []

    for line in lines:
        if '.set(' in line and '{' in line:
            original = line

            # Find .set({ pattern
            # Replace patterns like "value: identifier:" with "value, identifier:"
            # But ONLY when it's clearly corruption (multiple colons)

            # Pattern: word/number: <value>: word
            # Example: "true: layers:" -> "true, layers:"
            fixed = re.sub(
                r'([a-zA-Z_$][\w$]*|"[^"]+"|\'[^\']+\'|\d+)\s*:\s*([^:,{}\n]+?)\s*:\s*([a-zA-Z_$][\w$]*)',
                r'\1: \2, \3',
                line
            )

            # Also handle: number: number: pattern
            # Example: "35, 35: 35," -> "35, 35, 35,"
            fixed = re.sub(
                r'(\d+)\s*:\s*(\d+)\s*:\s*',
                r'\1, \2, ',
                fixed
            )

            if fixed != original:
                changes += 1
                result.append(fixed)
            else:
                result.append(line)
        else:
            result.append(line)

    return '\n'.join(result), changes

def patch_file(path: pathlib.Path, dry: bool = False) -> int:
    """Apply .set() corruption fix to a single file"""
    try:
        s = path.read_text(encoding="utf-8", errors="ignore")
    except Exception as e:
        print(f"[SKIP] {path}  error={e}")
        return 0

    # Apply fix
    s2, n = fix_set_obj_colons(s)

    if n > 0 and s2 != s:
        if dry:
            print(f"[DRY]  {path}  edits={n}")
            return n

        # Create backup
        bak = path.with_suffix(path.suffix + ".bak")
        shutil.copy2(path, bak)

        # Write patched file
        path.write_text(s2, encoding="utf-8")
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
