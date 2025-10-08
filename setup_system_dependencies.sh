#!/bin/bash

# Enterprise Portfolio Management - System Dependencies Setup
# This script installs all required system-level dependencies
# Run this script if you encounter missing library errors

echo "🔧 Setting up system dependencies for Enterprise Portfolio Management..."

# Update package list
echo "📦 Updating package list..."
apt-get update -qq

# Install libmagic (required by python-magic for file type detection)
echo "📦 Installing libmagic1 and libmagic-dev..."
apt-get install -y libmagic1 libmagic-dev

# Verify installation
if dpkg -l | grep -q libmagic1 && dpkg -l | grep -q libmagic-dev; then
    echo "✅ libmagic1 and libmagic-dev installed successfully"
else
    echo "❌ Failed to install libmagic libraries"
    exit 1
fi

# List of other system dependencies that might be needed
# Uncomment if additional dependencies are required in the future
# apt-get install -y \
#   build-essential \
#   python3-dev \
#   libffi-dev \
#   libssl-dev

echo "✅ All system dependencies installed successfully!"
echo ""
echo "🔄 You may need to restart the backend service:"
echo "   sudo supervisorctl restart backend"
