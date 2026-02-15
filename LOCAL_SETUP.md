# Local Development Setup (No Docker)

This guide explains how to run the SNA application locally without Docker.

## Prerequisites

Make sure you have the following installed:

- **Python 3.8+** ([Download](https://www.python.org/downloads/))
- **Node.js 16+** ([Download](https://nodejs.org/))
- **PostgreSQL 13+** ([Download](https://www.postgresql.org/download/))
  - macOS: `brew install postgresql@15`
  - Ubuntu: `sudo apt-get install postgresql-15`

## Quick Start

### 1. First Time Setup

Run the setup script **once** to install dependencies and configure the database:

```bash
./setup_local.sh
```

This script will:
- Create Python virtual environments for each service
- Install Python dependencies
- Install Node.js dependencies for frontend
- Create PostgreSQL database and user
- Initialize database schema
- Create `.env` files for all services

### 2. Start All Services

```bash
./run_local.sh
```

This will start all 5 services:
- **DB Service** (Port 8002)
- **Flow Service** (Port 8003)
- **Nodes Service** (Port 8001)
- **API Gateway** (Port 8000)
- **Frontend** (Port 5173)

The application will be available at: **http://localhost:5173**

### 3. Stop All Services

Press `Ctrl+C` in the terminal running `run_local.sh`, or run:

```bash
./stop_local.sh
```

## Manual Setup (Alternative)

If you prefer to set up manually:

### 1. Install Dependencies

```bash
# DB Service
cd backend/db-service
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
deactivate
cd ../..

# Flow Service
cd backend/flow-service
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
deactivate
cd ../..

# Nodes Service
cd backend/nodes-service
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
deactivate
cd ../..

# API Gateway
cd backend/api-gateway
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
deactivate
cd ../..

# Frontend
cd frontend
npm install
cd ..
```

### 2. Setup PostgreSQL Database

```bash
# Start PostgreSQL (if not running)
# macOS:
brew services start postgresql@15

# Ubuntu:
sudo systemctl start postgresql

# Create database and user
psql -U postgres -c "CREATE USER sna_user WITH PASSWORD 'sna_password';"
psql -U postgres -c "CREATE DATABASE sna_db OWNER sna_user;"
psql -U postgres -c "GRANT ALL PRIVILEGES ON DATABASE sna_db TO sna_user;"

# Initialize schema
psql -U sna_user -d sna_db -f backend/db-service/src/migrations/init.sql
```

### 3. Create .env Files

Create `.env` files for each service with the following content:

**backend/db-service/.env**
```
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_DB=sna_db
POSTGRES_USER=sna_user
POSTGRES_PASSWORD=sna_password
SERVICE_PORT=8002
SERVICE_HOST=0.0.0.0
```

**backend/flow-service/.env**
```
SERVICE_PORT=8003
SERVICE_HOST=0.0.0.0
```

**backend/nodes-service/.env**
```
SERVICE_PORT=8001
SERVICE_HOST=0.0.0.0
DB_SERVICE_URL=http://localhost:8002
FLOW_SERVICE_URL=http://localhost:8003
```

**backend/api-gateway/.env**
```
SERVICE_PORT=8000
SERVICE_HOST=0.0.0.0
NODES_SERVICE_URL=http://localhost:8001
```

**frontend/.env**
```
VITE_API_URL=http://localhost:8000
```

### 4. Start Services Manually

Open 5 separate terminals and run:

```bash
# Terminal 1 - DB Service
cd backend/db-service
source venv/bin/activate
python src/main.py

# Terminal 2 - Flow Service
cd backend/flow-service
source venv/bin/activate
python src/main.py

# Terminal 3 - Nodes Service
cd backend/nodes-service
source venv/bin/activate
python src/main.py

# Terminal 4 - API Gateway
cd backend/api-gateway
source venv/bin/activate
python src/main.py

# Terminal 5 - Frontend
cd frontend
npm run dev
```

## Viewing Logs

When using `run_local.sh`, all logs are saved in the `logs/` directory:

```bash
# View all logs
tail -f logs/*.log

# View specific service
tail -f logs/db-service.log
tail -f logs/flow-service.log
tail -f logs/nodes-service.log
tail -f logs/api-gateway.log
tail -f logs/frontend.log
```

## Troubleshooting

### PostgreSQL Connection Error

If you get a PostgreSQL connection error:

1. Check if PostgreSQL is running:
   ```bash
   pg_isready
   ```

2. Start PostgreSQL:
   ```bash
   # macOS:
   brew services start postgresql@15
   
   # Ubuntu:
   sudo systemctl start postgresql
   ```

3. Verify credentials in `.env` files match your PostgreSQL setup

### Port Already in Use

If a port is already in use, find and kill the process:

```bash
# Find process on port (e.g., 8000)
lsof -ti:8000

# Kill process
kill $(lsof -ti:8000)

# Or use stop_local.sh
./stop_local.sh
```

### Service Won't Start

1. Check the logs for that service:
   ```bash
   tail -f logs/[service-name].log
   ```

2. Verify dependencies are installed:
   ```bash
   cd backend/[service-name]
   source venv/bin/activate
   pip list
   ```

3. Re-run setup:
   ```bash
   ./setup_local.sh
   ```

## Development Tips

### Auto-Reload

All services have auto-reload enabled during development:
- Python services use `uvicorn` with `reload=True`
- Frontend uses Vite dev server with hot module replacement (HMR)

Just save your changes and the services will automatically restart.

### Database Reset

To reset the database:

```bash
# Drop and recreate database
psql -U postgres -c "DROP DATABASE sna_db;"
psql -U postgres -c "CREATE DATABASE sna_db OWNER sna_user;"
psql -U sna_user -d sna_db -f backend/db-service/src/migrations/init.sql
```

### Running Individual Services

You can start services individually for debugging:

```bash
cd backend/[service-name]
source venv/bin/activate
python src/main.py
```

## Architecture

```
Frontend (5173)
    ↓
API Gateway (8000) ← Entry point
    ↓
Nodes Service (8001) ← Business logic
    ↓         ↓
DB Service  Flow Service
  (8002)      (8003)
    ↓
PostgreSQL (5432)
```

## Moving to a New PC

1. **Clone the repository:**
   ```bash
   git clone <your-repo-url>
   cd SNA_Matan_and_Tomer
   ```

2. **Install prerequisites** (Python, Node.js, PostgreSQL)

3. **Run setup:**
   ```bash
   ./setup_local.sh
   ```

4. **Start the application:**
   ```bash
   ./run_local.sh
   ```

That's it! The setup script handles everything else.

## Switching Between Local and Docker

### Using Local (No Docker)
```bash
./run_local.sh
```

### Using Docker
```bash
docker-compose up --build
```

Both setups use the same codebase, just different execution environments.
