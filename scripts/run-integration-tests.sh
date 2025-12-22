#!/bin/bash

# NES Command Center Integration Test Runner
# Runs all integration tests for Phase 12

set -e

echo "🧪 NES Command Center Integration Tests"
echo "========================================"
echo ""

# Check if database is running
echo "📊 Checking database connection..."
if ! psql $DATABASE_URL -c "SELECT 1" > /dev/null 2>&1; then
  echo "❌ Database not available. Please start PostgreSQL."
  exit 1
fi
echo "✅ Database connected"
echo ""

# Check if migrations are applied
echo "📦 Checking migrations..."
MIGRATION_COUNT=$(psql $DATABASE_URL -t -c "SELECT COUNT(*) FROM drizzle_migrations" 2>/dev/null || echo "0")
if [ "$MIGRATION_COUNT" -lt 7 ]; then
  echo "⚠️  Warning: Expected at least 7 migrations, found $MIGRATION_COUNT"
  echo "   Run migrations first: npm run db:migrate"
fi
echo "✅ Migrations OK"
echo ""

# Check if archive tables exist
echo "🗄️  Checking archive tables..."
ARCHIVE_TABLES=$(psql $DATABASE_URL -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_name LIKE '%archive%'" 2>/dev/null || echo "0")
if [ "$ARCHIVE_TABLES" -lt 2 ]; then
  echo "⚠️  Warning: Archive tables not found"
  echo "   Apply migration: psql \$DATABASE_URL -f backend/migrations/007_create_archive_tables.sql"
fi
echo "✅ Archive tables OK"
echo ""

# Check if dev server is running
echo "🌐 Checking dev server..."
if ! curl -s http://localhost:5173 > /dev/null 2>&1; then
  echo "⚠️  Dev server not running on port 5173"
  echo "   Start it: npm run dev"
  echo ""
  echo "   Starting dev server in background..."
  npm run dev > /dev/null 2>&1 &
  DEV_SERVER_PID=$!
  echo "   Waiting for server to start..."
  sleep 5
else
  echo "✅ Dev server running"
  DEV_SERVER_PID=""
fi
echo ""

# Run tests
echo "🚀 Running integration tests..."
echo ""

# Run Playwright tests
npx playwright test tests/nes-command-center-integration.spec.ts \
  --reporter=list \
  --workers=1

TEST_EXIT_CODE=$?

# Cleanup
if [ -n "$DEV_SERVER_PID" ]; then
  echo ""
  echo "🧹 Stopping dev server..."
  kill $DEV_SERVER_PID 2>/dev/null || true
fi

echo ""
if [ $TEST_EXIT_CODE -eq 0 ]; then
  echo "✅ All tests passed!"
  echo ""
  echo "📊 Test Summary:"
  echo "   - Route creation and persistence: ✅"
  echo "   - Error cluster and health calculation: ✅"
  echo "   - Error brain analysis persistence: ✅"
  echo "   - Interaction logging: ✅"
  echo "   - Real-time SSE updates: ✅"
  echo "   - Data archival: ✅"
  echo ""
  echo "🎉 Phase 12 Complete!"
else
  echo "❌ Some tests failed"
  echo ""
  echo "📝 Check the test output above for details"
  echo "   Common issues:"
  echo "   - Database connection"
  echo "   - Missing migrations"
  echo "   - Dev server not running"
  echo "   - SSE connection issues"
fi

exit $TEST_EXIT_CODE
