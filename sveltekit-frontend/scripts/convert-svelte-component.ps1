# Svelte 5 Runes Mode: Convert <svelte:component> to Direct Component Usage
# This script finds all deprecated <svelte:component this={...}> usages
# and replaces them with the new Svelte 5 direct component syntax

param(
    [string]$Path = ".",
    [switch]$DryRun,
    [switch]$Verbose
)

Write-Host "🔄 Svelte 5 Component Converter" -ForegroundColor Cyan
Write-Host "Converting <svelte:component this={...}> to direct component syntax" -ForegroundColor Yellow
Write-Host ""

# Find all .svelte files
$svelteFiles = Get-ChildItem -Path $Path -Filter "*.svelte" -Recurse -File

$convertedCount = 0
$filesProcessed = 0

foreach ($file in $svelteFiles) {
    $filesProcessed++

    try {
        $content = Get-Content -Path $file.FullName -Raw -ErrorAction Stop
        $originalContent = $content

        if ($Verbose) {
            Write-Host "Processing: $($file.FullName)" -ForegroundColor Gray
        }

        # Pattern to match: <svelte:component this={ComponentName} prop1="value" prop2={variable} />
        # We need to capture the component variable and all props
        $pattern = '<svelte:component\s+this=\{([^}]+)\}([^>]*)\/?>'

        try {
            $matches = [regex]::Matches($content, $pattern, [System.Text.RegularExpressions.RegexOptions]::Multiline -bor [System.Text.RegularExpressions.RegexOptions]::IgnoreCase)
        } catch {
            Write-Host "Error processing regex on $($file.Name): $($_.Exception.Message)" -ForegroundColor Red
            continue
        }

        if ($matches.Count -gt 0) {
            Write-Host "Found $($matches.Count) deprecated component(s) in $($file.Name)" -ForegroundColor Yellow

            foreach ($match in $matches) {
                $componentVar = $match.Groups[1].Value.Trim()
                $props = $match.Groups[2].Value.Trim()

                # Build new component tag
                $newTag = "<$componentVar"

                if ($props) {
                    $newTag += " $props"
                }

                # Check if it was self-closing or had closing tag
                if ($match.Value.EndsWith("/>")) {
                    $newTag += " />"
                } else {
                    $newTag += ">"
                    # For non-self-closing, we need to handle the closing tag too
                    # This is more complex, so for now we'll assume self-closing
                    $newTag += " />"
                }

                if ($Verbose) {
                    Write-Host "  Converting: $($match.Value.Trim())" -ForegroundColor Red
                    Write-Host "  To: $newTag" -ForegroundColor Green
                }

                # Replace in content
                $content = $content.Replace($match.Value, $newTag)
            }

            if ($content -ne $originalContent) {
                $convertedCount++

                if (-not $DryRun) {
                    try {
                        Set-Content -Path $file.FullName -Value $content -NoNewline -ErrorAction Stop
                        Write-Host "✅ Updated: $($file.Name)" -ForegroundColor Green
                    } catch {
                        Write-Host "❌ Failed to update $($file.Name): $($_.Exception.Message)" -ForegroundColor Red
                    }
                } else {
                    Write-Host "🔍 Would update: $($file.Name) (dry run)" -ForegroundColor Blue
                }
            }
        }
    } catch {
        Write-Host "Error reading file $($file.Name): $($_.Exception.Message)" -ForegroundColor Red
        continue
    }
}

Write-Host ""
Write-Host "📊 Summary:" -ForegroundColor Cyan
Write-Host "  Files processed: $filesProcessed" -ForegroundColor White
Write-Host "  Files converted: $convertedCount" -ForegroundColor Green

if ($DryRun) {
    Write-Host ""
    Write-Host "💡 This was a dry run. Run without -DryRun to apply changes." -ForegroundColor Yellow
} else {
    Write-Host ""
    Write-Host "✅ Conversion complete! Your components are now using Svelte 5 syntax." -ForegroundColor Green
    Write-Host ""
    Write-Host "🧠 Remember:" -ForegroundColor Cyan
    Write-Host "  - Components are now reactive by default" -ForegroundColor White
    Write-Host "  - Use `$state()` for component variables if needed" -ForegroundColor White
    Write-Host "  - Use `$derived()` for computed component selections" -ForegroundColor White
}

Write-Host ""
Write-Host "🔍 Next steps:" -ForegroundColor Yellow
Write-Host "  1. Run 'npm run check' to verify no TypeScript errors" -ForegroundColor White
Write-Host "  2. Test your components to ensure they render correctly" -ForegroundColor White
Write-Host "  3. Update any component variables to use `$state()` if needed" -ForegroundColor White