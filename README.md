# Social Network Analysis (SNA) Application

## ⚠️ **NEW MICROSERVICES ARCHITECTURE**

This project has been migrated to a microservices architecture!

**📚 Documentation:**
- **[NEW_SETUP.md](NEW_SETUP.md)** - Setup instructions for new architecture
- **[ARCHITECTURE.md](ARCHITECTURE.md)** - System design and flows
- **[API_CONTRACTS.md](API_CONTRACTS.md)** - API documentation
- **[MIGRATION_GUIDE.md](MIGRATION_GUIDE.md)** - Old vs New comparison
- **[IMPLEMENTATION_SUMMARY.md](IMPLEMENTATION_SUMMARY.md)** - What's completed and what's next

---

## Overview
A full-stack microservices application for visualizing and analyzing phone call network data.

## 🚀 Quick Start

### Option 1: Docker (Recommended for Production)
```bash
docker-compose up --build
```
Then open http://localhost:5173

### Option 2: Local Development (No Docker)
```bash
# First time setup
./setup_local.sh

# Start all services
./run_local.sh
```
Then open http://localhost:5173

📖 **See [LOCAL_SETUP.md](LOCAL_SETUP.md) for detailed local setup instructions**

**📖 Old Setup:** See [SETUP.md](SETUP.md) for original monolithic setup (archived)

## Tech Stack
- **Frontend**: React + Vite + vis-network
- **Backend**: FastAPI (Microservices)
- **Database**: PostgreSQL
- **Deployment**: Docker Compose

## Microservices Architecture

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

- **API Gateway**: Pure routing layer
- **Nodes Service**: Main business logic orchestrator
- **DB Service**: Database operations (PostgreSQL)
- **Flow Service**: Mock third-party API (will be replaced with real API)
- **Frontend**: React SPA

## Project Structure
```
SNA_Matan_and_Tomer/
├── backend/
│   ├── api-gateway/         # API Gateway (Port 8000)
│   ├── nodes-service/       # Business Logic (Port 8001)
│   ├── db-service/          # Database Service (Port 8002)
│   └── flow-service/        # Mock Third-party API (Port 8003)
├── frontend/                # React SPA (Port 5173)
├── docker-compose.yml       # Docker setup
├── setup_local.sh          # Local setup script
├── run_local.sh            # Start all services locally
├── stop_local.sh           # Stop all services
├── LOCAL_SETUP.md          # Local development guide
└── README.md
```

## Features
- **Network Visualization**: Interactive graph of phone connections
- **Legend**: Group colors with toggle to show/hide
- **Search**: Find nodes by name or PSTN with autocomplete
- **Interest List**: Live scoring of most connected nodes
- **Filters**:
  - Hide Irrelevant: Show only recognized nodes and unknowns with 2+ connections
  - Aggregate Names: Merge multiple PSTNs with same name
  - Disable Physics: Freeze the graph layout
- **Interactions**:
  - Single click: Highlight node and connections
  - Double click: Copy PSTN to clipboard
  - Hover: Show node details

## Development

### Running Locally (No Docker)
See [LOCAL_SETUP.md](LOCAL_SETUP.md) for detailed instructions.

### Running with Docker
```bash
docker-compose up --build
```

### Stopping Services

**Local:**
```bash
./stop_local.sh
```
Or press `Ctrl+C` in the terminal running `run_local.sh`

**Docker:**
```bash
docker-compose down
```

### Viewing Logs

**Local:**
```bash
tail -f logs/*.log
```

**Docker:**
```bash
docker-compose logs -f [service-name]
```

## Moving to a New PC

1. Clone the repository
2. Choose your setup:
   - **Docker**: `docker-compose up --build`
   - **Local**: `./setup_local.sh` then `./run_local.sh`

That's it!
