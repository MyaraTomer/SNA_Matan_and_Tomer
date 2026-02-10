# Social Network Analysis (SNA) - Microservices Architecture

## 📐 High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                           FRONTEND (React)                       │
│                         Port: 5173                               │
│  ┌──────────────┐  ┌───────────────┐  ┌──────────────────┐    │
│  │   Project    │  │    Landing    │  │   Network Graph  │    │
│  │   Selector   │  │     Page      │  │   (Existing)     │    │
│  │   (Modal)    │  │ Search/History│  │                  │    │
│  └──────────────┘  └───────────────┘  └──────────────────┘    │
└────────────────────────────┬────────────────────────────────────┘
                             │ HTTP
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                      API GATEWAY (FastAPI)                       │
│                         Port: 8000                               │
│                   Pure Routing - No Logic                        │
└────┬────────────────────────────────────────────────────────┬───┘
     │                                                         │
     ▼                                                         ▼
┌─────────────────────────────────────┐    ┌──────────────────────┐
│     NODES SERVICE (FastAPI)         │    │  Other Routes        │
│          Port: 8001                 │    │  (Future)            │
│  ┌──────────────────────────────┐  │    └──────────────────────┘
│  │  Main Business Logic         │  │
│  │  - Process search requests   │  │
│  │  - Build nodes/edges         │  │
│  │  - Handle duplicates         │  │
│  │  - Orchestrate services      │  │
│  └──────────────────────────────┘  │
└────┬───────────────────┬────────────┘
     │                   │
     │                   │
     ▼                   ▼
┌──────────────┐   ┌──────────────────┐
│ DB SERVICE   │   │  FLOW SERVICE    │
│ Port: 8002   │   │  Port: 8003      │
│              │   │                  │
│ ┌──────────┐ │   │ ┌──────────────┐│
│ │PostgreSQL│ │   │ │ Mock Data    ││
│ │ Access   │ │   │ │ (Excel files)││
│ │ Only     │ │   │ │              ││
│ └──────────┘ │   │ └──────────────┘│
└──────┬───────┘   └──────────────────┘
       │
       ▼
┌──────────────────┐
│   PostgreSQL     │
│    Port: 5432    │
│                  │
│  ┌────────────┐  │
│  │  projects  │  │
│  │  history   │  │
│  └────────────┘  │
└──────────────────┘
```

---

## 🔄 User Flows

### **Flow 1: First-Time User**

```
1. User opens app → Project Selection Modal appears
2. User creates new project "Project Alpha"
3. Landing Page shows:
   - "New Search" form
   - Empty history (no previous searches)
4. User clicks "New Search"
```

### **Flow 2: New Search**

```
User Action:
├─ Enters username: "john.doe"
├─ Selects groups:
│  ├─ Option 1: Dynamic form (group name, PSTN, name rows)
│  └─ Option 2: Upload Excel (pstn, name columns)
├─ Selects time range: 2024-01-01 to 2024-01-31
├─ Names the search: "Investigation Q1"
└─ Clicks "Execute"

System Flow:
1. Frontend → API Gateway: POST /api/searches
   Body: {
     project_id, username, groups, time_range, search_name
   }

2. API Gateway → Nodes Service: POST /searches

3. Nodes Service:
   a. Checks for duplicates (same user + groups + time_range)
      └─ If found: Return existing history_id
   
   b. Calls Flow Service: POST /fetch
      Body: { time_range: { from: datetime, to: datetime } }
      Returns: { sna_data: [...], vector_data: [...] }
   
   c. Processes data:
      - Maps PSTNs to names using user-provided groups
      - Assigns colors to groups
      - Builds nodes/edges
      - Calculates degrees, relevance, sizes
   
   d. Calls DB Service: POST /history
      Body: {
        project_id, name, sna_df (JSON string),
        vector_df (JSON string), search_metadata,
        created_by, created_at
      }
   
   e. Returns processed network data to Frontend

4. Frontend displays network graph
```

### **Flow 3: View History**

```
User Action:
├─ Sees list of previous searches in project
└─ Clicks "Investigation Q1" from Jan 5

System Flow:
1. Frontend → API Gateway: GET /api/searches/{history_id}

2. API Gateway → Nodes Service: GET /searches/{history_id}

3. Nodes Service:
   a. Calls DB Service: GET /history/{history_id}
      Returns: { sna_df, vector_df, search_metadata, updated_at }
   
   b. Processes data on-demand:
      - Parse JSON strings to DataFrames
      - Rebuild nodes/edges using saved groups from metadata
      - Apply same processing logic
   
   c. Returns: { nodes, edges, groups, last_sync: updated_at }

4. Frontend displays:
   - Network graph
   - Top bar: "Last synced: Jan 5, 2024 14:30" [🔄 Refresh]
```

### **Flow 4: Refresh Search**

```
User Action:
├─ Viewing "Investigation Q1"
├─ Clicks 🔄 Refresh button
├─ Modal appears with original params (editable):
│  ├─ Groups (can modify)
│  └─ Time range (can modify)
└─ Clicks "Execute"

System Flow:
1. Frontend → API Gateway: PUT /api/searches/{history_id}/refresh
   Body: { groups, time_range, username }

2. API Gateway → Nodes Service: PUT /searches/{history_id}/refresh

3. Nodes Service:
   a. Calls Flow Service: POST /fetch
      Body: { time_range: { from: datetime, to: datetime } }
      Returns: { sna_data: [...], vector_data: [...] }
   
   b. Processes new data (same logic as new search)
   
   c. Calls DB Service: PUT /history/{history_id}
      Body: {
        sna_df (new data), vector_df (new data),
        search_metadata (updated), updated_at (now)
      }
      - Replaces old data completely
   
   d. Returns updated network data

4. Frontend displays updated graph with new sync time
```

---

## 📊 Database Schema

### **PostgreSQL Tables**

```sql
-- Projects table
CREATE TABLE projects (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_project_name UNIQUE(name)
);

-- History table (SNA searches)
CREATE TABLE history (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255),  -- User-provided or auto-generated
    project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    
    -- Raw data from Flow Service (as JSON strings)
    sna_df TEXT NOT NULL,      -- DataFrame.to_json(orient='records')
    vector_df TEXT NOT NULL,   -- DataFrame.to_json(orient='records')
    
    -- Search parameters and metadata
    search_metadata TEXT NOT NULL,  -- JSON string (see structure below)
    
    created_by VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX idx_history_project_id ON history(project_id);
CREATE INDEX idx_history_created_by ON history(created_by);
CREATE INDEX idx_history_created_at ON history(created_at DESC);
CREATE INDEX idx_history_updated_at ON history(updated_at DESC);
```

### **search_metadata JSON Structure**

```json
{
  "groups": [
    {
      "name": "group a",
      "members": [
        {"pstn": "9343434", "name": "lior"},
        {"pstn": "234234234", "name": "or"}
      ]
    },
    {
      "name": "group b",
      "members": [
        {"pstn": "444444", "name": "dan"},
        {"pstn": "55234234", "name": "gor"}
      ]
    }
  ],
  "time_range": {
    "from": "2024-01-01T00:00:00Z",
    "to": "2024-01-31T23:59:59Z"
  },
  "created_by": "john.doe",
  "created_at": "2024-02-10T14:30:00Z"
}
```

---

## 🔌 API Contracts

### **API Gateway → Nodes Service**

#### **POST /searches**
Create new search or return existing

**Request:**
```json
{
  "project_id": 1,
  "username": "john.doe",
  "search_name": "Investigation Q1",
  "groups": [
    {
      "name": "group a",
      "members": [
        {"pstn": "9343434", "name": "lior"}
      ]
    }
  ],
  "time_range": {
    "from": "2024-01-01T00:00:00Z",
    "to": "2024-01-31T23:59:59Z"
  }
}
```

**Response (New Search):**
```json
{
  "history_id": 123,
  "is_duplicate": false,
  "data": {
    "nodes": [...],
    "edges": [...],
    "groups": {...}
  }
}
```

**Response (Duplicate Found):**
```json
{
  "history_id": 100,
  "is_duplicate": true,
  "duplicate_info": {
    "name": "Previous Search",
    "created_at": "2024-01-05T10:00:00Z"
  },
  "message": "Similar search found. Load existing or create new?"
}
```

#### **GET /searches/{history_id}**
Get existing search data

**Response:**
```json
{
  "history_id": 123,
  "name": "Investigation Q1",
  "last_sync": "2024-02-10T14:30:00Z",
  "data": {
    "nodes": [...],
    "edges": [...],
    "groups": {...}
  }
}
```

#### **PUT /searches/{history_id}/refresh**
Refresh search with new/same params

**Request:**
```json
{
  "groups": [...],
  "time_range": {...},
  "username": "john.doe"
}
```

**Response:**
```json
{
  "history_id": 123,
  "last_sync": "2024-02-10T15:45:00Z",
  "data": {
    "nodes": [...],
    "edges": [...],
    "groups": {...}
  }
}
```

---

### **Nodes Service → DB Service**

#### **POST /projects**
Create new project

**Request:**
```json
{
  "name": "Project Alpha"
}
```

**Response:**
```json
{
  "id": 1,
  "name": "Project Alpha",
  "created_at": "2024-02-10T14:00:00Z"
}
```

#### **GET /projects**
List all projects

**Response:**
```json
{
  "projects": [
    {
      "id": 1,
      "name": "Project Alpha",
      "created_at": "2024-02-10T14:00:00Z"
    }
  ]
}
```

#### **GET /projects/{project_id}/history**
Get all history for a project

**Response:**
```json
{
  "history": [
    {
      "id": 123,
      "name": "Investigation Q1",
      "created_by": "john.doe",
      "created_at": "2024-02-10T14:30:00Z",
      "updated_at": "2024-02-10T14:30:00Z"
    }
  ]
}
```

#### **POST /history**
Create new history entry

**Request:**
```json
{
  "project_id": 1,
  "name": "Investigation Q1",
  "sna_df": "[{\"side_a\":\"123\",\"side_b\":\"456\",\"weight\":4}]",
  "vector_df": "[{\"side_a\":\"123\",\"side_b\":\"456\",\"words\":\"cat,dog\"}]",
  "search_metadata": "{\"groups\":[...],\"time_range\":{...}}",
  "created_by": "john.doe"
}
```

**Response:**
```json
{
  "id": 123,
  "created_at": "2024-02-10T14:30:00Z"
}
```

#### **GET /history/{history_id}**
Get history by ID

**Response:**
```json
{
  "id": 123,
  "name": "Investigation Q1",
  "project_id": 1,
  "sna_df": "[...]",
  "vector_df": "[...]",
  "search_metadata": "{...}",
  "created_by": "john.doe",
  "created_at": "2024-02-10T14:30:00Z",
  "updated_at": "2024-02-10T14:30:00Z"
}
```

#### **PUT /history/{history_id}**
Update history entry

**Request:**
```json
{
  "sna_df": "[...]",
  "vector_df": "[...]",
  "search_metadata": "{...}"
}
```

**Response:**
```json
{
  "id": 123,
  "updated_at": "2024-02-10T15:45:00Z"
}
```

#### **POST /history/find-duplicate**
Check for duplicate searches

**Request:**
```json
{
  "project_id": 1,
  "created_by": "john.doe",
  "search_metadata": "{...}"
}
```

**Response (Found):**
```json
{
  "found": true,
  "history": {
    "id": 100,
    "name": "Previous Search",
    "created_at": "2024-01-05T10:00:00Z"
  }
}
```

**Response (Not Found):**
```json
{
  "found": false
}
```

---

### **Nodes Service → Flow Service**

#### **POST /fetch**
Fetch data from mock third-party API

**Request:**
```json
{
  "time_range": {
    "from": "2024-01-01T00:00:00Z",
    "to": "2024-01-31T23:59:59Z"
  }
}
```

**Response (Success):**
```json
{
  "sna_data": [
    {
      "side_a": "9343434",
      "side_b": "444444",
      "weight": 4
    }
  ],
  "vector_data": [
    {
      "side_a": "9343434",
      "side_b": "444444",
      "words": "cat, dog, log"
    }
  ]
}
```

**Response (Error):**
```json
{
  "error": "Service Unavailable",
  "status_code": 503,
  "message": "Third-party API is temporarily unavailable"
}
```

---

## 📁 Folder Structure

```
SNA_Matan_and_Tomer/
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── ProjectSelector.jsx       # NEW: Modal for project selection
│   │   │   ├── LandingPage.jsx           # NEW: Search form + history list
│   │   │   ├── SearchForm.jsx            # NEW: Groups + time range input
│   │   │   ├── HistoryList.jsx           # NEW: List of previous searches
│   │   │   ├── RefreshModal.jsx          # NEW: Edit params + re-fetch
│   │   │   ├── NetworkGraph.jsx          # EXISTING (keep as-is)
│   │   │   ├── Legend.jsx                # EXISTING
│   │   │   ├── InterestList.jsx          # EXISTING
│   │   │   ├── SearchBox.jsx             # EXISTING
│   │   │   ├── FilterPanel.jsx           # EXISTING
│   │   │   └── ...                       # Other existing components
│   │   ├── api/
│   │   │   └── client.js                 # NEW: API client (axios/fetch)
│   │   ├── App.jsx                       # MODIFIED: Add routing logic
│   │   └── main.jsx                      # EXISTING
│   ├── Dockerfile                        # NEW
│   ├── .env.example                      # NEW
│   └── package.json
│
├── backend/
│   │
│   ├── api-gateway/
│   │   ├── src/
│   │   │   ├── main.py                   # FastAPI app with routing only
│   │   │   └── config.py                 # Load env vars
│   │   ├── Dockerfile
│   │   ├── requirements.txt
│   │   └── .env.example
│   │
│   ├── nodes-service/
│   │   ├── src/
│   │   │   ├── main.py                   # FastAPI endpoints
│   │   │   ├── data_processor.py         # MIGRATED: data_loader.py logic
│   │   │   ├── models.py                 # MIGRATED: Pydantic models
│   │   │   ├── services/
│   │   │   │   ├── db_client.py          # HTTP client for DB Service
│   │   │   │   └── flow_client.py        # HTTP client for Flow Service
│   │   │   └── config.py
│   │   ├── Dockerfile
│   │   ├── requirements.txt
│   │   └── .env.example
│   │
│   ├── db-service/
│   │   ├── src/
│   │   │   ├── main.py                   # FastAPI endpoints
│   │   │   ├── database.py               # PostgreSQL connection
│   │   │   ├── models.py                 # SQLAlchemy models
│   │   │   ├── crud.py                   # Database operations
│   │   │   └── config.py
│   │   ├── migrations/
│   │   │   └── init.sql                  # Initial schema
│   │   ├── Dockerfile
│   │   ├── requirements.txt
│   │   └── .env.example
│   │
│   └── flow-service/
│       ├── src/
│       │   ├── main.py                   # FastAPI endpoints
│       │   ├── mock/
│       │   │   ├── data_loader.py        # Load Excel files
│       │   │   └── data/                 # Mock Excel files
│       │   │       ├── df_sna.xlsx
│       │   │       └── df_vector.xlsx
│       │   └── config.py
│       ├── Dockerfile
│       ├── requirements.txt
│       └── .env.example
│
├── docker-compose.yml                     # NEW: Orchestrate all services
├── .env.example                           # NEW: Global env template
├── ARCHITECTURE.md                        # THIS FILE
├── MIGRATION_GUIDE.md                     # NEW: How to migrate from old structure
└── README.md                              # UPDATED: New setup instructions
```

---

## 🐳 Docker Setup

### **Service Dependencies**

```
PostgreSQL (must start first)
    ↓
DB Service (connects to PostgreSQL)
    ↓
Nodes Service (calls DB + Flow)
    ↓
API Gateway (routes to Nodes)
    ↓
Frontend (calls API Gateway)

Flow Service (independent, no dependencies)
```

### **docker-compose.yml Overview**

```yaml
services:
  postgres:
    image: postgres:15-alpine
    ports: 5432:5432
    
  db-service:
    depends_on: [postgres]
    ports: 8002:8002
    
  flow-service:
    ports: 8003:8003
    
  nodes-service:
    depends_on: [db-service, flow-service]
    ports: 8001:8001
    
  api-gateway:
    depends_on: [nodes-service]
    ports: 8000:8000
    
  frontend:
    depends_on: [api-gateway]
    ports: 5173:5173
```

---

## 🔐 Environment Variables

### **Global .env**

```bash
# Database
POSTGRES_HOST=postgres
POSTGRES_PORT=5432
POSTGRES_DB=sna_db
POSTGRES_USER=sna_user
POSTGRES_PASSWORD=sna_password

# Service URLs (Docker internal)
DB_SERVICE_URL=http://db-service:8002
FLOW_SERVICE_URL=http://flow-service:8003
NODES_SERVICE_URL=http://nodes-service:8001
API_GATEWAY_URL=http://api-gateway:8000

# Frontend (exposed to browser)
VITE_API_URL=http://localhost:8000
```

---

## 🚀 Development Workflow

### **Phase 1: Structure Setup**
1. Create new folder structure
2. Move existing code to appropriate services
3. Create base Dockerfiles

### **Phase 2: Backend Services**
1. Implement DB Service (PostgreSQL + CRUD)
2. Implement Flow Service (mock with Excel)
3. Implement Nodes Service (business logic)
4. Implement API Gateway (routing)

### **Phase 3: Frontend**
1. Create ProjectSelector component
2. Create LandingPage component
3. Create SearchForm component
4. Create HistoryList component
5. Update routing logic

### **Phase 4: Integration**
1. Wire services together
2. Test end-to-end flows
3. Write docker-compose
4. Test containerized deployment

### **Phase 5: Documentation**
1. Update README
2. Create MIGRATION_GUIDE
3. Document API endpoints
4. Add troubleshooting guide

---

## ✅ Success Criteria

- [ ] User can select/create projects
- [ ] User can create new searches (manual or Excel upload)
- [ ] User can view search history
- [ ] User can refresh searches with editable params
- [ ] Duplicate detection works (same user + params)
- [ ] All services run in Docker containers
- [ ] Frontend unchanged functionality (existing graph features work)
- [ ] Mock Flow Service easily replaceable
- [ ] Clean separation of concerns

---

## 🎯 Next Steps

1. ✅ Review and approve this architecture
2. Create folder structure
3. Implement services incrementally
4. Test each service independently
5. Integrate and test end-to-end
6. Document and deliver

---

**Questions or changes needed? Let me know before I start implementation!**
