# Setup Instructions

## Quick Start Guide

Follow these steps to get the SNA application running:

### Step 1: Create Sample Data

First, set up a Python virtual environment and install dependencies:

```bash
# Navigate to project directory
cd /Users/tomermyara/dev/SNA

# Create virtual environment
cd backend
python3 -m venv venv

# Activate virtual environment
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Go back to project root
cd ..

# Create sample Excel files
python create_sample_data.py
```

### Step 2: Start the Backend Server

```bash
# Make sure you're in the backend directory with venv activated
cd backend
source venv/bin/activate  # If not already activated

# Start the FastAPI server
uvicorn app.main:app --reload --port 8000
```

You should see logs indicating:
- Data files are being loaded
- Network graph is being built
- Server is ready at http://localhost:8000

### Step 3: Start the Frontend

Open a **NEW terminal** window:

```bash
# Navigate to frontend directory
cd /Users/tomermyara/dev/SNA/frontend

# Install Node dependencies
npm install

# Start the development server
npm run dev
```

The frontend will be available at: **http://localhost:5173**

### Step 4: Open the Application

Open your browser and go to: **http://localhost:5173**

You should see the network visualization with:
- Interactive graph in the center
- Legend (top-left)
- Interest List (left)
- Search box (top-right)
- Filter toggles (bottom-right)

---

## Using Your Own Data

### Data Files Location

Place your Excel files in the `data/` directory:

```
data/
├── df_sna.xlsx          # Required: Network connections
├── df_vector.xlsx       # Optional: Keywords for edges
├── names_group_a.xlsx   # Required: Names for Group A
├── names_group_b.xlsx   # Optional: Names for Group B
└── names_*.xlsx         # Add more groups as needed
```

### Data Format

#### df_sna.xlsx (Required)
| side_a      | side_b      | weight |
|-------------|-------------|--------|
| 05056109230 | 05026109230 | 4      |

- **side_a**: Phone number (PSTN) - source
- **side_b**: Phone number (PSTN) - target
- **weight**: Number of calls (integer)

#### df_vector.xlsx (Optional)
| side_a      | side_b      | words          |
|-------------|-------------|----------------|
| 05056109230 | 05026109230 | cat, dog, log  |

- **side_a**: Phone number (PSTN)
- **side_b**: Phone number (PSTN)
- **words**: Keywords from conversations (string)

Edges with words will appear **red** (high interest), others will be **gray**.

#### names_*.xlsx (At least one required)
| pstn        | name  |
|-------------|-------|
| 05077788899 | Lior  |

- **pstn**: Phone number
- **name**: Person's name

**Important**: The filename determines the group name:
- `names_group_a.xlsx` → "Group A" (red color)
- `names_group_b.xlsx` → "Group B" (blue color)
- `names_team_alpha.xlsx` → "Team Alpha"

Each group gets a different color automatically.

---

## Features Overview

### Legend (Top-Left)
- Click on a group to hide/show all nodes from that group
- Disabled groups appear faded with strikethrough

### Interest List (Left Side)
- Shows the top 15 most "interesting" people
- **Score Calculation**:
  - Red edge (with keywords) = 3 points
  - Gray edge (normal call) = 1 point
- Click colored circles to filter by group
- Click on a person to highlight them in the graph

### Search (Top-Right)
- Type to search by name or phone number
- Autocomplete suggestions appear
- Use arrow keys to navigate suggestions
- Press Enter to focus on selected node
- "Reset" button clears selection and fits graph

### Filter Panel (Bottom-Right)

**Hide Irrelevant:**
- Shows only recognized nodes + unknown nodes with 2+ connections to recognized nodes
- Filters out noise from the graph

**Aggregate Names:**
- Merges multiple phone numbers with the same name into one node
- Shows all aggregated PSTNs in the tooltip
- Combines edge weights

**Disable Physics:**
- Freezes the graph layout
- Useful when you want to manually arrange nodes

### Interactions

**Single Click on Node:**
- Highlights the node and its connections
- Fades out unrelated nodes
- Click again or click canvas to unhighlight

**Double Click on Node:**
- Copies the PSTN to clipboard
- Shows a toast notification

**Hover over Node:**
- Shows name and PSTN

**Hover over Edge:**
- Shows call count and keywords (if available)

---

## Troubleshooting

### Backend won't start
- Check that all Excel files exist in `data/` directory
- Verify file format matches the schema above
- Check backend logs for specific errors

### Frontend shows "Error Loading Data"
- Make sure backend is running on port 8000
- Check browser console for errors
- Try refreshing the page

### No nodes visible
- Check if groups are disabled in the legend
- Try disabling "Hide Irrelevant" filter
- Check that Excel files contain data

### Graph is too cluttered
- Use "Hide Irrelevant" to focus on important nodes
- Use "Aggregate Names" to merge duplicate PSTNs
- Filter by group using the legend

---

## Development Notes

- This is a **development environment** - not production-ready
- Logs are printed to console (both frontend and backend)
- Hot reload is enabled for both frontend and backend
- Data is loaded from Excel files on backend startup
- Future: Will migrate to PostgreSQL with Alembic

---

## Next Steps

To use your own data:
1. Stop the backend server (Ctrl+C)
2. Replace the Excel files in `data/` directory
3. Restart the backend server
4. Refresh the frontend

The application will automatically load your new data!
