@echo off
REM Phase 89: ACE Semantic Search CLI Wrapper
REM Makes querying the ACE system easy from PowerShell/CMD

SET PYTHON=C:\Users\james\Videos\deeds-web-app\.venv\Scripts\python.exe

echo.
echo ╔═══════════════════════════════════════════════════════════════════╗
echo ║             Phase 89: ACE Semantic Search                        ║
echo ╚═══════════════════════════════════════════════════════════════════╝
echo.

REM Check if query provided
if "%~1"=="" (
    echo Usage: run-ace-search.bat [search query]
    echo.
    echo Examples:
    echo   run-ace-search.bat "Fix TypeScript errors in UnifiedButton"
    echo   run-ace-search.bat "Svelte 5 runes migration" --top-k 100
    echo   run-ace-search.bat "langextract validation logic" --json
    echo.
    pause
    exit /b 1
)

REM Run search
"%PYTHON%" scripts\phase89-ace-search.py %*

if %ERRORLEVEL% EQU 0 (
    echo.
    echo ✅ Search complete!
) else (
    echo.
    echo ❌ Search failed with error code %ERRORLEVEL%
)

echo.
