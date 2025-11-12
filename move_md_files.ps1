# PowerShell script to move markdown files to the 'documents' directory, preserving structure.
# Excludes files within specified dependency/build/documentation directories.

$rootDir = "C:\Users\james\Videos\deeds-web-app"
$targetDir = Join-Path $rootDir "documents"

# Ensure the target directory exists
if (-not (Test-Path $targetDir)) {
    New-Item -Path $targetDir -ItemType Directory
}

# Define directories to exclude
$excludedDirs = @(
    "node_modules", ".venv", ".git", "dist", "build", "out", "bin", "obj", "tmp", "temp",
    "vendor", "target", "docs", "documents", "test", "tests", "archive", "archives",
    "old-scripts", "old", "backup", "backups", "examples", "demo", "playwright-report",
    "test-results", "test-reports", "bench_results", "unocss-main", "sveltekit-frontend\docs_readme"
)

# Get all markdown files, excluding those in the specified directories
Get-ChildItem -Path $rootDir -Recurse -Include "*.md" | ForEach-Object {
    $filePath = $_.FullName
    $relativePath = $filePath.Substring($rootDir.Length + 1)
    $pathSegments = $relativePath.Split('\')

    $shouldExclude = $false
    foreach ($segment in $pathSegments) {
        if ($excludedDirs -contains $segment) {
            $shouldExclude = $true
            break
        }
    }

    # Special handling for 'docs' and 'documents' if they are top-level or within sveltekit-frontend
    if ($relativePath.StartsWith("docs\") -or $relativePath.StartsWith("documents\")) {
        $shouldExclude = $true
    }
    if ($relativePath.StartsWith("sveltekit-frontend\docs\") -or $relativePath.StartsWith("sveltekit-frontend\documents\")) {
        $shouldExclude = $true
    }
    if ($relativePath.StartsWith("sveltekit-frontend\docs_readme\")) {
        $shouldExclude = $true
    }

    if (-not $shouldExclude) {
        $newRelativePath = $relativePath
        $newFilePath = Join-Path $targetDir $newRelativePath
        $newFileDir = Split-Path $newFilePath -Parent

        # Create target directory if it doesn't exist
        if (-not (Test-Path $newFileDir)) {
            New-Item -Path $newFileDir -ItemType Directory -Force
        }

        # Move the file using git mv to preserve history
        Write-Host "Moving '$filePath' to '$newFilePath'"
        git mv "$filePath" "$newFilePath"
    } else {
        Write-Host "Skipping excluded file: '$filePath'"
    }
}

Write-Host "Markdown file organization complete."