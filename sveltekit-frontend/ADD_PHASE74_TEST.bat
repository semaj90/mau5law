@echo off
REM Add Phase 74 performance test to package.json

echo Adding phase74:test script to package.json...
npm pkg set scripts.phase74:test="node scripts/test-phase74-performance.mjs"

echo.
echo ✅ Script added! Run the test with:
echo    npm run phase74:test
echo.
pause
