@echo off
echo Fixing corrupted import paths in TypeScript files...

cd /d "%~dp0"

REM Fix all corrupted import paths by removing the embedded TODO comments
powershell -NoProfile -ExecutionPolicy Bypass -Command "
Get-ChildItem -Recurse -Filter *.ts -Exclude node_modules | ForEach-Object {
    $content = Get-Content $_.FullName -Raw
    $originalContent = $content

    # Fix import statements with embedded TODO comments
    $content = $content -replace '\$lib // TODO: Verify store subscription is correct for Svelte 5 // TODO: Verify store subscription is correct for Svelte 5/', '$lib/'
    $content = $content -replace '\$app // TODO: Verify store subscription is correct for Svelte 5/', '$app/'

    # Fix $state declarations with embedded TODO comments
    $content = $content -replace '\$state // TODO: Verify store subscription is correct for Svelte 5\(([^)]+)\)', '$state($1)'

    # Fix $props declarations with embedded TODO comments
    $content = $content -replace '\$props // TODO: Verify store subscription is correct for Svelte 5', '$props'

    # Fix $derived declarations with embedded TODO comments
    $content = $content -replace '\$derived // TODO: Verify store subscription is correct for Svelte 5', '$derived'

    # Fix $bindable with embedded TODO comments
    $content = $content -replace '\$bindable // TODO: Verify store subscription is correct for Svelte 5', '$bindable'

    # Fix $page references with embedded TODO comments
    $content = $content -replace '\$page // TODO: Verify store subscription is correct for Svelte 5', '$page'

    if ($content -ne $originalContent) {
        Write-Host 'Fixed:' $_.FullName
        Set-Content -Path $_.FullName -Value $content -NoNewline
    }
}
"

echo Import path fixes completed!