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

**🚀 Quick Start (New Architecture):**
```bash
docker-compose up --build
```
Then open http://localhost:5173

**📖 Old Setup:** See [SETUP.md](SETUP.md) for original monolithic setup (archived)

## Tech Stack
- **Frontend**: React + Vite + vis-network
- **Backend**: FastAPI + NetworkX
- **Data Storage**: Excel files (will migrate to PostgreSQL later)

## Quick Start

### 1. Create Sample Data
```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
cd ..
python create_sample_data.py
```

### 2. Start Backend
```bash
./start_backend.sh
```
Or manually:
```bash
cd backend
source venv/bin/activate
uvicorn app.main:app --reload --port 8000
```

### 3. Start Frontend (in a new terminal)
```bash
./start_frontend.sh
```
Or manually:
```bash
cd frontend
npm install
npm run dev
```

### 4. Open Browser
Navigate to **http://localhost:5173**

### Windows / Git Bash
- **If `python3 -m venv venv` gives "Permission denied"**: stop any running backend (Ctrl+C in the terminal where uvicorn is running), then remove the venv and recreate:
  ```bash
  cd backend
  rm -rf venv
  python3 -m venv venv
  ```
- **Activate the venv**: on Windows the script is under `Scripts`, not `bin`:
  ```bash
  source venv/Scripts/activate
  ```
- **Run the backend** (from `backend` with venv activated):
  ```bash
  uvicorn app.main:app --reload --port 8000
  ```

## Project Structure
```
SNA/
├── backend/
│   ├── app/
│   │   ├── main.py          # FastAPI application
│   │   ├── data_loader.py   # Excel data loading logic
│   │   └── models.py        # Data models
│   ├── requirements.txt
│   └── .env.example
├── frontend/
│   ├── src/
│   │   ├── components/      # React components
│   │   ├── App.jsx
│   │   └── main.jsx
│   ├── package.json
│   └── vite.config.js
├── data/
│   ├── df_sna.xlsx          # Connections: side_a, side_b, weight
│   ├── df_vector.xlsx       # Keywords: side_a, side_b, words
│   └── names_*.xlsx         # Names: pstn, name (grouped by filename)
└── README.md
```

## Data Format

### df_sna.xlsx
| side_a       | side_b       | weight |
|--------------|--------------|--------|
| 05056109230  | 05026109230  | 4      |

### df_vector.xlsx
| side_a       | side_b       | words           |
|--------------|--------------|-----------------|
| 05056109230  | 05026109230  | cat, dog, log   |

### names_*.xlsx (e.g., names_group_a.xlsx)
| pstn         | name  |
|--------------|-------|
| 05077788899  | Lior  |

**Note**: Group name is determined by filename (e.g., `names_group_a.xlsx` → "Group A")


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

## Development Notes
- This is a dev environment (not production-ready)
- Excel files are read from `data/` folder on backend startup
- Future: Will migrate to PostgreSQL with Alembic
