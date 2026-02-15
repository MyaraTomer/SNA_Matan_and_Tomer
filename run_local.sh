#!/bin/bash
# ============================================================================
# Start All Services Locally (No Docker)
# ============================================================================

set -e  # Exit on error

echo "============================================================================"
echo "SNA Application - Starting All Services Locally"
echo "============================================================================"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Create logs directory
mkdir -p logs

# PID file to track running processes
PID_FILE=".local_services.pid"
rm -f $PID_FILE

# ============================================================================
# Cleanup function
# ============================================================================

cleanup() {
    echo ""
    echo "Received interrupt signal. Stopping all services..."
    ./stop_local.sh
    exit 0
}

trap cleanup SIGINT SIGTERM

# ============================================================================
# Check if setup was run
# ============================================================================

if [ ! -d "backend/db-service/venv" ]; then
    echo -e "${RED}✗ Virtual environments not found${NC}"
    echo ""
    echo "Please run setup first:"
    echo "  ./setup_local.sh"
    echo ""
    exit 1
fi

# ============================================================================
# Check PostgreSQL
# ============================================================================

echo "Checking PostgreSQL..."
if ! pg_isready -q 2>/dev/null; then
    echo -e "${RED}✗ PostgreSQL is not running${NC}"
    echo ""
    echo "Please start PostgreSQL:"
    echo "  macOS: brew services start postgresql@15"
    echo "  Ubuntu: sudo systemctl start postgresql"
    echo ""
    exit 1
fi
echo -e "${GREEN}✓ PostgreSQL is running${NC}"
echo ""

# ============================================================================
# Start Services
# ============================================================================

echo "Starting services..."
echo ""

# 1. DB Service (Port 8002)
echo -e "${BLUE}[1/5]${NC} Starting DB Service (Port 8002)..."
cd backend/db-service
source venv/bin/activate
nohup python src/main.py > ../../logs/db-service.log 2>&1 &
DB_PID=$!
echo $DB_PID >> ../../$PID_FILE
echo -e "${GREEN}      ✓ DB Service started (PID: $DB_PID)${NC}"
deactivate
cd ../..

sleep 2

# 2. Flow Service (Port 8003)
echo -e "${BLUE}[2/5]${NC} Starting Flow Service (Port 8003)..."
cd backend/flow-service
source venv/bin/activate
nohup python src/main.py > ../../logs/flow-service.log 2>&1 &
FLOW_PID=$!
echo $FLOW_PID >> ../../$PID_FILE
echo -e "${GREEN}      ✓ Flow Service started (PID: $FLOW_PID)${NC}"
deactivate
cd ../..

sleep 2

# 3. Nodes Service (Port 8001)
echo -e "${BLUE}[3/5]${NC} Starting Nodes Service (Port 8001)..."
cd backend/nodes-service
source venv/bin/activate
nohup python src/main.py > ../../logs/nodes-service.log 2>&1 &
NODES_PID=$!
echo $NODES_PID >> ../../$PID_FILE
echo -e "${GREEN}      ✓ Nodes Service started (PID: $NODES_PID)${NC}"
deactivate
cd ../..

sleep 2

# 4. API Gateway (Port 8000)
echo -e "${BLUE}[4/5]${NC} Starting API Gateway (Port 8000)..."
cd backend/api-gateway
source venv/bin/activate
nohup python src/main.py > ../../logs/api-gateway.log 2>&1 &
GATEWAY_PID=$!
echo $GATEWAY_PID >> ../../$PID_FILE
echo -e "${GREEN}      ✓ API Gateway started (PID: $GATEWAY_PID)${NC}"
deactivate
cd ../..

sleep 2

# 5. Frontend (Port 5173)
echo -e "${BLUE}[5/5]${NC} Starting Frontend (Port 5173)..."
cd frontend
nohup npm run dev > ../logs/frontend.log 2>&1 &
FRONTEND_PID=$!
echo $FRONTEND_PID >> ../$PID_FILE
echo -e "${GREEN}      ✓ Frontend started (PID: $FRONTEND_PID)${NC}"
cd ..

sleep 3

# ============================================================================
# Health Checks
# ============================================================================

echo ""
echo "Performing health checks..."
echo ""

check_health() {
    local name=$1
    local url=$2
    local max_attempts=10
    local attempt=1
    
    while [ $attempt -le $max_attempts ]; do
        if curl -s -f "$url" > /dev/null 2>&1; then
            echo -e "${GREEN}✓ $name is healthy${NC}"
            return 0
        fi
        sleep 1
        attempt=$((attempt + 1))
    done
    
    echo -e "${YELLOW}⚠ $name did not respond (may still be starting)${NC}"
    return 1
}

check_health "DB Service      " "http://localhost:8002/health"
check_health "Flow Service    " "http://localhost:8003/health"
check_health "Nodes Service   " "http://localhost:8001/health"
check_health "API Gateway     " "http://localhost:8000/health"
check_health "Frontend        " "http://localhost:5173"

echo ""

# ============================================================================
# Summary
# ============================================================================

echo "============================================================================"
echo -e "${GREEN}✓ All Services Started!${NC}"
echo "============================================================================"
echo ""
echo "Services:"
echo "  • DB Service:      http://localhost:8002/health"
echo "  • Flow Service:    http://localhost:8003/health"
echo "  • Nodes Service:   http://localhost:8001/health"
echo "  • API Gateway:     http://localhost:8000/health"
echo "  • Frontend:        http://localhost:5173"
echo ""
echo "Application URL:"
echo -e "  ${GREEN}➜${NC} http://localhost:5173"
echo ""
echo "Logs:"
echo "  • DB Service:      tail -f logs/db-service.log"
echo "  • Flow Service:    tail -f logs/flow-service.log"
echo "  • Nodes Service:   tail -f logs/nodes-service.log"
echo "  • API Gateway:     tail -f logs/api-gateway.log"
echo "  • Frontend:        tail -f logs/frontend.log"
echo ""
echo "To stop all services:"
echo "  ./stop_local.sh"
echo ""
echo "To view all logs:"
echo "  tail -f logs/*.log"
echo ""
echo "============================================================================"
echo ""

# Keep script running to maintain foreground process
# Press Ctrl+C to stop all services
echo "Press Ctrl+C to stop all services..."
echo ""

# Wait indefinitely
while true; do
    sleep 1
done
