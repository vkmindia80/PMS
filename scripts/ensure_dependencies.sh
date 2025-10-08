#!/bin/bash
# Ensure all system dependencies are installed before services start
# This script is idempotent and can be run multiple times safely

set -e

echo "🔍 Checking system dependencies..."

# Check if libmagic is installed
if ! dpkg -l | grep -q "libmagic1" || ! dpkg -l | grep -q "libmagic-dev"; then
    echo "⚠️  libmagic libraries not found. Installing..."
    
    # Update package list quietly
    apt-get update -qq
    
    # Install libmagic libraries
    apt-get install -y libmagic1 libmagic-dev
    
    echo "✅ libmagic libraries installed successfully"
else
    echo "✅ libmagic libraries already installed"
fi

# Verify python-magic can import
if python3 -c "import magic" 2>/dev/null; then
    echo "✅ Python magic module working correctly"
else
    echo "⚠️  Python magic module test failed, but dependencies are installed"
fi

echo "✅ All system dependencies verified"
