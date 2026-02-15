#!/bin/bash
# ============================================================================
# Stop All Services
# ============================================================================

echo "============================================================================"
echo "SNA Application - Stopping All Services"
echo "============================================================================"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

PID_FILE=".local_services.pid"

# ============================================================================
# Stop services by PID file
# ============================================================================

if [ -f "$PID_FILE" ]; then
    echo "Stopping services from PID file..."
    echo ""
    
    while read pid; do
        if ps -p $pid > /dev/null 2>&1; then
            echo "  → Stopping process $pid..."
            kill $pid 2>/dev/null || kill -9 $pid 2>/dev/null
            echo -e "${GREEN}    ✓ Process $pid stopped${NC}"
        else
            echo -e "${YELLOW}    ⚠ Process $pid not running${NC}"
        fi
    done < "$PID_FILE"
    
    rm -f "$PID_FILE"
    echo ""
fi

# ============================================================================
# Stop services by port (fallback)
# ============================================================================

echo "Checking for processes on ports..."
echo ""

stop_process_on_port() {
    local port=$1
    local name=$2
    
    local pid=$(lsof -ti:$port 2>/dev/null)
    
    if [ -n "$pid" ]; then
        echo "  → Stopping $name on port $port (PID: $pid)..."
        kill $pid 2>/dev/null || kill -9 $pid 2>/dev/null
        echo -e "${GREEN}    ✓ $name stopped${NC}"
    else
        echo -e "${YELLOW}    ⚠ No process on port $port${NC}"
    fi
}

stop_process_on_port 8002 "DB Service"
stop_process_on_port 8003 "Flow Service"
stop_process_on_port 8001 "Nodes Service"
stop_process_on_port 8000 "API Gateway"
stop_process_on_port 5173 "Frontend"

echo ""

# ============================================================================
# Summary
# ============================================================================

echo "============================================================================"
echo -e "${GREEN}✓ All services stopped${NC}"
echo "============================================================================"
echo ""
