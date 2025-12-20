@echo off
REM Batch file to execute test migration steps
echo.
echo ╔═══════════════════════════════════════════════════════════╗
echo ║  Test Fix ^& .txt Organization - Execution Starting       ║
echo ╚═══════════════════════════════════════════════════════════╝
echo.

cd /d "c:\Users\james\Videos\deeds-web-app\sveltekit-frontend"

echo 📁 Step 1: Organizing .txt files...
echo    Running: node scripts/organize-txt-files.mjs --apply
echo.
node scripts/organize-txt-files.mjs --apply
if errorlevel 1 (
    echo.
    echo ❌ Step 1 Failed
    pause
    exit /b 1
)
echo.
echo ✅ Step 1 Complete: .txt files organized
echo.

echo 🔧 Step 2: Migrating tests to new mock infrastructure...
echo    Running: node scripts/migrate-tests-to-mocks.mjs --apply
echo.
node scripts/migrate-tests-to-mocks.mjs --apply
if errorlevel 1 (
    echo.
    echo ❌ Step 2 Failed
    pause
    exit /b 1
)
echo.
echo ✅ Step 2 Complete: Tests migrated
echo.

echo 🧪 Step 3: Running tests to verify...
echo    Running: npm run test:run
echo.
npm run test:run

echo.
echo ╔═══════════════════════════════════════════════════════════╗
echo ║  Execution Complete - Check Results Above                ║
echo ╚═══════════════════════════════════════════════════════════╝
echo.
pause
