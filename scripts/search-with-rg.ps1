param(
    [Parameter(Mandatory = $true)]
    [string]$SearchRoot,
    [Parameter(Mandatory = $true)]
    [string]$GlobPattern,
    [Parameter(Mandatory = $true)]
    [string]$Keyword
)

if (-not (Test-Path $SearchRoot)) {
    Write-Error "Search root '$SearchRoot' not found."
    exit 1
}

# Optional: limit to files matching the glob using fast-glob-style syntax
$files = rg --files --iglob $GlobPattern --hidden --follow --null-data -- $SearchRoot
if (-not $files) {
    Write-Host "No files matched glob '$GlobPattern' under $SearchRoot"
    exit 0
}

# Use ripgrep with smart case + context; pipe to awk if you need custom filtering.
rg --smart-case --heading --line-number --color=always $Keyword $files |
    awk '{ print $0 }'