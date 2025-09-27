#!/bin/bash

# Enterprise Portfolio Management - Service Startup Script
# Ensures both backend and frontend start properly for external access

echo "🚀 Starting Enterprise Portfolio Management Services..."

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to check if service is running
check_service() {
    local port=$1
    local name=$2
    
    if netstat -tlnp | grep -q ":$port "; then
        echo -e "${GREEN}✅ $name is running on port $port${NC}"
        return 0
    else
        echo -e "⚠️  $name is not running on port $port"
        return 1
    fi
}

# 1. Start Backend (should be running via supervisor)
echo -e "\n${BLUE}1. Checking Backend Service...${NC}"
if ! check_service 8001 "Backend API"; then
    echo "Starting backend via supervisor..."
    sudo supervisorctl start backend
    sleep 3
fi

# 2. Start Frontend (manual start with proper network binding)
echo -e "\n${BLUE}2. Starting Frontend Service...${NC}"

# Kill any existing frontend processes
pkill -f "vite.*3000" 2>/dev/null
pkill -f "yarn dev" 2>/dev/null

# Start frontend with proper network binding
cd /app/frontend
export HOST=0.0.0.0
export PORT=3000
nohup yarn dev > /tmp/frontend_service.log 2>&1 &

# Wait for frontend to start
echo "Waiting for frontend to start..."
sleep 8

if check_service 3000 "Frontend"; then
    echo -e "${GREEN}✅ All services started successfully!${NC}"
else
    echo "❌ Frontend failed to start. Check logs:"
    echo "  tail -f /tmp/frontend_service.log"
    exit 1
fi

# 3. Validate external access
echo -e "\n${BLUE}3. Testing External Access...${NC}"
HOSTNAME=$(hostname -f 2>/dev/null || echo "localhost")

if [[ "$HOSTNAME" == *"emergentagent.com"* ]]; then
    # Test the external URL
    if curl -s -I https://$HOSTNAME | grep -q "200 OK"; then
        echo -e "${GREEN}✅ External access working: https://$HOSTNAME${NC}"
    else
        echo "⚠️  External access test inconclusive"
    fi
fi

# 4. Display service URLs
echo -e "\n${BLUE}🌐 Service URLs:${NC}"
echo "  • Backend API: http://localhost:8001"
echo "  • Frontend: http://localhost:3000"
echo "  • API Docs: http://localhost:8001/docs"

if [[ "$HOSTNAME" == *"emergentagent.com"* ]]; then
    echo "  • External: https://$HOSTNAME"
fi

echo -e "\n${BLUE}📋 Demo Credentials:${NC}"
echo "  • Email: demo@company.com"
echo "  • Password: demo123456"

echo -e "\n${GREEN}🎉 All services ready!${NC}"