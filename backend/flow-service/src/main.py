"""
Flow Service - Mock third-party API
Returns SNA and Vector data from Excel files

NOTE: This is a MOCK service. Replace with real API calls later.
      All mock logic is contained in the /mock directory.
"""
import logging
from typing import Dict, Optional
from fastapi import FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from config import settings, MOCK_DATA_DIR
from mock.data_loader import MockDataLoader

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Create FastAPI app
app = FastAPI(title="Flow Service (Mock)", version="1.0.0")

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"]
)

# Initialize mock data loader
mock_loader: Optional[MockDataLoader] = None


# ============================================================================
# PYDANTIC MODELS
# ============================================================================

class TimeRange(BaseModel):
    """Time range for data fetch"""
    # NOTE: Currently ignored in mock - always returns same data
    from_time: str = None  # ISO 8601 format
    to_time: str = None    # ISO 8601 format
    
    class Config:
        # Allow 'from' as field name (Python keyword workaround)
        populate_by_name = True
        fields = {
            'from_time': {'alias': 'from'},
            'to_time': {'alias': 'to'}
        }


class FetchRequest(BaseModel):
    """Request to fetch data from third-party API"""
    time_range: TimeRange


class FetchResponse(BaseModel):
    """Response with SNA and Vector data"""
    sna_data: list
    vector_data: list


class ErrorResponse(BaseModel):
    """Error response"""
    error: str
    status_code: int
    message: str


# ============================================================================
# STARTUP
# ============================================================================

@app.on_event("startup")
async def startup_event():
    """Initialize mock data loader on startup"""
    global mock_loader
    
    logger.info("=" * 60)
    logger.info("FLOW SERVICE (MOCK) STARTING")
    logger.info("=" * 60)
    logger.info(f"Mock data directory: {MOCK_DATA_DIR}")
    logger.info("")
    logger.info("⚠️  WARNING: This is a MOCK service!")
    logger.info("   Real third-party API integration pending.")
    logger.info("   All mock logic is in /mock directory.")
    logger.info("")
    
    try:
        mock_loader = MockDataLoader(MOCK_DATA_DIR)
        logger.info("✓ Mock data loader initialized")
    except Exception as e:
        logger.error(f"✗ Failed to initialize mock data loader: {e}")
        raise
    
    logger.info("Flow Service ready")
    logger.info("=" * 60)


# ============================================================================
# ENDPOINTS
# ============================================================================

@app.get("/")
def root():
    return {
        "service": "Flow Service (Mock)",
        "status": "running",
        "version": "1.0.0",
        "note": "This is a mock service. Replace with real API later."
    }


@app.get("/health")
def health_check():
    """Health check endpoint"""
    if mock_loader is None:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Mock data loader not initialized"
        )
    
    return {
        "status": "healthy",
        "mock_data_dir": str(MOCK_DATA_DIR),
        "sna_file_exists": mock_loader.sna_file.exists(),
        "vector_file_exists": mock_loader.vector_file.exists()
    }


@app.post("/fetch", response_model=FetchResponse)
def fetch_data(request: FetchRequest):
    """
    Fetch data from third-party API (mocked)
    
    NOTE: In real implementation, this would:
    1. Make HTTP request to actual third-party API
    2. Pass time_range parameters
    3. Handle authentication
    4. Return real data
    
    Mock behavior:
    - Always returns same data from Excel files
    - Ignores time_range parameter
    - Simulates API response format
    """
    logger.info("POST /fetch")
    if request.time_range and request.time_range.from_time:
        logger.info(f"  Time range: {request.time_range.from_time} to {request.time_range.to_time}")
        logger.info("  (NOTE: Time range ignored in mock - returns all data)")
    
    if mock_loader is None:
        logger.error("✗ Mock data loader not initialized")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Service not ready"
        )
    
    try:
        # Load mock data
        time_range_dict = None
        if request.time_range:
            time_range_dict = {
                "from": request.time_range.from_time,
                "to": request.time_range.to_time
            }
        
        data = mock_loader.load_data(time_range=time_range_dict)
        
        logger.info(f"✓ Mock data fetched successfully")
        logger.info(f"  SNA records: {len(data['sna_data'])}")
        logger.info(f"  Vector records: {len(data['vector_data'])}")
        
        return FetchResponse(
            sna_data=data["sna_data"],
            vector_data=data["vector_data"]
        )
        
    except FileNotFoundError as e:
        logger.error(f"✗ Mock data files not found: {e}")
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Mock data files not found: {str(e)}"
        )
    except Exception as e:
        logger.error(f"✗ Failed to fetch mock data: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to load mock data: {str(e)}"
        )


@app.post("/simulate-error")
def simulate_error(error_code: int = 503):
    """
    Simulate API errors for testing
    
    Usage: POST /simulate-error?error_code=404
    """
    logger.warning(f"Simulating error: {error_code}")
    
    error_messages = {
        404: "Not Found - No data available for requested time range",
        500: "Internal Server Error - Third-party API failure",
        503: "Service Unavailable - Third-party API temporarily down"
    }
    
    message = error_messages.get(error_code, "Unknown error")
    
    raise HTTPException(
        status_code=error_code,
        detail=message
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
