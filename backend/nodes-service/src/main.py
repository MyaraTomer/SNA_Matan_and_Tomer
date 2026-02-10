"""
Nodes Service - Main business logic for SNA application
Orchestrates DB Service and Flow Service
"""
import logging
import json
from datetime import datetime
from typing import List
from fastapi import FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
import pandas as pd
import httpx

from config import settings
from models import (
    SearchRequest, SearchResponse, RefreshRequest, RefreshResponse,
    HistoryDetailResponse, ProjectCreate, ProjectResponse, HistorySummary,
    NetworkData, Group
)
from data_processor import SNADataProcessor
from services.db_client import DBClient
from services.flow_client import FlowClient

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Create FastAPI app
app = FastAPI(title="Nodes Service", version="1.0.0")

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"]
)

# Initialize services
db_client = DBClient()
flow_client = FlowClient()
data_processor = SNADataProcessor()


# ============================================================================
# STARTUP
# ============================================================================

@app.on_event("startup")
async def startup_event():
    """Initialize on startup"""
    logger.info("=" * 60)
    logger.info("NODES SERVICE STARTING")
    logger.info("=" * 60)
    logger.info(f"DB Service URL: {settings.db_service_url}")
    logger.info(f"Flow Service URL: {settings.flow_service_url}")
    logger.info("Nodes Service ready")
    logger.info("=" * 60)


# ============================================================================
# HEALTH CHECK
# ============================================================================

@app.get("/")
def root():
    return {
        "service": "Nodes Service",
        "status": "running",
        "version": "1.0.0"
    }


@app.get("/health")
async def health_check():
    """Health check - verify dependent services"""
    health_status = {
        "status": "healthy",
        "db_service": "unknown",
        "flow_service": "unknown"
    }
    
    # Check DB Service
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            response = await client.get(f"{settings.db_service_url}/health")
            if response.status_code == 200:
                health_status["db_service"] = "healthy"
            else:
                health_status["db_service"] = "unhealthy"
    except Exception as e:
        logger.warning(f"DB Service health check failed: {e}")
        health_status["db_service"] = "unreachable"
    
    # Check Flow Service
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            response = await client.get(f"{settings.flow_service_url}/health")
            if response.status_code == 200:
                health_status["flow_service"] = "healthy"
            else:
                health_status["flow_service"] = "unhealthy"
    except Exception as e:
        logger.warning(f"Flow Service health check failed: {e}")
        health_status["flow_service"] = "unreachable"
    
    # Overall status
    if health_status["db_service"] != "healthy" or health_status["flow_service"] != "healthy":
        health_status["status"] = "degraded"
    
    return health_status


# ============================================================================
# LEGACY BACKWARD COMPATIBILITY ENDPOINT
# ============================================================================

@app.get("/api/network")
async def get_network_legacy():
    """
    BACKWARD COMPATIBILITY ENDPOINT
    Legacy endpoint for old frontend that expects GET /api/network
    Returns mock data from Flow Service without requiring search parameters
    TODO: Remove this when frontend is updated with new landing page
    """
    logger.info("🔄 Legacy /api/network endpoint called - returning mock data")
    
    try:
        # Fetch mock data from Flow Service
        async with httpx.AsyncClient(timeout=30.0) as client:
            flow_response = await client.post(
                f"{settings.flow_service_url}/fetch",
                json={"time_range": {"from": "2024-01-01T00:00:00", "to": "2024-12-31T23:59:59"}}
            )
            
            if flow_response.status_code != 200:
                raise HTTPException(
                    status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                    detail="Flow Service unavailable"
                )
            
            flow_data = flow_response.json()
        
        # Process the data using our data processor
        from data_processor import SNADataProcessor
        
        processor = SNADataProcessor()
        network_data = processor.process_network_data(
            sna_data=flow_data["sna_data"],
            vector_data=flow_data["vector_data"],
            groups={}  # No groups for legacy endpoint
        )
        
        # Convert Pydantic model to dict
        network_dict = network_data.model_dump() if hasattr(network_data, 'model_dump') else network_data
        
        logger.info(f"✓ Legacy endpoint returning {len(network_dict['nodes'])} nodes, {len(network_dict['edges'])} edges")
        
        return network_dict
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in legacy endpoint: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch network data: {str(e)}"
        )


# ============================================================================
# PROJECT ENDPOINTS
# ============================================================================

@app.get("/projects", response_model=List[ProjectResponse])
async def get_projects():
    """Get all projects"""
    logger.info("GET /projects")
    
    try:
        projects = await db_client.get_projects()
        logger.info(f"✓ Found {len(projects)} projects")
        return projects
    except httpx.HTTPStatusError as e:
        logger.error(f"✗ DB Service error: {e}")
        raise HTTPException(
            status_code=e.response.status_code,
            detail=f"DB Service error: {e.response.text}"
        )
    except Exception as e:
        logger.error(f"✗ Unexpected error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )


@app.post("/projects", response_model=ProjectResponse, status_code=status.HTTP_201_CREATED)
async def create_project(request: ProjectCreate):
    """Create new project"""
    logger.info(f"POST /projects - name: {request.name}")
    
    try:
        project = await db_client.create_project(request.name)
        logger.info(f"✓ Created project: {project['id']} - {project['name']}")
        return project
    except httpx.HTTPStatusError as e:
        if e.response.status_code == 409:
            logger.warning(f"✗ Project '{name}' already exists")
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Project name already exists"
            )
        logger.error(f"✗ DB Service error: {e}")
        raise HTTPException(
            status_code=e.response.status_code,
            detail=f"DB Service error: {e.response.text}"
        )
    except Exception as e:
        logger.error(f"✗ Unexpected error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )


# ============================================================================
# SEARCH ENDPOINTS
# ============================================================================

@app.get("/projects/{project_id}/searches", response_model=List[HistorySummary])
async def get_project_searches(project_id: int):
    """Get all searches (history) for a project"""
    logger.info(f"GET /projects/{project_id}/searches")
    
    try:
        history = await db_client.get_project_history(project_id)
        logger.info(f"✓ Found {len(history)} searches")
        return history
    except httpx.HTTPStatusError as e:
        logger.error(f"✗ DB Service error: {e}")
        raise HTTPException(
            status_code=e.response.status_code,
            detail=f"DB Service error: {e.response.text}"
        )
    except Exception as e:
        logger.error(f"✗ Unexpected error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )


@app.post("/searches", response_model=SearchResponse)
async def create_search(request: SearchRequest):
    """
    Create new search or return existing duplicate
    
    Flow:
    1. Check for duplicate (same user + params)
    2. If duplicate found (same user) -> return duplicate info
    3. If different user or no duplicate -> fetch from Flow Service
    4. Process data
    5. Save to DB
    6. Return network data
    """
    logger.info("=" * 60)
    logger.info("POST /searches - NEW SEARCH REQUEST")
    logger.info(f"  Project: {request.project_id}")
    logger.info(f"  User: {request.username}")
    logger.info(f"  Name: {request.search_name}")
    logger.info(f"  Groups: {len(request.groups)}")
    logger.info("=" * 60)
    
    try:
        # Step 1: Check for duplicate
        groups_list = [g.dict() for g in request.groups]
        time_range_dict = {
            "from": request.time_range.from_time,
            "to": request.time_range.to_time
        }
        
        duplicate_result = await db_client.find_duplicate(
            project_id=request.project_id,
            created_by=request.username,
            groups=groups_list,
            time_range=time_range_dict
        )
        
        # Step 2: If duplicate found (same user) -> ask user
        if duplicate_result.get("found"):
            duplicate_info = duplicate_result.get("history")
            logger.info(f"✓ Duplicate found: {duplicate_info['id']} - {duplicate_info['name']}")
            
            return SearchResponse(
                history_id=duplicate_info["id"],
                is_duplicate=True,
                duplicate_info={
                    "name": duplicate_info["name"],
                    "created_at": duplicate_info["created_at"]
                },
                data=None
            )
        
        # Step 3: Fetch data from Flow Service
        logger.info("→ Fetching data from Flow Service...")
        flow_data = await flow_client.fetch_data(time_range_dict)
        logger.info(f"✓ Received data from Flow Service")
        logger.info(f"  SNA records: {len(flow_data['sna_data'])}")
        logger.info(f"  Vector records: {len(flow_data['vector_data'])}")
        
        # Step 4: Process data
        logger.info("→ Processing network data...")
        network_data = data_processor.process_network_data(
            sna_data=flow_data["sna_data"],
            vector_data=flow_data["vector_data"],
            groups=groups_list
        )
        logger.info(f"✓ Processed {len(network_data.nodes)} nodes, {len(network_data.edges)} edges")
        
        # Step 5: Save to DB
        logger.info("→ Saving to database...")
        
        # Convert DataFrames to JSON strings
        sna_df_str = pd.DataFrame(flow_data["sna_data"]).to_json(orient='records')
        vector_df_str = pd.DataFrame(flow_data["vector_data"]).to_json(orient='records')
        
        # Build search metadata
        search_metadata = {
            "groups": groups_list,
            "time_range": time_range_dict,
            "created_by": request.username,
            "created_at": datetime.utcnow().isoformat() + "Z"
        }
        search_metadata_str = json.dumps(search_metadata)
        
        # Auto-generate name if not provided
        search_name = request.search_name
        if not search_name:
            timestamp = datetime.utcnow().strftime("%Y-%m-%d_%H-%M-%S")
            search_name = f"SNA_{timestamp}"
            logger.info(f"  Auto-generated name: {search_name}")
        
        # Save to DB
        save_result = await db_client.create_history(
            project_id=request.project_id,
            name=search_name,
            sna_df=sna_df_str,
            vector_df=vector_df_str,
            search_metadata=search_metadata_str,
            created_by=request.username
        )
        
        history_id = save_result["id"]
        logger.info(f"✓ Saved to database: history_id={history_id}")
        
        logger.info("=" * 60)
        logger.info("NEW SEARCH COMPLETED SUCCESSFULLY")
        logger.info("=" * 60)
        
        return SearchResponse(
            history_id=history_id,
            is_duplicate=False,
            data=network_data
        )
        
    except httpx.HTTPStatusError as e:
        if "Flow Service" in str(e) or e.request.url.host == settings.flow_service_url.split("://")[1].split(":")[0]:
            logger.error(f"✗ Flow Service error: {e.response.status_code}")
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail=f"Flow Service unavailable (HTTP {e.response.status_code}). Please try again later."
            )
        else:
            logger.error(f"✗ DB Service error: {e}")
            raise HTTPException(
                status_code=e.response.status_code,
                detail=f"DB Service error: {e.response.text}"
            )
    except Exception as e:
        logger.error(f"✗ Unexpected error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )


@app.post("/searches/confirm-duplicate")
async def confirm_duplicate(history_id: int):
    """User chose to use existing duplicate instead of creating new"""
    logger.info(f"POST /searches/confirm-duplicate - history_id: {history_id}")
    
    try:
        # Just retrieve the existing history
        history = await db_client.get_history(history_id)
        
        # Parse stored data
        sna_data = json.loads(history["sna_df"])
        vector_data = json.loads(history["vector_df"])
        search_metadata = json.loads(history["search_metadata"])
        
        # Process on-demand
        network_data = data_processor.process_network_data(
            sna_data=sna_data,
            vector_data=vector_data,
            groups=search_metadata["groups"]
        )
        
        logger.info(f"✓ Loaded duplicate: {history_id}")
        
        return SearchResponse(
            history_id=history_id,
            is_duplicate=False,
            data=network_data
        )
        
    except httpx.HTTPStatusError as e:
        logger.error(f"✗ DB Service error: {e}")
        raise HTTPException(
            status_code=e.response.status_code,
            detail=f"DB Service error: {e.response.text}"
        )
    except Exception as e:
        logger.error(f"✗ Unexpected error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )


@app.get("/searches/{history_id}", response_model=HistoryDetailResponse)
async def get_search(history_id: int):
    """Get existing search by ID"""
    logger.info(f"GET /searches/{history_id}")
    
    try:
        # Retrieve from DB
        history = await db_client.get_history(history_id)
        
        # Parse stored data
        sna_data = json.loads(history["sna_df"])
        vector_data = json.loads(history["vector_df"])
        search_metadata = json.loads(history["search_metadata"])
        
        # Process on-demand
        logger.info("→ Processing network data on-demand...")
        network_data = data_processor.process_network_data(
            sna_data=sna_data,
            vector_data=vector_data,
            groups=search_metadata["groups"]
        )
        
        logger.info(f"✓ Loaded search: {history['name']}")
        
        return HistoryDetailResponse(
            history_id=history["id"],
            name=history["name"],
            project_id=history["project_id"],
            created_by=history["created_by"],
            created_at=history["created_at"],
            updated_at=history["updated_at"],
            search_metadata=search_metadata,
            data=network_data
        )
        
    except httpx.HTTPStatusError as e:
        if e.response.status_code == 404:
            logger.warning(f"✗ Search {history_id} not found")
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Search not found"
            )
        logger.error(f"✗ DB Service error: {e}")
        raise HTTPException(
            status_code=e.response.status_code,
            detail=f"DB Service error: {e.response.text}"
        )
    except Exception as e:
        logger.error(f"✗ Unexpected error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )


@app.put("/searches/{history_id}/refresh", response_model=RefreshResponse)
async def refresh_search(history_id: int, request: RefreshRequest):
    """
    Refresh search with potentially updated parameters
    
    Flow:
    1. Fetch new data from Flow Service with (possibly updated) params
    2. Process data
    3. Update existing history entry in DB
    4. Return updated network data
    """
    logger.info("=" * 60)
    logger.info(f"PUT /searches/{history_id}/refresh - REFRESH REQUEST")
    logger.info(f"  User: {request.username}")
    logger.info(f"  Groups: {len(request.groups)}")
    logger.info("=" * 60)
    
    try:
        # Step 1: Fetch new data from Flow Service
        groups_list = [g.dict() for g in request.groups]
        time_range_dict = {
            "from": request.time_range.from_time,
            "to": request.time_range.to_time
        }
        
        logger.info("→ Fetching updated data from Flow Service...")
        flow_data = await flow_client.fetch_data(time_range_dict)
        logger.info(f"✓ Received updated data from Flow Service")
        
        # Step 2: Process data
        logger.info("→ Processing network data...")
        network_data = data_processor.process_network_data(
            sna_data=flow_data["sna_data"],
            vector_data=flow_data["vector_data"],
            groups=groups_list
        )
        logger.info(f"✓ Processed {len(network_data.nodes)} nodes, {len(network_data.edges)} edges")
        
        # Step 3: Update DB
        logger.info("→ Updating database...")
        
        # Convert to JSON strings
        sna_df_str = pd.DataFrame(flow_data["sna_data"]).to_json(orient='records')
        vector_df_str = pd.DataFrame(flow_data["vector_data"]).to_json(orient='records')
        
        # Update metadata
        search_metadata = {
            "groups": groups_list,
            "time_range": time_range_dict,
            "created_by": request.username,
            "created_at": datetime.utcnow().isoformat() + "Z"
        }
        search_metadata_str = json.dumps(search_metadata)
        
        # Update in DB
        update_result = await db_client.update_history(
            history_id=history_id,
            sna_df=sna_df_str,
            vector_df=vector_df_str,
            search_metadata=search_metadata_str
        )
        
        updated_at = update_result["updated_at"]
        logger.info(f"✓ Updated in database: updated_at={updated_at}")
        
        logger.info("=" * 60)
        logger.info("REFRESH COMPLETED SUCCESSFULLY")
        logger.info("=" * 60)
        
        return RefreshResponse(
            history_id=history_id,
            updated_at=updated_at,
            data=network_data
        )
        
    except httpx.HTTPStatusError as e:
        if "Flow Service" in str(e) or e.request.url.host == settings.flow_service_url.split("://")[1].split(":")[0]:
            logger.error(f"✗ Flow Service error: {e.response.status_code}")
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail=f"Flow Service unavailable. Unable to refresh data."
            )
        else:
            logger.error(f"✗ DB Service error: {e}")
            raise HTTPException(
                status_code=e.response.status_code,
                detail=f"DB Service error: {e.response.text}"
            )
    except Exception as e:
        logger.error(f"✗ Unexpected error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )


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
