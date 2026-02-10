# 🚀 SNA Microservices - Setup Guide

## Overview

This is the NEW microservices architecture for the SNA application. The system consists of:

- **Frontend** (React + Vite) - Port 5173
- **API Gateway** (Python/FastAPI) - Port 8000
- **Nodes Service** (Python/FastAPI) - Port 8001  
- **DB Service** (Python/FastAPI) - Port 8002
- **Flow Service** (Python/FastAPI - Mock) - Port 8003
- **PostgreSQL** - Port 5432

---

## 🐳 **Quick Start with Docker (Recommended)**

### Prerequisites
- Docker Desktop installed and running
- Docker Compose v2+

### Steps

1. **Clone/Navigate to project**
```bash
cd /Users/tomermyara/dev/SNA_Matan_and_Tomer
```

2. **Build and start all services**
```bash
docker-compose up --build
```

This will:
- Build all Docker images
- Start PostgreSQL and wait for it to be healthy
- Start all backend services in order
- Start the frontend
- Initialize the database with schema

3. **Access the application**
- Frontend: http://localhost:5173
- API Gateway: http://localhost:8000
- API Docs: http://localhost:8000/docs (Swagger UI)

4. **Stop all services**
```bash
docker-compose down
```

5. **Stop and remove volumes (clean database)**
```bash
docker-compose down -v
```

---

## 💻 **Local Development Setup (Without Docker)**

### Prerequisites
- Python 3.11+
- Node.js 20+
- PostgreSQL 15+

### 1. Database Setup

```bash
# Install PostgreSQL (macOS)
brew install postgresql@15

# Start PostgreSQL
brew services start postgresql@15

# Create database and user
psql postgres
```

```sql
CREATE DATABASE sna_db;
CREATE USER sna_user WITH PASSWORD 'sna_password';
GRANT ALL PRIVILEGES ON DATABASE sna_db TO sna_user;
\q
```

```bash
# Initialize schema
psql -U sna_user -d sna_db -f backend/db-service/src/migrations/init.sql
```

### 2. Backend Services

**Terminal 1 - DB Service**
```bash
cd backend/db-service
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# Create .env file
cat > .env << EOF
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_DB=sna_db
POSTGRES_USER=sna_user
POSTGRES_PASSWORD=sna_password
SERVICE_PORT=8002
SERVICE_HOST=0.0.0.0
EOF

# Run service
cd src
python main.py
```

**Terminal 2 - Flow Service**
```bash
cd backend/flow-service
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# Create .env file
cat > .env << EOF
SERVICE_PORT=8003
SERVICE_HOST=0.0.0.0
EOF

# Run service
cd src
python main.py
```

**Terminal 3 - Nodes Service**
```bash
cd backend/nodes-service
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# Create .env file
cat > .env << EOF
SERVICE_PORT=8001
SERVICE_HOST=0.0.0.0
DB_SERVICE_URL=http://localhost:8002
FLOW_SERVICE_URL=http://localhost:8003
EOF

# Run service
cd src
python main.py
```

**Terminal 4 - API Gateway**
```bash
cd backend/api-gateway
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# Create .env file
cat > .env << EOF
SERVICE_PORT=8000
SERVICE_HOST=0.0.0.0
NODES_SERVICE_URL=http://localhost:8001
EOF

# Run service
cd src
python main.py
```

### 3. Frontend

**Terminal 5 - Frontend**
```bash
cd frontend
npm install

# Create .env file
echo "VITE_API_URL=http://localhost:8000" > .env

# Run development server
npm run dev
```

---

## 🧪 **Testing the Setup**

### 1. Health Checks

```bash
# Check all services
curl http://localhost:8000/health  # API Gateway
curl http://localhost:8001/health  # Nodes Service
curl http://localhost:8002/health  # DB Service
curl http://localhost:8003/health  # Flow Service
```

### 2. Test Data Flow

```bash
# Create a project
curl -X POST http://localhost:8000/api/projects \
  -H "Content-Type: application/json" \
  -d '{"name": "Test Project"}'

# List projects
curl http://localhost:8000/api/projects
```

### 3. Frontend
- Open http://localhost:5173
- You should see the project selector modal
- Create a new project or select existing
- You'll see the landing page (when frontend is updated)

---

## 📊 **Database Management**

### Access PostgreSQL

**With Docker:**
```bash
docker exec -it sna-postgres psql -U sna_user -d sna_db
```

**Local:**
```bash
psql -U sna_user -d sna_db
```

### Useful Queries

```sql
-- View all projects
SELECT * FROM projects;

-- View all history entries
SELECT id, name, project_id, created_by, created_at, updated_at 
FROM history 
ORDER BY updated_at DESC;

-- View specific history
SELECT * FROM history WHERE id = 1;

-- Delete all data (reset)
TRUNCATE TABLE history, projects CASCADE;
```

---

## 🔍 **Troubleshooting**

### Services won't start

```bash
# Check if ports are already in use
lsof -i :5173  # Frontend
lsof -i :8000  # API Gateway
lsof -i :8001  # Nodes Service
lsof -i :8002  # DB Service
lsof -i :8003  # Flow Service
lsof -i :5432  # PostgreSQL

# Kill process on port (example)
kill -9 $(lsof -t -i:8000)
```

### Docker issues

```bash
# Remove all containers and volumes
docker-compose down -v

# Remove all images
docker-compose down --rmi all

# Rebuild from scratch
docker-compose up --build --force-recreate
```

### Database connection errors

```bash
# Check PostgreSQL is running
docker ps | grep postgres
# OR
brew services list | grep postgresql

# Check database exists
psql -U sna_user -l

# Re-initialize schema
psql -U sna_user -d sna_db -f backend/db-service/src/migrations/init.sql
```

### Service logs (Docker)

```bash
# View all logs
docker-compose logs

# View specific service logs
docker-compose logs db-service
docker-compose logs nodes-service
docker-compose logs api-gateway

# Follow logs (live)
docker-compose logs -f nodes-service
```

---

## 🔧 **Development Workflow**

### Making Changes

1. **Backend Services**: Edit code in `backend/*/src/` directories
   - With Docker: Services have hot reload (restart if needed)
   - Local: uvicorn auto-reloads on file changes

2. **Frontend**: Edit code in `frontend/src/`
   - Vite hot-reloads automatically

3. **Database Schema**: Edit `backend/db-service/src/migrations/init.sql`
   - Then re-run migration or recreate database

### Testing Individual Services

Each service can be tested independently:

```bash
# API Gateway docs
open http://localhost:8000/docs

# Nodes Service docs
open http://localhost:8001/docs

# DB Service docs
open http://localhost:8002/docs

# Flow Service docs
open http://localhost:8003/docs
```

---

## 📝 **Next Steps**

1. ✅ All backend services are running
2. ⏳ Frontend needs updates for landing page (in progress)
3. ⏳ Add authentication (future)
4. ⏳ Replace Flow Service mock with real API (future)

---

## 📚 **Additional Documentation**

- [ARCHITECTURE.md](./ARCHITECTURE.md) - System architecture and flows
- [API_CONTRACTS.md](./API_CONTRACTS.md) - API documentation
- [MIGRATION_GUIDE.md](./MIGRATION_GUIDE.md) - Migrating from old structure

---

**Questions or issues? Check the troubleshooting section or review the architecture docs!**
