"""
API Gateway - Routes requests to appropriate backend services

RESPONSIBILITIES:
- Pure routing (no business logic)
- Request forwarding
- CORS handling
- Future: Authentication, rate limiting

DOES NOT:
- Process data
- Access database
- Contain business logic
"""
import logging
from fastapi import FastAPI, Request, Response, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
import httpx

from config import settings

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Create FastAPI app
app = FastAPI(title="API Gateway", version="1.0.0")

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify allowed origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"]
)


# ============================================================================
# STARTUP
# ============================================================================

@app.on_event("startup")
async def startup_event():
    """Initialize on startup"""
    logger.info("=" * 60)
    logger.info("API GATEWAY STARTING")
    logger.info("=" * 60)
    logger.info(f"Nodes Service URL: {settings.nodes_service_url}")
    logger.info("API Gateway ready")
    logger.info("=" * 60)


# ============================================================================
# HEALTH CHECK
# ============================================================================

@app.get("/")
def root():
    return {
        "service": "API Gateway",
        "status": "running",
        "version": "1.0.0",
        "note": "Pure routing layer - no business logic"
    }


@app.get("/health")
async def health_check():
    """Health check - verify Nodes Service is reachable"""
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            response = await client.get(f"{settings.nodes_service_url}/health")
            if response.status_code == 200:
                return {
                    "status": "healthy",
                    "nodes_service": "healthy"
                }
            else:
                return {
                    "status": "degraded",
                    "nodes_service": "unhealthy"
                }
    except Exception as e:
        logger.error(f"Nodes Service unreachable: {e}")
        return {
            "status": "degraded",
            "nodes_service": "unreachable"
        }


# ============================================================================
# ROUTING - Forward all /api/* to Nodes Service
# ============================================================================

async def forward_request(
    request: Request,
    path: str,
    method: str = "GET"
) -> Response:
    """
    Forward request to Nodes Service
    
    Args:
        request: FastAPI request
        path: Target path (without /api prefix)
        method: HTTP method
    
    Returns:
        Response from Nodes Service
    """
    # Build target URL
    target_url = f"{settings.nodes_service_url}{path}"
    
    # Get request body if exists
    body = None
    if method in ["POST", "PUT", "PATCH"]:
        body = await request.body()
    
    # Get query params
    query_params = dict(request.query_params)
    
    # Forward request
    logger.info(f"→ Forwarding: {method} /api{path} → {target_url}")
    
    try:
        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.request(
                method=method,
                url=target_url,
                content=body,
                params=query_params,
                headers={
                    "Content-Type": request.headers.get("Content-Type", "application/json")
                }
            )
            
            logger.info(f"← Response: {response.status_code}")
            
            # Return response
            return Response(
                content=response.content,
                status_code=response.status_code,
                headers=dict(response.headers),
                media_type=response.headers.get("Content-Type", "application/json")
            )
            
    except httpx.TimeoutException:
        logger.error(f"✗ Timeout forwarding to Nodes Service")
        raise HTTPException(
            status_code=status.HTTP_504_GATEWAY_TIMEOUT,
            detail="Request timeout"
        )
    except httpx.ConnectError:
        logger.error(f"✗ Cannot connect to Nodes Service")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Nodes Service unavailable"
        )
    except Exception as e:
        logger.error(f"✗ Error forwarding request: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Gateway error: {str(e)}"
        )


# ============================================================================
# ROUTES - Map all /api/* endpoints
# ============================================================================

# Projects
@app.get("/api/projects")
async def get_projects(request: Request):
    return await forward_request(request, "/projects", "GET")


@app.post("/api/projects")
async def create_project(request: Request):
    return await forward_request(request, "/projects", "POST")


# Legacy endpoint for backward compatibility
@app.get("/api/network")
async def get_network_legacy(request: Request):
    """Legacy endpoint - forwards to Nodes Service /api/network"""
    return await forward_request(request, "/api/network", "GET")


# Searches (History)
@app.get("/api/projects/{project_id}/searches")
async def get_project_searches(project_id: int, request: Request):
    return await forward_request(request, f"/projects/{project_id}/searches", "GET")


@app.post("/api/searches")
async def create_search(request: Request):
    return await forward_request(request, "/searches", "POST")


@app.post("/api/searches/confirm-duplicate")
async def confirm_duplicate(request: Request):
    return await forward_request(request, "/searches/confirm-duplicate", "POST")


@app.get("/api/searches/{history_id}")
async def get_search(history_id: int, request: Request):
    return await forward_request(request, f"/searches/{history_id}", "GET")


@app.put("/api/searches/{history_id}/refresh")
async def refresh_search(history_id: int, request: Request):
    return await forward_request(request, f"/searches/{history_id}/refresh", "PUT")


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
