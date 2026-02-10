"""
Data models for Nodes Service (migrated from original backend)
"""
from pydantic import BaseModel, Field
from typing import Optional, List, Dict
from datetime import datetime


class Node(BaseModel):
    """Represents a node in the network"""
    id: str
    label: str
    name: str
    group: str
    color: str
    relevant: bool
    size: int = 20


class Edge(BaseModel):
    """Represents an edge/connection in the network"""
    id: str
    source: str  # from node
    target: str  # to node
    weight: int
    words: Optional[str] = None
    has_vector: bool
    color: str


class NetworkData(BaseModel):
    """Complete network data response"""
    nodes: List[Node]
    edges: List[Edge]
    groups: Dict[str, str]  # group_name -> color mapping


# ============================================================================
# Request/Response Models for API
# ============================================================================

class GroupMember(BaseModel):
    """Member of a group (PSTN + name)"""
    pstn: str
    name: str


class Group(BaseModel):
    """Group definition"""
    name: str
    members: List[GroupMember]


class TimeRange(BaseModel):
    """Time range for search"""
    from_time: str = Field(..., alias='from')  # ISO 8601 format
    to_time: str = Field(..., alias='to')      # ISO 8601 format
    
    model_config = {
        "populate_by_name": True
    }


class SearchRequest(BaseModel):
    """Request to create new search"""
    project_id: int
    username: str
    search_name: Optional[str] = None
    groups: List[Group]
    time_range: TimeRange


class SearchResponse(BaseModel):
    """Response for new/existing search"""
    history_id: int
    is_duplicate: bool = False
    duplicate_info: Optional[Dict] = None
    note: Optional[str] = None
    data: Optional[NetworkData] = None


class HistoryDetailResponse(BaseModel):
    """Response for history detail"""
    history_id: int
    name: Optional[str]
    project_id: int
    created_by: str
    created_at: datetime
    updated_at: datetime
    search_metadata: Dict
    data: NetworkData


class RefreshRequest(BaseModel):
    """Request to refresh search"""
    username: str
    groups: List[Group]
    time_range: TimeRange


class RefreshResponse(BaseModel):
    """Response for refresh"""
    history_id: int
    updated_at: datetime
    data: NetworkData


class ProjectCreate(BaseModel):
    """Project creation request"""
    name: str


class ProjectResponse(BaseModel):
    """Project response"""
    id: int
    name: str
    created_at: datetime


class HistorySummary(BaseModel):
    """History summary (without data)"""
    id: int
    name: Optional[str]
    created_by: str
    created_at: datetime
    updated_at: datetime
