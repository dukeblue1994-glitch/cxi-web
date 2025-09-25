#!/usr/bin/env bash

# Simple CXI Web Test Script
echo "🧪 Testing CXI Web Application"
echo "==============================="
echo ""

# Test 1: Check if server is responding
echo "📝 Test 1: Server Connectivity"
if curl -s -f http://localhost:8888 > /dev/null; then
    echo "✅ Server is responding on http://localhost:8888"
else
    echo "❌ Server is not responding. Make sure 'npm run dev' is running."
    exit 1
fi

# Test 2: Check main page content
echo ""
echo "📝 Test 2: Main Page Content"
if curl -s http://localhost:8888 | grep -q "CXI"; then
    echo "✅ Main page contains CXI content"
else
    echo "❌ Main page does not contain expected content"
fi

# Test 3: Check if functions are accessible
echo ""
echo "📝 Test 3: Function Accessibility"
if curl -s http://localhost:8888/.netlify/functions/schedule-nudge > /dev/null; then
    echo "✅ Schedule Nudge function is accessible"
else
    echo "⚠️  Schedule Nudge function returned an error (expected for invalid request)"
fi

if curl -s http://localhost:8888/.netlify/functions/nudge-cron > /dev/null; then
    echo "✅ Nudge Cron function is accessible"
else
    echo "⚠️  Nudge Cron function returned an error (may be expected)"
fi

# Test 4: Validate function files exist
echo ""
echo "📝 Test 4: Function Files"
if [ -f "netlify/functions/schedule-nudge.js" ]; then
    echo "✅ Schedule Nudge file exists"
else
    echo "❌ Schedule Nudge file missing"
fi

if [ -f "netlify/functions/nudge-cron.js" ]; then
    echo "✅ Nudge Cron file exists"
else
    echo "❌ Nudge Cron file missing"
fi

# Test 5: Environment check
echo ""
echo "📝 Test 5: Environment Variables"
if npm run env:check > /dev/null 2>&1; then
    echo "✅ Environment variables are properly configured"
else
    echo "❌ Environment variables need configuration"
fi

echo ""
echo "🎉 Basic functionality tests completed!"
echo ""
echo "🌐 Your CXI Web application is available at:"
echo "   Main Site: http://localhost:8888"
echo "   Functions: http://localhost:8888/.netlify/functions/"
echo ""
echo "💡 To test functions manually:"
echo "   curl -X POST http://localhost:8888/.netlify/functions/schedule-nudge \\"
echo "        -H 'Content-Type: application/json' \\"
echo "        -d '{\"email\":\"test@example.com\",\"token\":\"test-123\"}'"
