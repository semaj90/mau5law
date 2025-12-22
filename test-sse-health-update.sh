#!/bin/bash
# Test SSE Real-Time Health Updates
# Phase 10 Verification Script

echo "🧪 Testing SSE Real-Time Health Updates"
echo "========================================"
echo ""

# Test 1: Create a health event
echo "📡 Test 1: Creating health event..."
curl -X POST http://localhost:5173/api/routes/test-route-sse/health-event \
  -H "Content-Type: application/json" \
  -d '{
    "old_status": "healthy",
    "new_status": "broken",
    "reason": "SSE test - simulating error detection"
  }' \
  -w "\nHTTP Status: %{http_code}\n"

echo ""
echo "✅ Health event created"
echo "📺 Check browser console for: [SSE] Health change: test-route-sse → broken"
echo ""

# Test 2: Create another health event (recovery)
echo "📡 Test 2: Creating recovery event..."
sleep 2
curl -X POST http://localhost:5173/api/routes/test-route-sse/health-event \
  -H "Content-Type: application/json" \
  -d '{
    "old_status": "broken",
    "new_status": "healthy",
    "reason": "SSE test - simulating error resolution"
  }' \
  -w "\nHTTP Status: %{http_code}\n"

echo ""
echo "✅ Recovery event created"
echo "📺 Check browser console for: [SSE] Health change: test-route-sse → healthy"
echo ""

# Test 3: Get health history
echo "📡 Test 3: Fetching health history..."
curl -X GET "http://localhost:5173/api/routes/test-route-sse/health-history?limit=10" \
  -H "Content-Type: application/json" | jq '.'

echo ""
echo "✅ Health history retrieved"
echo ""

echo "🎉 SSE Testing Complete!"
echo ""
echo "Expected Results:"
echo "  ✅ Browser DevTools → Network tab shows 'events' connection (Status 200)"
echo "  ✅ Console shows SSE messages for each health change"
echo "  ✅ Route card updates without page reload"
echo "  ✅ Health indicator changes (✅ ↔ ❌)"
echo ""
echo "Manual Verification:"
echo "  1. Open http://localhost:5173/all-routes in browser"
echo "  2. Open DevTools → Network tab → Filter 'events'"
echo "  3. Run this script"
echo "  4. Watch route card update in real-time!"
