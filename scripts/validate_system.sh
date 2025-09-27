#!/bin/bash

# System Validation Script for Enterprise Portfolio Management
# This script validates that all services are running and demo data is available

echo "🔍 Enterprise Portfolio Management - System Validation"
echo "=================================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print status
print_status() {
    if [ $1 -eq 0 ]; then
        echo -e "${GREEN}✅ $2${NC}"
    else
        echo -e "${RED}❌ $2${NC}"
    fi
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

# 1. Check MongoDB
echo -e "\n${BLUE}1. Checking MongoDB...${NC}"
if pgrep -x "mongod" > /dev/null; then
    print_status 0 "MongoDB is running"
else
    print_status 1 "MongoDB is not running"
fi

# 2. Check Backend Service
echo -e "\n${BLUE}2. Checking Backend Service...${NC}"
BACKEND_HEALTH=$(curl -s http://localhost:8001/api/health 2>/dev/null)
if echo "$BACKEND_HEALTH" | grep -q "healthy"; then
    print_status 0 "Backend API is healthy"
    print_info "Backend URL: http://localhost:8001"
else
    print_status 1 "Backend API is not responding"
fi

# 3. Check Frontend Service
echo -e "\n${BLUE}3. Checking Frontend Service...${NC}"
FRONTEND_STATUS=$(curl -s -I http://localhost:3000 2>/dev/null | head -n 1)
if echo "$FRONTEND_STATUS" | grep -q "200 OK"; then
    print_status 0 "Frontend is accessible"
    print_info "Frontend URL: http://localhost:3000"
else
    print_status 1 "Frontend is not accessible"
fi

# 4. Test Demo Credentials
echo -e "\n${BLUE}4. Validating Demo Credentials...${NC}"
DEMO_LOGIN=$(curl -s -X POST http://localhost:8001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "demo@company.com", "password": "demo123456"}' 2>/dev/null)

if echo "$DEMO_LOGIN" | grep -q "access_token"; then
    print_status 0 "Demo credentials are working"
    print_info "Email: demo@company.com"
    print_info "Password: demo123456"
else
    print_status 1 "Demo credentials failed"
    print_warning "You may need to run: python /app/backend/create_demo_user.py"
fi

# 5. Check External Access (if on emergentagent.com)
echo -e "\n${BLUE}5. Checking External Access...${NC}"
HOSTNAME=$(hostname -f 2>/dev/null || echo "localhost")

if [[ "$HOSTNAME" == *"emergentagent.com"* ]]; then
    EXTERNAL_HEALTH=$(curl -s https://$HOSTNAME/api/health 2>/dev/null || curl -s http://$HOSTNAME/api/health 2>/dev/null)
    if echo "$EXTERNAL_HEALTH" | grep -q "healthy"; then
        print_status 0 "External access working"
        print_info "External URL: https://$HOSTNAME"
    else
        print_status 1 "External access not working"
    fi
else
    print_info "Local environment - external access test skipped"
fi

# 6. Check Database Collections
echo -e "\n${BLUE}6. Checking Database Collections...${NC}"
DB_STATUS=$(curl -s http://localhost:8001/api/database/status 2>/dev/null)
if echo "$DB_STATUS" | grep -q "connected"; then
    print_status 0 "Database collections accessible"
    
    # Extract collection counts
    USERS=$(echo "$DB_STATUS" | grep -o '"users":[0-9]*' | cut -d':' -f2)
    ORGS=$(echo "$DB_STATUS" | grep -o '"organizations":[0-9]*' | cut -d':' -f2)
    
    if [ ! -z "$USERS" ] && [ "$USERS" -gt 0 ]; then
        print_info "Users in database: $USERS"
    fi
    
    if [ ! -z "$ORGS" ] && [ "$ORGS" -gt 0 ]; then
        print_info "Organizations in database: $ORGS"
    fi
else
    print_status 1 "Database status check failed"
fi

# 7. Supervisor Status
echo -e "\n${BLUE}7. Supervisor Services Status...${NC}"
if command -v supervisorctl >/dev/null 2>&1; then
    SUPERVISOR_STATUS=$(sudo supervisorctl status 2>/dev/null)
    
    if echo "$SUPERVISOR_STATUS" | grep -q "RUNNING"; then
        print_status 0 "Supervisor services are running"
        
        # Show individual service status
        while IFS= read -r line; do
            if echo "$line" | grep -q "RUNNING"; then
                SERVICE=$(echo "$line" | awk '{print $1}')
                print_info "✓ $SERVICE is running"
            elif echo "$line" | grep -q "FATAL\|ERROR"; then
                SERVICE=$(echo "$line" | awk '{print $1}')
                print_warning "✗ $SERVICE has issues"
            fi
        done <<< "$SUPERVISOR_STATUS"
    else
        print_status 1 "Supervisor services have issues"
    fi
else
    print_warning "Supervisor not available"
fi

# Summary
echo -e "\n${BLUE}📊 System Validation Summary${NC}"
echo "================================="
print_info "System Status: All core services should be running"
print_info "Demo Login: demo@company.com / demo123456"
print_info "API Documentation: http://localhost:8001/docs"
print_info "Frontend Access: http://localhost:3000"

echo -e "\n${YELLOW}🚀 Ready for Phase 2.2: Project Creation & Management!${NC}"
echo ""