#!/bin/bash
# Enterprise Portfolio Management - Startup Script
# This script ensures all dependencies are installed and services are started correctly

set -e

echo "🚀 Starting Enterprise Portfolio Management System..."

# Step 1: Ensure system dependencies
echo "📦 Step 1: Verifying system dependencies..."
bash /app/scripts/ensure_dependencies.sh

# Step 2: Check MongoDB connection
echo "🗄️  Step 2: Checking MongoDB connection..."
timeout=30
counter=0
until mongosh --eval "db.adminCommand('ping')" > /dev/null 2>&1; do
    counter=$((counter + 1))
    if [ $counter -gt $timeout ]; then
        echo "❌ MongoDB not available after ${timeout} seconds"
        exit 1
    fi
    echo "⏳ Waiting for MongoDB... ($counter/$timeout)"
    sleep 1
done
echo "✅ MongoDB is ready"

# Step 3: Verify backend can start
echo "🔧 Step 3: Verifying backend configuration..."
cd /app/backend
if python3 -c "import server" 2>/dev/null; then
    echo "✅ Backend configuration valid"
else
    echo "⚠️  Backend configuration test failed, but will try to start anyway"
fi

# Step 4: Check if backend is running
echo "🌐 Step 4: Checking backend service..."
if curl -s http://localhost:8001/api/health > /dev/null 2>&1; then
    echo "✅ Backend is already running"
else
    echo "⏳ Backend not responding, waiting for supervisor to start it..."
fi

# Step 5: Display system status
echo ""
echo "📊 System Status:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
supervisorctl status
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "✅ Startup sequence complete!"
echo ""
echo "🌐 Access Points:"
echo "   Frontend: http://localhost:3000"
echo "   Backend:  http://localhost:8001"
echo "   API Docs: http://localhost:8001/docs"
echo ""
