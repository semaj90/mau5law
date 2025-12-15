@echo off
echo Finding Svelte 5 migration targets...
cd /d "%~dp0"

echo.
echo === STUB COMPONENTS ===
echo Files with "Page under reconstruction" or "page-repair":
echo.
for /f "delims=" %%i in ('findstr /s /i /m "Page under reconstruction\|page-repair" src\*.svelte 2^>nul') do (
    echo %%i
)

echo.
echo === DYNAMIC COMPONENTS ===
echo Files using ^<svelte:component^>:
echo.
for /f "delims=" %%i in ('findstr /s /m "<svelte:component" src\*.svelte 2^>nul') do (
    echo %%i
)

echo.
echo === LUCIDE ICONS ===
echo Files importing from lucide-svelte/icons:
echo.
for /f "delims=" %%i in ('findstr /s /m "lucide-svelte/icons" src\*.svelte src\*.ts src\*.js 2^>nul') do (
    echo %%i
)

echo.
echo === SVELTE TRANSITIONS ===
echo Files with type-only transition imports:
echo.
for /f "delims=" %%i in ('findstr /s /m "import type.*fade\|import type.*fly\|import type.*slide\|import type.*scale\|import type.*draw.*from.*svelte" src\*.svelte src\*.ts src\*.js 2^>nul') do (
    echo %%i
)

echo.
echo === VOID SELF-CLOSING TAGS ===
echo Files with void self-closing tags ^(may be false positives^):
echo.
for /f "delims=" %%i in ('findstr /s /m "<\(div\|span\|p\|section\|main\|article\|header\|footer\|nav\)[^>]*\/>" src\*.svelte 2^>nul') do (
    echo %%i
)

echo.
echo === ON: EVENT HANDLERS ===
echo Files with old on: syntax:
echo.
for /f "delims=" %%i in ('findstr /s /m "on:" src\*.svelte 2^>nul') do (
    echo %%i
)

echo.
echo Scan complete. Check the files above for Svelte 5 migration issues.
pause