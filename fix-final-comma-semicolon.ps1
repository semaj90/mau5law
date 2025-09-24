# Fix the final 10 comma-semicolon errors
$files = @(
    'sveltekit-frontend/src/routes/admin/users/[userId]/+page.server.ts',
    'sveltekit-frontend/src/routes/cases/[id]/enhanced/+page.server.ts',
    'sveltekit-frontend/src/routes/cases/[caseId]/rag/+page.server.ts'
)

foreach ($file in $files) {
    if (Test-Path $file) {
        Write-Host "Fixing: $file"
        $content = Get-Content $file
        $newContent = $content -replace ',\s*;', ','
        Set-Content -Path $file -Value $newContent
    } else {
        Write-Host "File not found: $file" -ForegroundColor Yellow
    }
}