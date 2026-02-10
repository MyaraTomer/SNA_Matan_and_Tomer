# 🔄 Migration Guide - Old vs New Architecture

## Overview

This guide explains the differences between the old monolithic architecture and the new microservices architecture.

---

## 📊 **Architecture Comparison**

### Old Architecture (Monolithic)
```
frontend/ (React)
    ↓ HTTP
backend/app/ (FastAPI monolith)
    ├── main.py (API + business logic)
    ├── data_loader.py (loads Excel files)
    └── models.py
    ↓
data/ (Excel files on disk)
```

### New Architecture (Microservices)
```
frontend/ (React)
    ↓
API Gateway (routing only)
    ↓
Nodes Service (business logic)
    ↓          ↓
DB Service   Flow Service (mock API)
    ↓
PostgreSQL
```

---

## 🗂️ **File Mapping**

### Backend

| Old Location | New Location | Notes |
|--------------|--------------|-------|
| `backend/app/main.py` | `backend/nodes-service/src/main.py` | Split into services |
| `backend/app/data_loader.py` | `backend/nodes-service/src/data_processor.py` | Adapted for user-provided groups |
| `backend/app/models.py` | `backend/nodes-service/src/models.py` | Same models |
| `data/*.xlsx` | `backend/flow-service/src/mock/data/*.xlsx` | Mock data for Flow Service |
| `backend/requirements.txt` | `backend/*/requirements.txt` | Per-service requirements |

### Frontend (No Changes Yet)

| Old Location | New Location | Status |
|--------------|--------------|--------|
| `frontend/src/App.jsx` | Same | ✅ No changes (compatible) |
| `frontend/src/components/*` | Same | ✅ All components work |

**Note**: Frontend changes (landing page, project selector) are pending but not required for backend to work.

---

## 🔑 **Key Differences**

### 1. Data Loading

**Old:**
- Loads `names_group_a.xlsx`, `names_group_b.xlsx` from disk at startup
- Groups defined by filenames

**New:**
- User provides groups via API (manual entry or Excel upload)
- Groups stored in `search_metadata` in database
- No more `names_*.xlsx` files

### 2. Data Storage

**Old:**
- Excel files on disk
- No database
- No history

**New:**
- PostgreSQL database with `projects` and `history` tables
- Raw data stored as JSON strings
- Full search history with timestamps

### 3. API Endpoints

**Old:**
```
GET  /api/network  → Returns network data (from Excel files)
GET  /api/status   → Health check
```

**New:**
```
# Projects
GET  /api/projects
POST /api/projects

# Searches (History)
GET  /api/projects/{id}/searches
POST /api/searches (create new or detect duplicate)
GET  /api/searches/{id}
PUT  /api/searches/{id}/refresh
```

### 4. Data Flow

**Old:**
```
1. Backend starts
2. Loads Excel files from data/ folder
3. Processes all data at startup
4. Frontend fetches /api/network
5. Displays graph
```

**New:**
```
1. User selects project
2. User creates search (provides groups + time range)
3. Nodes Service calls Flow Service (third-party API)
4. Nodes Service processes data
5. Nodes Service saves to DB (via DB Service)
6. Returns processed network data to Frontend
7. Frontend displays graph
```

---

## 🆕 **New Features**

1. **Project Management**
   - Multiple projects (investigations)
   - Isolated workspaces

2. **Search History**
   - Save all searches
   - View past searches
   - Refresh with updated data

3. **Duplicate Detection**
   - Prevents redundant API calls
   - Same user + same params = reuse existing

4. **Dynamic Groups**
   - User-defined groups (not file-based)
   - Flexible group management

5. **Time Range Selection**
   - Specify date range for data fetch
   - Calendar picker or relative dates

6. **Refresh Capability**
   - Re-fetch data with same/modified params
   - Update existing search

---

## 🔧 **Configuration Changes**

### Old

**Backend:**
- No environment variables
- Hardcoded paths to Excel files

**Frontend:**
- Proxy in `vite.config.js` to backend

### New

**Backend Services** (each has `.env`):
```bash
# DB Service
POSTGRES_HOST=postgres
POSTGRES_PORT=5432
POSTGRES_DB=sna_db
POSTGRES_USER=sna_user
POSTGRES_PASSWORD=sna_password

# Nodes Service
DB_SERVICE_URL=http://db-service:8002
FLOW_SERVICE_URL=http://flow-service:8003

# API Gateway
NODES_SERVICE_URL=http://nodes-service:8001
```

**Frontend:**
```bash
VITE_API_URL=http://localhost:8000
```

---

## 🚀 **Deployment Changes**

### Old
```bash
# Terminal 1 - Backend
cd backend
source venv/bin/activate
uvicorn app.main:app --reload

# Terminal 2 - Frontend
cd frontend
npm run dev
```

### New

**With Docker (Recommended):**
```bash
docker-compose up
```

**Without Docker:**
```bash
# 5 terminals needed:
# 1. DB Service
# 2. Flow Service
# 3. Nodes Service
# 4. API Gateway
# 5. Frontend

# See NEW_SETUP.md for details
```

---

## 📝 **Code Migration Examples**

### Example 1: Processing Network Data

**Old (`backend/app/data_loader.py`):**
```python
class SNADataLoader:
    def load_all_data(self):
        self._load_sna_data()          # Load from Excel
        self._load_vector_data()       # Load from Excel
        self._load_names_data()        # Load names_*.xlsx files
        self._process_names()          # Assign colors
```

**New (`backend/nodes-service/src/data_processor.py`):**
```python
class SNADataProcessor:
    def process_network_data(self, sna_data, vector_data, groups):
        # Groups provided by user, not loaded from files
        id_to_name, node_colors = self._process_groups(groups)
        nodes, edges = self._build_graph(...)
        return NetworkData(nodes=nodes, edges=edges)
```

### Example 2: API Response Format

**Old and New (Same Format!):**
```json
{
  "nodes": [...],
  "edges": [...],
  "groups": {"group a": "#E63946", "group b": "#4361EE"}
}
```

✅ **Frontend doesn't need changes** - same response format!

---

## ✅ **Backward Compatibility**

### What's Compatible?

✅ **Frontend code** - No changes required (existing graph works)
✅ **Network data format** - Same JSON structure
✅ **Node/Edge models** - Identical
✅ **Graph visualization** - Uses same vis-network library

### What's Different?

❌ **API endpoints** - New routes (but can add compatibility layer)
❌ **Data source** - Database instead of Excel files
❌ **Groups** - User-provided instead of file-based

---

## 🎯 **Migration Steps (if you want to run both)**

To keep old system running while testing new:

1. **Rename old backend folder:**
```bash
mv backend backend-old
```

2. **Keep old frontend setup:**
   - Old system uses port 8000 (backend) + 5173 (frontend)
   - New system uses same ports
   - Run only one at a time, or change ports

3. **Run old system:**
```bash
# Terminal 1
cd backend-old
source venv/bin/activate
uvicorn app.main:app --reload --port 8888  # Different port

# Terminal 2
cd frontend
# Update .env: VITE_API_URL=http://localhost:8888
npm run dev -- --port 5174  # Different port
```

4. **Run new system:**
```bash
docker-compose up
```

Now you have:
- Old system: http://localhost:5174
- New system: http://localhost:5173

---

## 🔮 **Future: Replacing Flow Service Mock**

When the real third-party API is ready:

1. **Delete mock folder:**
```bash
rm -rf backend/flow-service/src/mock/
```

2. **Update Flow Service to call real API:**
```python
# backend/flow-service/src/main.py

@app.post("/fetch")
async def fetch_data(request: FetchRequest):
    # Replace this:
    # data = mock_loader.load_data(time_range)
    
    # With this:
    async with httpx.AsyncClient() as client:
        response = await client.post(
            "https://real-api.com/fetch",
            json={
                "from": request.time_range.from_time,
                "to": request.time_range.to_time,
                "api_key": settings.api_key
            }
        )
        data = response.json()
    
    return FetchResponse(
        sna_data=data["sna_data"],
        vector_data=data["vector_data"]
    )
```

3. **No other services need changes!** ✅

---

## 📚 **Additional Resources**

- [ARCHITECTURE.md](./ARCHITECTURE.md) - System design
- [API_CONTRACTS.md](./API_CONTRACTS.md) - API documentation
- [NEW_SETUP.md](./NEW_SETUP.md) - Setup instructions

---

**Questions? Check the architecture docs or ask!**
