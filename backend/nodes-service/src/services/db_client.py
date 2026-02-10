"""
HTTP Client for DB Service
"""
import logging
from typing import List, Dict, Optional
import httpx
from config import settings

logger = logging.getLogger(__name__)


class DBClient:
    """Client for communicating with DB Service"""
    
    def __init__(self):
        self.base_url = settings.db_service_url
        self.timeout = 30.0  # seconds
        logger.info(f"DBClient initialized: {self.base_url}")
    
    async def get_projects(self) -> List[Dict]:
        """Get all projects"""
        async with httpx.AsyncClient(timeout=self.timeout) as client:
            response = await client.get(f"{self.base_url}/projects")
            response.raise_for_status()
            return response.json()
    
    async def create_project(self, name: str) -> Dict:
        """Create new project"""
        async with httpx.AsyncClient(timeout=self.timeout) as client:
            response = await client.post(
                f"{self.base_url}/projects",
                json={"name": name}
            )
            response.raise_for_status()
            return response.json()
    
    async def get_project_history(self, project_id: int) -> List[Dict]:
        """Get all history for a project"""
        async with httpx.AsyncClient(timeout=self.timeout) as client:
            response = await client.get(
                f"{self.base_url}/projects/{project_id}/history"
            )
            response.raise_for_status()
            return response.json()
    
    async def get_history(self, history_id: int) -> Dict:
        """Get history entry by ID"""
        async with httpx.AsyncClient(timeout=self.timeout) as client:
            response = await client.get(
                f"{self.base_url}/history/{history_id}"
            )
            response.raise_for_status()
            return response.json()
    
    async def create_history(
        self,
        project_id: int,
        name: Optional[str],
        sna_df: str,
        vector_df: str,
        search_metadata: str,
        created_by: str
    ) -> Dict:
        """Create new history entry"""
        async with httpx.AsyncClient(timeout=self.timeout) as client:
            response = await client.post(
                f"{self.base_url}/history",
                json={
                    "project_id": project_id,
                    "name": name,
                    "sna_df": sna_df,
                    "vector_df": vector_df,
                    "search_metadata": search_metadata,
                    "created_by": created_by
                }
            )
            response.raise_for_status()
            return response.json()
    
    async def update_history(
        self,
        history_id: int,
        sna_df: str,
        vector_df: str,
        search_metadata: str
    ) -> Dict:
        """Update history entry"""
        async with httpx.AsyncClient(timeout=self.timeout) as client:
            response = await client.put(
                f"{self.base_url}/history/{history_id}",
                json={
                    "sna_df": sna_df,
                    "vector_df": vector_df,
                    "search_metadata": search_metadata
                }
            )
            response.raise_for_status()
            return response.json()
    
    async def find_duplicate(
        self,
        project_id: int,
        created_by: str,
        groups: List[Dict],
        time_range: Dict
    ) -> Dict:
        """Find duplicate search"""
        async with httpx.AsyncClient(timeout=self.timeout) as client:
            response = await client.post(
                f"{self.base_url}/history/find-duplicate",
                json={
                    "project_id": project_id,
                    "created_by": created_by,
                    "groups": groups,
                    "time_range": time_range
                }
            )
            response.raise_for_status()
            return response.json()
