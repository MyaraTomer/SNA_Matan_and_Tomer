"""
DB Service - Handles all database operations
"""
import logging
from typing import List, Optional
from datetime import datetime
from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from sqlalchemy import text
from pydantic import BaseModel

from database import get_db, init_db
from config import settings
import crud

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Create FastAPI app
app = FastAPI(title="DB Service", version="1.0.0")

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"]
)


# ============================================================================
# PYDANTIC MODELS (Request/Response schemas)
# ============================================================================

class ProjectCreate(BaseModel):
    name: str


class ProjectResponse(BaseModel):
    id: int
    name: str
    created_at: datetime
    
    class Config:
        from_attributes = True


class HistoryCreate(BaseModel):
    project_id: int
    name: Optional[str] = None
    sna_df: str
    vector_df: str
    search_metadata: str
    created_by: str


class HistoryUpdate(BaseModel):
    sna_df: str
    vector_df: str
    search_metadata: str


class HistoryResponse(BaseModel):
    id: int
    name: Optional[str]
    project_id: int
    sna_df: str
    vector_df: str
    search_metadata: str
    created_by: str
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True


class HistorySummary(BaseModel):
    """Lightweight history info (without large data fields)"""
    id: int
    name: Optional[str]
    created_by: str
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True


class FindDuplicateRequest(BaseModel):
    project_id: int
    created_by: str
    groups: list
    time_range: dict


class FindDuplicateResponse(BaseModel):
    found: bool
    history: Optional[HistorySummary] = None


# ============================================================================
# STARTUP/SHUTDOWN
# ============================================================================

@app.on_event("startup")
async def startup_event():
    """Initialize database on startup"""
    logger.info("=" * 60)
    logger.info("DB SERVICE STARTING")
    logger.info("=" * 60)
    logger.info(f"Database URL: {settings.database_url.replace(settings.postgres_password, '***')}")
    
    try:
        init_db()
        logger.info("✓ Database initialized successfully")
    except Exception as e:
        logger.error(f"✗ Failed to initialize database: {e}")
        raise
    
    logger.info("DB Service ready")
    logger.info("=" * 60)


# ============================================================================
# HEALTH CHECK
# ============================================================================

@app.get("/")
def root():
    return {
        "service": "DB Service",
        "status": "running",
        "version": "1.0.0"
    }


@app.get("/health")
def health_check(db: Session = Depends(get_db)):
    """Health check endpoint"""
    try:
        # Try a simple query
        db.execute(text("SELECT 1"))
        return {"status": "healthy", "database": "connected"}
    except Exception as e:
        logger.error(f"Health check failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Database connection failed"
        )


# ============================================================================
# PROJECT ENDPOINTS
# ============================================================================

@app.get("/projects", response_model=List[ProjectResponse])
def get_projects(db: Session = Depends(get_db)):
    """Get all projects"""
    logger.info("GET /projects")
    projects = crud.get_all_projects(db)
    logger.info(f"✓ Found {len(projects)} projects")
    return projects


@app.post("/projects", response_model=ProjectResponse, status_code=status.HTTP_201_CREATED)
def create_project(project: ProjectCreate, db: Session = Depends(get_db)):
    """Create new project"""
    logger.info(f"POST /projects - name: {project.name}")
    
    # Check if project name already exists
    existing = crud.get_project_by_name(db, project.name)
    if existing:
        logger.warning(f"✗ Project name '{project.name}' already exists")
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Project name already exists"
        )
    
    new_project = crud.create_project(db, project.name)
    logger.info(f"✓ Created project: {new_project.id} - {new_project.name}")
    return new_project


@app.get("/projects/{project_id}", response_model=ProjectResponse)
def get_project(project_id: int, db: Session = Depends(get_db)):
    """Get project by ID"""
    logger.info(f"GET /projects/{project_id}")
    
    project = crud.get_project_by_id(db, project_id)
    if not project:
        logger.warning(f"✗ Project {project_id} not found")
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found"
        )
    
    logger.info(f"✓ Found project: {project.name}")
    return project


# ============================================================================
# HISTORY ENDPOINTS
# ============================================================================

@app.get("/projects/{project_id}/history", response_model=List[HistorySummary])
def get_project_history_endpoint(project_id: int, db: Session = Depends(get_db)):
    """Get all history entries for a project"""
    logger.info(f"GET /projects/{project_id}/history")
    
    # Verify project exists
    project = crud.get_project_by_id(db, project_id)
    if not project:
        logger.warning(f"✗ Project {project_id} not found")
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found"
        )
    
    history = crud.get_project_history(db, project_id)
    logger.info(f"✓ Found {len(history)} history entries")
    return history


@app.get("/history/{history_id}", response_model=HistoryResponse)
def get_history(history_id: int, db: Session = Depends(get_db)):
    """Get history entry by ID"""
    logger.info(f"GET /history/{history_id}")
    
    history = crud.get_history_by_id(db, history_id)
    if not history:
        logger.warning(f"✗ History {history_id} not found")
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="History entry not found"
        )
    
    logger.info(f"✓ Found history: {history.name}")
    return history


@app.post("/history", response_model=dict, status_code=status.HTTP_201_CREATED)
def create_history_endpoint(history: HistoryCreate, db: Session = Depends(get_db)):
    """Create new history entry"""
    logger.info(f"POST /history - project_id: {history.project_id}, name: {history.name}")
    
    # Verify project exists
    project = crud.get_project_by_id(db, history.project_id)
    if not project:
        logger.warning(f"✗ Project {history.project_id} not found")
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found"
        )
    
    new_history = crud.create_history(
        db=db,
        project_id=history.project_id,
        name=history.name,
        sna_df=history.sna_df,
        vector_df=history.vector_df,
        search_metadata=history.search_metadata,
        created_by=history.created_by
    )
    
    logger.info(f"✓ Created history: {new_history.id}")
    return {
        "id": new_history.id,
        "created_at": new_history.created_at
    }


@app.put("/history/{history_id}", response_model=dict)
def update_history_endpoint(
    history_id: int,
    history: HistoryUpdate,
    db: Session = Depends(get_db)
):
    """Update history entry"""
    logger.info(f"PUT /history/{history_id}")
    
    updated = crud.update_history(
        db=db,
        history_id=history_id,
        sna_df=history.sna_df,
        vector_df=history.vector_df,
        search_metadata=history.search_metadata
    )
    
    if not updated:
        logger.warning(f"✗ History {history_id} not found")
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="History entry not found"
        )
    
    logger.info(f"✓ Updated history: {history_id}")
    return {
        "id": updated.id,
        "updated_at": updated.updated_at
    }


@app.delete("/history/{history_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_history_endpoint(history_id: int, db: Session = Depends(get_db)):
    """Delete history entry"""
    logger.info(f"DELETE /history/{history_id}")
    
    success = crud.delete_history(db, history_id)
    if not success:
        logger.warning(f"✗ History {history_id} not found")
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="History entry not found"
        )
    
    logger.info(f"✓ Deleted history: {history_id}")
    return None


@app.post("/history/find-duplicate", response_model=FindDuplicateResponse)
def find_duplicate(request: FindDuplicateRequest, db: Session = Depends(get_db)):
    """Find duplicate search"""
    logger.info(f"POST /history/find-duplicate - project: {request.project_id}, user: {request.created_by}")
    
    duplicate = crud.find_duplicate_history(
        db=db,
        project_id=request.project_id,
        created_by=request.created_by,
        groups=request.groups,
        time_range=request.time_range
    )
    
    if duplicate:
        logger.info(f"✓ Found duplicate: {duplicate.id} - {duplicate.name}")
        return FindDuplicateResponse(
            found=True,
            history=HistorySummary(
                id=duplicate.id,
                name=duplicate.name,
                created_by=duplicate.created_by,
                created_at=duplicate.created_at,
                updated_at=duplicate.updated_at
            )
        )
    else:
        logger.info("✓ No duplicate found")
        return FindDuplicateResponse(found=False)


# ============================================================================
# MAIN
# ============================================================================

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host=settings.service_host,
        port=settings.service_port,
        reload=True
    )
