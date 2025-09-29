#!/bin/bash

# Phase 4.1 System Verification & Sample Data Loading Script
# Comprehensive verification and data loading for Enterprise Portfolio Management System

echo "🚀 Phase 4.1 System Verification & Sample Data Loading"
echo "=================================================================="

# Set colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Check if we're in the right directory
if [ ! -f "/app/backend/server.py" ]; then
    echo -e "${RED}❌ Error: Not in the correct directory. Please run from /app${NC}"
    exit 1
fi

# Check if services are running
echo -e "${BLUE}🔍 Checking system services...${NC}"
sudo supervisorctl status

# Function to check service status
check_service() {
    local service_name=$1
    if sudo supervisorctl status | grep -q "$service_name.*RUNNING"; then
        echo -e "${GREEN}✅ $service_name is running${NC}"
        return 0
    else
        echo -e "${RED}❌ $service_name is not running${NC}"
        return 1
    fi
}

# Check required services
services_ok=true
check_service "backend" || services_ok=false
check_service "frontend" || services_ok=false
check_service "mongodb" || services_ok=false

if [ "$services_ok" = false ]; then
    echo -e "${YELLOW}⚠️  Some services are not running. Attempting to restart...${NC}"
    sudo supervisorctl restart all
    sleep 5
    
    # Check again
    services_ok=true
    check_service "backend" || services_ok=false
    check_service "frontend" || services_ok=false
    check_service "mongodb" || services_ok=false
    
    if [ "$services_ok" = false ]; then
        echo -e "${RED}❌ Unable to start all required services. Please check the logs.${NC}"
        echo "Backend logs:"
        tail -10 /var/log/supervisor/backend.err.log
        exit 1
    fi
fi

echo -e "${GREEN}✅ All required services are running${NC}"

# Install Python dependencies if needed
echo -e "${BLUE}📦 Installing required Python packages...${NC}"
cd /app/backend
pip install colorama httpx > /dev/null 2>&1

# Option 1: Load Sample Data
echo ""
echo -e "${YELLOW}Choose an operation:${NC}"
echo "1. Load comprehensive sample data for all modules"
echo "2. Run system verification & testing"
echo "3. Run both (load data + verification)"
echo "4. Quick health check only"

read -p "Enter your choice (1-4): " choice

case $choice in
    1)
        echo -e "${BLUE}📥 Loading comprehensive sample data...${NC}"
        python3 master_sample_data_loader.py
        if [ $? -eq 0 ]; then
            echo -e "${GREEN}✅ Sample data loading completed successfully${NC}"
        else
            echo -e "${RED}❌ Sample data loading failed${NC}"
            exit 1
        fi
        ;;
    2)
        echo -e "${BLUE}🔍 Running system verification & testing...${NC}"
        python3 phase_4_1_system_verification.py
        if [ $? -eq 0 ]; then
            echo -e "${GREEN}✅ System verification completed successfully${NC}"
        else
            echo -e "${RED}❌ System verification failed${NC}"
            exit 1
        fi
        ;;
    3)
        echo -e "${BLUE}📥 Loading comprehensive sample data...${NC}"
        python3 master_sample_data_loader.py
        if [ $? -eq 0 ]; then
            echo -e "${GREEN}✅ Sample data loading completed${NC}"
        else
            echo -e "${RED}❌ Sample data loading failed${NC}"
            exit 1
        fi
        
        echo ""
        echo -e "${BLUE}🔍 Running system verification & testing...${NC}"
        python3 phase_4_1_system_verification.py
        if [ $? -eq 0 ]; then
            echo -e "${GREEN}✅ System verification completed successfully${NC}"
        else
            echo -e "${RED}❌ System verification failed${NC}"
            exit 1
        fi
        ;;
    4)
        echo -e "${BLUE}🏥 Running quick health check...${NC}"
        
        # Test backend health
        if curl -s http://localhost:8001/api/health > /dev/null; then
            echo -e "${GREEN}✅ Backend API is healthy${NC}"
        else
            echo -e "${RED}❌ Backend API is not responding${NC}"
        fi
        
        # Test frontend
        if curl -s http://localhost:3000 > /dev/null; then
            echo -e "${GREEN}✅ Frontend is accessible${NC}"
        else
            echo -e "${RED}❌ Frontend is not accessible${NC}"
        fi
        
        # Test database
        db_status=$(curl -s http://localhost:8001/api/database/status | grep -o '"status":"[^"]*"' | cut -d'"' -f4)
        if [ "$db_status" = "connected" ]; then
            echo -e "${GREEN}✅ Database is connected${NC}"
        else
            echo -e "${RED}❌ Database connection failed${NC}"
        fi
        ;;
    *)
        echo -e "${RED}❌ Invalid choice${NC}"
        exit 1
        ;;
esac

echo ""
echo -e "${GREEN}🎉 Phase 4.1 operations completed!${NC}"
echo ""
echo -e "${BLUE}🌐 Access Points:${NC}"
echo "  • Frontend: http://localhost:3000"
echo "  • Backend API: http://localhost:8001"
echo "  • API Documentation: http://localhost:8001/docs"
echo "  • Demo Login: demo@company.com / demo123456"
echo ""
echo -e "${YELLOW}📋 Reports saved in /app/backend/ directory${NC}"
echo "=================================================================="