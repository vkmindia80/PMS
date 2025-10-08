#!/bin/bash
# Backend Startup Wrapper - Ensures all dependencies are met before starting
set -e

echo "🚀 Starting Backend Service..."

# Step 1: Verify system dependencies
echo "📦 Checking system dependencies..."

# Check and install libmagic if needed
if ! dpkg -l | grep -q "^ii.*libmagic1" || ! dpkg -l | grep -q "^ii.*libmagic-dev"; then
    echo "⚠️  libmagic libraries not found. Installing..."
    apt-get update -qq >/dev/null 2>&1
    apt-get install -y libmagic1 libmagic-dev >/dev/null 2>&1
    apt-get remove -y libmagic-mgc >/dev/null 2>&1 || true
    apt-get install -y libmagic1 libmagic-dev libmagic-mgc >/dev/null 2>&1
    echo "✅ libmagic libraries installed"
else
    echo "✅ libmagic libraries present"
fi

# Step 2: Verify Python can import required modules
echo "🐍 Verifying Python dependencies..."

# Test critical imports
if ! python3 -c "import magic" 2>/dev/null; then
    echo "❌ Python magic module cannot be imported"
    echo "📦 Reinstalling python-magic..."
    pip install --force-reinstall python-magic
fi

if ! python3 -c "import motor" 2>/dev/null; then
    echo "❌ Motor (MongoDB driver) not available"
    exit 1
fi

if ! python3 -c "import fastapi" 2>/dev/null; then
    echo "❌ FastAPI not available"
    exit 1
fi

echo "✅ All Python dependencies verified"

# Step 3: Wait for MongoDB to be ready
echo "🗄️  Waiting for MongoDB..."
timeout=30
counter=0
until mongosh --eval "db.adminCommand('ping')" > /dev/null 2>&1; do
    counter=$((counter + 1))
    if [ $counter -gt $timeout ]; then
        echo "❌ MongoDB not available after ${timeout} seconds"
        exit 1
    fi
    sleep 1
done
echo "✅ MongoDB is ready"

# Step 4: Start the backend server
echo "🌐 Starting FastAPI backend..."
cd /app/backend
exec python -m uvicorn server:app --host 0.0.0.0 --port 8001 --reload
