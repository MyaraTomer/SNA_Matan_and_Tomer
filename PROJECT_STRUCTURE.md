# Project Structure & Code Organization

This document explains the clean architecture of the new SNA application.

## Directory Structure

```
SNA/
├── backend/                    # FastAPI backend
│   ├── app/
│   │   ├── main.py            # FastAPI app, routes, startup logic
│   │   ├── data_loader.py     # Excel file loading & processing
│   │   └── models.py          # Pydantic data models
│   └── requirements.txt       # Python dependencies
│
├── frontend/                   # React frontend
│   ├── src/
│   │   ├── components/        # React components (one per file)
│   │   │   ├── NetworkGraph.jsx      # Main vis-network visualization
│   │   │   ├── Legend.jsx            # Group legend with toggles
│   │   │   ├── InterestList.jsx      # Live scoring list
│   │   │   ├── SearchBox.jsx         # Search with autocomplete
│   │   │   ├── FilterPanel.jsx       # Toggle switches
│   │   │   ├── Toast.jsx             # Toast notifications
│   │   │   └── LoadingOverlay.jsx    # Loading spinner
│   │   ├── App.jsx            # Main app component
│   │   ├── App.css            # App styles
│   │   ├── main.jsx           # React entry point
│   │   └── index.css          # Global styles
│   ├── index.html             # HTML template
│   ├── package.json           # Node dependencies
│   └── vite.config.js         # Vite configuration
│
├── data/                      # Excel data files
│   ├── df_sna.xlsx           # Network connections (required)
│   ├── df_vector.xlsx        # Keywords (optional)
│   └── names_*.xlsx          # Name groups (at least one required)
│
├── create_sample_data.py     # Script to create test data
├── start_backend.sh          # Quick start for backend
├── start_frontend.sh         # Quick start for frontend
├── README.md                 # Project overview
├── SETUP.md                  # Detailed setup instructions
└── .gitignore                # Git ignore rules
```

---

## Backend Architecture

### 1. `models.py` - Data Models
**Purpose**: Define the API contract using Pydantic models

```python
Node        # Represents a person/phone number
Edge        # Represents a connection/call
NetworkData # Complete graph data (nodes + edges + groups)
StatusResponse # API health check
```

**Why**: Type safety, automatic validation, clear API documentation

---

### 2. `data_loader.py` - Data Loading Logic
**Purpose**: Load and process Excel files into clean data structures

**Key Methods**:
- `load_all_data()` - Main entry point, loads all files
- `_load_sna_data()` - Load connections (df_sna.xlsx)
- `_load_vector_data()` - Load keywords (df_vector.xlsx)
- `_load_names_data()` - Load all names_*.xlsx files
- `_process_names()` - Create mappings and assign colors

**Data Structures Created**:
```python
recognized_ids    # Set of known phone numbers
id_to_name        # PSTN → Name mapping
node_colors       # PSTN → Color mapping
group_colors      # Group Name → Color mapping
name_to_ids       # Name → [PSTNs] (for aggregation)
```

**Logging**: Every step is logged clearly:
- `✓` Success messages
- `✗` Error messages
- `⚠` Warning messages

**Why**: Separation of concerns, easy debugging, reusable logic

---

### 3. `main.py` - FastAPI Application
**Purpose**: API server and business logic

**Endpoints**:
```
GET  /                  # Health check
GET  /api/status        # Data loading status
GET  /api/network       # Complete network data
```

**Key Functions**:
- `startup_event()` - Loads data on server start
- `_build_graph()` - Creates NetworkX graph
- `_identify_relevant_nodes()` - Filters important nodes
- `_build_vector_lookup()` - Creates keyword lookup
- `get_network_data()` - Main API endpoint

**Flow**:
1. Server starts → Load Excel files
2. Build NetworkX graph from connections
3. Calculate relevance scores
4. When client requests → Return JSON data

**Logging**: Comprehensive logging of every operation

**Why**: Clean separation between data loading, processing, and API

---

## Frontend Architecture

### Component Hierarchy

```
App (main state management)
├── NetworkGraph (vis-network visualization)
├── Legend (group toggles)
├── InterestList (scoring + filtering)
├── SearchBox (search + autocomplete)
├── FilterPanel (toggle switches)
├── Toast (notifications)
└── LoadingOverlay (spinner)
```

---

### 1. `App.jsx` - Main Component
**Purpose**: Central state management and data fetching

**State**:
```javascript
networkData      # Full network data from API
loading          # Loading state
error            # Error state
disabledGroups   # Set of hidden groups
hideIrrelevant   # Relevance filter toggle
aggregateNames   # Name aggregation toggle
physicsEnabled   # Physics simulation toggle
selectedNode     # Currently selected/highlighted node
toastMessage     # Toast notification text
```

**Flow**:
1. On mount → Fetch data from `/api/network`
2. Pass data + state to child components
3. Handle state changes from user interactions

**Why**: Single source of truth, predictable state flow

---

### 2. `NetworkGraph.jsx` - Visualization
**Purpose**: Render and manage the vis-network graph

**Key Logic**:
- Initialize vis-network with nodes and edges
- Apply filters (groups, relevance, aggregation)
- Handle node highlighting on selection
- Manage click/double-click events
- Control physics simulation

**Effects**:
```javascript
useEffect(() => {}, [data])              # Initialize graph
useEffect(() => {}, [filters])           # Apply filters
useEffect(() => {}, [physicsEnabled])    # Toggle physics
useEffect(() => {}, [selectedNode])      # Highlight node
```

**Why**: Isolated visualization logic, reactive to state changes

---

### 3. `Legend.jsx` - Group Controls
**Purpose**: Display groups and toggle visibility

**Simple Component**:
- Renders list of groups with colors
- Calls `toggleGroup()` on click
- Shows disabled state visually

---

### 4. `InterestList.jsx` - Live Scoring
**Purpose**: Calculate and display top nodes by score

**Scoring Algorithm** (in `useMemo`):
```javascript
for each visible edge:
  if edge has keywords:
    add 3 points to both nodes
    increment red count
  else:
    add 1 point to both nodes
    increment gray count

sort by score (descending)
return top 15
```

**Filters**:
- Respects disabled groups
- Respects relevance filter
- Has its own group filter (colored circles)

**Why**: Dynamic calculation based on visible graph state

---

### 5. `SearchBox.jsx` - Smart Search
**Purpose**: Search nodes with autocomplete

**Features**:
- Real-time filtering as you type
- Keyboard navigation (arrows, enter, escape)
- Searches by name, PSTN, or label
- Groups results by name
- Calls `onNodeSelect()` on selection

---

### 6. `FilterPanel.jsx` - Toggle Controls
**Purpose**: Simple toggle switches for filters

**Toggles**:
- Hide Irrelevant
- Aggregate Names
- Disable Physics

**Why**: Simple, reusable toggle component

---

### 7. `Toast.jsx` & `LoadingOverlay.jsx`
**Purpose**: User feedback components

- Toast: Shows temporary messages (e.g., "Copied!")
- Loading: Shows spinner during operations

---

## Data Flow

### On Page Load:
```
1. App.jsx: fetchNetworkData()
2. → GET /api/network
3. Backend: Load Excel → Build graph → Return JSON
4. ← Response with nodes, edges, groups
5. App.jsx: setNetworkData(data)
6. → Props cascade to all components
7. NetworkGraph: Initialize vis-network
8. InterestList: Calculate scores
9. Render complete
```

### On User Interaction:
```
Example: Click on Legend to hide a group

1. Legend: onClick → toggleGroup('Group A')
2. → App.jsx: setDisabledGroups(...)
3. → Props update to NetworkGraph
4. NetworkGraph: useEffect detects change
5. → Update node visibility in vis-network
6. → InterestList: useMemo recalculates scores
7. UI updates reactively
```

---

## Key Design Principles

### 1. **Separation of Concerns**
- Backend: Data loading, processing, API
- Frontend: UI, visualization, user interaction
- Each component has ONE clear responsibility

### 2. **Clear Logging**
```python
# Backend
logger.info("=" * 60)
logger.info("LOADING DATA")
logger.info("=" * 60)
logger.info("✓ Loaded df_sna.xlsx: 9 rows")
```

```javascript
// Frontend
console.log('-'.repeat(60))
console.log('APPLYING FILTERS')
console.log('  Disabled groups: Group A')
console.log('-'.repeat(60))
```

**Why**: Easy debugging, understand what's happening

### 3. **Type Safety**
- Backend: Pydantic models validate all data
- Frontend: PropTypes or TypeScript (future)

### 4. **Reactive Updates**
- React hooks (`useState`, `useEffect`, `useMemo`)
- Props flow down, events flow up
- Single source of truth in App.jsx

### 5. **Modular Components**
- Each component in its own file
- Each component has its own CSS
- Easy to modify one without breaking others

### 6. **Dev-Friendly**
- Hot reload on both frontend and backend
- Clear error messages
- Sample data included
- Shell scripts for quick start

---

## How to Modify

### Add a new group:
1. Create `data/names_new_group.xlsx`
2. Restart backend
3. Group appears automatically with new color

### Change scoring algorithm:
1. Edit `InterestList.jsx`
2. Modify the `useMemo` calculation
3. Save → Hot reload → See changes

### Add new API endpoint:
1. Add route in `backend/app/main.py`
2. Add fetch call in frontend component
3. Use the data

### Change colors:
1. Backend: Edit `VIBRANT_COLORS` in `data_loader.py`
2. Frontend: Edit CSS files

---

## Common Tasks

### Debug why a node isn't showing:
1. Check backend logs: Is it in the data?
2. Check Legend: Is its group disabled?
3. Check Filters: Is "Hide Irrelevant" on?
4. Check browser console: Any errors?

### Add a new filter:
1. Add state in `App.jsx`
2. Add toggle in `FilterPanel.jsx`
3. Add logic in `NetworkGraph.jsx` useEffect
4. Update `InterestList.jsx` scoring if needed

### Change node appearance:
1. Edit `NetworkGraph.jsx`
2. Modify node properties in initialization
3. Or modify in highlighting logic

---

## Migration to PostgreSQL (Future)

When ready to migrate from Excel to PostgreSQL:

1. **Backend Changes**:
   - Replace `data_loader.py` with `db_loader.py`
   - Use SQLAlchemy ORM
   - Add Alembic for migrations
   - Keep the same data models (Pydantic)
   - Keep the same API endpoints

2. **Frontend Changes**:
   - **NONE!** Frontend doesn't know about data source
   - API contract stays the same

This is why we separated concerns cleanly!

---

## Summary

The new architecture is:
- ✅ **Clean**: One file per component/concern
- ✅ **Readable**: Clear names, good logs, comments
- ✅ **Maintainable**: Easy to find and change code
- ✅ **Debuggable**: Logs everywhere, clear errors
- ✅ **Extensible**: Easy to add features
- ✅ **Professional**: Proper separation of concerns

vs. old code which was:
- ❌ 856 lines in one file
- ❌ Mixed Python and JavaScript
- ❌ Generated HTML as strings
- ❌ Hard to understand
- ❌ Hard to modify

**You can now understand and modify this code easily!** 🎉
