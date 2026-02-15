#!/bin/bash
# ============================================================================
# Local Development Setup Script (No Docker)
# Run this ONCE to set up your local environment
# ============================================================================

set -e  # Exit on error

echo "============================================================================"
echo "SNA Application - Local Development Setup"
echo "============================================================================"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# ============================================================================
# 1. Check Prerequisites
# ============================================================================

echo "Step 1: Checking prerequisites..."
echo ""

# Check Python
if ! command -v python3 &> /dev/null; then
    echo -e "${RED}✗ Python 3 is not installed${NC}"
    echo "  Please install Python 3.8 or higher"
    exit 1
fi
PYTHON_VERSION=$(python3 --version)
echo -e "${GREEN}✓ Python found: $PYTHON_VERSION${NC}"

# Check Node.js
if ! command -v node &> /dev/null; then
    echo -e "${RED}✗ Node.js is not installed${NC}"
    echo "  Please install Node.js 16 or higher"
    exit 1
fi
NODE_VERSION=$(node --version)
echo -e "${GREEN}✓ Node.js found: $NODE_VERSION${NC}"

# Check npm
if ! command -v npm &> /dev/null; then
    echo -e "${RED}✗ npm is not installed${NC}"
    exit 1
fi
NPM_VERSION=$(npm --version)
echo -e "${GREEN}✓ npm found: $NPM_VERSION${NC}"

# Check PostgreSQL
if ! command -v psql &> /dev/null; then
    echo -e "${YELLOW}⚠ PostgreSQL client (psql) not found${NC}"
    echo "  Please install PostgreSQL 13 or higher"
    echo "  macOS: brew install postgresql@15"
    echo "  Ubuntu: sudo apt-get install postgresql-15"
    exit 1
fi
POSTGRES_VERSION=$(psql --version)
echo -e "${GREEN}✓ PostgreSQL found: $POSTGRES_VERSION${NC}"

echo ""

# ============================================================================
# 2. Create Python Virtual Environments
# ============================================================================

echo "Step 2: Creating Python virtual environments..."
echo ""

# DB Service
echo "  → Creating venv for db-service..."
cd backend/db-service
python3 -m venv venv
source venv/bin/activate
pip install --upgrade pip > /dev/null
pip install -r requirements.txt
deactivate
cd ../..
echo -e "${GREEN}  ✓ db-service venv created${NC}"

# Flow Service
echo "  → Creating venv for flow-service..."
cd backend/flow-service
python3 -m venv venv
source venv/bin/activate
pip install --upgrade pip > /dev/null
pip install -r requirements.txt
deactivate
cd ../..
echo -e "${GREEN}  ✓ flow-service venv created${NC}"

# Nodes Service
echo "  → Creating venv for nodes-service..."
cd backend/nodes-service
python3 -m venv venv
source venv/bin/activate
pip install --upgrade pip > /dev/null
pip install -r requirements.txt
deactivate
cd ../..
echo -e "${GREEN}  ✓ nodes-service venv created${NC}"

# API Gateway
echo "  → Creating venv for api-gateway..."
cd backend/api-gateway
python3 -m venv venv
source venv/bin/activate
pip install --upgrade pip > /dev/null
pip install -r requirements.txt
deactivate
cd ../..
echo -e "${GREEN}  ✓ api-gateway venv created${NC}"

echo ""

# ============================================================================
# 3. Install Frontend Dependencies
# ============================================================================

echo "Step 3: Installing frontend dependencies..."
echo ""

cd frontend
npm install
cd ..
echo -e "${GREEN}✓ Frontend dependencies installed${NC}"

echo ""

# ============================================================================
# 4. Setup PostgreSQL Database
# ============================================================================

echo "Step 4: Setting up PostgreSQL database..."
echo ""

# Database credentials
DB_NAME="sna_db"
DB_USER="sna_user"
DB_PASSWORD="sna_password"

echo "  Database: $DB_NAME"
echo "  User: $DB_USER"
echo "  Password: $DB_PASSWORD"
echo ""

# Check if PostgreSQL is running
if ! pg_isready -q 2>/dev/null; then
    echo -e "${YELLOW}⚠ PostgreSQL is not running${NC}"
    echo "  Please start PostgreSQL:"
    echo "    macOS: brew services start postgresql@15"
    echo "    Ubuntu: sudo systemctl start postgresql"
    echo ""
    echo "  Then run this script again."
    exit 1
fi

echo "  → PostgreSQL is running"

# Create database and user
echo "  → Creating database and user..."
echo ""
echo "  You may be prompted for your PostgreSQL superuser password."
echo ""

# Try to create user and database
psql -U postgres -c "CREATE USER $DB_USER WITH PASSWORD '$DB_PASSWORD';" 2>/dev/null || \
psql postgres -c "CREATE USER $DB_USER WITH PASSWORD '$DB_PASSWORD';" 2>/dev/null || \
echo "  (User may already exist)"

psql -U postgres -c "CREATE DATABASE $DB_NAME OWNER $DB_USER;" 2>/dev/null || \
psql postgres -c "CREATE DATABASE $DB_NAME OWNER $DB_USER;" 2>/dev/null || \
echo "  (Database may already exist)"

psql -U postgres -c "GRANT ALL PRIVILEGES ON DATABASE $DB_NAME TO $DB_USER;" 2>/dev/null || \
psql postgres -c "GRANT ALL PRIVILEGES ON DATABASE $DB_NAME TO $DB_USER;" 2>/dev/null || true

echo ""
echo -e "${GREEN}✓ Database and user created${NC}"

# Initialize database schema
echo "  → Initializing database schema..."
psql -U $DB_USER -d $DB_NAME -f backend/db-service/src/migrations/init.sql

echo -e "${GREEN}✓ Database schema initialized${NC}"

echo ""

# ============================================================================
# 5. Create .env files (optional)
# ============================================================================

echo "Step 5: Creating .env files..."
echo ""

# DB Service .env
cat > backend/db-service/.env << EOF
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_DB=$DB_NAME
POSTGRES_USER=$DB_USER
POSTGRES_PASSWORD=$DB_PASSWORD
SERVICE_PORT=8002
SERVICE_HOST=0.0.0.0
EOF
echo -e "${GREEN}✓ Created backend/db-service/.env${NC}"

# Flow Service .env
cat > backend/flow-service/.env << EOF
SERVICE_PORT=8003
SERVICE_HOST=0.0.0.0
EOF
echo -e "${GREEN}✓ Created backend/flow-service/.env${NC}"

# Nodes Service .env
cat > backend/nodes-service/.env << EOF
SERVICE_PORT=8001
SERVICE_HOST=0.0.0.0
DB_SERVICE_URL=http://localhost:8002
FLOW_SERVICE_URL=http://localhost:8003
EOF
echo -e "${GREEN}✓ Created backend/nodes-service/.env${NC}"

# API Gateway .env
cat > backend/api-gateway/.env << EOF
SERVICE_PORT=8000
SERVICE_HOST=0.0.0.0
NODES_SERVICE_URL=http://localhost:8001
EOF
echo -e "${GREEN}✓ Created backend/api-gateway/.env${NC}"

# Frontend .env
cat > frontend/.env << EOF
VITE_API_URL=http://localhost:8000
EOF
echo -e "${GREEN}✓ Created frontend/.env${NC}"

echo ""

# ============================================================================
# Done!
# ============================================================================

echo "============================================================================"
echo -e "${GREEN}✓ Setup Complete!${NC}"
echo "============================================================================"
echo ""
echo "You can now start the application with:"
echo "  ./run_local.sh"
echo ""
echo "To stop all services:"
echo "  ./stop_local.sh"
echo ""
