"""
HTTP Client for Flow Service
"""
import logging
from typing import Dict
import httpx
from config import settings

logger = logging.getLogger(__name__)


class FlowClient:
    """Client for communicating with Flow Service"""
    
    def __init__(self):
        self.base_url = settings.flow_service_url
        self.timeout = 60.0  # seconds (longer for potential API delays)
        logger.info(f"FlowClient initialized: {self.base_url}")
    
    async def fetch_data(self, time_range: Dict) -> Dict:
        """
        Fetch data from Flow Service (third-party API)
        
        Args:
            time_range: {"from": "ISO8601", "to": "ISO8601"}
        
        Returns:
            {"sna_data": [...], "vector_data": [...]}
        
        Raises:
            httpx.HTTPStatusError: If API returns error status
        """
        async with httpx.AsyncClient(timeout=self.timeout) as client:
            response = await client.post(
                f"{self.base_url}/fetch",
                json={"time_range": time_range}
            )
            response.raise_for_status()
            return response.json()
