param(
    [string]$root = "C:\Users\james\Videos\deeds-web-app\sveltekit-frontend"
)

Write-Host "📄 Exporting Top 1,000 Svelte Errors..." -ForegroundColor Cyan

$errors = "$root\error-top1000.json"
$outTxt = "$root\..\logs\svelte-errors-top1000.txt"

# Create logs directory
if (!(Test-Path "$root\..\logs")) {
    New-Item -ItemType Directory -Path "$root\..\logs" | Out-Null
}

if (Test-Path $errors) {
    $json = Get-Content $errors | ConvertFrom-Json

    # Clear output file
    "" | Out-File -FilePath $outTxt -Encoding UTF8

    # Write header
    "SVELTE-CHECK TOP 1,000 ERRORS" | Out-File -Append -Encoding UTF8 $outTxt
    "Generated: $(Get-Date)" | Out-File -Append -Encoding UTF8 $outTxt
    "Total Errors: $($json.Count)" | Out-File -Append -Encoding UTF8 $outTxt
    "=" * 80 | Out-File -Append -Encoding UTF8 $outTxt
    "" | Out-File -Append -Encoding UTF8 $outTxt

    # Export errors
    $limit = [math]::Min(999, $json.Count - 1)
    $json[0..$limit] | ForEach-Object {
        $line = "[$($_.code)] $($_.message) --> $($_.file):$($_.line)"
        $line | Out-File -Append -Encoding UTF8 $outTxt
    }

    Write-Host "✅ Export complete: $outTxt" -ForegroundColor Green
    Write-Host "📊 Exported $($limit + 1) errors" -ForegroundColor Green
} else {
    Write-Host "❌ Could not find $errors" -ForegroundColor Red
    Write-Host "Run 'npm run check:svelte' first to generate error-top1000.json" -ForegroundColor Yellow
}
