# PowerShell script to fix comma-semicolon syntax errors in TypeScript files
$files = Get-ChildItem -Path "sveltekit-frontend/src" -Filter "*.ts" -Recurse
$total = $files.Count
$processed = 0

foreach ($file in $files) {
    $processed++
    Write-Host "Processing $processed/$total : $($file.FullName)"

    try {
        $content = Get-Content $file.FullName
        $newContent = $content -replace ',\s*;', ','
        Set-Content -Path $file.FullName -Value $newContent
    }
    catch {
        Write-Host "Error processing $($file.FullName): $($_.Exception.Message)" -ForegroundColor Red
    }
}

Write-Host "Completed processing $total files" -ForegroundColor Green