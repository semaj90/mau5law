# scripts/fix-svelte5-blockers.ps1
# Fixes common Svelte 5 (runes mode) build blockers in src/routes + src/lib
# - Rewrites on:* directives -> on* attributes
# - Rewrites <svelte:component this={X} .../> -> <X .../>
# - Fixes lucide-svelte/icons/* imports -> named imports from lucide-svelte
# - Fixes "import type { fade } from 'svelte/transition'" -> value import (fade/fly/slide/scale/draw)
# - Fixes self-closing non-void tags for common cases (<div />, <span />, etc.)
# Makes backup copies and prints a post-run verification report.

$ErrorActionPreference = "Stop"

function Write-Section($title) {
  Write-Host ""
  Write-Host "============================================================"
  Write-Host $title
  Write-Host "============================================================"
}

# Adjust if you want to include more directories.
$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$Targets = @(
  (Join-Path $RepoRoot "src\routes"),
  (Join-Path $RepoRoot "src\lib")
)

$BackupRoot = Join-Path $RepoRoot ".svelte5-fix-backups"
$RunStamp = Get-Date -Format "yyyyMMdd_HHmmss"
$BackupDir = Join-Path $BackupRoot $RunStamp
$LogPath = Join-Path $BackupDir "fix-log.txt"

New-Item -ItemType Directory -Force -Path $BackupDir | Out-Null
New-Item -ItemType File -Force -Path $LogPath | Out-Null

Write-Section "Svelte 5 Blocker Fixer"
"RepoRoot: $RepoRoot" | Add-Content $LogPath
"BackupDir: $BackupDir" | Add-Content $LogPath

# Events we rewrite. Add more if needed.
$EventMap = @(
  @{ from = "on:click";   to = "onclick"   },
  @{ from = "on:submit";  to = "onsubmit"  },
  @{ from = "on:change";  to = "onchange"  },
  @{ from = "on:input";   to = "oninput"   },
  @{ from = "on:keydown"; to = "onkeydown" },
  @{ from = "on:keyup";   to = "onkeyup"   },
  @{ from = "on:focus";   to = "onfocus"   },
  @{ from = "on:blur";    to = "onblur"    }
)

# Conservative list of non-void tags people accidentally self-close in Svelte
$NonVoidTagsToFix = @("div","span","button","a","main","section","header","footer","nav","p","label","textarea","select","option","h1","h2","h3","h4","h5","h6")

# Transition imports commonly used as directives, must NOT be import type
$TransitionFns = @("fade","fly","slide","scale","draw")

# Collect .svelte files
$SvelteFiles = @()
foreach ($t in $Targets) {
  if (Test-Path $t) {
    $SvelteFiles += Get-ChildItem $t -Recurse -File -Filter "*.svelte"
  }
}

Write-Host "Found $($SvelteFiles.Count) .svelte files under routes/lib."
"FilesFound: $($SvelteFiles.Count)" | Add-Content $LogPath

$ChangedCount = 0
$ChangedFiles = @()

foreach ($file in $SvelteFiles) {
  $path = $file.FullName
  $orig = Get-Content $path -Raw -Encoding UTF8

  $text = $orig

  # 1) Rewrite on:* directives -> on* attributes
  foreach ($m in $EventMap) {
    # Replace only attribute prefix "on:click=" with "onclick="
    $text = $text -replace ("(?m)\b" + [regex]::Escape($m.from) + "\s*="), ($m.to + "=")
  }

  # 2) Replace <svelte:component this={X} .../>  -> <X .../>
  # Handles both self-closing and explicit close tags:
  #   <svelte:component this={Comp} class="x" />
  #   <svelte:component this={Comp} ...>...</svelte:component>
  # NOTE: This assumes `this={Identifier}` (or dotted like foo.Bar) is a valid component reference.
  $text = $text -replace '(?is)<svelte:component\s+this=\{([A-Za-z_$][\w.$]*)\}([^>/]*?)/\s*>', '<$1$2 />'
  $text = $text -replace '(?is)<svelte:component\s+this=\{([A-Za-z_$][\w.$]*)\}([^>]*)>', '<$1$2>'
  $text = $text -replace '(?is)</svelte:component\s*>', '</$1>'  # will only work if $1 exists; safer below

  # Safer close-tag rewrite: do it with a callback
  $text = [regex]::Replace($text, '(?is)<svelte:component\s+this=\{([A-Za-z_$][\w.$]*)\}([^>]*)>(.*?)</svelte:component\s*>', {
    param($m)
    $comp = $m.Groups[1].Value
    $attrs = $m.Groups[2].Value
    $inner = $m.Groups[3].Value
    return "<$comp$attrs>$inner</$comp>"
  })

  # 3) Fix lucide imports: lucide-svelte/icons/foo -> { Foo } from lucide-svelte
  # Examples:
  #   import Trash2 from "lucide-svelte/icons/trash2";
  #   import Grid3x3 from 'lucide-svelte/icons/grid3x3';
  $text = [regex]::Replace($text, '(?m)^\s*import\s+([A-Za-z_$][\w$]*)\s+from\s+([\'"])lucide-svelte\/icons\/[^\'"]+\2\s*;?\s*$', {
    param($m)
    $name = $m.Groups[1].Value
    $quote = $m.Groups[2].Value
    return "import { $name } from ${quote}lucide-svelte${quote};"
  })

  # 4) Fix "import type { fade } from 'svelte/transition'" -> value import for transition fns
  foreach ($fn in $TransitionFns) {
    $pattern = "(?m)^\s*import\s+type\s+\{\s*$fn\s*\}\s+from\s+([`'`""])\s*svelte\/transition\s*\1\s*;?\s*$"
    $text = [regex]::Replace($text, $pattern, { param($m)
      $q = $m.Groups[1].Value
      return "import { $fn } from ${q}svelte/transition${q};"
    })
  }

  # 5) Fix self-closing non-void tags like <div ... />
  # Conservative: only fixes tags in $NonVoidTagsToFix list.
  foreach ($tag in $NonVoidTagsToFix) {
    # <div ... />
    $text = [regex]::Replace($text, "(?is)<$tag(\\s[^>]*)?/\\s*>", {
      param($m)
      $attrs = $m.Groups[1].Value
      if ([string]::IsNullOrEmpty($attrs)) { $attrs = "" }
      return "<$tag$attrs></$tag>"
    })
  }

  if ($text -ne $orig) {
    # backup original file
    $rel = $path.Substring($RepoRoot.Length).TrimStart('\','/')
    $backupPath = Join-Path $BackupDir $rel
    New-Item -ItemType Directory -Force -Path (Split-Path $backupPath -Parent) | Out-Null
    Set-Content -Path $backupPath -Value $orig -Encoding UTF8

    # write updated
    Set-Content -Path $path -Value $text -Encoding UTF8

    $ChangedCount++
    $ChangedFiles += $rel
    "CHANGED: $rel" | Add-Content $LogPath
  }
}

Write-Section "Completed"
Write-Host "Changed files: $ChangedCount"
"ChangedCount: $ChangedCount" | Add-Content $LogPath

if ($ChangedFiles.Count -gt 0) {
  Write-Host ""
  Write-Host "Changed file list (relative):"
  $ChangedFiles | ForEach-Object { Write-Host " - $_" }
}

Write-Section "Post-run quick verification (recommended to run manually)"
Write-Host "From sveltekit-frontend/ run:"
Write-Host '  rg "on:" src --glob "*.svelte"'
Write-Host '  rg "<svelte:component" src'
Write-Host '  rg "lucide-svelte/icons" src'
Write-Host '  rg "import type \{ (fade|fly|slide|scale|draw) \} from .svelte/transition" src --glob "*.svelte"'
Write-Host '  npm run build'

Write-Section "Remaining fatal patterns report (this script does NOT auto-fix these)"
Write-Host '  rg "export let " src --glob "*.svelte"'
Write-Host '  rg "^\s*\$:" src --glob "*.svelte"'
Write-Host '  rg "<slot\s*/?>" src --glob "*.svelte"'
Write-Host ""
Write-Host "Backup created at: $BackupDir"
Write-Host "Log written to:    $LogPath"
