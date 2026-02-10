# API Contracts - SNA Microservices

## 📡 Service Communication Map

```
Frontend (JS)
    ↓ HTTP
API Gateway (Python) ← Pure Router
    ↓ HTTP
Nodes Service (Python) ← Business Logic
    ↓                ↓
    ↓                ↓ HTTP
    ↓            Flow Service (Python) ← Mock Data
    ↓ HTTP
DB Service (Python) ← Database Only
    ↓
PostgreSQL
```

---

## 🌐 Frontend → API Gateway

Base URL: `http://localhost:8000/api`

### **Projects**

#### `GET /api/projects`
List all projects

**Response 200:**
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

#### `POST /api/projects`
Create new project

**Request:**
```json
{
  "name": "Project Alpha"
}
```

**Response 201:**
```json
{
  "id": 1,
  "name": "Project Alpha",
  "created_at": "2024-02-10T14:00:00Z"
}
```

**Response 409 (Conflict):**
```json
{
  "error": "Project name already exists"
}
```

---

### **Searches (History)**

#### `GET /api/projects/{project_id}/searches`
Get all searches for a project

**Response 200:**
```json
{
  "searches": [
    {
      "id": 123,
      "name": "Investigation Q1",
      "created_by": "john.doe",
      "created_at": "2024-02-10T14:30:00Z",
      "updated_at": "2024-02-10T14:30:00Z"
    },
    {
      "id": 124,
      "name": "Morning Investigation",
      "created_by": "jane.smith",
      "created_at": "2024-02-11T09:15:00Z",
      "updated_at": "2024-02-11T09:15:00Z"
    }
  ]
}
```

#### `POST /api/searches`
Create new search (with duplicate detection)

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
        {"pstn": "9343434", "name": "lior"},
        {"pstn": "234234234", "name": "or"}
      ]
    },
    {
      "name": "group b",
      "members": [
        {"pstn": "444444", "name": "dan"}
      ]
    }
  ],
  "time_range": {
    "from": "2024-01-01T00:00:00Z",
    "to": "2024-01-31T23:59:59Z"
  }
}
```

**Response 200 (New Search Created):**
```json
{
  "history_id": 123,
  "is_duplicate": false,
  "data": {
    "nodes": [
      {
        "id": "9343434",
        "label": "lior",
        "name": "lior",
        "group": "group a",
        "color": "#E63946",
        "relevant": true,
        "size": 25
      }
    ],
    "edges": [
      {
        "id": "9343434_444444",
        "source": "9343434",
        "target": "444444",
        "weight": 4,
        "words": "cat, dog, log",
        "has_vector": true,
        "color": "#e63946"
      }
    ],
    "groups": {
      "group a": "#E63946",
      "group b": "#4361EE",
      "Unknown": "#adb5bd"
    }
  }
}
```

**Response 200 (Duplicate Found - Same User):**
```json
{
  "is_duplicate": true,
  "duplicate_info": {
    "history_id": 100,
    "name": "Previous Search",
    "created_at": "2024-01-05T10:00:00Z"
  },
  "message": "Similar search found from Jan 5. Use existing or create new?"
}
```

**Response 200 (Different User - New Created Anyway):**
```json
{
  "history_id": 125,
  "is_duplicate": false,
  "note": "Similar search exists by different user, but created new entry",
  "data": { ... }
}
```

**Response 503 (Flow Service Error):**
```json
{
  "error": "Flow Service unavailable",
  "status_code": 503,
  "message": "Unable to fetch data from third-party API. Please try again later."
}
```

#### `POST /api/searches/confirm-duplicate`
User chose to use duplicate instead of creating new

**Request:**
```json
{
  "history_id": 100
}
```

**Response 200:**
```json
{
  "history_id": 100,
  "data": { ... }
}
```

#### `GET /api/searches/{history_id}`
Get existing search data

**Response 200:**
```json
{
  "history_id": 123,
  "name": "Investigation Q1",
  "project_id": 1,
  "created_by": "john.doe",
  "created_at": "2024-02-10T14:30:00Z",
  "updated_at": "2024-02-10T14:30:00Z",
  "search_metadata": {
    "groups": [...],
    "time_range": {...}
  },
  "data": {
    "nodes": [...],
    "edges": [...],
    "groups": {...}
  }
}
```

**Response 404:**
```json
{
  "error": "Search not found"
}
```

#### `PUT /api/searches/{history_id}/refresh`
Refresh search with potentially updated params

**Request:**
```json
{
  "username": "john.doe",
  "groups": [
    {
      "name": "group a",
      "members": [
        {"pstn": "9343434", "name": "lior"}
      ]
    }
  ],
  "time_range": {
    "from": "2024-02-01T00:00:00Z",
    "to": "2024-02-28T23:59:59Z"
  }
}
```

**Response 200:**
```json
{
  "history_id": 123,
  "updated_at": "2024-02-10T15:45:00Z",
  "data": {
    "nodes": [...],
    "edges": [...],
    "groups": {...}
  }
}
```

**Response 503 (Flow Service Error):**
```json
{
  "error": "Flow Service unavailable",
  "status_code": 503,
  "message": "Unable to refresh data. Please try again later."
}
```

---

## 🔄 API Gateway → Nodes Service

Base URL: `http://nodes-service:8001`

All endpoints are **pass-through** from Frontend with same contracts.

API Gateway simply routes:
- `/api/projects/*` → `http://nodes-service:8001/projects/*`
- `/api/searches/*` → `http://nodes-service:8001/searches/*`

---

## 🧠 Nodes Service → DB Service

Base URL: `http://db-service:8002`

### **Projects**

#### `GET /projects`
List all projects

**Response 200:**
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

#### `POST /projects`
Create project

**Request:**
```json
{
  "name": "Project Alpha"
}
```

**Response 201:**
```json
{
  "id": 1,
  "name": "Project Alpha",
  "created_at": "2024-02-10T14:00:00Z"
}
```

**Response 409:**
```json
{
  "error": "Project name already exists"
}
```

---

### **History**

#### `GET /projects/{project_id}/history`
Get all history entries for project

**Response 200:**
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

#### `POST /history`
Create new history entry

**Request:**
```json
{
  "project_id": 1,
  "name": "Investigation Q1",
  "sna_df": "[{\"side_a\":\"9343434\",\"side_b\":\"444444\",\"weight\":4}]",
  "vector_df": "[{\"side_a\":\"9343434\",\"side_b\":\"444444\",\"words\":\"cat, dog\"}]",
  "search_metadata": "{\"groups\":[{\"name\":\"group a\",\"members\":[{\"pstn\":\"9343434\",\"name\":\"lior\"}]}],\"time_range\":{\"from\":\"2024-01-01T00:00:00Z\",\"to\":\"2024-01-31T23:59:59Z\"},\"created_by\":\"john.doe\",\"created_at\":\"2024-02-10T14:30:00Z\"}",
  "created_by": "john.doe"
}
```

**Response 201:**
```json
{
  "id": 123,
  "created_at": "2024-02-10T14:30:00Z"
}
```

#### `GET /history/{history_id}`
Get history entry by ID

**Response 200:**
```json
{
  "id": 123,
  "name": "Investigation Q1",
  "project_id": 1,
  "sna_df": "[{\"side_a\":\"9343434\",\"side_b\":\"444444\",\"weight\":4}]",
  "vector_df": "[{\"side_a\":\"9343434\",\"side_b\":\"444444\",\"words\":\"cat, dog\"}]",
  "search_metadata": "{\"groups\":[...],\"time_range\":{...}}",
  "created_by": "john.doe",
  "created_at": "2024-02-10T14:30:00Z",
  "updated_at": "2024-02-10T14:30:00Z"
}
```

**Response 404:**
```json
{
  "error": "History entry not found"
}
```

#### `PUT /history/{history_id}`
Update history entry

**Request:**
```json
{
  "sna_df": "[{...}]",
  "vector_df": "[{...}]",
  "search_metadata": "{...}"
}
```

**Response 200:**
```json
{
  "id": 123,
  "updated_at": "2024-02-10T15:45:00Z"
}
```

#### `POST /history/find-duplicate`
Check for duplicate search (same user + params)

**Request:**
```json
{
  "project_id": 1,
  "created_by": "john.doe",
  "groups": [...],
  "time_range": {...}
}
```

**Response 200 (Found):**
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

**Response 200 (Not Found):**
```json
{
  "found": false
}
```

**Note**: Matching logic compares:
- `project_id`
- `created_by`
- `groups` (exact match of PSTNs, names, group names)
- `time_range` (exact from/to datetimes)

---

## 📊 Nodes Service → Flow Service

Base URL: `http://flow-service:8003`

### **POST /fetch**
Fetch data from third-party API (currently mocked)

**Request:**
```json
{
  "time_range": {
    "from": "2024-01-01T00:00:00Z",
    "to": "2024-01-31T23:59:59Z"
  }
}
```

**Response 200 (Success):**
```json
{
  "sna_data": [
    {
      "side_a": "9343434",
      "side_b": "444444",
      "weight": 4
    },
    {
      "side_a": "234234234",
      "side_b": "444444",
      "weight": 2
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

**Response 404:**
```json
{
  "error": "Not Found",
  "status_code": 404,
  "message": "No data found for specified time range"
}
```

**Response 503:**
```json
{
  "error": "Service Unavailable",
  "status_code": 503,
  "message": "Third-party API is temporarily unavailable"
}
```

**Response 500:**
```json
{
  "error": "Internal Server Error",
  "status_code": 500,
  "message": "Failed to process request"
}
```

**Note**: Mock implementation always returns same data from Excel files, ignoring `time_range`. Real implementation will use `time_range` parameter.

---

## 🔒 DB Service → PostgreSQL

Direct SQL queries (not HTTP).

### **Example Queries**

#### Create Project
```sql
INSERT INTO projects (name) 
VALUES ('Project Alpha') 
RETURNING id, name, created_at;
```

#### Get Project History
```sql
SELECT id, name, created_by, created_at, updated_at 
FROM history 
WHERE project_id = $1 
ORDER BY updated_at DESC;
```

#### Find Duplicate
```sql
SELECT id, name, created_at 
FROM history 
WHERE project_id = $1 
  AND created_by = $2 
  AND search_metadata = $3  -- JSON comparison
LIMIT 1;
```

#### Update History
```sql
UPDATE history 
SET sna_df = $1, 
    vector_df = $2, 
    search_metadata = $3, 
    updated_at = CURRENT_TIMESTAMP 
WHERE id = $4 
RETURNING id, updated_at;
```

---

## 🎨 Data Formats

### **Groups Format (User Input)**

**Frontend Form → Backend:**
```json
{
  "groups": [
    {
      "name": "group a",
      "members": [
        {"pstn": "9343434", "name": "lior"},
        {"pstn": "234234234", "name": "or"}
      ]
    }
  ]
}
```

**Excel Upload (Option 2):**
File: `group_a.xlsx` (filename = group name)
```
| pstn        | name  |
|-------------|-------|
| 9343434     | lior  |
| 234234234   | or    |
```

---

### **Time Range Format**

```json
{
  "time_range": {
    "from": "2024-01-01T00:00:00Z",
    "to": "2024-01-31T23:59:59Z"
  }
}
```

Format: ISO 8601 with UTC timezone

---

### **DataFrame Storage Format (in DB)**

**Raw Data (from Flow Service):**
```json
{
  "sna_data": [
    {"side_a": "9343434", "side_b": "444444", "weight": 4}
  ]
}
```

**Stored in DB (as TEXT):**
```text
"[{\"side_a\":\"9343434\",\"side_b\":\"444444\",\"weight\":4}]"
```

**Processing:**
```python
import pandas as pd
import json

# Save to DB
df = pd.DataFrame(sna_data)
sna_df_str = df.to_json(orient='records')

# Load from DB
df = pd.read_json(sna_df_str, orient='records')
```

---

### **Network Data Format (to Frontend)**

**Nodes:**
```json
{
  "id": "9343434",        // PSTN
  "label": "lior",        // Display name
  "name": "lior",         // Actual name
  "group": "group a",     // Group name
  "color": "#E63946",     // Group color
  "relevant": true,       // In recognized list or degree >= 2
  "size": 25              // Node size (based on degree)
}
```

**Edges:**
```json
{
  "id": "9343434_444444",     // Unique edge ID
  "source": "9343434",        // From PSTN
  "target": "444444",         // To PSTN
  "weight": 4,                // Number of calls
  "words": "cat, dog, log",   // Keywords (if any)
  "has_vector": true,         // Has keywords?
  "color": "#e63946"          // Red if has_vector, gray otherwise
}
```

**Groups:**
```json
{
  "group a": "#E63946",
  "group b": "#4361EE",
  "Unknown": "#adb5bd"
}
```

---

## 🚨 Error Handling

### **Standard Error Response**

```json
{
  "error": "Error Title",
  "status_code": 400,
  "message": "Detailed error message",
  "details": {  // Optional
    "field": "specific error info"
  }
}
```

### **HTTP Status Codes**

- **200 OK**: Success
- **201 Created**: Resource created
- **400 Bad Request**: Invalid input
- **404 Not Found**: Resource not found
- **409 Conflict**: Resource already exists
- **500 Internal Server Error**: Server error
- **503 Service Unavailable**: Dependent service down

---

## 📝 Notes

1. **All datetime values** use ISO 8601 format with UTC timezone
2. **JSON strings in DB** are TEXT type (not JSONB) for simplicity
3. **Flow Service** mock returns same data regardless of params (for now)
4. **Duplicate detection** requires exact match of all search parameters
5. **Names/groups** are user-provided, NOT from Flow Service
6. **API Gateway** does NO processing, just routing
7. **Nodes Service** owns ALL business logic
8. **DB Service** is ONLY service that touches PostgreSQL

---

**Ready to implement? Any questions or changes?**
